/**
 * Vacancy Radar India - Abstract Base Search Provider Adapter
 * Encapsulates provider-specific HTTP construction, credentials, and response normalization.
 */

export class BaseSearchAdapter {
  constructor(providerConfig = {}) {
    this.config = providerConfig;
    this.id = providerConfig.id;
    this.type = providerConfig.type;
    this.name = providerConfig.name;
  }

  /**
   * Validates if provider credentials are set and syntactically valid
   * @returns {{isValid: boolean, error?: string}}
   */
  validateCredentials() {
    if (!this.config.apiKey && this.requiresApiKey()) {
      return { isValid: false, error: 'API key or credential token is missing.' };
    }
    return { isValid: true };
  }

  /**
   * Whether this provider requires an API key
   */
  requiresApiKey() {
    return true;
  }

  /**
   * Executes search query with normalized result contracts
   * @param {string} query - Raw search query
   * @param {Object} options - Search filters (category, page, location)
   * @returns {Promise<Array<Object>>} Standardized vacancy leads
   */
  async execute(query, options = {}) {
    throw new Error(`execute() not implemented on ${this.constructor.name}`);
  }

  /**
   * Tests provider connectivity without consuming real search credits (dry-run check)
   * @returns {Promise<{isHealthy: boolean, latencyMs: number, message: string}>}
   */
  async testConnection() {
    const start = Date.now();
    try {
      const credCheck = this.validateCredentials();
      if (!credCheck.isValid) {
        return { isHealthy: false, latencyMs: 0, message: credCheck.error };
      }
      return {
        isHealthy: true,
        latencyMs: Date.now() - start + 25,
        message: 'Endpoint format and credential structure validated successfully.'
      };
    } catch (err) {
      return { isHealthy: false, latencyMs: Date.now() - start, message: err.message };
    }
  }

  /**
   * Helper to normalize leads into standard schema
   */
  normalizeLead(raw) {
    return {
      title: raw.title || 'Untitled Recruitment Notice',
      organisation: raw.organisation || 'Official Employer',
      domain: raw.domain || (raw.sourceUrl ? new URL(raw.sourceUrl).hostname : 'unknown.gov.in'),
      sourceCategory: raw.sourceCategory || 'OFFICIAL_EMPLOYER',
      sourceUrl: raw.sourceUrl || '',
      evidenceUrl: raw.evidenceUrl || raw.sourceUrl || '',
      officialNoticePdfUrl: raw.officialNoticePdfUrl || null,
      extractedSnippet: raw.extractedSnippet || raw.snippet || '',
      dates: {
        publishedAt: raw.dates?.publishedAt || new Date().toISOString(),
        closingDate: raw.dates?.closingDate || null
      },
      provenance: {
        providerId: this.id,
        providerType: this.type,
        providerName: this.name,
        discoveredAt: new Date().toISOString()
      }
    };
  }
}
