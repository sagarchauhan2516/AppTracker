import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import dotenv from 'dotenv';

dotenv.config();

const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');

const __filename = fileURLToPath(import.meta.url);
// __dirname pointing to the project root
export const ROOT_DIR = path.resolve(path.dirname(__filename), '..');
export const PORT = process.env.PORT || 3000;
export const PDF_CACHE_DIR = path.join(ROOT_DIR, 'data', 'pdf-cache');

// Per-domain TLS relaxation for Indian National PKI / Government departmental certificates
export const GOV_TLS_DOMAINS = ['.gov.in', '.nic.in', '.cdac.in', '.nfsu.ac.in', '.drdo.gov.in'];
export const govTlsAgent = new https.Agent({ rejectUnauthorized: false });

/**
 * Returns fetch options with relaxed TLS only for known Indian government domains.
 * @param {string} url - The URL being fetched
 * @returns {object} Additional fetch options (agent) or empty object
 */
export function getGovTlsOptions(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (GOV_TLS_DOMAINS.some(d => hostname.endsWith(d))) {
      return { agent: govTlsAgent };
    }
  } catch (_) {}
  return {};
}

// CORS configuration — restrict to configured origins (default: localhost)
export const CORS_ALLOWED_ORIGINS = (process.env.CORS_ALLOWED_ORIGINS || `http://localhost:${PORT}`)
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

export const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

export function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 5 * 1024 * 1024) { // 5MB limit
        reject(new Error('Request body too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        resolve({ raw: body });
      }
    });
    req.on('error', reject);
  });
}

export function getCorsOrigin(req) {
  const origin = (req && req.headers && req.headers.origin) || '';
  if (CORS_ALLOWED_ORIGINS.includes(origin)) return origin;
  return CORS_ALLOWED_ORIGINS[0] || 'http://localhost:3000';
}

let _currentCorsOrigin = CORS_ALLOWED_ORIGINS[0] || 'http://localhost:3000';

export function setRequestCorsOrigin(origin) {
  _currentCorsOrigin = origin;
}

export function getCurrentCorsOrigin() {
  return _currentCorsOrigin;
}

export function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=UTF-8',
    'Access-Control-Allow-Origin': _currentCorsOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

// In-memory sliding-window rate limiting map
const _rateLimitMap = new Map();

/**
 * Validates request against sliding window limit per client IP + route.
 * @param {string} key - Unique rate-limit identifier (IP + endpoint)
 * @param {number} maxRequests - Max requests allowed in window
 * @param {number} windowMs - Window duration in ms (default: 60000ms = 1m)
 * @returns {boolean} True if allowed, false if rate limited
 */
export function checkRateLimit(key, maxRequests = 60, windowMs = 60000) {
  const now = Date.now();
  const history = (_rateLimitMap.get(key) || []).filter(t => now - t < windowMs);
  if (history.length >= maxRequests) {
    return false;
  }
  history.push(now);
  _rateLimitMap.set(key, history);
  return true;
}

export const CREDENTIALS_FILE = path.join(ROOT_DIR, 'data', 'credentials.json');

export function loadStoredCredentials() {
  try {
    if (fs.existsSync(CREDENTIALS_FILE)) {
      return JSON.parse(fs.readFileSync(CREDENTIALS_FILE, 'utf8') || '{}');
    }
  } catch (_) {}
  return {};
}

export function saveStoredCredentials(creds) {
  try {
    const dir = path.dirname(CREDENTIALS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const current = loadStoredCredentials();
    const merged = { ...current, ...creds, updatedAt: new Date().toISOString() };
    fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(merged, null, 2), 'utf8');
    return merged;
  } catch (err) {
    console.error('Error saving credentials:', err.message);
    return creds;
  }
}

export const LEARNED_SOURCES_FILE = path.join(ROOT_DIR, 'data', 'learned-sources.json');

export function loadLearnedSources() {
  try {
    if (fs.existsSync(LEARNED_SOURCES_FILE)) {
      return JSON.parse(fs.readFileSync(LEARNED_SOURCES_FILE, 'utf8') || '[]');
    }
  } catch (_) {}
  return [];
}

