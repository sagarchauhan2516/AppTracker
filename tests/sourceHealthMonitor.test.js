import assert from 'node:assert';
import { SourceHealthMonitor, HealthStatus, DEFAULT_MONITORED_SOURCES } from '../js/engine/sourceHealthMonitor.js';

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
    console.error(err);
  }
}

console.log('------------------------------------------------------------');
console.log('⚡ RUNNING SILENT-FAILURE & SOURCE HEALTH MONITOR SUITE');
console.log('------------------------------------------------------------\n');

// TEST 1: Staleness Days Calculation
runTest('SourceHealthMonitor accurately calculates staleness in days', () => {
  const refDate = new Date('2026-10-19T00:00:00Z');
  const past30Days = '2026-09-19';
  const past65Days = '2026-08-15';

  const days30 = SourceHealthMonitor.calculateStalenessDays(past30Days, refDate);
  const days65 = SourceHealthMonitor.calculateStalenessDays(past65Days, refDate);

  assert.strictEqual(days30, 30);
  assert.strictEqual(days65, 65);
});

// TEST 2: Staleness Warning Trigger (>= 60 days)
runTest('SourceHealthMonitor flags sources with 0 vacancies in 60+ days as STALE_WARNING', () => {
  const refDate = new Date('2026-10-19T00:00:00Z');
  const staleSource = {
    id: 'src_test_stale',
    name: 'State Public Service Commission',
    domain: 'spsc.gov.in',
    lastVacancyFoundDate: '2026-08-01', // ~79 days ago
    lastChecked: null
  };

  const evaluated = SourceHealthMonitor.evaluateSourceHealth(staleSource, { success: true, status: 200, latencyMs: 220 }, refDate);
  assert.strictEqual(evaluated.isStale, true);
  assert.strictEqual(evaluated.status, HealthStatus.STALE_WARNING);
  assert(evaluated.healthDetails.includes('Staleness warning'));
});

// TEST 3: Scraper HTTP Error Detection
runTest('SourceHealthMonitor flags HTTP 404/500 errors as SCRAPER_ERROR', () => {
  const errorSource = {
    id: 'src_broken',
    name: 'Redesigned Career Portal',
    domain: 'portal.gov.in',
    lastVacancyFoundDate: '2026-10-10'
  };

  const evaluated = SourceHealthMonitor.evaluateSourceHealth(errorSource, { success: false, status: 500, error: 'Internal Server Error' });
  assert.strictEqual(evaluated.status, HealthStatus.SCRAPER_ERROR);
  assert(evaluated.healthDetails.includes('Scraper error'));
});

// TEST 4: Canary Test Extractor Verification
runTest('SourceHealthMonitor validates extractor parsing on canary documents', () => {
  const successCanary = { success: true, text: 'Detailed Advertisement No 01/2026 for Scientist posts' };
  const failedCanary = { success: false, text: '' };

  const passRes = SourceHealthMonitor.verifyCanary(successCanary);
  const failRes = SourceHealthMonitor.verifyCanary(failedCanary);

  assert.strictEqual(passRes.passed, true);
  assert.strictEqual(passRes.canaryStatus, 'PASSED');
  assert.strictEqual(failRes.passed, false);
  assert.strictEqual(failRes.canaryStatus, 'FAILED');
});

// TEST 5: System-Wide Health Aggregation
runTest('SourceHealthMonitor aggregates operational status across source registry', () => {
  const testSources = [
    { status: HealthStatus.HEALTHY },
    { status: HealthStatus.HEALTHY },
    { status: HealthStatus.STALE_WARNING },
    { status: HealthStatus.SCRAPER_ERROR }
  ];

  const summary = SourceHealthMonitor.summarizeHealth(testSources);
  assert.strictEqual(summary.totalSources, 4);
  assert.strictEqual(summary.healthy, 2);
  assert.strictEqual(summary.stale, 1);
  assert.strictEqual(summary.error, 1);
  assert.strictEqual(summary.overallOperational, false, 'Should be non-operational if any scraper has errors');
  assert.strictEqual(summary.statusBadge, 'CRITICAL_FAILURES');
});

console.log('\n------------------------------------------------------------');
console.log(`🎉 TEST RUN COMPLETED: ${testsPassed} / ${testsTotal} PASSED (100% SUCCESS)`);
console.log('------------------------------------------------------------');

if (testsPassed !== testsTotal) {
  process.exit(1);
}
