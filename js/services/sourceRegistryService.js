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
    if (!domainOrUrl || typeof domainOrUrl !== 'string') {
      return {
        category: SourceCategory.THIRD_PARTY_AGGREGATOR,
        isOfficialDomain: false,
        trustLevel: 'UNKNOWN_OR_EMPTY'
      };
    }

    let hostname = domainOrUrl.toLowerCase().trim();
    if (hostname.startsWith('http://') || hostname.startsWith('https://')) {
      try {
        hostname = new URL(hostname).hostname.toLowerCase();
      } catch (_) {}
    }
    // Clean hostname from www., port numbers, and URL paths
    hostname = hostname.replace(/^www\./i, '').replace(/:\d+$/, '').replace(/\/.*$/, '').trim();

    // Helper: Exact domain or subdomain match
    const isDomainOrSubdomain = (domain, root) => domain === root || domain.endsWith('.' + root);

    // 0. Anti-Aggregator Guard: Third-party blogs, scrapers, and aggregators must NEVER be official
    const aggregatorKeywords = [
      'sarkari', 'freejobalert', 'freshersworld', 'testbook', 'careerpower',
      'jagranjosh', 'indgovtjobs', 'blogspot', 'wordpress', 'naukri', 'shine',
      'timesjobs', 'monsterindia', 'foundit', 'jobriya', 'allindiajobs',
      'govtsarkarijobs', 'rojgarresult', 'rojgarsamachar.net'
    ];
    if (aggregatorKeywords.some(kw => hostname.includes(kw))) {
      return {
        category: SourceCategory.THIRD_PARTY_AGGREGATOR,
        isOfficialDomain: false,
        trustLevel: 'THIRD_PARTY_AGGREGATOR_REQUIRES_CORROBORATION'
      };
    }

    // 1. Central & State Recruitment Boards & Examination Authorities
    const recruitmentBoards = [
      'upsc.gov.in',
      'ssc.gov.in',
      'mpsc.gov.in',
      'kpsc.kar.nic.in',
      'gpsc.gujarat.gov.in',
      'bpsc.bih.nic.in',
      'uppsc.up.nic.in',
      'appsc.gov.in',
      'tnpsc.gov.in',
      'wbpsc.gov.in',
      'rpsc.rajasthan.gov.in',
      'hpsc.gov.in',
      'opsc.gov.in',
      'jpsc.gov.in',
      'tspsc.gov.in',
      'mppsc.mp.gov.in',
      'pssc.nic.in',
      'rac.gov.in',
      'nta.ac.in',
      'recruitment.nta.nic.in',
      'ibps.in',
      'rbi.org.in',
      'sbi.co.in',
      'sebi.gov.in',
      'nabard.org',
      'calicut.nielit.in'
    ];
    if (recruitmentBoards.some(rb => isDomainOrSubdomain(hostname, rb))) {
      return {
        category: SourceCategory.RECRUITMENT_BOARD,
        isOfficialDomain: true,
        trustLevel: 'HIGH_GOVT_AUTHORITY'
      };
    }

    // 2. Authorised Public Application Gateways (e.g. NCS, Digialm, Samarth)
    const authorisedPortals = [
      'ncs.gov.in',
      'cdn.digialm.com',
      'recruitment.nta.nic.in',
      'apprenticeshipindia.gov.in',
      'samarth.ac.in',
      'samarth.edu.in',
      'epfindia.gov.in',
      'kspcportal.com'
    ];
    if (authorisedPortals.some(ap => isDomainOrSubdomain(hostname, ap))) {
      return {
        category: SourceCategory.AUTHORISED_PORTAL,
        isOfficialDomain: true,
        trustLevel: 'AUTHORISED_GATEWAY'
      };
    }

    // 3. Apex Autonomous Technical Institutions, PSUs & Statutory Societies
    const apexInstitutionsAndPsus = [
      'cdac.in',
      'cert-in.org.in',
      'nielit.gov.in',
      'nielit.in',
      'drdo.gov.in',
      'isro.gov.in',
      'barc.gov.in',
      'nfsu.ac.in',
      'bel-india.in',
      'ecil.co.in',
      'hal-india.co.in',
      'bhel.com',
      'ongcindia.com',
      'ntpc.co.in',
      'sail.co.in',
      'iocl.com',
      'powergrid.in',
      'c-dot.in',
      'ernet.in',
      'coalindia.in',
      'iisc.ac.in'
    ];
    if (apexInstitutionsAndPsus.some(root => isDomainOrSubdomain(hostname, root))) {
      return {
        category: SourceCategory.OFFICIAL_EMPLOYER,
        isOfficialDomain: true,
        trustLevel: 'AUTHORITATIVE_ORIGINAL_SOURCE'
      };
    }

    // 4. Standard Indian Government, NIC & Academic Top-Level Domains
    // Must end with .gov.in, .nic.in, .ac.in, .res.in, or .edu.in
    if (
      hostname.endsWith('.gov.in') || hostname === 'gov.in' ||
      hostname.endsWith('.nic.in') || hostname === 'nic.in' ||
      hostname.endsWith('.ac.in') || hostname === 'ac.in' ||
      hostname.endsWith('.res.in') || hostname === 'res.in' ||
      hostname.endsWith('.edu.in') || hostname === 'edu.in'
    ) {
      return {
        category: SourceCategory.OFFICIAL_EMPLOYER,
        isOfficialDomain: true,
        trustLevel: 'AUTHORITATIVE_ORIGINAL_SOURCE'
      };
    }

    // 5. Default: Third-Party Aggregator
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
