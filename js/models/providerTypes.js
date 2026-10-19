/**
 * Vacancy Radar India - Provider Types & Health Definitions
 * Multi-Provider Search Orchestration, Quota Tracking & Failover Models
 */

export const ProviderType = {
  PUBLIC_FEEDS_RSS: 'PUBLIC_FEEDS_RSS',
  SEARXNG: 'SEARXNG',
  BRAVE_SEARCH: 'BRAVE_SEARCH',
  GOOGLE_CUSTOM_SEARCH: 'GOOGLE_CUSTOM_SEARCH',
  BING_WEB_SEARCH: 'BING_WEB_SEARCH',
  SERPAPI: 'SERPAPI',
  CUSTOM_REST_ADAPTER: 'CUSTOM_REST_ADAPTER'
};

export const ProviderHealthStatus = {
  HEALTHY: 'HEALTHY',           // Normal operation, high reliability
  DEGRADED: 'DEGRADED',         // Higher latency or sporadic soft errors
  RATE_LIMITED: 'RATE_LIMITED', // Hit RPM/RPD limit, in short cooldown
  QUOTA_EXHAUSTED: 'QUOTA_EXHAUSTED', // Consumed all free queries for the cycle
  CIRCUIT_OPEN: 'CIRCUIT_OPEN', // Consecutive hard errors triggered circuit breaker
  AUTH_FAILED: 'AUTH_FAILED',   // 401/403 Invalid API credentials (no retry loop)
  DISABLED: 'DISABLED'          // Switched off by user
};

export const FailoverReason = {
  TIMEOUT: 'TIMEOUT',
  SERVER_ERROR: 'SERVER_ERROR',
  AUTH_FAILURE: 'AUTH_FAILURE',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  QUOTA_EXHAUSTED: 'QUOTA_EXHAUSTED',
  CIRCUIT_OPEN: 'CIRCUIT_OPEN',
  MANUALLY_DISABLED: 'MANUALLY_DISABLED',
  SIMULATED_TEST: 'SIMULATED_TEST'
};

export const QuotaResetPeriod = {
  DAILY: 'DAILY',
  MONTHLY: 'MONTHLY'
};

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
  'https://searxng.moonshadow.dev'
];

