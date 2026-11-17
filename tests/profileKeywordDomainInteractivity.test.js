/**
 * Vacancy Radar India - Profile Keyword & Website Interactive UI Unit Tests
 * Tests live DOM events in ProfileSettingsUI for adding, quick-adding,
 * and removing technical keywords and target websites, ensuring real-time
 * persistence to StorageService.
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { storageService } from '../js/services/storageService.js';
import { ProfileSettingsUI } from '../js/ui/profileSettingsUI.js';

class MockStorage {
  constructor() { this.store = new Map(); }
  getItem(k) { return this.store.get(k) || null; }
  setItem(k, v) { this.store.set(k, String(v)); }
  removeItem(k) { this.store.delete(k); }
  clear() { this.store.clear(); }
}

class MockElement {
  constructor(tag, id = '') {
    this.tagName = (tag || 'DIV').toUpperCase();
    this.id = id;
    this.classList = {
      _classes: new Set(),
      add(c) { this._classes.add(c); },
      remove(c) { this._classes.delete(c); },
      contains(c) { return this._classes.has(c); },
      toggle(c) { if (this.contains(c)) this.remove(c); else this.add(c); }
    };
    this.style = {};
    this.attributes = new Map();
    this.listeners = new Map();
    this.children = [];
    this._innerHTML = '';
    this.value = '';
    this.checked = false;
  }
  setAttribute(k, v) { this.attributes.set(k, String(v)); }
  getAttribute(k) { return this.attributes.get(k) || null; }
  addEventListener(event, fn) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event).push(fn);
  }
  click() {
    const fns = this.listeners.get('click') || [];
    for (const fn of fns) fn({ target: this, preventDefault() {} });
  }
  querySelector(sel) {
    if (sel.startsWith('#')) {
      const targetId = sel.slice(1);
      if (this.id === targetId) return this;
      for (const c of this.children) {
        const found = c.querySelector(sel);
        if (found) return found;
      }
    }
    return null;
  }
  querySelectorAll(sel) {
    const res = [];
    if (sel.startsWith('.')) {
      const cls = sel.slice(1);
      if (this.classList.contains(cls)) res.push(this);
      for (const c of this.children) {
        res.push(...c.querySelectorAll(sel));
      }
    }
    return res;
  }
  appendChild(child) { this.children.push(child); return child; }
  get innerHTML() { return this._innerHTML; }
  set innerHTML(val) {
    this._innerHTML = val;
    // Parse element IDs and classes minimally for DOM lookups
    this.children = [];
    const idRegex = /<([a-z0-9]+)[^>]*id=["']([^"']+)["'][^>]*>/gi;
    let m;
    while ((m = idRegex.exec(val)) !== null) {
      const el = new MockElement(m[1], m[2]);
      const classMatch = m[0].match(/class=["']([^"']+)["']/i);
      if (classMatch) {
        classMatch[1].split(/\s+/).forEach(c => el.classList.add(c));
      }
      const dataKw = m[0].match(/data-kw=["']([^"']+)["']/i);
      if (dataKw) el.setAttribute('data-kw', dataKw[1]);
      const dataDom = m[0].match(/data-domain=["']([^"']+)["']/i);
      if (dataDom) el.setAttribute('data-domain', dataDom[1]);
      this.children.push(el);
      global.mockRegistry.set(m[2], el);
    }

    // Also parse elements with classes but no ID (e.g. .btn-remove-kw, .btn-remove-site)
    const classRegex = /<([a-z0-9]+)[^>]*class=["']([^"']+)["'][^>]*>/gi;
    while ((m = classRegex.exec(val)) !== null) {
      const el = new MockElement(m[1]);
      m[2].split(/\s+/).forEach(c => el.classList.add(c));
      const dataKw = m[0].match(/data-kw=["']([^"']+)["']/i);
      if (dataKw) el.setAttribute('data-kw', dataKw[1]);
      const dataDom = m[0].match(/data-domain=["']([^"']+)["']/i);
      if (dataDom) el.setAttribute('data-domain', dataDom[1]);
      this.children.push(el);
    }
  }
}

test('ProfileSettingsUI: Interactive add and remove of keywords and websites', async () => {
  global.mockRegistry = new Map();
  const storage = storageService;

  const container = new MockElement('div', 'modalProfileSettingsBody');
  global.mockRegistry.set('modalProfileSettingsBody', container);

  global.window = global;
  global.document = {
    readyState: 'complete',
    getElementById(id) { return global.mockRegistry.get(id) || null; },
    createElement(tag) { return new MockElement(tag); }
  };
  global.lucide = { createIcons: () => {} };

  // Setup initial active profile
  const initialProfile = storage.getActiveProfile();
  initialProfile.keywords = ['Forensics', 'EnCase'];
  initialProfile.negativeKeywords = ['Sales'];
  initialProfile.targetFocus = {
    enabled: true,
    mode: 'PRIORITY_BOOST',
    targetDomains: ['cdac.in'],
    websites: ['cdac.in']
  };
  storage.saveProfile(initialProfile);

  let stateChangedCalls = 0;
  const ui = new ProfileSettingsUI('modalProfileSettingsBody', () => {
    stateChangedCalls++;
  });

  // Switch to keywords tab and render
  ui.activeTab = 'keywords';
  ui.render();

  // 1. Add Positive Keyword
  const inputKw = global.mockRegistry.get('inputAddPositiveKw');
  const btnAddKw = global.mockRegistry.get('btnAddPositiveKw');
  assert(inputKw, 'inputAddPositiveKw must be present in DOM');
  assert(btnAddKw, 'btnAddPositiveKw must be present in DOM');

  inputKw.value = 'Memory Analysis';
  btnAddKw.click();

  let profile = storage.getActiveProfile();
  assert(profile.keywords.includes('Memory Analysis'), 'Memory Analysis must be saved in storage');
  assert.strictEqual(stateChangedCalls, 1, 'onStateChanged must be called');

  // 2. Remove Positive Keyword
  const removeKwBtn = container.querySelectorAll('.btn-remove-kw').find(b => b.getAttribute('data-kw') === 'EnCase');
  assert(removeKwBtn, 'btn-remove-kw for EnCase must exist');
  removeKwBtn.click();

  profile = storage.getActiveProfile();
  assert(!profile.keywords.includes('EnCase'), 'EnCase must be removed from storage');
  assert.strictEqual(stateChangedCalls, 2);

  // 3. Add Negative Keyword
  const inputNeg = global.mockRegistry.get('inputAddNegativeKw');
  const btnAddNeg = global.mockRegistry.get('btnAddNegativeKw');
  assert(inputNeg && btnAddNeg);

  inputNeg.value = 'Unpaid Internship';
  btnAddNeg.click();

  profile = storage.getActiveProfile();
  assert(profile.negativeKeywords.includes('Unpaid Internship'), 'Negative keyword must be saved');

  // 4. Remove Negative Keyword
  const removeNegBtn = container.querySelectorAll('.btn-remove-nkw').find(b => b.getAttribute('data-kw') === 'Sales');
  assert(removeNegBtn);
  removeNegBtn.click();

  profile = storage.getActiveProfile();
  assert(!profile.negativeKeywords.includes('Sales'), 'Sales must be removed from storage');

  // 5. Switch to Websites Tab and Add Website
  ui.activeTab = 'websites';
  ui.render();

  const inputSite = global.mockRegistry.get('inputAddWebsite');
  const btnAddSite = global.mockRegistry.get('btnAddWebsite');
  assert(inputSite && btnAddSite);

  inputSite.value = 'https://cert-in.org.in/path';
  btnAddSite.click();

  profile = storage.getActiveProfile();
  assert(profile.targetFocus.targetDomains.includes('cert-in.org.in'), 'cert-in.org.in must be saved in targetDomains');
  assert(profile.targetFocus.websites.includes('cert-in.org.in'), 'cert-in.org.in must be saved in websites');

  // 6. Remove Website
  const removeSiteBtn = container.querySelectorAll('.btn-remove-site').find(b => b.getAttribute('data-domain') === 'cdac.in');
  assert(removeSiteBtn);
  removeSiteBtn.click();

  profile = storage.getActiveProfile();
  assert(!profile.targetFocus.targetDomains.includes('cdac.in'), 'cdac.in must be removed from targetDomains');
  assert(!profile.targetFocus.websites.includes('cdac.in'), 'cdac.in must be removed from websites');

  // 7. Quick Add Website toggle
  const quickAddBtn = container.querySelectorAll('.btn-quick-add-site').find(b => b.getAttribute('data-domain') === 'drdo.gov.in');
  assert(quickAddBtn, 'Quick add button for DRDO should exist');
  quickAddBtn.click();

  profile = storage.getActiveProfile();
  assert(profile.targetFocus.targetDomains.includes('drdo.gov.in'), 'drdo.gov.in must be added to targetDomains');
  assert(profile.targetFocus.websites.includes('drdo.gov.in'), 'drdo.gov.in must be added to websites');

  // Toggle off
  quickAddBtn.click();
  profile = storage.getActiveProfile();
  assert(!profile.targetFocus.targetDomains.includes('drdo.gov.in'), 'drdo.gov.in must be removed on second click');

  // 8. Test Telegram Alert Button calls /api/test-telegram
  ui.activeTab = 'alerts';
  ui.render();

  let testTelegramEndpointCalled = false;
  let sentPayload = null;
  global.fetch = async (url, opts) => {
    if (url === '/api/test-telegram') {
      testTelegramEndpointCalled = true;
      sentPayload = JSON.parse(opts.body);
      return {
        ok: true,
        json: async () => ({
          success: true,
          pingSent: true,
          botUser: { username: 'vacancy_radar1_bot' }
        })
      };
    }
    return { ok: true, json: async () => ({}) };
  };

  const inputTg = global.mockRegistry.get('inputProfTgChat');
  const btnTestTg = global.mockRegistry.get('btnTestProfTelegram');
  assert(inputTg && btnTestTg, 'Telegram inputs must be present in DOM');

  inputTg.value = '5451190370';
  await btnTestTg.click();

  assert.strictEqual(testTelegramEndpointCalled, true, '/api/test-telegram must be called when clicking Send Test Alert');
  assert.strictEqual(sentPayload.chatId, '5451190370', 'Chat ID must be dispatched in body');
});
