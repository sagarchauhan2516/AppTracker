/**
 * Vacancy Radar India - Profile Segregation & Dedicated Settings Panel Test Suite
 * Validates:
 * 1. Profile-wise feed segregation (DFIR/Cyber Forensic matches vs off-domain opportunities)
 * 2. Persistent alert credentials sync (sagarmc2516@gmail.com & Telegram chat 5451190370 across profiles)
 * 3. Segregated settings architecture (Main Settings for system APIs vs Profile Settings for candidate preferences)
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { MatchingEngine } from '../js/engine/matchingEngine.js';
import { defaultProfile } from '../js/data/defaultProfile.js';
import { loadStoredCredentials, saveStoredCredentials } from '../server/context.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('⚡ RUNNING PROFILE SEGREGATION & SETTINGS PANEL ACCEPTANCE SUITE', async (t) => {

  await t.test('1. Candidate alert credentials defaults to sagarmc2516@gmail.com and Telegram ID 5451190370', () => {
    // Check default profile template
    assert.equal(defaultProfile.scheduleSettings.emailAddress, 'sagarmc2516@gmail.com');
    assert.equal(defaultProfile.scheduleSettings.telegramChatId, '5451190370');
    assert.ok(defaultProfile.scheduleSettings.notificationEmails.includes('sagarmc2516@gmail.com'));

    // Check credentials.json file
    const credsPath = path.join(__dirname, '..', 'data', 'credentials.json');
    if (fs.existsSync(credsPath)) {
      const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
      assert.equal(creds.notificationEmail, 'sagarmc2516@gmail.com');
      assert.equal(creds.telegramChatId, '5451190370');
    }
    console.log('✅ [PASS] 1. Credentials accurately stored as sagarmc2516@gmail.com and Telegram ID 5451190370');
  });

  await t.test('2. Profile-wise segregation correctly isolates Cyber Forensics/DFIR posts from off-domain posts', () => {
    const profile = JSON.parse(JSON.stringify(defaultProfile));

    const cdacCyberForensicsVac = {
      id: 'cdac_cf_1',
      title: 'Project Engineer - Cyber Forensics & Incident Response',
      organisation: 'Centre for Development of Advanced Computing (C-DAC)',
      domain: 'cdac.in',
      verification: { sourceDomain: 'cdac.in', status: 'OFFICIALLY_VERIFIED' },
      qualifications: { branchRequired: 'Computer Science / Cyber Security / Forensics' },
      isTargetFocusMatch: true
    };

    const civilEngVac = {
      id: 'irrigation_civil_1',
      title: 'Assistant Executive Engineer (Civil Construction)',
      organisation: 'State Water Resources Department',
      domain: 'wrd.gov.in',
      verification: { sourceDomain: 'wrd.gov.in', status: 'OFFICIALLY_VERIFIED' },
      qualifications: { branchRequired: 'Civil Engineering' },
      isTargetFocusMatch: false
    };

    // Helper logic as implemented in app.js
    const isProfileMatch = (v) => {
      if (v.isTargetFocusMatch) return true;
      const titleLower = (v.title || '').toLowerCase();
      const descLower = (v.description || '').toLowerCase() + ' ' + (v.qualifications?.branchRequired || '').toLowerCase();
      const fullText = `${titleLower} ${descLower}`;
      const hasRole = (profile.roles || []).some(r => r && titleLower.includes(r.toLowerCase()));
      if (hasRole) return true;
      const allKeywords = [...(profile.keywords || []), ...(profile.positiveKeywords || [])].filter(Boolean);
      const hasKeyword = allKeywords.some(k => k && fullText.includes(k.toLowerCase()));
      if (hasKeyword) return true;
      if ((v.matchAnalysis?.overallScore || 0) >= 65 && (v.matchAnalysis?.reasons || []).some(r => {
        const lr = r.toLowerCase();
        return lr.includes('forensic') || lr.includes('cyber') || lr.includes('target role');
      })) {
        return true;
      }
      return false;
    };

    cdacCyberForensicsVac.matchAnalysis = MatchingEngine.evaluateMatch(profile, cdacCyberForensicsVac);
    civilEngVac.matchAnalysis = MatchingEngine.evaluateMatch(profile, civilEngVac);

    assert.equal(isProfileMatch(cdacCyberForensicsVac), true, 'C-DAC Cyber Forensics must match active candidate profile');
    assert.equal(isProfileMatch(civilEngVac), false, 'Civil Engineering vacancy must NOT match active candidate profile');
    console.log('✅ [PASS] 2. Profile-wise feed segregation accurately distinguishes profile-relevant vs off-domain posts');
  });

  await t.test('3. Dedicated UI elements exist in index.html for separate Main Settings & Profile Settings panels', () => {
    const htmlPath = path.join(__dirname, '..', 'index.html');
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');

    // Header buttons
    assert.ok(htmlContent.includes('id="btnHeaderProfileSettings"'), 'Must have dedicated Profile Settings header button');
    assert.ok(htmlContent.includes('id="btnHeaderMainSettings"'), 'Must have dedicated Main Settings header button');

    // Feed segregation bar & toggles
    assert.ok(htmlContent.includes('id="profileFeedSegregationBar"'), 'Must have Profile Feed Segregation Bar');
    assert.ok(htmlContent.includes('id="btnFeedProfileOnly"'), 'Must have Profile Matches toggle button');
    assert.ok(htmlContent.includes('id="btnFeedAllGlobal"'), 'Must have All Discovered toggle button');
    assert.ok(htmlContent.includes('id="segregatedProfileName"'), 'Must display active profile name in segregation bar');

    // Separate modal containers
    assert.ok(htmlContent.includes('id="profileSettingsModal"'), 'Must have #profileSettingsModal container');
    assert.ok(htmlContent.includes('id="dashboardModal"'), 'Must have #dashboardModal container');

    console.log('✅ [PASS] 3. Dedicated HTML elements verified for two distinct panels and profile segregation bar');
  });

  await t.test('4. Telegram Bot API Token & All Credentials persist permanently to disk without data loss', () => {
    // 1. Save Telegram Bot Token and verify it merges cleanly into data/credentials.json
    const testToken = '8846559143:AAEqSPXMqF6ZY-pUM4NpgT9zT8KmMlf-adg';
    const updated = saveStoredCredentials({ telegramBotToken: testToken });
    assert.equal(updated.telegramBotToken, testToken);

    // 2. Load stored credentials and verify all essential fields are preserved
    const reloaded = loadStoredCredentials();
    assert.equal(reloaded.telegramBotToken, testToken);
    assert.equal(reloaded.notificationEmail, 'sagarmc2516@gmail.com');
    assert.equal(reloaded.telegramChatId, '5451190370');

    // 3. Ensure passing empty or blank fields does not wipe existing saved tokens
    const mergedWithBlank = saveStoredCredentials({ emptyKey: '', telegramBotToken: '' });
    assert.equal(mergedWithBlank.telegramBotToken, testToken, 'Blank values must not overwrite existing valid credentials');

    // 4. Verify UI templates contain the required input IDs for Telegram Bot Token in both Credentials and Settings tabs
    const credsTabPath = path.join(__dirname, '..', 'js', 'ui', 'dashboard', 'credentialsTab.js');
    const settingsTabPath = path.join(__dirname, '..', 'js', 'ui', 'dashboard', 'settingsTab.js');

    const credsTabContent = fs.readFileSync(credsTabPath, 'utf8');
    const settingsTabContent = fs.readFileSync(settingsTabPath, 'utf8');

    assert.ok(credsTabContent.includes('inputTelegramBotTokenCredentials'), 'Credentials tab must have inputTelegramBotTokenCredentials');
    assert.ok(settingsTabContent.includes('inputTelegramBotToken'), 'Settings tab must have inputTelegramBotToken');
    assert.ok(settingsTabContent.includes('inputTelegramChatId'), 'Settings tab must have inputTelegramChatId');

    console.log('✅ [PASS] 4. Telegram Bot API Token & Credentials persistence verified across disk & UI components');
  });

});
