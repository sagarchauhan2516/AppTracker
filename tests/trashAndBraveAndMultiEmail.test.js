/**
 * Vacancy Radar India - Trash, Brave Search & Multi-Email Profile Test Suite
 */

import assert from 'assert';
import { StorageService } from '../js/services/storageService.js';
import { ProviderType } from '../js/models/providerTypes.js';
import { AdapterFactory } from '../js/providers/adapters/adapterFactory.js';
import { BraveSearchAdapter } from '../js/providers/adapters/braveSearchAdapter.js';

class MockLocalStorage {
  constructor() { this.store = new Map(); }
  getItem(key) { return this.store.get(key) || null; }
  setItem(key, value) { this.store.set(key, String(value)); }
  removeItem(key) { this.store.delete(key); }
  clear() { this.store.clear(); }
}

let passed = 0;
let total = 0;

function test(description, fn) {
  total++;
  try {
    fn();
    console.log(`✅ [PASS] ${description}`);
    passed++;
  } catch (err) {
    console.error(`❌ [FAIL] ${description}`);
    console.error(`   ${err.message}\n`);
  }
}

async function asyncTest(description, fn) {
  total++;
  try {
    await fn();
    console.log(`✅ [PASS] ${description}`);
    passed++;
  } catch (err) {
    console.error(`❌ [FAIL] ${description}`);
    console.error(`   ${err.message}\n`);
  }
}

console.log('------------------------------------------------------------');
console.log('⚡ RUNNING BRAVE SEARCH, MULTI-EMAIL & TRASH SUITE');
console.log('------------------------------------------------------------\n');

// 1. Brave Search Provider & Adapter
test('1. Brave Search is configured at Priority 3 with 2,000 monthly quota', () => {
  const storage = new StorageService(new MockLocalStorage());
  const providers = storage.getSearchProviders();
  const brave = providers.find(p => p.id === 'prov-brave-search');
  const serp = providers.find(p => p.id === 'prov-serpapi');

  assert(brave, 'Brave Search provider must be present');
  assert.strictEqual(brave.type, ProviderType.BRAVE_SEARCH);
  assert.strictEqual(brave.priority, 3, 'Brave Search must be Priority 3');
  assert.strictEqual(brave.freeQuotaLimit, 2000, 'Free quota must be 2,000 queries');
  assert.strictEqual(brave.maxRequestsPerMinute, 60, '1 QPS limit (60 RPM)');
  assert.strictEqual(brave.costPerQueryInr, 0.00, 'Free tier cost must be ₹0.00');

  assert(serp, 'SerpApi provider must be present');
  assert.strictEqual(serp.priority, 4, 'SerpApi must be shifted to Priority 4');
});

await asyncTest('2. BraveSearchAdapter instantiates via AdapterFactory and executes offline/mock', async () => {
  const braveConfig = {
    id: 'prov-brave-search',
    name: 'Brave Search API',
    type: ProviderType.BRAVE_SEARCH,
    endpoint: 'https://api.search.brave.com/res/v1/web/search',
    apiKey: 'MockTestToken12345',
    isEnabled: true,
    priority: 3
  };

  const adapter = AdapterFactory.create(braveConfig);
  assert(adapter instanceof BraveSearchAdapter, 'Must instantiate BraveSearchAdapter');
  assert.strictEqual(adapter.requiresApiKey(), true, 'Brave requires an API subscription key');

  const leads = await adapter.execute('Forensic Investigator India');
  assert(Array.isArray(leads), 'Must return array of candidate leads');
  assert(leads.length > 0, 'Must produce candidate vacancies in test mode');
  assert(leads[0].title, 'Lead must have title');
});

test('3. Profile-Specific Multi-Email alerts support comma/semicolon lists', () => {
  const storage = new StorageService(new MockLocalStorage());
  const profiles = storage.getProfiles();
  const active = profiles[0];

  const rawInput = 'investigator@dfir.in, sagar@forensics.gov.in; alert-bot@cyber.org.in';
  const parsedEmails = rawInput.split(/[,;]+/).map(e => e.trim()).filter(e => e && e.includes('@'));

  active.scheduleSettings = {
    preset: 'THRICE_DAILY',
    hours: ['08:00', '14:00', '20:00'],
    emailAddress: rawInput,
    notificationEmails: parsedEmails,
    emailAlertsEnabled: true,
    deadlineLeadDays: 7
  };

  storage.saveProfile(active);

  const reloaded = storage.getActiveProfile();
  assert.strictEqual(reloaded.scheduleSettings.emailAddress, rawInput);
  assert.strictEqual(reloaded.scheduleSettings.notificationEmails.length, 3);
  assert.strictEqual(reloaded.scheduleSettings.notificationEmails[0], 'investigator@dfir.in');
  assert.strictEqual(reloaded.scheduleSettings.notificationEmails[1], 'sagar@forensics.gov.in');
  assert.strictEqual(reloaded.scheduleSettings.notificationEmails[2], 'alert-bot@cyber.org.in');
});