export function saveLearnedSource(domain, meta = {}) {
  try {
    const list = loadLearnedSources();
    const cleanDomain = domain.toLowerCase().trim();
    const existing = list.find(s => s.domain === cleanDomain);
    if (!existing) {
      list.push({
        domain: cleanDomain,
        addedAt: new Date().toISOString(),
        firstDiscoveredFrom: meta.url || '',
        organisation: meta.organisation || cleanDomain,
        sourceType: 'USER_CONTRIBUTED',
        active: true
      });
      const dir = path.dirname(LEARNED_SOURCES_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(LEARNED_SOURCES_FILE, JSON.stringify(list, null, 2), 'utf8');
      return true;
    }
  } catch (err) {
    console.error('Error saving learned source:', err.message);
  }
  return false;
}

export const TRAINING_CORPUS_FILE = path.join(ROOT_DIR, 'data', 'training-corpus.json');

export function loadTrainingCorpus() {
  try {
    if (fs.existsSync(TRAINING_CORPUS_FILE)) {
      return JSON.parse(fs.readFileSync(TRAINING_CORPUS_FILE, 'utf8') || '[]');
    }
  } catch (_) {}
  return [];
}

export function saveTrainingCorpusSample(specimen) {
  try {
    if (!specimen || !specimen.title) return false;
    const corpus = loadTrainingCorpus();
    const existingIdx = corpus.findIndex(s => 
      (specimen.id && s.id === specimen.id) || 
      (s.advertisementNumber && specimen.advertisementNumber && s.advertisementNumber === specimen.advertisementNumber) ||
      (s.domain === specimen.domain && s.title.toLowerCase() === specimen.title.toLowerCase())
    );

    if (existingIdx >= 0) {
      corpus[existingIdx] = { ...corpus[existingIdx], ...specimen, updatedLast: new Date().toISOString() };
    } else {
      corpus.push({
        id: specimen.id || `corpus-${Date.now()}`,
        ...specimen,
        verifiedAt: specimen.verifiedAt || new Date().toISOString()
      });
    }

    const dir = path.dirname(TRAINING_CORPUS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    // Keep max 250 high-quality verified specimens for fast memory injection
    const trimmed = corpus.slice(-250);
    fs.writeFileSync(TRAINING_CORPUS_FILE, JSON.stringify(trimmed, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error saving training corpus sample:', err.message);
  }
  return false;
}

export const CDAC_CAREERS_KEY = process.env.CDAC_CAREERS_KEY || '';

export function decryptCdacPayload(ciphertextB64) {
  try {
    const cipherBytes = Buffer.from(ciphertextB64, 'base64');
    if (cipherBytes.slice(0, 8).toString() !== 'Salted__') return null;
    const salt = cipherBytes.slice(8, 16);
    const encrypted = cipherBytes.slice(16);

    const passwordBuf = Buffer.from(CDAC_CAREERS_KEY, 'utf8');
    let d = Buffer.alloc(0);
    let d_i = Buffer.alloc(0);
    while (d.length < 48) {
      const hash = crypto.createHash('md5');
      hash.update(d_i);
      hash.update(passwordBuf);
      hash.update(salt);
      d_i = hash.digest();
      d = Buffer.concat([d, d_i]);
    }

    const key = d.slice(0, 32);
    const iv = d.slice(32, 48);

    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, null, 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
  } catch (err) {
    console.error('CDAC decryption error:', err.message);
    return null;
  }
}

export const TRACKED_APPLICATIONS_FILE = path.join(ROOT_DIR, 'data', 'tracked-applications.json');

export function loadTrackedApplications() {
  try {
    if (fs.existsSync(TRACKED_APPLICATIONS_FILE)) {
      return JSON.parse(fs.readFileSync(TRACKED_APPLICATIONS_FILE, 'utf8') || '[]');
    }
  } catch (_) {}
  return [];
}

export function saveTrackedApplications(apps) {
  try {
    const dir = path.dirname(TRACKED_APPLICATIONS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(TRACKED_APPLICATIONS_FILE, JSON.stringify(apps, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error saving tracked applications:', err.message);
    return false;
  }
}

export async function sendAutomatedDeadlineReminders() {
  const creds = loadStoredCredentials();
  const botToken = (creds.telegramBotToken || '').trim();
  const chatId = (creds.telegramChatId || '').trim();
  const recipientEmail = (creds.notificationEmail || creds.email || '').trim();
  const webhookUrl = (creds.googleAppsScriptWebhookUrl || '').trim();

  const apps = loadTrackedApplications();
  const nowMs = Date.now();
  const urgentApps = [];

  for (const app of apps) {
    if (!app.deadline) continue;
    const deadlineMs = new Date(app.deadline).getTime();
    if (isNaN(deadlineMs)) continue;

    const diffDays = Math.ceil((deadlineMs - nowMs) / (1000 * 60 * 60 * 24));
    if (diffDays >= 0 && diffDays <= 7) {
      urgentApps.push({ ...app, diffDays });
    }
  }

  if (urgentApps.length === 0) return { success: true, count: 0, message: 'No upcoming deadlines within 7 days' };

  let msg = `🚨 *URGENT APPLICATION DEADLINE REMINDER*\n\nYou have *${urgentApps.length} tracked vacancies* with closing dates in 7 days or less:\n\n`;
  urgentApps.forEach((u, i) => {
    msg += `*${i + 1}. ${u.vacancyTitle || u.title}*\n`;
    msg += `🏢 ${u.organisation}\n`;
    msg += `⏳ *Deadline: ${u.deadline}* (${u.diffDays === 0 ? 'CLOSES TODAY!' : `${u.diffDays} day${u.diffDays === 1 ? '' : 's'} left`})\n`;
    msg += `📋 Stage: ${u.status || 'PREPARING'}\n`;
    if (u.sourceUrl) msg += `🔗 [Official Apply Link](${u.sourceUrl})\n`;
    msg += `\n`;
  });
  msg += `👉 Open your tracker to submit: http://localhost:3001`;

  let telegramSentCount = 0;
  if (botToken && chatId) {
    const rawChatIds = chatId.split(/[,\s;]+/).map(s => s.trim()).filter(Boolean);
    for (const targetId of rawChatIds) {
      try {
        const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: targetId,
            text: msg,
            parse_mode: 'Markdown',
            disable_web_page_preview: true
          }),
          signal: AbortSignal.timeout(12000)
        });
        const data = await res.json();
        if (data.ok) telegramSentCount++;
        console.log(`[DEADLINE REMINDER] Dispatched alert for ${urgentApps.length} vacancies to Telegram chat ${targetId}`);
      } catch (e) {
        console.warn(`[DEADLINE REMINDER] Failed to send Telegram alert:`, e.message);
      }
    }
  }

  let emailDispatched = false;
  if (webhookUrl && recipientEmail && recipientEmail.includes('@')) {
    try {
      const emailRes = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'TEST_EMAIL',
          recipient: recipientEmail,
          email: recipientEmail,
          notes: `Automated Deadline Reminder for ${urgentApps.length} tracked vacancies closing within 7 days.`
        }),
        signal: AbortSignal.timeout(15000)
      });
      const emailData = await emailRes.json().catch(() => null);
      if (emailData && emailData.status === 'SUCCESS') {
        emailDispatched = true;
        console.log(`[DEADLINE REMINDER] Dispatched email digest to ${recipientEmail} via Google Apps Script`);
      }
    } catch (e) {
      console.warn(`[DEADLINE REMINDER] Failed to send email alert via webhook:`, e.message);
    }
  }

  return {
    success: telegramSentCount > 0 || emailDispatched,
    count: urgentApps.length,
    telegramSentTo: telegramSentCount,
    emailDispatched,
    recipientEmail: recipientEmail || 'NOT_CONFIGURED',
    urgentVacancies: urgentApps.map(u => ({ id: u.id, title: u.vacancyTitle || u.title, deadline: u.deadline, diffDays: u.diffDays }))
  };
}

