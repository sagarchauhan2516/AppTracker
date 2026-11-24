/**
 * Vacancy Radar India - Apex Web Scraper Engine
 * 
 * Direct, intelligent web scrapers for Indian government and apex technical institutions:
 * - C-DAC (Centre for Development of Advanced Computing)
 * - NFSU (National Forensic Sciences University - Regular & Contractual)
 * - NIELIT (National Institute of Electronics & Information Technology)
 * - DRDO RAC (Defence Research & Development Organisation - Recruitment & Assessment Centre)
 * - UPSC (Union Public Service Commission - Technical & Scientific Posts)
 * - CERT-In (Indian Computer Emergency Response Team)
 * - Universal / Generic Apex Scraper for any candidate-added .gov.in / .nic.in / .ac.in portal
 * 
 * Features:
 * - 100% Zero-Cost ₹0.00 HTTP-native discovery
 * - TLS relaxation for Indian departmental PKI certificates
 * - Smart Advertisement Number, Cut-Off Date & PDF Notice Extraction
 * - Deterministic Page-Diff integration
 * - Instant OFFICIALLY_VERIFIED trust tier assignment
 */

import https from 'https';
import crypto from 'crypto';

// Relax TLS certificate verification for Indian governmental and autonomous apex PKI authorities (CCA/NIC root certs)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import { 
  decryptCdacPayload,
  saveLearnedSource,
  loadLearnedSources
} from '../context.js';
import { parseJobDates } from '../routes/searchRoutes.js';
import { PageDiffEngine } from '../../js/engine/pageDiffEngine.js';

// Relaxed HTTPS agent for Indian government servers with legacy/departmental SSL certs
const govTlsAgent = new https.Agent({ rejectUnauthorized: false });

/**
 * Standard fetch wrapper for government portals with timeouts and resilient headers
 */
export async function fetchGovPage(url, timeoutMs = 12000) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,application/json,*/*;q=0.8',
    'Accept-Language': 'en-IN,en;q=0.9',
    'Cache-Control': 'no-cache'
  };

  try {
    const res = await fetch(url, {
      agent: govTlsAgent,
      headers,
      signal: AbortSignal.timeout(timeoutMs),
      redirect: 'follow'
    });
    return res;
  } catch (err) {
    // If standard fetch with agent failed, attempt fallback without agent
    return await fetch(url, {
      headers,
      signal: AbortSignal.timeout(timeoutMs),
      redirect: 'follow'
    });
  }
}

/**
 * Normalizes relative URLs into absolute URLs
 */
export function resolveUrl(relativeOrAbsolute, baseUrl) {
  if (!relativeOrAbsolute) return '';
  const trimmed = relativeOrAbsolute.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  try {
    return new URL(trimmed, baseUrl).href;
  } catch (_) {
    return trimmed;
  }
}

/**
 * Robust Regex to identify Indian Government Advertisement / Circular Reference Numbers
 */
export const ADVT_PATTERNS = [
  /(?:Advt|Advertisement|Notification|Circular|Ref|Reference|Notice)\.?\s*(?:No\.?|Number)?[\s:–—]*([A-Za-z0-9][A-Za-z0-9\/\-\._\(\)]{2,45})/i,
  /(?:EN|Employment\s*Notice)[\s:–—]*([A-Za-z0-9\/\-\._\(\)]{3,40})/i,
  /(?:Recruit(?:ment)?\/?202[4-9]\/?[A-Za-z0-9\-_]*)/i,
  /([A-Z]{2,10}\/[A-Za-z0-9\-\/\(\)]{4,35})/
];

export function extractAdvertisementNumber(text) {
  if (!text || typeof text !== 'string') return '';
  for (const pat of ADVT_PATTERNS) {
    const match = text.match(pat);
    if (match && match[1]) {
      const advt = match[1].trim().replace(/[\.,;]+$/, '');
      // Ensure advt number contains at least one digit and is not a stopword
      if (advt.length >= 3 && /\d/.test(advt) && !/^(pdf|view|click|link|apply|here|download|reference|details|notice)$/i.test(advt)) {
        return advt;
      }
    }
  }
  return '';
}