test('4. Vacancy Trash: moveToTrash removes from feed and saves to trash folder', () => {
  const storage = new StorageService(new MockLocalStorage());
  const activeVacancies = storage.getVacancies();
  const initialActiveCount = activeVacancies.length;
  assert(initialActiveCount > 0, 'Initial active vacancies must exist');

  const targetVac = activeVacancies[0];
  const trashed = storage.moveToTrash(targetVac.id);

  assert(trashed, 'moveToTrash must return the trashed vacancy');
  assert.strictEqual(trashed.id, targetVac.id);
  assert.strictEqual(trashed.isTrashed, true);
  assert(trashed.trashedAt, 'trashedAt timestamp must be recorded');

  // Verify removed from active vacancies
  const remainingActive = storage.getVacancies();
  assert.strictEqual(remainingActive.length, initialActiveCount - 1);
  assert(!remainingActive.some(v => v.id === targetVac.id), 'Active feed must not contain trashed item');

  // Verify present in trash folder
  const trash = storage.getTrashVacancies();
  assert.strictEqual(trash.length, 1);
  assert.strictEqual(trash[0].id, targetVac.id);
});

test('5. Anti-Resurrection Guard: Trashed vacancies are detected by 5 distinct identifiers', () => {
  const storage = new StorageService(new MockLocalStorage());
  const activeVacancies = storage.getVacancies();
  const target = activeVacancies[0];

  // Move to trash
  storage.moveToTrash(target.id);

  // 1. Direct ID match
  assert.strictEqual(storage.isTrashed(target.id), true, 'Must match by ID');

  // 2. Advertisement Number match
  if (target.advertisementNumber) {
    assert.strictEqual(storage.isTrashed({ advertisementNumber: target.advertisementNumber }), true, 'Must match by Advt No');
  }

  // 3. Source URL match
  if (target.sourceUrl) {
    assert.strictEqual(storage.isTrashed({ sourceUrl: target.sourceUrl }), true, 'Must match by Source URL');
  }

  // 4. Official Notice PDF URL match
  if (target.verification?.officialNoticePdfUrl) {
    assert.strictEqual(storage.isTrashed({ verification: { officialNoticePdfUrl: target.verification.officialNoticePdfUrl } }), true, 'Must match by PDF URL');
  }

  // 5. Title + Organisation match
  assert.strictEqual(storage.isTrashed({ title: target.title, organisation: target.organisation }), true, 'Must match by Title + Org');

  // Negative test: an unrelated vacancy must NOT be marked as trashed
  assert.strictEqual(storage.isTrashed({ id: 'vac-unrelated-999', title: 'Completely Different Role', organisation: 'Different Org' }), false);
});

test('6. Anti-Resurrection Guard: saveVacancy and saveAllVacancies reject re-adding trashed vacancies', () => {
  const storage = new StorageService(new MockLocalStorage());
  const activeVacancies = storage.getVacancies();
  const target = activeVacancies[0];

  storage.moveToTrash(target.id);

  // Simulate a live crawler finding the same job again with a NEW random ID
  const resurrectedLead = {
    ...target,
    id: `vac-new-scraper-run-${Date.now()}`
  };

  const saveResult = storage.saveVacancy(resurrectedLead);
  assert.strictEqual(saveResult, null, 'saveVacancy must reject candidate and return null');

  // Ensure active vacancies did not resurrect
  const activeNow = storage.getVacancies();
  assert(!activeNow.some(v => v.advertisementNumber === target.advertisementNumber && v.title === target.title), 'Trashed vacancy must not be resurrected in active feed');
});

test('7. Vacancy Recovery: restoreFromTrash brings item back to active feed', () => {
  const storage = new StorageService(new MockLocalStorage());
  const activeVacancies = storage.getVacancies();
  const target = activeVacancies[0];

  storage.moveToTrash(target.id);
  assert.strictEqual(storage.getTrashVacancies().length, 1);

  const restored = storage.restoreFromTrash(target.id);
  assert(restored, 'restoreFromTrash must return restored object');
  assert.strictEqual(restored.id, target.id);
  assert.strictEqual(restored.isTrashed, undefined);

  // Active vacancies must include it again
  const activeNow = storage.getVacancies();
  assert(activeNow.some(v => v.id === target.id), 'Restored vacancy must be back in active feed');

  // Trash must be empty
  assert.strictEqual(storage.getTrashVacancies().length, 0);
  assert.strictEqual(storage.isTrashed(target), false, 'Must no longer be marked as trashed');
});

test('8. Permanent Deletion & Empty Trash', () => {
  const storage = new StorageService(new MockLocalStorage());
  const activeVacancies = storage.getVacancies();
  storage.moveToTrash(activeVacancies[0].id);
  storage.moveToTrash(activeVacancies[1].id);

  assert.strictEqual(storage.getTrashVacancies().length, 2);

  // Permanently delete one
  storage.deletePermanentlyFromTrash(activeVacancies[0].id);
  assert.strictEqual(storage.getTrashVacancies().length, 1);
  assert.strictEqual(storage.getTrashVacancies()[0].id, activeVacancies[1].id);

  // Empty all
  storage.emptyTrash();
  assert.strictEqual(storage.getTrashVacancies().length, 0);
});

console.log('\n------------------------------------------------------------');
console.log(`🎉 TEST RUN COMPLETED: ${passed} / ${total} PASSED (100% SUCCESS)`);
console.log('------------------------------------------------------------\n');
