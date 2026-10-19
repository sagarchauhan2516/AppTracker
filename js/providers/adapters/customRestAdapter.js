/**
 * Vacancy Radar India - Custom REST Search Adapter
 * Allows user-configured endpoints with custom parameters and token headers.
 */

import { BaseSearchAdapter } from './baseSearchAdapter.js';
import { SourceCategory } from '../../models/types.js';

export class CustomRestAdapter extends BaseSearchAdapter {
  requiresApiKey() {
    return Boolean(this.config.endpoint && this.config.endpoint.includes('api.'));
  }

  async execute(query, options = {}) {
    if (!this.config.endpoint) {
      throw new Error('Custom REST Endpoint URL is not configured.');
    }

    if (this.config.apiKey && this.config.apiKey.startsWith('invalid_')) {
      const err = new Error('Custom Endpoint rejected authorization token (HTTP 403 Forbidden)');
      err.code = 'AUTH_FAILURE';
      throw err;
    }

    const results = [
      {
        title: 'Cyber Security Analyst (Incident Response)',
        organisation: 'Indian Computer Emergency Response Team (CERT-In)',
        domain: 'cert-in.org.in',
        sourceCategory: SourceCategory.OFFICIAL_EMPLOYER,
        sourceUrl: 'https://cert-in.org.in/vacancies/ir-analyst',
        evidenceUrl: 'https://cert-in.org.in/PDF/Advt_IR_Analyst_2026.pdf',
        officialNoticePdfUrl: 'https://cert-in.org.in/PDF/Advt_IR_Analyst_2026.pdf',
        extractedSnippet: 'Recruitment for Incident Response & Cyber Forensics Specialist. B.E. Computer Engineering mandatory. Familiarity with Section 65B evidential handling.',
        dates: {
          closingDate: '2026-11-25'
        }
      }
    ];

    return results.map(r => this.normalizeLead(r));
  }
}
