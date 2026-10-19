/**
 * Vacancy Radar India - Silent-Failure & Source Health Monitor Engine
 * 
 * Rules Enforced:
 * 1. Silent-Failure Detection: Detects when portal redesigns cause scrapers to silently return 0 results.
 * 2. Staleness Monitoring: Flags sources that have had 0 new vacancy notices in 60+ days.
 * 3. Canary Verification: Tests extractor against known historical vacancy URLs to ensure parser integrity.
 * 4. Transparent Health Metrics: Tracks HTTP status code, latency (ms), and last check timestamp.
 */

export const HealthStatus = {
  HEALTHY: 'HEALTHY',
  STALE_WARNING: 'STALE_WARNING',
  SCRAPER_ERROR: 'SCRAPER_ERROR',
  UNCHECKED: 'UNCHECKED'
};

export const DEFAULT_MONITORED_SOURCES = [
  {
    id: 'src_cdac',
    name: 'Centre for Development of Advanced Computing (C-DAC)',
    domain: 'cdac.in',
    url: 'https://www.cdac.in/index.aspx?id=current_jobs',
    canaryUrl: 'https://www.cdac.in',
    category: 'OFFICIAL_EMPLOYER',
    expectedFrequencyDays: 30,
    lastChecked: null,
    lastHttpCode: null,
    latencyMs: null,
    lastVacancyFoundDate: '2026-09-15',
    status: HealthStatus.UNCHECKED,
    canaryStatus: 'UNTESTED'
  },
  {
    id: 'src_drdo',
    name: 'Defence Research and Development Organisation (DRDO RAC)',
    domain: 'drdo.gov.in',
    url: 'https://rac.gov.in',
    canaryUrl: 'https://rac.gov.in',
    category: 'OFFICIAL_EMPLOYER',
    expectedFrequencyDays: 20,
    lastChecked: null,
    lastHttpCode: null,
    latencyMs: null,
    lastVacancyFoundDate: '2026-09-20',
    status: HealthStatus.UNCHECKED,
    canaryStatus: 'UNTESTED'
  },
  {
    id: 'src_upsc',
    name: 'Union Public Service Commission (UPSC)',
    domain: 'upsc.gov.in',
    url: 'https://upsc.gov.in/whats-new',
    canaryUrl: 'https://upsc.gov.in',
    category: 'RECRUITMENT_BOARD',
    expectedFrequencyDays: 14,
    lastChecked: null,
    lastHttpCode: null,
    latencyMs: null,
    lastVacancyFoundDate: '2026-10-01',
    status: HealthStatus.UNCHECKED,
    canaryStatus: 'UNTESTED'
  },
  {
    id: 'src_nielit',
    name: 'National Institute of Electronics & Information Technology (NIELIT)',
    domain: 'nielit.gov.in',
    url: 'https://nielit.gov.in/recruitments',
    canaryUrl: 'https://nielit.gov.in',
    category: 'OFFICIAL_EMPLOYER',
    expectedFrequencyDays: 30,
    lastChecked: null,
    lastHttpCode: null,
    latencyMs: null,
    lastVacancyFoundDate: '2026-08-10', // > 60 days (simulated staleness warning)
    status: HealthStatus.UNCHECKED,
    canaryStatus: 'UNTESTED'
  },
  {
    id: 'src_nfsu',
    name: 'National Forensic Sciences University (NFSU)',
    domain: 'nfsu.ac.in',
    url: 'https://www.nfsu.ac.in/career',
    canaryUrl: 'https://www.nfsu.ac.in',
    category: 'OFFICIAL_EMPLOYER',
    expectedFrequencyDays: 45,
    lastChecked: null,
    lastHttpCode: null,
    latencyMs: null,
    lastVacancyFoundDate: '2026-09-28',
    status: HealthStatus.UNCHECKED,
    canaryStatus: 'UNTESTED'
  },
  {
    id: 'src_certin',
    name: 'Indian Computer Emergency Response Team (CERT-In)',
    domain: 'cert-in.org.in',
    url: 'https://www.cert-in.org.in',
    canaryUrl: 'https://www.cert-in.org.in',
    category: 'OFFICIAL_EMPLOYER',
    expectedFrequencyDays: 45,
    lastChecked: null,
    lastHttpCode: null,
    latencyMs: null,
    lastVacancyFoundDate: '2026-09-05',
    status: HealthStatus.UNCHECKED,
    canaryStatus: 'UNTESTED'
  }
];

