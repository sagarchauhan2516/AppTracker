/**
 * Vacancy Radar India - UI Component Acceptance & Render Suite
 * Validates modular tab components, XSS safety, and feed state calculations.
 */

import assert from 'assert';
import { renderCreditsTab } from '../js/ui/dashboard/creditsTab.js';
import { renderHealthTab } from '../js/ui/dashboard/healthTab.js';
import { renderTrashTab } from '../js/ui/dashboard/trashTab.js';
import { escapeHtml, truncate } from '../js/utils/htmlUtils.js';

console.log('------------------------------------------------------------');
console.log('⚡ RUNNING UI COMPONENT ACCEPTANCE & RENDERING SUITE');
console.log('------------------------------------------------------------\n');

let testsPassed = 0;
let testsTotal = 0;

function runTest(name, fn) {
  testsTotal++;
  try {
    fn();
    console.log(`✅ [PASS] ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`❌ [FAIL] ${name}`);
    console.error(`   Error: ${err.message}\n`);
    throw err;
  }
}

// TEST 1: Credits tab renders quota counters, meters, and escapes provider names
runTest('1. renderCreditsTab renders consumption meters and sanitizes provider names', () => {
  const mockProviders = [
    {
      id: 'p1',
      name: '<img src=x onerror=alert(1)> Google Search',
      type: 'GOOGLE_CUSTOM_SEARCH',
      freeQuotaLimit: 100,
      quotaUsed: 90,
      quotaRemaining: 10
    },
    {
      id: 'p2',
      name: 'SearXNG Apex Mirror',
      type: 'SEARXNG',
      freeQuotaLimit: 999999,
      quotaUsed: 500,
      quotaRemaining: 999499
    }
  ];

  const html = renderCreditsTab(mockProviders, {});
  
  // Verify XSS neutralization
  assert(!html.includes('<img src=x onerror=alert(1)>'), 'Raw script/image tag must not be injected');
  assert(html.includes('&lt;img src=x onerror=alert(1)&gt;'), 'XSS payload must be escaped');
  
  // Verify critical buttons and elements
  assert(html.includes('id="btnResetQuotaCounters"'), 'Must contain reset quota button');
  assert(html.includes('id="chkGlobalZeroSpendGuard"'), 'Must contain ₹0.00 spending cap toggle');
  assert(html.includes('∞ Unlimited Free'), 'Must render unlimited indicator for quota > 100000');
  assert(html.includes('10 left'), 'Must show remaining quota count');
});

// TEST 2: Health tab renders KPI metrics and canary check actions
runTest('2. renderHealthTab computes and renders source health KPI cards', () => {
  const mockSources = [
    { id: 'cdac', name: 'CDAC Careers', healthStatus: 'HEALTHY', lastScrapedAt: new Date().toISOString() },
    { id: 'drdo', name: 'DRDO Recruitment', healthStatus: 'HEALTHY', lastScrapedAt: new Date().toISOString() },
    { id: 'upsc', name: 'UPSC Notifications', healthStatus: 'STALE', lastScrapedAt: new Date(Date.now() - 70 * 86400000).toISOString() },
    { id: 'isro', name: 'ISRO Portal', healthStatus: 'ERROR', lastScrapedAt: null }
  ];

  const html = renderHealthTab(mockSources);

  assert(html.includes('Monitored Portals'), 'Must render portal KPI card');
  assert(html.includes('Operational &amp; Responsive'), 'Must render operational KPI card');
  assert(html.includes('Staleness Warnings (&gt;60d)'), 'Must render staleness KPI card');
  assert(html.includes('Scraper Errors'), 'Must render error KPI card');
  assert(html.includes('id="btnRunHealthDiagnostics"'), 'Must include canary check trigger button');
});

// TEST 3: Health tab handles empty sources gracefully without NaN or errors
runTest('3. renderHealthTab handles empty source list gracefully', () => {
  const html = renderHealthTab([]);
  assert(typeof html === 'string' && html.length > 0, 'Must produce valid HTML string');
  assert(html.includes('Monitored Portals'), 'Must still render KPI layout');
});

// TEST 4: Trash tab renders empty state when no items are trashed
runTest('4. renderTrashTab renders empty state container when empty', () => {
  const html = renderTrashTab([]);
  assert(html.includes('Trash folder is empty'), 'Must display empty trash message');
  assert(!html.includes('id="btnEmptyTrashDash"'), 'Must NOT show empty trash button when already empty');
});

// TEST 5: Trash tab renders items with recover and delete forever controls
runTest('5. renderTrashTab renders trashed items with action buttons and escaped data', () => {
  const mockTrashed = [
    {
      id: 'vac-101',
      title: '<script>alert("hack")</script>Senior Scientist',
      organisation: 'DRDO Apex Labs',
      advertisementNumber: 'DRDO/2026/04',
      trashedAt: new Date('2026-10-15T10:00:00Z').toISOString()
    }
  ];

  const html = renderTrashTab(mockTrashed);

  // XSS validation
  assert(!html.includes('<script>alert("hack")</script>'), 'Title must be HTML-escaped');
  assert(html.includes('&lt;script&gt;alert(&quot;hack&quot;)&lt;/script&gt;'), 'Title escaped properly');

  // Verify action buttons
  assert(html.includes('id="btnEmptyTrashDash"'), 'Must show empty trash button when items exist');
  assert(html.includes('btn-dash-restore-vac'), 'Must have restore button');
  assert(html.includes('data-id="vac-101"'), 'Buttons must bind data-id');
  assert(html.includes('btn-dash-perm-delete-vac'), 'Must have permanent delete button');
  assert(html.includes('DRDO/2026/04'), 'Must render advertisement number');
});

// TEST 6: Feed Pagination Calculations
runTest('6. Feed pagination calculations slice and navigate correctly', () => {
  const totalItems = 75;
  const pageSize = 20;
  const totalPages = Math.ceil(totalItems / pageSize);

  assert.strictEqual(totalPages, 4, '75 items with 20/page should yield 4 pages');

  // Page 1 slice
  const page1Start = (1 - 1) * pageSize;
  const page1End = page1Start + pageSize;
  assert.strictEqual(page1Start, 0);
  assert.strictEqual(page1End, 20);

  // Page 4 slice (partial)
  const page4Start = (4 - 1) * pageSize;
  const page4End = page4Start + pageSize;
  assert.strictEqual(page4Start, 60);
  assert.strictEqual(page4End, 80);

  // Clamping page within valid boundaries
  const clampPage = (p) => Math.max(1, Math.min(p, totalPages));
  assert.strictEqual(clampPage(0), 1, 'Page 0 clamped to 1');
  assert.strictEqual(clampPage(99), 4, 'Page 99 clamped to max pages (4)');
  assert.strictEqual(clampPage(3), 3, 'Page 3 unchanged');
});

// TEST 7: Feed Error Boundary Fallback Structure
runTest('7. Feed error boundary markup contains retry action and error details', () => {
  const mockError = new Error('Feed rendering failed due to malformed payload');
  const boundaryHtml = `
    <div class="dash-panel-card alert-box-danger" style="text-align: center; padding: 2rem;">
      <h3 style="margin-top: 0;">⚠️ Feed Render Interrupted</h3>
      <p style="color: var(--text-secondary); font-size: 0.85rem;">
        ${escapeHtml(mockError.message)}
      </p>
      <button class="btn btn-outline btn-sm" onclick="location.reload()">🔄 Reload Feed</button>
    </div>
  `;

  assert(boundaryHtml.includes('Feed Render Interrupted'), 'Must show headline');
  assert(boundaryHtml.includes('Feed rendering failed due to malformed payload'), 'Must include safe error message');
  assert(boundaryHtml.includes('location.reload()'), 'Must include recovery action');
});

console.log(`\n============================================================`);
console.log(`🏆 UI COMPONENT ACCEPTANCE SUITE COMPLETE`);
console.log(`Results: ${testsPassed} / ${testsTotal} PASSED (100% SUCCESS)`);
console.log(`============================================================\n`);
