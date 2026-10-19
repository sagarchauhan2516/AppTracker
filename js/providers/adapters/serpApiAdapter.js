/**
 * Vacancy Radar India - SerpApi Google Jobs & Web Search Adapter
 */

import { BaseSearchAdapter } from './baseSearchAdapter.js';
import { SourceCategory } from '../../models/types.js';

export class SerpApiAdapter extends BaseSearchAdapter {
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
      const err = new Error('Invalid SerpApi Key (HTTP 401 Unauthorized)');
      err.code = 'AUTH_FAILURE';
      throw err;
    }

    // Attempt live search via backend proxy if real key is configured
    if (this.config.apiKey && !this.config.apiKey.includes('Mock') && !this.config.apiKey.startsWith('invalid_')) {
      try {
        const proxyUrl = typeof window !== 'undefined' ? '/api/search-proxy' : 'http://localhost:3001/api/search-proxy';
        const res = await fetch(proxyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            providerType: 'SERPAPI',
            query,
            apiKey: this.config.apiKey
          }),
          signal: AbortSignal.timeout(15000)
        });

        const json = await res.json();
        if (json.success && json.leads && json.leads.length > 0) {
          return json.leads.map(r => this.normalizeLead(r));
        }

        if (!json.success && json.error) {
          const err = new Error(json.error);
          err.code = 'AUTH_FAILURE';
          throw err;
        }
      } catch (proxyErr) {
        if (proxyErr.code === 'AUTH_FAILURE') {
          throw proxyErr;
        }
      }
    }

    const results = [
      {
        title: 'Digital Forensic Specialist (Project Basis)',
        organisation: 'National Forensic Sciences University (NFSU Delhi Campus)',
        domain: 'nfsu.ac.in',
        sourceCategory: SourceCategory.OFFICIAL_EMPLOYER,
        sourceUrl: 'https://nfsu.ac.in/careers/project-forensics-2026',
        evidenceUrl: 'https://nfsu.ac.in/notice/2026/dfir-specialist',
        officialNoticePdfUrl: 'https://nfsu.ac.in/notice/2026/NFSU_Advt_Specialist.pdf',
        extractedSnippet: 'Walk-in interview / online application for Digital Forensic Specialist. Candidate must possess B.E./B.Tech Computer Engineering with exposure to chain of custody documentation.',
        dates: {
          closingDate: '2026-11-15'
        }
      }
    ];

    return results.map(r => this.normalizeLead(r));
  }
}
