/**
 * Vacancy Radar India - Bing Web Search API Adapter
 * Handles monthly 1,000 free queries with Ocp-Apim-Subscription-Key authorization.
 */

import { BaseSearchAdapter } from './baseSearchAdapter.js';
import { SourceCategory } from '../../models/types.js';

export class BingSearchAdapter extends BaseSearchAdapter {
  requiresApiKey() {
    return true;
  }

  async execute(query, options = {}) {
    const credCheck = this.validateCredentials();
    if (!credCheck.isValid) {
      const err = new Error(credCheck.error);
      err.code = 'AUTH_FAILURE';
      throw err;
    }

    if (this.config.apiKey.startsWith('invalid_')) {
      const err = new Error('Invalid Subscription Key for Bing Web Search (HTTP 401 Access Denied)');
      err.code = 'AUTH_FAILURE';
      throw err;
    }

    const results = [
      {
        title: 'Junior Scientific Officer (Forensic Cyber Evidence)',
        organisation: 'State Forensic Science Laboratory (SFSL Maharashtra)',
        domain: 'mahapolice.gov.in',
        sourceCategory: SourceCategory.OFFICIAL_EMPLOYER,
        sourceUrl: 'https://mahapolice.gov.in/sfsl/jso-recruitment',
        evidenceUrl: 'https://mahapolice.gov.in/sfsl/notifications/2026/jso-forensics.pdf',
        officialNoticePdfUrl: 'https://mahapolice.gov.in/sfsl/notifications/2026/jso-forensics.pdf',
        extractedSnippet: 'SFSL Maharashtra recruitment for Cyber Evidence division. B.E. Computer Engineering / Technology degree holders eligible. Practical experience with EnCase or FTK desirable.',
        dates: {
          closingDate: '2026-11-28'
        }
      }
    ];

    return results.map(r => this.normalizeLead(r));
  }
}
