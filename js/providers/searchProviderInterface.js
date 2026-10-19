/**
 * Vacancy Radar India - Modular Search Provider Base Interface
 * Enables interchangeable search backends without rewriting application logic.
 */

export class SearchProviderInterface {
  constructor(config = {}) {
    this.id = 'base-provider';
    this.name = 'Base Search Provider';
    this.isFreeByDefault = true;
    this.requiresApiKey = false;
    this.config = config;
  }

  /**
   * Returns current provider quota and spending statistics
   */
  getUsageStats() {
    return {
      providerId: this.id,
      providerName: this.name,
      queriesUsedThisMonth: 0,
      monthlyQuota: 100,
      quotaRemaining: 100,
      estimatedCostInr: 0.00,
      isHardLimitEnforced: true,
      requiresApiKey: this.requiresApiKey
    };
  }

  /**
   * Executes a search query across the provider's discovery channels
   * @param {string} query - The formatted query string
   * @param {Object} options - Filters and search scope
   * @returns {Promise<Array<Object>>} List of discovered leads
   */
  async search(query, options = {}) {
    throw new Error('search() method must be implemented by concrete provider subclass');
  }

  /**
   * Revalidates an individual source URL for uptime and reachability
   * @param {string} url - Target URL to probe
   * @returns {Promise<Object>} Verification result with status code and latency
   */
  async validateSourceUrl(url) {
    throw new Error('validateSourceUrl() must be implemented by concrete provider subclass');
  }
}
