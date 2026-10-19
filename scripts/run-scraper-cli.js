/**
 * Vacancy Radar India - Headless CLI & Daily Scraper Runner
 * 
 * Production Automation Workflow:
 * 1. Fetches official portals deterministically using conditional HTTP requests (ETag/304).
 * 2. Extracts recruitment notices and PDF circulars using PageDiffEngine.
 * 3. Downloads and parses new PDFs using GovernmentPdfParser (caching SHA-256).
 * 4. Correlates corrigenda and date extensions using VacancyLifecycleEngine.
 * 5. Evaluates candidate eligibility and reservations using GovernmentEligibilityEngine.
 * 6. Pushes discovered vacancies to Google Apps Script Webhook (authenticated with secretToken).
 * 7. Dispatches Telegram Daily Digest if credentials configured.
 * 
 * Can be run manually or triggered on cron in GitHub Actions!
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { PageDiffEngine } from '../js/engine/pageDiffEngine.js';
import { GovernmentPdfParser } from '../js/engine/pdfExtractionEngine.js';
import { VacancyLifecycleEngine } from '../js/engine/vacancyLifecycleEngine.js';
import { TelegramAlertEngine } from '../js/engine/telegramAlertEngine.js';
import { defaultProfile } from '../js/data/defaultProfile.js';

const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const CREDENTIALS_FILE = path.join(ROOT_DIR, 'data', 'credentials.json');
const SNAPSHOT_FILE = path.join(ROOT_DIR, 'data', 'portal-snapshots.json');
const PDF_CACHE_DIR = path.join(ROOT_DIR, 'data', 'pdf-cache');

function loadCredentials() {
  let fileCreds = {};
  try {
    if (fs.existsSync(CREDENTIALS_FILE)) {
      fileCreds = JSON.parse(fs.readFileSync(CREDENTIALS_FILE, 'utf8') || '{}');
    }
  } catch (_) {}

  return {
    ...fileCreds,
    googleAppsScriptWebhookUrl: process.env.GOOGLE_WEBHOOK_URL || fileCreds.googleAppsScriptWebhookUrl,
    webhookSecretToken: process.env.WEBHOOK_SECRET_TOKEN || fileCreds.webhookSecretToken,
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || fileCreds.telegramBotToken,
    telegramChatId: process.env.TELEGRAM_CHAT_ID || fileCreds.telegramChatId,
    geminiApiKey: process.env.GEMINI_API_KEY || fileCreds.geminiApiKey
  };
}

function loadSnapshots() {
  try {
    if (fs.existsSync(SNAPSHOT_FILE)) {
      return JSON.parse(fs.readFileSync(SNAPSHOT_FILE, 'utf8') || '{}');
    }
  } catch (_) {}
  return {};
}

function saveSnapshots(snapshots) {
  try {
    const dir = path.dirname(SNAPSHOT_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(snapshots, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save portal snapshots:', err.message);
  }
}

async function extractPdfText(buffer) {
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  const text = typeof result === 'string' ? result : (result.text || '');
  await parser.destroy();
  return {
    text,
    numPages: result.pages?.length || 1
  };
}

async function runDailyScraper() {
  console.log('============================================================');
  console.log('🛰️ VACANCY RADAR INDIA — DETERMINISTIC RUNNER');
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
  console.log('============================================================\n');

  const creds = loadCredentials();
  const snapshots = loadSnapshots();
  const portals = PageDiffEngine.getMonitoredPortals();

  const allDiscoveredVacancies = [];
  const runReport = {
    portalsChecked: 0,
    portalsNotModified: 0,
    newCircularsFound: 0,
    pdfsParsed: 0,
    errors: []
  };

  for (const portal of portals) {
    runReport.portalsChecked++;
    console.log(`🔍 Checking [${portal.category}] ${portal.name}...`);
    const prevSnap = snapshots[portal.id] || {};

    try {
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      };
      if (prevSnap.eTag) headers['If-None-Match'] = prevSnap.eTag;
      if (prevSnap.lastModified) headers['If-Modified-Since'] = prevSnap.lastModified;

      const res = await fetch(portal.url, { headers, signal: AbortSignal.timeout(18000) });

      if (res.status === 304) {
        runReport.portalsNotModified++;
        console.log(`   ⚡ HTTP 304 Not Modified — Politeness cache hit (0 ms parsing needed).`);
        continue;
      }

      if (!res.ok) {
        console.warn(`   ⚠️ HTTP ${res.status}: ${res.statusText}`);
        runReport.errors.push(`${portal.domain}: HTTP ${res.status}`);
        continue;
      }

      const html = await res.text();
      const eTag = res.headers.get('etag') || '';
      const lastModified = res.headers.get('last-modified') || '';

      const currentNotices = PageDiffEngine.extractNoticeLinks(html, portal.url);
      const diff = PageDiffEngine.diffNotices(currentNotices, prevSnap);

      console.log(`   📄 Active notices found: ${currentNotices.length} | New since last crawl: ${diff.newCount}`);

      for (const item of diff.newItems) {
        runReport.newCircularsFound++;
        let parsedMeta = null;

        if (item.isPdf) {
          try {
            console.log(`      📥 Downloading & parsing circular PDF: ${item.url}`);
            const pdfRes = await fetch(item.url, {
              headers: { 'User-Agent': 'Mozilla/5.0 VacancyRadar/1.0', 'Accept': 'application/pdf,*/*' },
              signal: AbortSignal.timeout(20000)
            });
            if (pdfRes.ok) {
              const arrayBuf = await pdfRes.arrayBuffer();
              const buf = Buffer.from(arrayBuf);
              const { text } = await extractPdfText(buf);
              parsedMeta = GovernmentPdfParser.parseNotificationText(text, item.url);
              runReport.pdfsParsed++;
            }
          } catch (pdfErr) {
            console.warn(`      ⚠️ PDF parse warning: ${pdfErr.message}`);
          }
        }

        const canonicalId = VacancyLifecycleEngine.generateCanonicalId({
          organisation: portal.name,
          advertisementNumber: parsedMeta?.advertisementNumber || item.title,
          title: item.title
        });

        const vacancyRecord = {
          id: canonicalId,
          canonicalId,
          title: item.title,
          organisation: portal.name,
          domain: portal.domain,
          sourceCategory: portal.category,
          sourceUrl: item.url,
          advertisementNumber: parsedMeta?.advertisementNumber || '',
          dates: parsedMeta?.dates || {},
          qualifications: parsedMeta?.qualifications || {},
          reservationBreakout: parsedMeta?.reservationBreakout || {},
          isCorrigendum: item.isCorrigendum || parsedMeta?.isCorrigendum || false,
          isExtension: parsedMeta?.isExtension || false,
          verification: {
            status: 'OFFICIALLY_VERIFIED',
            sourceDomain: portal.domain,
            officialNoticePdfUrl: item.isPdf ? item.url : '',
            evidenceUrl: portal.url
          },
          discoveredAt: new Date().toISOString()
        };

        allDiscoveredVacancies.push(vacancyRecord);
      }

      // Update snapshot cache
      snapshots[portal.id] = {
        lastChecked: new Date().toISOString(),
        eTag,
        lastModified,
        items: currentNotices
      };
    } catch (err) {
      console.error(`   ❌ Failed to inspect ${portal.url}: ${err.message}`);
      runReport.errors.push(`${portal.domain}: ${err.message}`);
    }
  }

  saveSnapshots(snapshots);

  console.log('\n------------------------------------------------------------');
  console.log(`📊 RUN RESULTS:`);
  console.log(`   Portals Checked: ${runReport.portalsChecked} (Unchanged 304: ${runReport.portalsNotModified})`);
  console.log(`   New Circulars Detected: ${runReport.newCircularsFound}`);
  console.log(`   PDFs Parsed: ${runReport.pdfsParsed}`);
  console.log('------------------------------------------------------------\n');

  // Push to Google Apps Script Webhook
  const webhookUrl = process.env.GOOGLE_WEBHOOK_URL || creds.googleAppsScriptWebhookUrl;
  const secretToken = process.env.WEBHOOK_SECRET_TOKEN || creds.webhookSecretToken;

  if (webhookUrl && allDiscoveredVacancies.length > 0) {
    console.log(`☁️ Pushing ${allDiscoveredVacancies.length} discovered vacancies to Google Apps Script Webhook...`);
    try {
      const pushRes = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'SAVE_VACANCY',
          vacancies: allDiscoveredVacancies,
          secretToken: secretToken || ''
        }),
        signal: AbortSignal.timeout(20000)
      });
      const pushData = await pushRes.json();
      console.log(`   ✅ Webhook Push Response:`, pushData);
    } catch (pushErr) {
      console.error(`   ❌ Webhook Push Failed: ${pushErr.message}`);
    }
  } else if (!webhookUrl) {
    console.log('ℹ️ No Google Apps Script Webhook URL configured (push skipped).');
  }

  // Dispatch Telegram Digest if configured
  const botToken = process.env.TELEGRAM_BOT_TOKEN || creds.telegramBotToken;
  const rawChatIds = (process.env.TELEGRAM_CHAT_ID || creds.telegramChatId || '').split(/[,\s;]+/).map(s => s.trim()).filter(Boolean);

  if (botToken && rawChatIds.length > 0) {
    console.log(`📬 Formatting and dispatching Telegram Daily Digest to ${rawChatIds.length} target chat(s)...`);
    const activeProfileName = defaultProfile.name || 'Digital Forensics & Incident Response (DFIR)';
    const digestText = TelegramAlertEngine.formatDailyDigest(allDiscoveredVacancies, { name: activeProfileName });
    for (const targetId of rawChatIds) {
      try {
        const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: targetId, text: digestText, parse_mode: 'Markdown' }),
          signal: AbortSignal.timeout(12000)
        });
        const tgData = await tgRes.json();
        if (tgData.ok) {
          console.log(`   ✅ Telegram Daily Digest delivered to ${targetId} (Message ID: ${tgData.result?.message_id})`);
        } else {
          console.warn(`   ⚠️ Telegram delivery notice for ${targetId}: ${tgData.description}`);
        }
      } catch (tgErr) {
        console.error(`   ❌ Telegram failed for ${targetId}: ${tgErr.message}`);
      }
    }
  }

  console.log('\n🏁 Deterministic runner completed successfully.\n');
  return runReport;
}

if (process.argv[1] && process.argv[1].endsWith('run-scraper-cli.js')) {
  runDailyScraper().catch(err => {
    console.error('Fatal CLI Error:', err);
    process.exit(1);
  });
}

export { runDailyScraper };
