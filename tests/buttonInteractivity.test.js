/**
 * Vacancy Radar India - Button Interactivity & Modal Triggers Test Suite
 * Validates that all primary header buttons, modals, tabs, and theme toggles
 * initialize immediately and respond properly to user click events.
 */

import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';

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
  querySelector() { return null; }
  querySelectorAll() { return []; }
  appendChild(child) { this.children.push(child); return child; }
  get innerHTML() { return this._innerHTML; }
  set innerHTML(val) { this._innerHTML = val; }
}

test('Button Interactivity: Header buttons, modals, and controllers bind and activate on click', async () => {
  const elements = new Map();
  function getOrCreate(id) {
    if (!elements.has(id)) {
      elements.set(id, new MockElement('div', id));
    }
    return elements.get(id);
  }

  // Populate all element IDs from index.html
  const html = fs.readFileSync('index.html', 'utf8');
  const idMatches = html.matchAll(/id=["']([a-zA-Z0-9_-]+)["']/g);
  for (const m of idMatches) {
    getOrCreate(m[1]);
  }

  global.window = global;
  global.window.addEventListener = (event, fn) => {};
  global.document = {
    readyState: 'complete',
    documentElement: getOrCreate('html'),
    body: getOrCreate('body'),
    getElementById(id) { return elements.get(id) || null; },
    createElement(tag) { return new MockElement(tag); },
    addEventListener() {},
    querySelector() { return null; },
    querySelectorAll() { return []; }
  };
  global.localStorage = {
    _store: new Map(),
    getItem(k) { return this._store.get(k) || null; },
    setItem(k, v) { this._store.set(k, String(v)); },
    removeItem(k) { this._store.delete(k); }
  };
  global.fetch = async () => ({ ok: true, json: async () => ({ success: true }) });
  global.lucide = { createIcons: () => {} };

  // Import app.js
  await import('../js/app.js');

  const app = global.window.app;
  assert(app, 'app instance should be attached to window');

  // 1. Test Main Settings Button & Modal
  const btnSettings = document.getElementById('btnHeaderMainSettings');
  const modalSettings = document.getElementById('dashboardModal');
  const btnCloseSettings = document.getElementById('dashboardModalCloseBtn');

  assert(btnSettings, 'btnHeaderMainSettings must exist in DOM');
  assert(modalSettings, 'dashboardModal must exist in DOM');
  assert(!modalSettings.classList.contains('active'), 'Settings modal should start closed');

  btnSettings.click();
  assert(modalSettings.classList.contains('active'), 'Clicking btnHeaderMainSettings must add .active to dashboardModal');

  btnCloseSettings.click();
  assert(!modalSettings.classList.contains('active'), 'Clicking close button must remove .active from dashboardModal');

  // 2. Test Profile Settings Button & Modal
  const btnProfile = document.getElementById('btnHeaderProfileSettings');
  const modalProfile = document.getElementById('profileSettingsModal');
  const btnCloseProfile = document.getElementById('profileSettingsModalCloseBtn');

  assert(btnProfile, 'btnHeaderProfileSettings must exist in DOM');
  assert(modalProfile, 'profileSettingsModal must exist in DOM');
  assert(!modalProfile.classList.contains('active'), 'Profile modal should start closed');

  btnProfile.click();
  assert(modalProfile.classList.contains('active'), 'Clicking btnHeaderProfileSettings must add .active to profileSettingsModal');

  btnCloseProfile.click();
  assert(!modalProfile.classList.contains('active'), 'Clicking close button must remove .active from profileSettingsModal');

  // 3. Test Theme Toggle Button
  const btnTheme = document.getElementById('btnThemeToggle');
  assert(btnTheme, 'btnThemeToggle must exist in DOM');

  const initialTheme = document.documentElement.getAttribute('data-theme') || 'dark';
  btnTheme.click();
  const toggledTheme = document.documentElement.getAttribute('data-theme');
  assert.notStrictEqual(initialTheme, toggledTheme, 'Theme should toggle on click');

  btnTheme.click();
  const revertedTheme = document.documentElement.getAttribute('data-theme');
  assert.strictEqual(initialTheme, revertedTheme, 'Theme should toggle back on second click');
});