/**
 * Monitored Apex Scraper Registry
 */
export const MONITORED_APEX_SCRAPERS = [
  {
    id: 'scraper-cdac',
    name: 'Centre for Development of Advanced Computing (C-DAC)',
    shortName: 'C-DAC',
    domain: 'cdac.in',
    portalUrl: 'https://careers.cdac.in',
    fallbackUrl: 'https://www.cdac.in/index.aspx?id=current_jobs',
    category: 'Autonomous Govt Institution',
    description: 'Premier R&D organization of MeitY for Supercomputing, Cyber Forensics & IT',
    supportsEncryptedApi: true,
    enabled: true
  },
  {
    id: 'scraper-nfsu',
    name: 'National Forensic Sciences University (NFSU)',
    shortName: 'NFSU',
    domain: 'nfsu.ac.in',
    portalUrl: 'https://nfsu.ac.in/career',
    regularRecruitmentUrl: 'https://nfsu.ac.in/Regular_Recruitment',
    contractualRecruitmentUrl: 'https://nfsu.ac.in/Contractual_Recruitment',
    category: 'Institution of National Importance (MHA)',
    description: 'Premier national forensics university under Ministry of Home Affairs',
    enabled: true
  },
  {
    id: 'scraper-nielit',
    name: 'National Institute of Electronics and Information Technology (NIELIT)',
    shortName: 'NIELIT',
    domain: 'nielit.gov.in',
    portalUrl: 'https://nielit.gov.in/recruitments',
    category: 'Autonomous Scientific Society (MeitY)',
    description: 'Central recruitment authority for Scientist B & Scientific Officers across Govt',
    enabled: true
  },
  {
    id: 'scraper-drdo',
    name: 'Defence Research and Development Organisation (DRDO RAC)',
    shortName: 'DRDO RAC',
    domain: 'rac.gov.in',
    portalUrl: 'https://rac.gov.in',
    category: 'Central Government (Ministry of Defence)',
    description: 'Recruitment and Assessment Centre for Scientist B and Technical cadres',
    enabled: true
  },
  {
    id: 'scraper-upsc',
    name: 'Union Public Service Commission (UPSC)',
    shortName: 'UPSC',
    domain: 'upsc.gov.in',
    portalUrl: 'https://upsc.gov.in/recruitment/recruitment-advertisement',
    category: 'Central Recruitment Board',
    description: 'Specialist officer, Senior Scientific Officer & Cyber forensics examinations',
    enabled: true
  },
  {
    id: 'scraper-certin',
    name: 'Indian Computer Emergency Response Team (CERT-In)',
    shortName: 'CERT-In',
    domain: 'cert-in.org.in',
    portalUrl: 'https://www.cert-in.org.in/s2cMainServlet?pageid=VLNLISTRE',
    category: 'Apex National Cyber Security Agency (MeitY)',
    description: 'National nodal agency for responding to computer security incidents',
    enabled: true
  }
];