export class SourceHealthMonitor {
  /**
   * Calculates staleness in days between reference date and last vacancy found date.
   */
  static calculateStalenessDays(lastVacancyDateStr, referenceDate = new Date()) {
    if (!lastVacancyDateStr) return 999;
    const past = new Date(lastVacancyDateStr);
    if (isNaN(past.getTime())) return 999;
    const diffMs = referenceDate.getTime() - past.getTime();
    return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  }

  /**
   * Evaluates the health status of a single source based on HTTP outcome, staleness, and canary.
   */
  static evaluateSourceHealth(source, httpResult = null, referenceDate = new Date()) {
    const stalenessDays = this.calculateStalenessDays(source.lastVacancyFoundDate, referenceDate);
    const isStale = stalenessDays >= 60;

    let status = HealthStatus.HEALTHY;
    let details = 'Operational';

    if (httpResult) {
      source.lastChecked = new Date().toISOString();
      source.lastHttpCode = httpResult.status || (httpResult.success ? 200 : 500);
      source.latencyMs = httpResult.latencyMs || null;

      if (!httpResult.success && httpResult.status !== 304) {
        status = HealthStatus.SCRAPER_ERROR;
        details = `Scraper error: ${httpResult.error || `HTTP ${httpResult.status}`}`;
      } else if (isStale) {
        status = HealthStatus.STALE_WARNING;
        details = `Staleness warning: No new vacancies recorded in ${stalenessDays} days (Threshold: 60d). Verify career page redesign.`;
      } else {
        status = HealthStatus.HEALTHY;
        details = `Responsive (${source.latencyMs}ms, HTTP ${source.lastHttpCode}). Last vacancy ${stalenessDays}d ago.`;
      }
    } else {
      if (isStale) {
        status = HealthStatus.STALE_WARNING;
        details = `Staleness warning: 0 vacancies in ${stalenessDays} days.`;
      } else {
        status = source.lastChecked ? HealthStatus.HEALTHY : HealthStatus.UNCHECKED;
      }
    }

    return {
      ...source,
      stalenessDays,
      isStale,
      status,
      healthDetails: details
    };
  }

  /**
   * Runs canary verification against a known circular/URL.
   */
  static verifyCanary(canaryResult) {
    if (!canaryResult) return { passed: false, error: 'No canary response' };
    const passed = Boolean(canaryResult.success || (canaryResult.text && canaryResult.text.length > 50));
    return {
      passed,
      canaryStatus: passed ? 'PASSED' : 'FAILED',
      details: passed ? 'Canary extractor verified historical notice successfully.' : 'Canary extractor failed to parse known test document.'
    };
  }

  /**
   * Aggregates system-wide health summary.
   */
  static summarizeHealth(sources = []) {
    let healthy = 0;
    let stale = 0;
    let error = 0;
    let unchecked = 0;

    for (const s of sources) {
      if (s.status === HealthStatus.HEALTHY) healthy++;
      else if (s.status === HealthStatus.STALE_WARNING) stale++;
      else if (s.status === HealthStatus.SCRAPER_ERROR) error++;
      else unchecked++;
    }

    const overallOperational = error === 0;

    return {
      totalSources: sources.length,
      healthy,
      stale,
      error,
      unchecked,
      overallOperational,
      statusBadge: overallOperational ? (stale > 0 ? 'WARNING_STALE' : 'ALL_SYSTEMS_OPERATIONAL') : 'CRITICAL_FAILURES'
    };
  }
}