export async function extractTextFromPdfBuffer(buffer) {
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  const text = typeof result === 'string' ? result : (result.text || '');
  await parser.destroy();
  return {
    text,
    numPages: result.pages?.length || 1
  };
}

export function getPdfCache(sha256) {
  try {
    const file = path.join(PDF_CACHE_DIR, `${sha256}.json`);
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    }
  } catch (_) {}
  return null;
}

export function savePdfCache(sha256, data) {
  try {
    if (!fs.existsSync(PDF_CACHE_DIR)) fs.mkdirSync(PDF_CACHE_DIR, { recursive: true });
    const file = path.join(PDF_CACHE_DIR, `${sha256}.json`);
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to save PDF cache:', e.message);
  }
}

// Verified High-Capacity Public SearXNG Mirror Pool (Auto-Failover)
export const PUBLIC_SEARXNG_MIRRORS = [
  'https://www.isci.si',
  'https://etsi.me',
  'https://searx.perennialte.ch',
  'https://search.lumy.live',
  'https://searx.dresden.network',
  'https://searxng.online',
  'https://searx.party',
  'https://search.im-in.space',
  'https://baresearch.org',
  'https://search.ononoki.org',
  'https://priv.au',
  'https://searx.tiekoetter.com',
  'https://search.unredacted.org',
  'https://searx.si',
  'https://searx.be',
  'https://search.einfachzocken.eu',
  'https://searx.ro',
  'https://search.chocolatemoo53.com',
  'https://searxng.canine.tools',
  'https://search.rowie.at',
  'https://searxng.site',
  'https://search.rhscz.eu',
  'https://searxng.cups.moe',
  'https://privatus.online',
  'https://search.sapti.me',
  'https://search.privacy.kr',
  'https://northboot.xyz',
  'https://search.gcomm.ch',
  'https://searx.prvt.site',
  'https://searx.webheberg.info'
];