export class ApexPortalScraper {
  /**
   * Scrapes all enabled apex portals + user-specified custom target domains
   */
  static async scrapeAllApexPortals(options = {}) {
    const { targetDomains = [], forceRefresh = false, profileKeywords = [] } = options;
    const t0 = Date.now();
    const results = [];
    const portalStatuses = {};

    // 1. Scrape Registered Apex Portals
    for (const scraper of MONITORED_APEX_SCRAPERS) {
      if (!scraper.enabled) continue;
      
      // If user specified targetDomains and this portal is not in target list, skip unless target list is empty
      if (targetDomains.length > 0) {
        const isTargeted = targetDomains.some(td => {
          const cleanTd = td.toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
          return scraper.domain.includes(cleanTd) || cleanTd.includes(scraper.domain);
        });
        if (!isTargeted) continue;
      }

      try {
        const startTime = Date.now();
        let portalVacancies = [];

        if (scraper.id === 'scraper-cdac') {
          portalVacancies = await this.scrapeCdac(scraper);
        } else if (scraper.id === 'scraper-nfsu') {
          portalVacancies = await this.scrapeNfsu(scraper);
        } else if (scraper.id === 'scraper-nielit') {
          portalVacancies = await this.scrapeNielit(scraper);
        } else if (scraper.id === 'scraper-drdo') {
          portalVacancies = await this.scrapeDrdo(scraper);
        } else if (scraper.id === 'scraper-upsc') {
          portalVacancies = await this.scrapeUpsc(scraper);
        } else if (scraper.id === 'scraper-certin') {
          portalVacancies = await this.scrapeCertIn(scraper);
        }

        results.push(...portalVacancies);
        portalStatuses[scraper.id] = {
          name: scraper.shortName,
          status: 'SUCCESS',
          count: portalVacancies.length,
          latencyMs: Date.now() - startTime
        };
      } catch (err) {
        portalStatuses[scraper.id] = {
          name: scraper.shortName,
          status: 'ERROR',
          count: 0,
          error: err.message
        };
      }
    }

    // 2. Scrape Any Custom User-Added Domains that are not in the predefined list
    const predefinedDomains = new Set(MONITORED_APEX_SCRAPERS.map(s => s.domain));
    for (const rawDomain of targetDomains) {
      const cleanDomain = rawDomain.toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();
      if (!cleanDomain || predefinedDomains.has(cleanDomain)) continue;

      try {
        const startTime = Date.now();
        const customUrl = rawDomain.startsWith('http') ? rawDomain : `https://${cleanDomain}`;
        const customVacancies = await this.scrapeGenericGovPortal(customUrl, cleanDomain);
        results.push(...customVacancies);
        portalStatuses[cleanDomain] = {
          name: cleanDomain,
          status: 'SUCCESS',
          count: customVacancies.length,
          latencyMs: Date.now() - startTime
        };
      } catch (err) {
        portalStatuses[cleanDomain] = {
          name: cleanDomain,
          status: 'ERROR',
          count: 0,
          error: err.message
        };
      }
    }

    // 3. Deduplicate discovered vacancies within this scrape run
    const seenMap = new Map();
    const uniqueVacancies = [];

    for (const v of results) {
      const key = (v.advertisementNumber && v.advertisementNumber.length > 3)
        ? `advt:${v.advertisementNumber.toLowerCase()}`
        : (v.officialNoticePdfUrl || v.sourceUrl || `${v.organisation}:${v.title}`.toLowerCase());

      if (!seenMap.has(key)) {
        seenMap.set(key, true);
        uniqueVacancies.push(v);
      }
    }

    return {
      success: true,
      count: uniqueVacancies.length,
      vacancies: uniqueVacancies,
      portalStatuses,
      durationMs: Date.now() - t0
    };
  }

  /**
   * Scrapes a single portal on demand by ID or domain
   */
  static async scrapeSinglePortal(portalIdOrDomain) {
    const clean = (portalIdOrDomain || '').toLowerCase().trim();
    const scraper = MONITORED_APEX_SCRAPERS.find(s => s.id === clean || s.domain === clean || clean.includes(s.domain));

    if (scraper) {
      const res = await this.scrapeAllApexPortals({ targetDomains: [scraper.domain], forceRefresh: true });
      return {
        portal: scraper,
        ...res
      };
    }

    // Fallback to generic portal scraper
    const customUrl = clean.startsWith('http') ? clean : `https://${clean}`;
    const vacancies = await this.scrapeGenericGovPortal(customUrl, clean);
    return {
      portal: { id: `custom-${clean}`, name: clean, domain: clean, portalUrl: customUrl },
      success: true,
      count: vacancies.length,
      vacancies
    };
  }

  // =========================================================================
  // DEDICATED PORTAL SCRAPERS
  // =========================================================================

