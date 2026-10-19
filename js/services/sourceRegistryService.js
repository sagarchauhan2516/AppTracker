/**
 * Vacancy Radar India - Candidate Source Registry Service
 * Manages domain classification, health status revalidation, rate-limits, and approval workflows.
 */

import { storageService } from './storageService.js';
import { SourceCategory } from '../models/types.js';

export class SourceRegistryService {
  /**
   * Classifies a domain strictly based on authoritative identity.
   * CRITICAL RULE: A third-party site must NEVER become an official source merely because it links to a government employer.
   * @param {string} domainOrUrl - Domain name or full URL
   * @returns {Object} Classification metadata
   */
  static classifyDomain(domainOrUrl) {
    let hostname = domainOrUrl.toLowerCase();
    try {
      if (domainOrUrl.startsWith('http')) {
        hostname = new URL(domainOrUrl).hostname.toLowerCase();
      }
    } catch (e) {
      // Keep as string
    }

    // 1. Central / State Recruitment Boards
    const recruitmentBoards = [
      'upsc.gov.in',
      'ssc.gov.in',
      'mpsc.gov.in',
      'kpsc.kar.nic.in',
      'gpsc.gujarat.gov.in',
      'bpsc.bih.nic.in',
      'calicut.nielit.in'
    ];
    if (recruitmentBoards.some(rb => hostname.includes(rb))) {
      return {
        category: SourceCategory.RECRUITMENT_BOARD,
        isOfficialDomain: true,
        trustLevel: 'HIGH_GOVT_AUTHORITY'
      };
    }

    // 2. Authorised Public Application Portals (e.g. NCS, Digialm, NTA)
    const authorisedPortals = [
      'ncs.gov.in',
      'cdn.digialm.com',
      'recruitment.nta.nic.in',
      'apprenticeshipindia.gov.in'
    ];
    if (authorisedPortals.some(ap => hostname.includes(ap))) {
      return {
        category: SourceCategory.AUTHORISED_PORTAL,
        isOfficialDomain: true,
        trustLevel: 'AUTHORISED_GATEWAY'
      };
    }

    // 3. Official Apex Government Employers & Universities
    const officialGovtOrAc = [
      'cdac.in',
      'nic.in',
      'cert-in.org.in',
      'drdo.gov.in',
      'isro.gov.in',
      'nfsu.ac.in',
      'iitd.ac.in',
      'iitb.ac.in',
      'iitk.ac.in',
      'gov.in'
    ];
    if (officialGovtOrAc.some(suffix => hostname.endsWith(suffix) || hostname.includes(suffix))) {
      return {
        category: SourceCategory.OFFICIAL_EMPLOYER,
        isOfficialDomain: true,
        trustLevel: 'AUTHORITATIVE_ORIGINAL_SOURCE'
      };
    }

    // 4. Default: Third-Party Aggregator
    // Even if the aggregator mentions a government job, it remains an aggregator.
    return {
      category: SourceCategory.THIRD_PARTY_AGGREGATOR,
      isOfficialDomain: false,
      trustLevel: 'THIRD_PARTY_LEAD_REQUIRES_CORROBORATION'
    };
  }

  /**
   * Registers a newly discovered domain from search results into the candidate registry
   */
  static registerDiscoveredDomain(domain, organisationName, sourceUrl, discoveryMethod = 'Dynamic Search') {
    const classification = this.classifyDomain(domain);
    const existing = storageService.getSources().find(s => s.domain === domain);

    if (existing) {
      existing.relevantResultsFound = (existing.relevantResultsFound || 0) + 1;
      storageService.saveSource(existing);
      return existing;
    }

    const newSource = {
      id: `src-${Date.now()}`,
      domain,
      organisationName: organisationName || domain,
      category: classification.category,
      sourceUrl,
      isOfficialDomain: classification.isOfficialDomain,
      discoveryMethod,
      retrievalMethod: classification.isOfficialDomain ? 'HTML_SCRAPE' : 'RSS_ATOM_FEED',
      lastSuccessfulCheck: new Date().toISOString(),
      lastFailure: null,
      consecutiveFailures: 0,
      relevantResultsFound: 1,
      rateLimitMinutes: classification.isOfficialDomain ? 120 : 360,
      isEnabled: true,
      userApproved: true
    };

    storageService.saveSource(newSource);
    return newSource;
  }

  /**
   * Revalidates all enabled sources in the registry and updates health metadata
   */
  static async revalidateAllSources(provider) {
    const sources = storageService.getSources();
    const results = [];

    for (const source of sources) {
      if (!source.isEnabled) continue;

      try {
        const check = await provider.validateSourceUrl(source.sourceUrl);
        if (check.isAlive) {
          source.lastSuccessfulCheck = new Date().toISOString();
          source.consecutiveFailures = 0;
          results.push({ id: source.id, domain: source.domain, status: 'OK', latency: check.latencyMs });
        } else {
          source.lastFailure = new Date().toISOString();
          source.consecutiveFailures = (source.consecutiveFailures || 0) + 1;
          results.push({ id: source.id, domain: source.domain, status: 'FAILED' });
        }
      } catch (err) {
        source.lastFailure = new Date().toISOString();
        source.consecutiveFailures = (source.consecutiveFailures || 0) + 1;
        results.push({ id: source.id, domain: source.domain, status: 'ERROR', error: err.message });
      }

      storageService.saveSource(source);
    }

    return results;
  }
}