export const initialSearchProviders = [
  {
    id: 'prov-public-feeds',
    name: 'Direct Official & Enterprise Feeds (Self-Reliable ₹0.00 Engine)',
    type: ProviderType.PUBLIC_FEEDS_RSS,
    endpoint: 'https://www.ncs.gov.in/rss/all-jobs.xml',
    apiKey: '',
    freeQuotaLimit: 999999,
    quotaResetPeriod: QuotaResetPeriod.DAILY,
    quotaRemaining: 999999,
    quotaUsed: 14,
    maxRequestsPerMinute: 60,
    maxRequestsPerDay: 10000,
    priority: 1, // First Priority as requested (Zero cost, self-reliant)
    isEnabled: true,
    allowedCategories: ['ALL', 'CENTRAL_GOVT', 'STATE_GOVT', 'PSU', 'ACADEMIC_FORENSICS'],
    permitPaidRequests: false, // Strict ₹0.00 guard
    healthStatus: ProviderHealthStatus.HEALTHY,
    lastSuccessfulRequestAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    lastErrorAt: null,
    lastErrorMessage: null,
    errorCount: 0,
    successCount: 42,
    consecutiveFailures: 0,
    circuitBreakerOpenUntil: null,
    costPerQueryInr: 0.00,
    estimatedPaidCostInr: 0.00
  },
  {
    id: 'prov-searxng',
    name: 'SearXNG Metasearch Engine (Free & Open Source ₹0.00)',
    type: ProviderType.SEARXNG,
    endpoint: 'https://www.isci.si',
    apiKey: '',
    freeQuotaLimit: 999999,
    quotaResetPeriod: QuotaResetPeriod.DAILY,
    quotaRemaining: 999999,
    quotaUsed: 0,
    maxRequestsPerMinute: 30,
    maxRequestsPerDay: 5000,
    priority: 2, // Second Priority (Unlimited Free Metasearch across Google, Bing, DDG)
    isEnabled: true,
    allowedCategories: ['ALL', 'CENTRAL_GOVT', 'STATE_GOVT', 'PSU', 'ACADEMIC_FORENSICS'],
    permitPaidRequests: false,
    healthStatus: ProviderHealthStatus.HEALTHY,
    lastSuccessfulRequestAt: new Date().toISOString(),
    lastErrorAt: null,
    lastErrorMessage: null,
    errorCount: 0,
    successCount: 1,
    consecutiveFailures: 0,
    circuitBreakerOpenUntil: null,
    costPerQueryInr: 0.00,
    estimatedPaidCostInr: 0.00
  },
  {
    id: 'prov-brave-search',
    name: 'Brave Search API (Free Tier 2,000/Month)',
    type: ProviderType.BRAVE_SEARCH,
    endpoint: 'https://api.search.brave.com/res/v1/web/search',
    apiKey: '',
    freeQuotaLimit: 2000,
    quotaResetPeriod: QuotaResetPeriod.MONTHLY,
    quotaRemaining: 2000,
    quotaUsed: 0,
    maxRequestsPerMinute: 60, // 1 QPS
    maxRequestsPerDay: 200,
    priority: 3, // Third Priority
    isEnabled: true,
    allowedCategories: ['ALL', 'CENTRAL_GOVT', 'STATE_GOVT', 'PSU', 'ACADEMIC_FORENSICS'],
    permitPaidRequests: false,
    healthStatus: ProviderHealthStatus.HEALTHY,
    lastSuccessfulRequestAt: null,
    lastErrorAt: null,
    lastErrorMessage: null,
    errorCount: 0,
    successCount: 0,
    consecutiveFailures: 0,
    circuitBreakerOpenUntil: null,
    costPerQueryInr: 0.00,
    estimatedPaidCostInr: 0.00
  },
  {
    id: 'prov-serpapi',
    name: 'SerpApi Google Jobs Search (Free 250/Month Backup)',
    type: ProviderType.SERPAPI,
    endpoint: 'https://serpapi.com/search.json',
    apiKey: '84b52eb2f22236ae64661de078a666ae3de5c5c9bcbfe21b70c0bd1f7596d71b',
    freeQuotaLimit: 250,
    quotaResetPeriod: QuotaResetPeriod.MONTHLY,
    quotaRemaining: 249,
    quotaUsed: 1,
    maxRequestsPerMinute: 5,
    maxRequestsPerDay: 50,
    priority: 4, // Fourth Priority (Broad-web backup)
    isEnabled: true,
    requiresUserConsent: true, // Always ask user before using SerpApi
    askUserFirst: true,
    allowedCategories: ['ALL', 'CENTRAL_GOVT', 'PSU', 'ACADEMIC_FORENSICS'],
    permitPaidRequests: false,
    healthStatus: ProviderHealthStatus.HEALTHY,
    lastSuccessfulRequestAt: new Date().toISOString(),
    lastErrorAt: null,
    lastErrorMessage: null,
    errorCount: 0,
    successCount: 1,
    consecutiveFailures: 0,
    circuitBreakerOpenUntil: null,
    costPerQueryInr: 0.00,
    estimatedPaidCostInr: 0.00
  },
  {
    id: 'prov-google-cse',
    name: 'Google Custom Search API (Closed to New Projects by Google)',
    type: ProviderType.GOOGLE_CUSTOM_SEARCH,
    endpoint: 'https://customsearch.googleapis.com/v1',
    apiKey: '',
    freeQuotaLimit: 100,
    quotaResetPeriod: QuotaResetPeriod.DAILY,
    quotaRemaining: 0,
    quotaUsed: 0,
    maxRequestsPerMinute: 10,
    maxRequestsPerDay: 100,
    priority: 99,
    isEnabled: false, // Disabled as requested
    allowedCategories: ['CENTRAL_GOVT', 'STATE_GOVT', 'PSU', 'ACADEMIC_FORENSICS'],
    permitPaidRequests: false, // Strict ₹0.00 guard
    healthStatus: ProviderHealthStatus.DISABLED,
    lastSuccessfulRequestAt: null,
    lastErrorAt: new Date().toISOString(),
    lastErrorMessage: 'Closed to new projects by Google policy',
    errorCount: 1,
    successCount: 0,
    consecutiveFailures: 1,
    circuitBreakerOpenUntil: null,
    costPerQueryInr: 0.00,
    estimatedPaidCostInr: 0.00
  },
  {
    id: 'prov-bing-search',
    name: 'Bing Web Search API (Disabled - Credit Card Required on Azure)',
    type: ProviderType.BING_WEB_SEARCH,
    endpoint: 'https://api.bing.microsoft.com/v7.0/search',
    apiKey: '',
    freeQuotaLimit: 1000,
    quotaResetPeriod: QuotaResetPeriod.MONTHLY,
    quotaRemaining: 1000,
    quotaUsed: 0,
    maxRequestsPerMinute: 15,
    maxRequestsPerDay: 50,
    priority: 99,
    isEnabled: false, // Disabled as requested (requires Azure credit card)
    allowedCategories: ['CENTRAL_GOVT', 'STATE_GOVT', 'PSU'],
    permitPaidRequests: false,
    healthStatus: ProviderHealthStatus.DISABLED,
    lastSuccessfulRequestAt: null,
    lastErrorAt: null,
    lastErrorMessage: null,
    errorCount: 0,
    successCount: 0,
    consecutiveFailures: 0,
    circuitBreakerOpenUntil: null,
    costPerQueryInr: 0.00,
    estimatedPaidCostInr: 0.00
  },
  {
    id: 'prov-custom-rest',
    name: 'Autonomous Dept REST Endpoint',
    type: ProviderType.CUSTOM_REST_ADAPTER,
    endpoint: 'https://api.govforensics-portal.in/v1/jobs',
    apiKey: '',
    freeQuotaLimit: 500,
    quotaResetPeriod: QuotaResetPeriod.DAILY,
    quotaRemaining: 500,
    quotaUsed: 0,
    maxRequestsPerMinute: 30,
    maxRequestsPerDay: 500,
    priority: 5,
    isEnabled: false,
    allowedCategories: ['ACADEMIC_FORENSICS', 'PSU'],
    permitPaidRequests: false,
    healthStatus: ProviderHealthStatus.DISABLED,
    lastSuccessfulRequestAt: null,
    lastErrorAt: null,
    lastErrorMessage: null,
    errorCount: 0,
    successCount: 0,
    consecutiveFailures: 0,
    circuitBreakerOpenUntil: null,
    costPerQueryInr: 0.00,
    estimatedPaidCostInr: 0.00
  }
];