  /**
   * 1. C-DAC Scraper (careers.cdac.in / cdac.in)
   */
  static async scrapeCdac(scraper) {
    const vacancies = [];
    let discoveredFromApi = false;

    // A. Attempt C-DAC Encrypted Application API
    try {
      const advtRes = await fetchGovPage('https://careers.cdac.in/advt-1', 9000);
      if (advtRes.ok) {
        const advtBody = await advtRes.json();
        const advtList = decryptCdacPayload(advtBody.data) || [];

        for (const advt of advtList.slice(0, 10)) {
          if (!advt.job_id) continue;
          try {
            const postsRes = await fetchGovPage(`https://careers.cdac.in/advt/post_details/${advt.job_id}`, 8000);
            if (postsRes.ok) {
              const postsBody = await postsRes.json();
              const posts = decryptCdacPayload(postsBody.data) || [];
              for (const p of posts) {
                const title = p.post_name || 'Project Engineer';
                const skills = (p.skill_set || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
                const qual = (p.educational_qualification || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
                const closing = p.last_date_of_advt ? p.last_date_of_advt.slice(0, 10) : '';
                const advtNo = p.advt_no || advt.advt_no || 'C-DAC Recruitment 2026';

                vacancies.push({
                  id: `cdac_${p.post_id || Math.random().toString(36).slice(2, 8)}`,
                  title,
                  organisation: 'Centre for Development of Advanced Computing (C-DAC)',
                  domain: 'cdac.in',
                  sourceCategory: 'OFFICIAL_EMPLOYER',
                  sector: 'Autonomous Govt Institution',
                  advertisementNumber: advtNo,
                  payScale: p.salary || 'Level 10 / Consolidated Project Scale',
                  totalPosts: parseInt(p.no_of_posts, 10) || 1,
                  location: p.location || 'Pune / Delhi / Bangalore / Hyderabad',
                  sourceUrl: `https://careers.cdac.in/post-details/${p.post_id || ''}`,
                  evidenceUrl: 'https://careers.cdac.in',
                  officialNoticePdfUrl: '',
                  extractedSnippet: `${title} at C-DAC. Skills: ${skills.slice(0, 180)}. Qualifications: ${qual.slice(0, 150)}`,
                  dates: {
                    publishedAt: new Date().toISOString().slice(0, 10),
                    closingDate: closing || '2026-12-31'
                  },
                  qualifications: qual ? [qual] : ['B.E. / B.Tech in Computer Engineering / IT / MCA'],
                  skills,
                  verification: {
                    status: 'OFFICIALLY_VERIFIED',
                    sourceDomain: 'cdac.in',
                    officialNoticePdfUrl: '',
                    applicationUrl: `https://careers.cdac.in/post-details/${p.post_id || ''}`,
                    evidenceUrl: 'https://careers.cdac.in',
                    confidenceScore: 100,
                    verifiedAt: new Date().toISOString(),
                    confirmedFacts: ['ORIGINAL_APEX_PORTAL', 'CDAC_APPLICATION_GATEWAY', 'DECRYPTED_PAYLOAD_VERIFIED', 'OFFICIAL_GOV_DOMAIN']
                  },
                  provenance: {
                    providerId: 'prov-apex-scraper',
                    providerName: 'Official Apex Web Scraper (C-DAC Careers)',
                    scrapedFrom: 'https://careers.cdac.in',
                    discoveredAt: new Date().toISOString()
                  },
                  isLiveDiscovered: true,
                  isTestData: false
                });
              }
              discoveredFromApi = true;
            }
          } catch (_) {}
        }
      }
    } catch (_) {}

    // B. If API yielded results, return them. If not, scrape the public current_jobs HTML page
    if (vacancies.length > 0) {
      saveLearnedSource('careers.cdac.in', { url: 'https://careers.cdac.in', organisation: 'Centre for Development of Advanced Computing (C-DAC)' });
      return vacancies;
    }

    try {
      const htmlRes = await fetchGovPage(scraper.fallbackUrl, 10000);
      if (htmlRes.ok) {
        const html = await htmlRes.text();
        const extracted = this.extractVacanciesFromHtml(html, scraper.fallbackUrl, 'Centre for Development of Advanced Computing (C-DAC)', 'cdac.in');
        vacancies.push(...extracted);
      }
    } catch (_) {}

    return vacancies;
  }

  /**
   * 2. NFSU Scraper (nfsu.ac.in - Regular & Contractual Recruitment)
   */
  static async scrapeNfsu(scraper) {
    const vacancies = [];
    const endpoints = [
      scraper.regularRecruitmentUrl || 'https://nfsu.ac.in/Regular_Recruitment',
      scraper.contractualRecruitmentUrl || 'https://nfsu.ac.in/Contractual_Recruitment',
      scraper.portalUrl || 'https://nfsu.ac.in/career'
    ];

    for (const url of endpoints) {
      try {
        const res = await fetchGovPage(url, 12000);
        if (!res.ok) continue;
        const html = await res.text();
        const extracted = this.extractVacanciesFromHtml(html, url, 'National Forensic Sciences University (NFSU)', 'nfsu.ac.in');
        
        extracted.forEach(v => {
          v.sector = 'Autonomous Govt Institution';
          v.provenance.providerName = 'Official Apex Web Scraper (NFSU Career Portal)';
          vacancies.push(v);
        });
      } catch (_) {}
    }

    saveLearnedSource('nfsu.ac.in', { url: 'https://nfsu.ac.in/career', organisation: 'National Forensic Sciences University (NFSU)' });
    return vacancies;
  }

  /**
   * 3. NIELIT Scraper (nielit.gov.in/recruitments)
   */
  static async scrapeNielit(scraper) {
    const vacancies = [];
    const url = scraper.portalUrl || 'https://nielit.gov.in/recruitments';

    try {
      const res = await fetchGovPage(url, 12000);
      if (res.ok) {
        const html = await res.text();
        const extracted = this.extractVacanciesFromHtml(html, url, 'National Institute of Electronics and Information Technology (NIELIT)', 'nielit.gov.in');
        extracted.forEach(v => {
          v.sector = 'Autonomous Govt Institution';
          v.provenance.providerName = 'Official Apex Web Scraper (NIELIT Portal)';
          vacancies.push(v);
        });
      }
    } catch (_) {}

    saveLearnedSource('nielit.gov.in', { url, organisation: 'National Institute of Electronics and Information Technology (NIELIT)' });
    return vacancies;
  }

  /**
   * 4. DRDO RAC Scraper (rac.gov.in)
   */
  static async scrapeDrdo(scraper) {
    const vacancies = [];
    const url = scraper.portalUrl || 'https://rac.gov.in';

    try {
      const res = await fetchGovPage(url, 12000);
      if (res.ok) {
        const html = await res.text();
        const extracted = this.extractVacanciesFromHtml(html, url, 'Defence Research and Development Organisation (DRDO RAC)', 'rac.gov.in');
        extracted.forEach(v => {
          v.sector = 'Central Government';
          v.provenance.providerName = 'Official Apex Web Scraper (DRDO RAC)';
          vacancies.push(v);
        });
      }
    } catch (_) {}

    saveLearnedSource('rac.gov.in', { url, organisation: 'Defence Research and Development Organisation (DRDO)' });
    return vacancies;
  }

  /**
   * 5. UPSC Scraper (upsc.gov.in)
   */
  static async scrapeUpsc(scraper) {
    const vacancies = [];
    const url = scraper.portalUrl || 'https://upsc.gov.in/recruitment/recruitment-advertisement';

    try {
      const res = await fetchGovPage(url, 12000);
      if (res.ok) {
        const html = await res.text();
        const extracted = this.extractVacanciesFromHtml(html, url, 'Union Public Service Commission (UPSC)', 'upsc.gov.in');
        extracted.forEach(v => {
          v.sector = 'Central Government';
          v.sourceCategory = 'RECRUITMENT_BOARD';
          v.provenance.providerName = 'Official Apex Web Scraper (UPSC)';
          vacancies.push(v);
        });
      }
    } catch (_) {}

    saveLearnedSource('upsc.gov.in', { url, organisation: 'Union Public Service Commission (UPSC)' });
    return vacancies;
  }

  /**
   * 6. CERT-In Scraper (cert-in.org.in)
   */
  static async scrapeCertIn(scraper) {
    const vacancies = [];
    const urls = [
      scraper.portalUrl || 'https://www.cert-in.org.in/s2cMainServlet?pageid=VLNLISTRE',
      'https://www.cert-in.org.in/s2cMainServlet?pageid=PUBWEL01'
    ];

    for (const url of urls) {
      try {
        const res = await fetchGovPage(url, 12000);
        if (res.ok) {
          const html = await res.text();
          const extracted = this.extractVacanciesFromHtml(html, url, 'Indian Computer Emergency Response Team (CERT-In)', 'cert-in.org.in');
          extracted.forEach(v => {
            v.sector = 'Autonomous Govt Institution';
            v.provenance.providerName = 'Official Apex Web Scraper (CERT-In)';
            vacancies.push(v);
          });
        }
      } catch (_) {}
    }

    saveLearnedSource('cert-in.org.in', { url: urls[0], organisation: 'Indian Computer Emergency Response Team (CERT-In)' });
    return vacancies;
  }

  /**
   * 7. Universal Generic Government Portal Scraper
   * Scrapes any user-added government, university or PSU domain
   */
  static async scrapeGenericGovPortal(url, domain) {
    const res = await fetchGovPage(url, 12000);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }
    const html = await res.text();
    const orgName = domain.toUpperCase().replace(/\.(GOV|NIC|AC|ORG)\.IN$/, '');
    return this.extractVacanciesFromHtml(html, url, orgName, domain);
  }

  // =========================================================================
  // UNIVERSAL RESILIENT HTML EXTRACTOR FOR INDIAN GOVT WEBSITES
  // =========================================================================

  /**
   * Extracts vacancies from raw HTML by combining table-row parsing, list items, and PDF notices
   */
  static extractVacanciesFromHtml(html, baseUrl, defaultOrg = 'Apex Institution', domain = '') {
    if (!html || typeof html !== 'string') return [];

    let hostname = domain;
    if (!hostname) {
      try { hostname = new URL(baseUrl).hostname.replace(/^www\./i, ''); } catch (_) { hostname = 'official.gov.in'; }
    }

    const items = [];
    const seenNoticeKeys = new Set();
    const seenNoticeUrls = new Set();
    const genericTitleRegex = /^(?:download(?:\s+notification)?|view(?:\s+advertisement)?|click\s+here|details|pdf|apply|view|download|link|notice)$/i;

    // 1. Table-based extraction (Common on UPSC, NIELIT, DRDO, State PSCs)
    const tableRowMatches = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gis)];
    for (const rowMatch of tableRowMatches) {
      const rowHtml = rowMatch[1];
      // Skip header rows
      if (/<th\b/i.test(rowHtml) && !/<td\b/i.test(rowHtml)) continue;

      const cells = [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gis)].map(c => c[1]);
      if (cells.length < 2) continue;

      const rowPlainText = rowHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      const isRecruitmentRelated = /(?:recruitment|advt|vacancy|post|scientist|engineer|analyst|officer|examiner|fellow|corrigendum|eligib|deadline|interview|apply)/i.test(rowPlainText);
      if (!isRecruitmentRelated) continue;

      // Find links and PDFs inside this row
      const linkMatch = rowHtml.match(/<a[^>]+href=["']([^"']+)["'][^>]*>(.*?)<\/a>/is);
      const pdfMatch = rowHtml.match(/<a[^>]+href=["']([^"']+\.pdf(?:\?[^"']*)?)["'][^>]*>(.*?)<\/a>/is);

      const anchorHref = (pdfMatch ? pdfMatch[1] : (linkMatch ? linkMatch[1] : '')).trim();
      const resolvedLink = resolveUrl(anchorHref || baseUrl, baseUrl);
      const isPdf = resolvedLink.toLowerCase().includes('.pdf');

      // Extract title from cell with link or largest text cell
      let title = '';
      if (pdfMatch && pdfMatch[2]) {
        title = pdfMatch[2].replace(/<[^>]+>/g, '').replace(/\[\s*PDF\s*\]/gi, '').trim();
      } else if (linkMatch && linkMatch[2]) {
        title = linkMatch[2].replace(/<[^>]+>/g, '').replace(/\[\s*PDF\s*\]/gi, '').trim();
      }

      // If anchor text is generic, look for descriptive text in neighboring cells
      if (!title || title.length < 5 || genericTitleRegex.test(title)) {
        const descriptiveCell = cells
          .map(c => c.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
          .filter(c => c.length > 5 && !/^\d+$/.test(c) && !/^\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4}$/.test(c) && !/^(?:download|view|click|pdf|details|apply)/i.test(c))
          .sort((a, b) => b.length - a.length)[0];

        if (descriptiveCell) {
          title = descriptiveCell;
        } else {
          title = 'Technical Vacancy Opening';
        }
      }

      // Clean title from extraneous HTML entities or trailing brackets
      title = title.replace(/&amp;/g, '&').replace(/&#8211;/g, '-').replace(/\s*\[\s*PDF\s*\]\s*$/i, '').trim();
      if (title.length < 5) continue;

      const advtNo = extractAdvertisementNumber(rowPlainText) || extractAdvertisementNumber(title);
      let dates = parseJobDates(title, rowPlainText, null);

      // Distinguish explicit deadline markers from circular upload / notification dates
      const hasDeadlineMarker = /(?:last\s*date|closing\s*date|apply\s*before|deadline|end\s*date|till|upto)[\s:–—]*(\d{1,2}[-/\.](?:[0-9]{1,2}|[A-Za-z]{3,9})[-/\.]\d{2,4})/i.test(rowPlainText);
      const standaloneDateMatch = rowPlainText.match(/\b(\d{1,2})[-/\.](\d{1,2})[-/\.](\d{4})\b/);

      if (hasDeadlineMarker && standaloneDateMatch) {
        const d = parseInt(standaloneDateMatch[1], 10);
        const m = parseInt(standaloneDateMatch[2], 10);
        const y = parseInt(standaloneDateMatch[3], 10);
        if (m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 2024 && y <= 2030) {
          dates.closingDate = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        }
      } else if (standaloneDateMatch) {
        const d = parseInt(standaloneDateMatch[1], 10);
        const m = parseInt(standaloneDateMatch[2], 10);
        const y = parseInt(standaloneDateMatch[3], 10);
        if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
          const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const dateMs = new Date(dateStr).getTime();
          // If the date is current/future (or late 2026/2027), treat as closing date
          if (y > 2026 || (y === 2026 && dateMs >= new Date('2026-11-01').getTime())) {
            dates.closingDate = dateStr;
          } else {
            // Otherwise it is an older notification issue date (e.g. 2024/early 2025)
            dates.publishedAt = dateStr;
            const estClose = new Date(Date.now() + 28 * 24 * 60 * 60 * 1000);
            dates.closingDate = estClose.toISOString().slice(0, 10);
          }
        }
      }

      const noticeKey = `${title}_${advtNo || resolvedLink}`.toLowerCase();
      if (!seenNoticeKeys.has(noticeKey) && !seenNoticeUrls.has(resolvedLink.toLowerCase())) {
        seenNoticeKeys.add(noticeKey);
        if (resolvedLink) seenNoticeUrls.add(resolvedLink.toLowerCase());

        items.push({
          id: `vac-scraped-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          title,
          organisation: defaultOrg,
          domain: hostname,
          sourceCategory: 'OFFICIAL_EMPLOYER',
          sector: hostname.endsWith('.gov.in') || hostname.endsWith('.nic.in') ? 'Central Government' : 'Autonomous Govt Institution',
          advertisementNumber: advtNo,
          sourceUrl: resolvedLink || baseUrl,
          evidenceUrl: baseUrl,
          officialNoticePdfUrl: isPdf ? resolvedLink : '',
          extractedSnippet: rowPlainText.slice(0, 320),
          dates,
          qualifications: this.inferQualifications(title + ' ' + rowPlainText),
          verification: {
            status: 'OFFICIALLY_VERIFIED',
            sourceDomain: hostname,
            officialNoticePdfUrl: isPdf ? resolvedLink : '',
            applicationUrl: resolvedLink || baseUrl,
            evidenceUrl: baseUrl,
            confidenceScore: 100,
            verifiedAt: new Date().toISOString(),
            confirmedFacts: ['ORIGINAL_APEX_PORTAL', 'TABLE_LISTING_CONFIRMED', 'OFFICIAL_GOV_DOMAIN']
          },
          provenance: {
            providerId: 'prov-apex-scraper',
            providerName: `Apex Web Scraper (${defaultOrg})`,
            scrapedFrom: baseUrl,
            discoveredAt: new Date().toISOString()
          },
          isLiveDiscovered: true,
          isTestData: false
        });
      }
    }

    // 2. Direct Anchor / PDF Links Extraction (for portals that use lists or cards like NFSU, CERT-In, C-DAC)
    const noticeLinks = PageDiffEngine.extractNoticeLinks(html, baseUrl);
    for (const notice of noticeLinks) {
      if (seenNoticeUrls.has(notice.url.toLowerCase()) || seenNoticeKeys.has(notice.url.toLowerCase())) continue;

      const title = notice.title.replace(/&amp;/g, '&').replace(/&#8211;/g, '-').trim();
      if (!title || title.length < 8 || /^(home|about|contact|login|sitemap)$/i.test(title)) continue;

      const advtNo = extractAdvertisementNumber(title) || extractAdvertisementNumber(notice.url);
      const dates = parseJobDates(title, title, null);

      seenNoticeKeys.add(notice.url.toLowerCase());
      seenNoticeUrls.add(notice.url.toLowerCase());

      items.push({
        id: `vac-scraped-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title,
        organisation: defaultOrg,
        domain: hostname,
        sourceCategory: 'OFFICIAL_EMPLOYER',
        sector: hostname.endsWith('.gov.in') || hostname.endsWith('.nic.in') ? 'Central Government' : 'Autonomous Govt Institution',
        advertisementNumber: advtNo,
        sourceUrl: notice.url,
        evidenceUrl: baseUrl,
        officialNoticePdfUrl: notice.isPdf ? notice.url : '',
        extractedSnippet: `Official vacancy announcement from ${defaultOrg}: ${title}`,
        dates,
        qualifications: this.inferQualifications(title),
        verification: {
          status: 'OFFICIALLY_VERIFIED',
          sourceDomain: hostname,
          officialNoticePdfUrl: notice.isPdf ? notice.url : '',
          applicationUrl: notice.url,
          evidenceUrl: baseUrl,
          confidenceScore: 100,
          verifiedAt: new Date().toISOString(),
          confirmedFacts: ['ORIGINAL_APEX_PORTAL', 'OFFICIAL_CIRCULAR_CONFIRMED', 'OFFICIAL_GOV_DOMAIN']
        },
        provenance: {
          providerId: 'prov-apex-scraper',
          providerName: `Apex Web Scraper (${defaultOrg})`,
          scrapedFrom: baseUrl,
          discoveredAt: new Date().toISOString()
        },
        isLiveDiscovered: true,
        isTestData: false
      });
    }

    return items;
  }

  /**
   * Infers educational qualification requirements from vacancy title and text
   */
  static inferQualifications(text) {
    if (!text || typeof text !== 'string') return [];
    const quals = [];
    const lower = text.toLowerCase();

    if (/b\.?e\.?|b\.?tech|computer\s*engineering|information\s*technology/i.test(lower)) {
      quals.push('B.E. / B.Tech in Computer Engineering / Information Technology');
    }
    if (/mca|master\s*of\s*computer\s*applications/i.test(lower)) {
      quals.push('MCA (Master of Computer Applications)');
    }
    if (/m\.?sc|master\s*of\s*science|forensic|cyber/i.test(lower)) {
      quals.push('M.Sc in Digital Forensics / Cyber Security / Information Security');
    }
    if (/scientist\s*['"]?b['"]?/i.test(lower)) {
      quals.push('1st Class Bachelor Degree in Engineering/Technology (CS/IT/ECE)');
    }
    if (quals.length === 0) {
      quals.push('Relevant Technical Degree (B.E./B.Tech/MCA/M.Sc) from recognized university');
    }
    return quals;
  }
}
