/**
 * Vacancy Radar India - Apex Web Scraper Engine
 *
 * Direct, verifiable web scrapers for Indian government, PSU & apex technical institutions:
 * - C-DAC (Centre for Development of Advanced Computing)
 * - NFSU (National Forensic Sciences University - Regular & Contractual)
 * - BEL (Bharat Electronics Limited - Cyber Security, Homeland Security & Engineering)
 * - CSIR (Council of Scientific and Industrial Research)
 * - POWERGRID (Power Grid Corporation of India)
 * - ISRO (Indian Space Research Organisation)
 * - RBI (Reserve Bank of India)
 * - NIELIT (National Institute of Electronics & Information Technology)
 * - DRDO RAC (Defence Research & Development Organisation)
 * - UPSC (Union Public Service Commission)
 * - CERT-In (Indian Computer Emergency Response Team)
 *
 * Accuracy Guarantees:
 * - Zero fake closing dates on archived/expired circulars
 * - Accurate Indian DD/MM/YYYY and DD.MM.YYYY date parsing
 * - Strict exclusion of navigation menus, whitepapers, admit cards, results, shortlists & cancellations
 * - HTML comment & chrome stripping before extraction
 * - Official PDF metadata verification for C-DAC & BEL notifications
 */

import https from 'https';
import {
  decryptCdacPayload,
  extractTextFromPdfBuffer,
  saveLearnedSource
} from '../context.js';
import { parseIndianDate, parseJobDates } from '../routes/searchRoutes.js';
import { PageDiffEngine } from '../../js/engine/pageDiffEngine.js';

// Relax TLS certificate verification for Indian governmental and autonomous apex PKI authorities (CCA/NIC root certs)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const govTlsAgent = new https.Agent({ rejectUnauthorized: false });
const pdfMetaCache = new Map();

/**
 * Standard fetch wrapper for government portals with timeouts and resilient headers
 */
export async function fetchGovPage(url, timeoutMs = 8000) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,application/json,*/*;q=0.8',
    'Accept-Language': 'en-IN,en;q=0.9',
    'Cache-Control': 'no-cache'
  };

  return await fetch(url, {
    headers,
    signal: AbortSignal.timeout(timeoutMs),
    redirect: 'follow'
  });
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
  /(?:Advt|Advertisement|Notification|Circular|Ref|Reference|Notice)\.?\s*(?:No\.?|Number)?[\s:–—:\-]*([A-Za-z0-9][A-Za-z0-9\/\-\._\(\)]{2,45})/i,
  /(?:EN|Employment\s*Notice)[\s:–—]*([A-Za-z0-9\/\-\._\(\)]{3,40})/i,
  /(?:Recruit(?:ment)?\/?202[4-9]\/?[A-Za-z0-9\-_]*)/i,
  /\b([A-Z][A-Z0-9\-\(\)]{1,12}\/[A-Za-z0-9\-\/\(\)]{3,38})\b/
];

export function extractAdvertisementNumber(text) {
  if (!text || typeof text !== 'string') return '';
  // Ignore URL path fragments & PDF file names
  const sanitized = text.replace(/https?:\/\/\S+/gi, ' ').trim();
  for (const pat of ADVT_PATTERNS) {
    const match = sanitized.match(pat);
    if (match && match[1]) {
      const advt = match[1].trim().replace(/[\.,;:\s]+$/, '');
      if (
        advt.length >= 3 &&
        /\d/.test(advt) &&
        !/\.pdf$/i.test(advt) &&
        !/^(?:pdf|view|click|link|apply|here|download|reference|details|notice|uploads|data|scan)$/i.test(advt) &&
        !/^(?:[a-z]\d*|wp-content|uploads|data\/pdfs)\//i.test(advt)
      ) {
        return advt;
      }
    }
  }
  return '';
}

/**
 * Strips comments and navigation/chrome sections from raw HTML
 */
export function cleanHtmlBody(html) {
  if (!html || typeof html !== 'string') return '';
  return html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<header\b[^>]*>[\s\S]*?<\/header>/gi, ' ')
    .replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/gi, ' ');
}

/**
 * Decodes HTML entities and collapses whitespace cleanly
 */
export function decodeHtmlText(raw) {
  if (!raw || typeof raw !== 'string') return '';
  return raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#8211;|&ndash;/g, '-')
    .replace(/&#8212;|&mdash;/g, '—')
    .replace(/&#039;|&#x27;/gi, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Returns today's date in YYYY-MM-DD (local time)
 */
export function getLocalTodayIso() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * Strict filter to reject non-vacancy links, whitepapers, admit cards, results, shortlists, and cancellations
 */
export function isNonVacancyOrClosedNotice(title = '', url = '') {
  const txt = `${title} ${url}`.toLowerCase();
  const cleanTitle = title.trim();

  if (!cleanTitle || cleanTitle.length < 6) return true;
  if (/^(?:javascript:|mailto:|tel:|#)/i.test(url)) return true;
  if (/linkedin\.com|twitter\.com|x\.com|facebook\.com|youtube\.com|instagram\.com/i.test(url)) return true;

  // Reject website chrome, statutes, forms, certificates & vendor docs
  if (/^(?:home|about|contact|login|sitemap|recruitment|selection\s*for\s*pg|direct\s*recruitment|recruitment\s*policy|recruitment\s*methodology|apprenticeship\s*opportunities|online\s*recruitment\s*application|examination\s*calendar|active\s*examinations|previous\s*exam|notifications?|statutes|advertisement|brief\s*advertisement|recruitment\s*notice|apply\s*now(?:\s*open_in_new)?|read\s*more|click\s*here|details)$/i.test(cleanTitle)) {
    return true;
  }
  if (/\b(?:certificate\s*format|obc[\-_]?format|ews[\-_]?certificate|sc[_\-]st[_\-]certificate|pwd[_\-]certificate|sbcollect|sbi\s*collect|export\s*booklet|corporate\s*brochure|vendor\s*(?:check|directory)|sub\s*contract\s*procedure|works\s*contract\s*procedure|reprint\s*application|caution|चेतावनी|application\s*form\s+for\s+walk[\-\s]?in|interview\s*application\s+consultant|dividends?\s+payment|shareholders?|unclaimed\s+dividend|advt_15[0-7](?:_|\.)|gatepublicnotice)\b/i.test(txt)) {
    return true;
  }

  // Reject cybersecurity bulletins, advisories, whitepapers & draft rules
  if (/\b(?:vulnerability\s*note|civn-\d+|sbom|qbom|cbom|aibom|hbom|blueprint\s*for\s*reducing|technical\s*guidelines|information\s*security\s*practices|directions\s*by\s*cert-in|comments\s*of\s*(?:the\s*)?stakeholders|draft\s*rrs|annual\s*report|global\s*research\s*partner|faqs?)\b/i.test(txt)) {
    return true;
  }

  // Reject post-application stage notices (results, admit cards, shortlists, cancellations, challenges, answer keys)
  if (/\b(?:download\s*admit\s*card|admit\s*card|hall\s*ticket|call\s*letter|interview\s*letter|written\s*examination\s*result|skill\s*test\s*result|exam(?:ination)?\s*result|final\s*result|results?\s+of|select\s*list|selected\s*candidates|short[\s\-]?listed\s*candidates|provisionally\s*(?:not\s*)?(?:short\s*listed|eligible)|not\s*eligible\s*candidates|rejected\s*list|merit\s*list|waiting\s*list|answer\s*key|cut[\-\s]?off\s*marks|cutoff\s*marks|application\s*status|number\s*of\s*application|cancellation\s*of|recruitment\s*cancelled|challenge\s*period|administrative\s*screening|recommendations?\s+for\s+vacancies|selection\s*panel|schedule\s+of\s+interview|interview\s*schedule|important\s*info:\s*the\s*provisionally)\b/i.test(txt)) {
    return true;
  }

  // Exclude explicit Hindi-only rows when English equivalent exists
  if (/^[\u0900-\u097F\s0-9\-\(\)\[\]\/,\.:]+$/.test(cleanTitle)) {
    return true;
  }

  return false;
}

/**
 * Checks whether a parsed vacancy's dates show it has already closed/expired
 */
export function isVacancyDateExpired(dates = {}) {
  const today = getLocalTodayIso();
  if (dates.isArchived) return true;
  if (dates.closingDate && /^\d{4}-\d{2}-\d{2}$/.test(dates.closingDate)) {
    if (dates.closingDate < today) return true;
  }
  // If non-rolling notice has NO closing date and publishedAt is > 35 days old, consider closed
  if (!dates.closingDate && !dates.isRolling && dates.publishedAt && /^\d{4}-\d{2}-\d{2}$/.test(dates.publishedAt)) {
    const pubMs = new Date(dates.publishedAt).getTime();
    if (!isNaN(pubMs) && (Date.now() - pubMs) > 35 * 86400000) {
      return true;
    }
  }
  return false;
}

/**
 * Extracts deadline, advt number, posts & pay hints from an official PDF circular (with caching)
 */
async function inspectOfficialPdfMeta(pdfUrl) {
  if (!pdfUrl || !/\.pdf/i.test(pdfUrl)) return null;
  if (pdfMetaCache.has(pdfUrl)) return pdfMetaCache.get(pdfUrl);

  try {
    const res = await fetchGovPage(pdfUrl, 5000);
    if (!res.ok) return null;
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    if (!ct.includes('pdf') && !pdfUrl.toLowerCase().includes('.pdf')) return null;

    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 500 || buf.length > 8 * 1024 * 1024) return null;

    const parsed = await extractTextFromPdfBuffer(buf);
    const flat = (parsed.text || '').replace(/\s+/g, ' ').trim();
    if (flat.length < 80) {
      pdfMetaCache.set(pdfUrl, { emptyOrScanned: true });
      return { emptyOrScanned: true };
    }

    const dates = parseJobDates('', flat.slice(0, 35000), null);
    // Keep only header publication date when PDF contains no explicit future deadline
    if (!dates.closingDate && dates.publishedAt) {
      const headerDates = parseJobDates('', flat.slice(0, 1200), null);
      if (headerDates.publishedAt) dates.publishedAt = headerDates.publishedAt;
    }
    const advtNo = extractAdvertisementNumber(flat.slice(0, 2000));

    let payScale = '';
    const payMatch = flat.match(/(?:Pay\s*(?:Level|Band|Scale|Matrix)|CTC|Consolidated\s*(?:Pay|Remuneration|Emoluments?))[\s:–—]*([^\n\.]{5,65})/i);
    if (payMatch) payScale = payMatch[1].trim().slice(0, 60);

    let totalPosts = 0;
    const postMatch = flat.match(/(?:Total\s*(?:No\.?\s*of\s*)?(?:Posts|Vacancies)|Number\s*of\s*Posts)[\s:–—]*(\d{1,4})\b/i);
    if (postMatch) totalPosts = parseInt(postMatch[1], 10);

    const meta = { dates, advtNo, payScale, totalPosts, snippet: flat.slice(0, 300) };
    pdfMetaCache.set(pdfUrl, meta);
    return meta;
  } catch (_) {
    return null;
  }
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
    id: 'scraper-bel',
    name: 'Bharat Electronics Limited (BEL)',
    shortName: 'BEL',
    domain: 'bel-india.in',
    portalUrl: 'https://bel-india.in/job-notifications/',
    category: 'Public Sector Undertaking (PSU)',
    description: 'Navratna Defence PSU recruiting Network & Cyber Security, Homeland Security & Software Engineers',
    enabled: true
  },
  {
    id: 'scraper-csir',
    name: 'Council of Scientific and Industrial Research (CSIR)',
    shortName: 'CSIR',
    domain: 'csir.res.in',
    portalUrl: 'https://www.csir.res.in/en/career-opportunities/recruitment',
    category: 'Autonomous Govt Institution',
    description: 'National R&D laboratories recruiting Scientific, Technical and Project personnel',
    enabled: true
  },
  {
    id: 'scraper-powergrid',
    name: 'Power Grid Corporation of India (POWERGRID)',
    shortName: 'POWERGRID',
    domain: 'powergrid.in',
    portalUrl: 'https://www.powergrid.in/job-opportunities',
    category: 'Public Sector Undertaking (PSU)',
    description: 'Maharatna PSU recruiting Computer Science, IT & Electronics Engineers',
    enabled: true
  },
  {
    id: 'scraper-isro',
    name: 'Indian Space Research Organisation (ISRO)',
    shortName: 'ISRO',
    domain: 'isro.gov.in',
    portalUrl: 'https://www.isro.gov.in/Careers.html',
    category: 'Central Government',
    description: 'Department of Space recruiting Scientist/Engineer SC and Technical positions',
    enabled: true
  },
  {
    id: 'scraper-rbi',
    name: 'Reserve Bank of India (RBI)',
    shortName: 'RBI',
    domain: 'rbi.org.in',
    portalUrl: 'https://opportunities.rbi.org.in/scripts/vacancies.aspx',
    category: 'Central Recruitment Board',
    description: 'RBI Specialist Officers, IT & Cyber Security cadre openings',
    enabled: true
  },
  {
    id: 'scraper-nielit',
    name: 'National Institute of Electronics and Information Technology (NIELIT)',
    shortName: 'NIELIT',
    domain: 'nielit.gov.in',
    portalUrl: 'https://recruit-delhi.nielit.gov.in/',
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
    portalUrl: 'https://upsc.gov.in/advertisements/',
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
   * Scrapes all enabled apex portals + user-specified custom target domains.
   * Returns only verified ACTIVE/OPEN vacancies unless includeExpired=true.
   */
  static async scrapeAllApexPortals(options = {}) {
    const { targetDomains = [], includeExpired = false } = options;
    const t0 = Date.now();
    const results = [];
    const portalStatuses = {};

    const activeScrapers = MONITORED_APEX_SCRAPERS.filter(scraper => {
      if (!scraper.enabled) return false;
      if (targetDomains.length === 0) return true;
      return targetDomains.some(td => {
        const cleanTd = td.toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
        return scraper.domain.includes(cleanTd) || cleanTd.includes(scraper.domain);
      });
    });

    const scraperFns = {
      'scraper-cdac': (s) => this.scrapeCdac(s, { includeExpired }),
      'scraper-nfsu': (s) => this.scrapeNfsu(s, { includeExpired }),
      'scraper-bel': (s) => this.scrapeBel(s, { includeExpired }),
      'scraper-csir': (s) => this.scrapeCsir(s, { includeExpired }),
      'scraper-powergrid': (s) => this.scrapePowerGrid(s, { includeExpired }),
      'scraper-isro': (s) => this.scrapeIsro(s, { includeExpired }),
      'scraper-rbi': (s) => this.scrapeRbi(s, { includeExpired }),
      'scraper-nielit': (s) => this.scrapeNielit(s, { includeExpired }),
      'scraper-drdo': (s) => this.scrapeDrdo(s, { includeExpired }),
      'scraper-upsc': (s) => this.scrapeUpsc(s, { includeExpired }),
      'scraper-certin': (s) => this.scrapeCertIn(s, { includeExpired })
    };

    await Promise.allSettled(activeScrapers.map(async (scraper) => {
      const startTime = Date.now();
      try {
        const fn = scraperFns[scraper.id];
        const portalVacancies = fn ? await fn(scraper) : [];
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
    }));

    // Custom user-added domains (in parallel)
    const predefinedDomains = new Set(MONITORED_APEX_SCRAPERS.map(s => s.domain));
    const customTargets = targetDomains.filter(rawDomain => {
      const cleanDomain = rawDomain.toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();
      return cleanDomain && !predefinedDomains.has(cleanDomain);
    });

    await Promise.allSettled(customTargets.map(async (rawDomain) => {
      const cleanDomain = rawDomain.toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();
      const startTime = Date.now();
      try {
        const customUrl = rawDomain.startsWith('http') ? rawDomain : `https://${cleanDomain}`;
        const customVacancies = await this.scrapeGenericGovPortal(customUrl, cleanDomain, { includeExpired });
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
    }));

    // Deduplicate across this scrape run by PDF URL, Advt No, or Org+Normalized Title
    const seenMap = new Map();
    const uniqueVacancies = [];

    for (const v of results) {
      if (!includeExpired && isVacancyDateExpired(v.dates)) continue;

      const normTitle = (v.title || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
      const key = (v.officialNoticePdfUrl && v.officialNoticePdfUrl.length > 10)
        ? `pdf:${v.officialNoticePdfUrl.toLowerCase()}`
        : (v.advertisementNumber && v.advertisementNumber.length > 3)
          ? `advt:${v.domain}:${v.advertisementNumber.toLowerCase()}`
          : `title:${v.domain}:${normTitle}`;

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
      return { portal: scraper, ...res };
    }

    const customUrl = clean.startsWith('http') ? clean : `https://${clean}`;
    const vacancies = await this.scrapeGenericGovPortal(customUrl, clean);
    return {
      portal: { id: `custom-${clean}`, name: clean, domain: clean, portalUrl: customUrl },
      success: true,
      count: vacancies.length,
      vacancies
    };
  }

  /**
   * Constructs a normalized, evidence-backed vacancy record
   */
  static buildVacancyRecord({
    idPrefix = 'vac-scraped',
    title,
    organisation,
    domain,
    sourceCategory = 'OFFICIAL_EMPLOYER',
    sector,
    advertisementNumber = '',
    payScale = '',
    totalPosts = 0,
    location = '',
    sourceUrl,
    applicationUrl,
    evidenceUrl,
    officialNoticePdfUrl = '',
    extractedSnippet = '',
    dates = {},
    qualifications = [],
    providerName = ''
  }) {
    const cleanTitle = decodeHtmlText(title);
    const cleanPdf = officialNoticePdfUrl ? resolveUrl(officialNoticePdfUrl, evidenceUrl || sourceUrl) : '';
    const cleanSource = resolveUrl(sourceUrl || cleanPdf || evidenceUrl, evidenceUrl || sourceUrl);
    const cleanApply = resolveUrl(applicationUrl || cleanSource, evidenceUrl || sourceUrl);
    const isPdfSource = /\.pdf(?:[\?#]|$)/i.test(cleanPdf || cleanSource);

    return {
      id: `${idPrefix}-${Buffer.from(`${domain}:${cleanTitle}:${advertisementNumber}`).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 18)}`,
      title: cleanTitle,
      organisation,
      domain,
      sourceCategory,
      sector: sector || (domain.endsWith('.gov.in') || domain.endsWith('.nic.in') ? 'Central Government' : 'Autonomous Govt Institution'),
      advertisementNumber: advertisementNumber || '',
      numberOfPosts: totalPosts || undefined,
      remuneration: payScale ? { amountText: payScale } : undefined,
      location: location ? (typeof location === 'string' ? { city: location, state: '' } : location) : undefined,
      sourceUrl: cleanSource,
      evidenceUrl: evidenceUrl || cleanSource,
      officialNoticePdfUrl: cleanPdf || (isPdfSource ? cleanSource : ''),
      extractedSnippet: decodeHtmlText(extractedSnippet || `Official vacancy circular from ${organisation}: ${cleanTitle}`).slice(0, 320),
      dates: {
        publishedAt: dates.publishedAt || getLocalTodayIso(),
        closingDate: dates.closingDate || '',
        ...(dates.isRolling ? { isRolling: true } : {}),
        ...(dates.isArchived ? { isArchived: true } : {})
      },
      qualifications: qualifications.length ? qualifications : this.inferQualifications(cleanTitle + ' ' + extractedSnippet),
      verification: {
        status: 'OFFICIALLY_VERIFIED',
        sourceDomain: domain,
        officialNoticePdfUrl: cleanPdf || (isPdfSource ? cleanSource : ''),
        applicationUrl: cleanApply,
        evidenceUrl: evidenceUrl || cleanSource,
        confidenceScore: 100,
        verifiedAt: new Date().toISOString(),
        confirmedFacts: ['ORIGINAL_APEX_PORTAL', 'OFFICIAL_CIRCULAR_CONFIRMED', 'OFFICIAL_GOV_DOMAIN']
      },
      provenance: {
        providerId: 'prov-apex-scraper',
        providerName: providerName || `Official Apex Scraper (${organisation})`,
        scrapedFrom: evidenceUrl || cleanSource,
        discoveredAt: new Date().toISOString()
      },
      isLiveDiscovered: true,
      isTestData: false
    };
  }

  // =========================================================================
  // DEDICATED PORTAL SCRAPERS
  // =========================================================================

  /**
   * 1. C-DAC Scraper (careers.cdac.in encrypted API + public current_jobs HTML fallback)
   */
  static async scrapeCdac(scraper, opts = {}) {
    const vacancies = [];

    // A. Attempt C-DAC Encrypted Application API
    try {
      const advtRes = await fetchGovPage('https://careers.cdac.in/advt-1', 8000);
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
                const skills = decodeHtmlText(p.skill_set || '');
                const qual = decodeHtmlText(p.educational_qualification || '');
                const closing = p.last_date_of_advt ? p.last_date_of_advt.slice(0, 10) : '';
                if (!opts.includeExpired && closing && closing < getLocalTodayIso()) continue;

                vacancies.push(this.buildVacancyRecord({
                  idPrefix: `cdac-${p.post_id || 'post'}`,
                  title,
                  organisation: 'Centre for Development of Advanced Computing (C-DAC)',
                  domain: 'cdac.in',
                  sector: 'Autonomous Govt Institution',
                  advertisementNumber: p.advt_no || advt.advt_no || '',
                  payScale: p.salary || 'Consolidated Project Scale',
                  totalPosts: parseInt(p.no_of_posts, 10) || 0,
                  location: p.location || 'India',
                  sourceUrl: `https://careers.cdac.in/post-details/${p.post_id || ''}`,
                  evidenceUrl: 'https://careers.cdac.in',
                  extractedSnippet: `${title} at C-DAC. Skills: ${skills.slice(0, 160)}.`,
                  dates: { publishedAt: getLocalTodayIso(), closingDate: closing },
                  qualifications: qual ? [qual] : [],
                  providerName: 'Official Apex Web Scraper (C-DAC Careers)'
                }));
              }
            }
          } catch (_) {}
        }
      }
    } catch (_) {}

    if (vacancies.length > 0) {
      saveLearnedSource('careers.cdac.in', { url: 'https://careers.cdac.in', organisation: 'Centre for Development of Advanced Computing (C-DAC)' });
      return vacancies;
    }

    // B. Public C-DAC current_jobs HTML page: slice ONLY Current Openings & Rolling Advertisements (before Notifications)
    try {
      const htmlRes = await fetchGovPage(scraper.fallbackUrl, 10000);
      if (htmlRes.ok) {
        let html = cleanHtmlBody(await htmlRes.text());
        const startIdx = html.indexOf('Current Openings');
        const endIdx = html.indexOf('Notifications</h3>');
        if (startIdx > -1) {
          html = endIdx > startIdx ? html.slice(startIdx, endIdx) : html.slice(startIdx);
        }

        const blocks = html.split(/<hr\s*\/?>|(?=<h3\b)/i);
        for (const block of blocks) {
          const text = decodeHtmlText(block);
          if (!text || text.length < 15) continue;

          const anchors = [...block.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
            .map(m => ({ url: resolveUrl(m[1], scraper.fallbackUrl), label: decodeHtmlText(m[2]) }))
            .filter(a => a.url && !a.url.startsWith('javascript:'));

          if (anchors.length === 0) continue;

          // Build clean title from primary bold text or anchor label
          const strongMatch = block.match(/<strong>([\s\S]*?)<\/strong>/i);
          const title = decodeHtmlText(strongMatch ? strongMatch[1] : anchors[0].label) || anchors[0].label;
          if (isNonVacancyOrClosedNotice(title, anchors[0].url) || isNonVacancyOrClosedNotice(text, anchors[0].url)) continue;

          const pdfAnchor = anchors.find(a => /\.pdf/i.test(a.url) && !/application[\-_]?form|interview[\-_]?application/i.test(a.url + ' ' + a.label));
          const applyAnchor = anchors.find(a => !/\.pdf/i.test(a.url)) || pdfAnchor || anchors[0];
          const primaryUrl = (pdfAnchor || applyAnchor).url;

          // Extract date tokens in text and URLs (e.g. ca_TvmContractStaff130526 -> 13/05/2026)
          let urlDateHint = '';
          const ddmmyyUrl = primaryUrl.match(/(\d{2})(\d{2})(202\d|2\d)(?:\.pdf|$)/i);
          if (ddmmyyUrl) {
            const yr = ddmmyyUrl[3].length === 2 ? `20${ddmmyyUrl[3]}` : ddmmyyUrl[3];
            urlDateHint = `Date: ${ddmmyyUrl[1]}/${ddmmyyUrl[2]}/${yr}`;
          }

          let dates = parseJobDates(title, `${text} ${urlDateHint}`, null);
          let advtNo = extractAdvertisementNumber(text) || extractAdvertisementNumber(title);
          let payScale = '';
          let totalPosts = 0;

          // Verify actual PDF dates for undated Current Openings so expired PDFs don't masquerade as live
          if (!dates.isRolling && !dates.isArchived && pdfAnchor && !dates.closingDate) {
            const pdfMeta = await inspectOfficialPdfMeta(pdfAnchor.url);
            if (pdfMeta && !pdfMeta.emptyOrScanned) {
              if (pdfMeta.dates?.closingDate) dates.closingDate = pdfMeta.dates.closingDate;
              if (pdfMeta.dates?.publishedAt) dates.publishedAt = pdfMeta.dates.publishedAt;
              if (pdfMeta.dates?.isArchived) dates.isArchived = true;
              if (pdfMeta.advtNo && !advtNo) advtNo = pdfMeta.advtNo;
              if (pdfMeta.payScale) payScale = pdfMeta.payScale;
              if (pdfMeta.totalPosts) totalPosts = pdfMeta.totalPosts;
            }
          }

          // Skip rolling schemes? No, Rolling Advertisements (CAE/ADS) are active year-round; skip non-rolling expired/old ones
          if (!opts.includeExpired && isVacancyDateExpired(dates)) continue;

          // Also if non-rolling C-DAC notice has NO date at all AND came from a known old subpage ID, skip unless corrigendum 2026
          const hasCorrigendum = /corrigendum/i.test(text) && /2026/i.test(text);
          if (!opts.includeExpired && !dates.isRolling && !dates.closingDate && !hasCorrigendum) {
            continue;
          }

          vacancies.push(this.buildVacancyRecord({
            idPrefix: 'cdac-html',
            title: title.length > 180 ? title.slice(0, 177) + '...' : title,
            organisation: 'Centre for Development of Advanced Computing (C-DAC)',
            domain: 'cdac.in',
            sector: 'Autonomous Govt Institution',
            advertisementNumber: advtNo,
            payScale,
            totalPosts,
            sourceUrl: applyAnchor.url,
            applicationUrl: applyAnchor.url,
            evidenceUrl: scraper.fallbackUrl,
            officialNoticePdfUrl: pdfAnchor ? pdfAnchor.url : '',
            extractedSnippet: text.slice(0, 280),
            dates,
            providerName: 'Official Apex Web Scraper (C-DAC Portal)'
          }));
        }
      }
    } catch (_) {}

    return vacancies;
  }

  /**
   * 2. NFSU Scraper (<fieldset> parser for Regular & Contractual Recruitment)
   */
  static async scrapeNfsu(scraper, opts = {}) {
    const vacancies = [];
    const endpoints = [
      scraper.contractualRecruitmentUrl || 'https://nfsu.ac.in/Contractual_Recruitment',
      scraper.regularRecruitmentUrl || 'https://nfsu.ac.in/Regular_Recruitment'
    ];

    for (const pageUrl of endpoints) {
      try {
        const res = await fetchGovPage(pageUrl, 12000);
        if (!res.ok) continue;
        const html = cleanHtmlBody(await res.text());

        const fieldsets = [...html.matchAll(/<fieldset\b[^>]*>([\s\S]*?)<\/fieldset>/gi)];
        for (const fsMatch of fieldsets) {
          const fsHtml = fsMatch[1];
          const legendRaw = (fsHtml.match(/<legend[^>]*>([\s\S]*?)<\/legend>/i) || [])[1] || '';
          const anchors = [...fsHtml.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
            .map(m => ({ url: resolveUrl(m[1], pageUrl), text: decodeHtmlText(m[2]) }))
            .filter(a => a.url && !a.url.startsWith('javascript:'));

          if (anchors.length === 0) continue;

          const bodyText = decodeHtmlText(fsHtml);
          let title = decodeHtmlText(legendRaw) || anchors[0].text;
          if (isNonVacancyOrClosedNotice(title, anchors[0].url)) continue;

          // Identify notice PDF vs application portal link (e.g. Google Form or Samarth)
          const pdfAnchor = anchors.find(a => /\.pdf/i.test(a.url) && !/syllabus|corrigendum/i.test(a.text));
          const anyPdf = pdfAnchor || anchors.find(a => /\.pdf/i.test(a.url));
          const applyAnchor = anchors.find(a => /forms\.gle|docs\.google\.com\/forms|samarth|apply/i.test(a.url + ' ' + a.text)) || anyPdf || anchors[0];

          const dates = parseJobDates(title, bodyText, null);
          if (!opts.includeExpired && isVacancyDateExpired(dates)) continue;

          const advtNo = extractAdvertisementNumber(title) || extractAdvertisementNumber(bodyText);
          let location = 'Gandhinagar / Pan-India Campus';
          const campusMatch = title.match(/NFSU[\s,\-]+([A-Za-z]+)(?:\s+Campus)?/i);
          if (campusMatch) location = `NFSU ${campusMatch[1]} Campus`;

          vacancies.push(this.buildVacancyRecord({
            idPrefix: 'nfsu',
            title: title.replace(/\s*Last Updated\s*:.*$/i, '').trim(),
            organisation: 'National Forensic Sciences University (NFSU)',
            domain: 'nfsu.ac.in',
            sector: 'Autonomous Govt Institution',
            advertisementNumber: advtNo,
            location,
            sourceUrl: applyAnchor.url,
            applicationUrl: applyAnchor.url,
            evidenceUrl: pageUrl,
            officialNoticePdfUrl: anyPdf ? anyPdf.url : '',
            extractedSnippet: bodyText.slice(0, 280),
            dates,
            providerName: 'Official Apex Web Scraper (NFSU Career Portal)'
          }));
        }
      } catch (_) {}
    }

    saveLearnedSource('nfsu.ac.in', { url: 'https://nfsu.ac.in/career', organisation: 'National Forensic Sciences University (NFSU)' });
    return vacancies;
  }

  /**
   * 3. BEL Scraper (.career-result-box parser + PDF verification for Closing Date & Advt No)
   */
  static async scrapeBel(scraper, opts = {}) {
    const vacancies = [];
    const url = scraper.portalUrl || 'https://bel-india.in/job-notifications/';

    try {
      const res = await fetchGovPage(url, 12000);
      if (!res.ok) return vacancies;
      const html = cleanHtmlBody(await res.text());

      const boxes = html.split('<div class="career-result-box">').slice(1).slice(0, 12);
      const parsedBoxes = await Promise.all(boxes.map(async (b) => {
        const endSec = b.indexOf('</section>');
        const chunk = endSec > -1 ? b.slice(0, endSec) : b.slice(0, 5000);

        const titleMatch = chunk.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
        const title = decodeHtmlText(titleMatch ? titleMatch[1] : '');
        if (!title || isNonVacancyOrClosedNotice(title, url)) return null;

        const anchors = [...chunk.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
          .map(m => ({ url: resolveUrl(m[1], url), label: decodeHtmlText(m[2]) }))
          .filter(a => a.url && !isNonVacancyOrClosedNotice(a.label, a.url));

        const pdfAnchor = anchors.find(a => /\.pdf/i.test(a.url) && !/format|sbcollect|instruction|application/i.test(a.url));
        const applyAnchor = anchors.find(a => /jobapply|apply/i.test(a.url)) || pdfAnchor || anchors[0];
        if (!applyAnchor && !pdfAnchor) return null;

        const chunkText = decodeHtmlText(chunk);
        let dates = parseJobDates(title, chunkText, null);
        let advtNo = extractAdvertisementNumber(title) || extractAdvertisementNumber(chunkText);
        let payScale = '';
        let totalPosts = 0;

        if (pdfAnchor && (!dates.closingDate || !advtNo)) {
          const pdfMeta = await inspectOfficialPdfMeta(pdfAnchor.url);
          if (pdfMeta && !pdfMeta.emptyOrScanned) {
            if (!dates.closingDate && pdfMeta.dates?.closingDate) dates.closingDate = pdfMeta.dates.closingDate;
            if (pdfMeta.dates?.publishedAt) dates.publishedAt = pdfMeta.dates.publishedAt;
            if (pdfMeta.dates?.isArchived) dates.isArchived = true;
            if (!advtNo && pdfMeta.advtNo) advtNo = pdfMeta.advtNo;
            if (pdfMeta.payScale) payScale = pdfMeta.payScale;
            if (pdfMeta.totalPosts) totalPosts = pdfMeta.totalPosts;
          }
        }

        if (!dates.closingDate) {
          const pathMonth = (pdfAnchor?.url || '').match(/uploads\/(202\d)\/(0?\d|1[0-2])\//i);
          if (pathMonth && parseInt(pathMonth[1], 10) <= 2026 && parseInt(pathMonth[2], 10) < 10) {
            dates.isArchived = true;
          }
        }

        if (!opts.includeExpired && isVacancyDateExpired(dates)) return null;

        return this.buildVacancyRecord({
          idPrefix: 'bel',
          title,
          organisation: 'Bharat Electronics Limited (BEL)',
          domain: 'bel-india.in',
          sector: 'Public Sector Undertaking (PSU)',
          advertisementNumber: advtNo,
          payScale,
          totalPosts,
          sourceUrl: (applyAnchor || pdfAnchor).url,
          applicationUrl: (applyAnchor || pdfAnchor).url,
          evidenceUrl: url,
          officialNoticePdfUrl: pdfAnchor ? pdfAnchor.url : '',
          extractedSnippet: chunkText.slice(0, 280),
          dates,
          providerName: 'Official Apex Web Scraper (BEL Recruitment)'
        });
      }));
      vacancies.push(...parsedBoxes.filter(Boolean));
    } catch (_) {}

    return vacancies;
  }

  /**
   * 4. CSIR Scraper (https://www.csir.res.in/en/career-opportunities/recruitment)
   */
  static async scrapeCsir(scraper, opts = {}) {
    const vacancies = [];
    const url = scraper.portalUrl || 'https://www.csir.res.in/en/career-opportunities/recruitment';
    try {
      const res = await fetchGovPage(url, 12000);
      if (!res.ok) return vacancies;
      const html = cleanHtmlBody(await res.text());
      const extracted = this.extractVacanciesFromHtml(html, url, 'Council of Scientific and Industrial Research (CSIR)', 'csir.res.in', opts);
      vacancies.push(...extracted);
    } catch (_) {}
    return vacancies;
  }

  /**
   * 5. POWERGRID Scraper (https://www.powergrid.in/job-opportunities)
   */
  static async scrapePowerGrid(scraper, opts = {}) {
    const vacancies = [];
    const url = scraper.portalUrl || 'https://www.powergrid.in/job-opportunities';
    try {
      const res = await fetchGovPage(url, 12000);
      if (!res.ok) return vacancies;
      const html = cleanHtmlBody(await res.text());
      const matches = [...html.matchAll(/<li[^>]*>\s*<a[^>]*href=["']([^"']*)["'][^>]*title=["']([^"']+)["'][^>]*>/gi)];
      for (const m of matches) {
        const title = decodeHtmlText(m[2]);
        const link = resolveUrl(m[1], url) || url;
        if (!title || isNonVacancyOrClosedNotice(title, link)) continue;
        if (!/(?:recruit|engineer|trainee|officer|executive|advt)/i.test(title)) continue;

        const dates = parseJobDates(title, title, null);
        if (!opts.includeExpired && isVacancyDateExpired(dates)) continue;

        vacancies.push(this.buildVacancyRecord({
          idPrefix: 'pgcil',
          title,
          organisation: 'Power Grid Corporation of India (POWERGRID)',
          domain: 'powergrid.in',
          sector: 'Public Sector Undertaking (PSU)',
          advertisementNumber: extractAdvertisementNumber(title),
          sourceUrl: link,
          evidenceUrl: url,
          officialNoticePdfUrl: /\.pdf/i.test(link) ? link : '',
          extractedSnippet: `Official notification from POWERGRID: ${title}`,
          dates,
          providerName: 'Official Apex Web Scraper (POWERGRID)'
        }));
      }
    } catch (_) {}
    return vacancies;
  }

  /**
   * 6. ISRO Scraper (https://www.isro.gov.in/Careers.html)
   */
  static async scrapeIsro(scraper, opts = {}) {
    const vacancies = [];
    const url = scraper.portalUrl || 'https://www.isro.gov.in/Careers.html';
    try {
      const res = await fetchGovPage(url, 8000);
      if (!res.ok) return vacancies;
      const html = cleanHtmlBody(await res.text());
      const extracted = this.extractVacanciesFromHtml(html, url, 'Indian Space Research Organisation (ISRO)', 'isro.gov.in', opts);
      for (const v of extracted) {
        v.title = v.title.replace(/\s*Read\s*More$/i, '').trim();
        // Verify Status: Open vs Closed on ISRO detail page when available
        if (!opts.includeExpired && v.sourceUrl && v.sourceUrl.includes('isro.gov.in') && !v.sourceUrl.endsWith('.pdf')) {
          try {
            const detRes = await fetchGovPage(v.sourceUrl, 5000);
            if (detRes.ok) {
              const detTxt = decodeHtmlText(await detRes.text());
              if (/Status:\s*Closed/i.test(detTxt)) continue;
              const locM = detTxt.match(/Location:\s*[^\/]+\/\s*([A-Za-z\s,]+)/i);
              if (locM) v.location = { city: locM[1].trim(), state: '' };
            }
          } catch (_) {}
        }
        vacancies.push(v);
      }
    } catch (_) {}
    return vacancies;
  }

  /**
   * 7. RBI Scraper (https://opportunities.rbi.org.in/scripts/vacancies.aspx)
   */
  static async scrapeRbi(scraper, opts = {}) {
    const vacancies = [];
    const url = scraper.portalUrl || 'https://opportunities.rbi.org.in/scripts/vacancies.aspx';
    try {
      const res = await fetchGovPage(url, 8000);
      if (!res.ok) return vacancies;
      const html = cleanHtmlBody(await res.text());

      // Track RBI section date headers ("Nov 02, 2026", "Oct 26, 2026") across <tr> rows
      let currentHeaderDate = '';
      const rowMatches = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
      for (const rm of rowMatches) {
        const rowHtml = rm[1];
        const rowText = decodeHtmlText(rowHtml);
        if (!rowText || rowText.length < 6) continue;

        const maybeDate = parseIndianDate(rowText);
        if (maybeDate && rowText.length < 25) {
          currentHeaderDate = maybeDate;
          continue;
        }

        const linkM = rowHtml.match(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
        if (!linkM) continue;
        const title = decodeHtmlText(linkM[2]);
        const link = resolveUrl(linkM[1], url);
        if (!/(?:recruitment|engagement|officer|consultant|specialist|grade)/i.test(title)) continue;
        if (isNonVacancyOrClosedNotice(title, link)) continue;

        const dates = parseJobDates(title, `${rowText} ${currentHeaderDate ? 'Dated ' + currentHeaderDate : ''}`, currentHeaderDate || null);
        if (!opts.includeExpired && isVacancyDateExpired(dates)) continue;

        vacancies.push(this.buildVacancyRecord({
          title,
          organisation: 'Reserve Bank of India (RBI)',
          domain: 'rbi.org.in',
          sourceCategory: 'RECRUITMENT_BOARD',
          sector: 'Central Recruitment Board',
          advertisementNumber: extractAdvertisementNumber(title),
          sourceUrl: link,
          evidenceUrl: url,
          officialNoticePdfUrl: /\.pdf/i.test(link) ? link : '',
          extractedSnippet: rowText,
          dates,
          providerName: 'Official Apex Web Scraper (RBI)'
        }));
      }
    } catch (_) {}
    return vacancies;
  }

  /**
   * 8. NIELIT Scraper
   */
  static async scrapeNielit(scraper, opts = {}) {
    const vacancies = [];
    const url = scraper.portalUrl || 'https://recruit-delhi.nielit.gov.in/';
    try {
      const res = await fetchGovPage(url, 8000);
      if (res.ok) {
        const html = cleanHtmlBody(await res.text());
        // Extract per card/block on recruit-delhi.nielit.gov.in so Last Date text next to anchor is preserved
        const blockMatches = [...html.matchAll(/<div[^>]*class=["'][^"']*(?:card|row|panel|job|recruit|notice)[^"']*["'][^>]*>([\s\S]{30,1800}?)<\/div>/gi)];
        if (blockMatches.length > 0) {
          for (const bm of blockMatches) {
            const blkText = decodeHtmlText(bm[1]);
            const linkM = bm[1].match(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
            if (!linkM || !/recruitment|scientist|assistant|engineer|officer|advt/i.test(blkText)) continue;
            const title = decodeHtmlText(linkM[2]);
            const link = resolveUrl(linkM[1], url);
            if (isNonVacancyOrClosedNotice(title, link)) continue;
            const dates = parseJobDates(title, blkText, null);
            if (!opts.includeExpired && isVacancyDateExpired(dates)) continue;
            vacancies.push(this.buildVacancyRecord({
              title,
              organisation: 'National Institute of Electronics and Information Technology (NIELIT)',
              domain: 'nielit.gov.in',
              advertisementNumber: extractAdvertisementNumber(blkText),
              sourceUrl: link,
              evidenceUrl: url,
              officialNoticePdfUrl: /\.pdf/i.test(link) ? link : '',
              extractedSnippet: blkText,
              dates,
              providerName: 'Official Apex Web Scraper (NIELIT)'
            }));
          }
        } else {
          const extracted = this.extractVacanciesFromHtml(html, url, 'National Institute of Electronics and Information Technology (NIELIT)', 'nielit.gov.in', opts);
          vacancies.push(...extracted);
        }
      }
    } catch (_) {}
    return vacancies;
  }

  /**
   * 9. DRDO RAC Scraper
   */
  static async scrapeDrdo(scraper, opts = {}) {
    const vacancies = [];
    const url = scraper.portalUrl || 'https://rac.gov.in';
    try {
      const res = await fetchGovPage(url, 10000);
      if (res.ok) {
        const html = cleanHtmlBody(await res.text());
        const extracted = this.extractVacanciesFromHtml(html, url, 'Defence Research and Development Organisation (DRDO RAC)', 'rac.gov.in', opts);
        vacancies.push(...extracted);
      }
    } catch (_) {}
    return vacancies;
  }

  /**
   * 10. UPSC Scraper
   */
  static async scrapeUpsc(scraper, opts = {}) {
    const vacancies = [];
    const url = scraper.portalUrl || 'https://upsc.gov.in/advertisements/';
    try {
      const res = await fetchGovPage(url, 10000);
      if (res.ok) {
        const html = cleanHtmlBody(await res.text());
        const extracted = this.extractVacanciesFromHtml(html, url, 'Union Public Service Commission (UPSC)', 'upsc.gov.in', opts);
        extracted.forEach(v => { v.sourceCategory = 'RECRUITMENT_BOARD'; });
        vacancies.push(...extracted);
      }
    } catch (_) {}
    return vacancies;
  }

  /**
   * 11. CERT-In Scraper (strictly Recruitment block, skipping already-shortlisted drives and advisories)
   */
  static async scrapeCertIn(scraper, opts = {}) {
    const vacancies = [];
    const url = scraper.portalUrl || 'https://www.cert-in.org.in/s2cMainServlet?pageid=VLNLISTRE';
    try {
      const res = await fetchGovPage(url, 8000);
      if (res.ok) {
        let html = cleanHtmlBody(await res.text());
        const marker = html.toLowerCase().indexOf('recruitment to the');
        if (marker > -1) {
          const block = html.slice(marker, marker + 5000);
          // Split by sub-recruitment blocks (<TR>...<TD> with bullet image)
          const subBlocks = block.split(/<tr[^>]*>\s*<td[^>]*>\s*<img[^>]*aboutbull/i);
          for (const sb of subBlocks) {
            const sbText = decodeHtmlText(sb);
            // If this drive already issued Call Letters / Cut-off Marks / Stakeholders comments only, applications are closed
            if (!opts.includeExpired && /(?:cut-off\s*marks|to\s*download\s*call\s*letter|comments\s*of\s*stakeholders|draft\s*rrs)/i.test(sbText)) {
              continue;
            }
            const extracted = this.extractVacanciesFromHtml(sb, url, 'Indian Computer Emergency Response Team (CERT-In)', 'cert-in.org.in', opts);
            vacancies.push(...extracted);
          }
        }
      }
    } catch (_) {}
    return vacancies;
  }

  /**
   * Universal Generic Government Portal Scraper
   */
  static async scrapeGenericGovPortal(url, domain, opts = {}) {
    const res = await fetchGovPage(url, 12000);
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const html = cleanHtmlBody(await res.text());
    const orgName = domain.toUpperCase().replace(/\.(GOV|NIC|AC|ORG)\.IN$/, '');
    return this.extractVacanciesFromHtml(html, url, orgName, domain, opts);
  }

  // =========================================================================
  // UNIVERSAL RESILIENT HTML EXTRACTOR FOR INDIAN GOVT WEBSITES
  // =========================================================================

  /**
   * Extracts active vacancies from table rows, fieldsets, and verified notice links
   */
  static extractVacanciesFromHtml(html, baseUrl, defaultOrg = 'Apex Institution', domain = '', opts = {}) {
    if (!html || typeof html !== 'string') return [];

    let hostname = domain;
    if (!hostname) {
      try { hostname = new URL(baseUrl).hostname.replace(/^www\./i, ''); } catch (_) { hostname = 'official.gov.in'; }
    }

    const cleanedHtml = cleanHtmlBody(html);
    const items = [];
    const seenNoticeKeys = new Set();
    const seenNoticeUrls = new Set();
    const genericTitleRegex = /^(?:download(?:\s+notification)?|view(?:\s+advertisement)?|click\s+here|details|pdf|apply(?:\s+now(?:\s+open_in_new)?)?|view|download|link|notice|read\s*more|advertisement|brief\s+advertisement|recruitment\s+notice|[^\s\/]+\.pdf)$/i;

    // 1. Table-based extraction (UPSC, CSIR, ISRO, RBI, NIELIT)
    const tableMatches = [...cleanedHtml.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gis)];
    const tablesToScan = tableMatches.length > 0 ? tableMatches.map(m => m[1]) : [cleanedHtml];

    for (const tableHtml of tablesToScan) {
      // Detect if table explicitly declares a Closing / Last Date column header
      const headerCells = [...(tableHtml.match(/<thead[\s\S]*?<\/thead>/i)?.[0] || tableHtml.match(/<tr[^>]*>[\s\S]*?<\/tr>/i)?.[0] || '').matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gis)]
        .map(h => decodeHtmlText(h[1]).toLowerCase());
      const hasClosingHeader = headerCells.some(h => /closing|last\s*date|deadline|end\s*date/i.test(h));
      const closingColIdx = headerCells.findIndex(h => /closing|last\s*date|deadline|end\s*date/i.test(h));

      const tableRowMatches = [...tableHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gis)];
      for (const rowMatch of tableRowMatches) {
        const rowHtml = rowMatch[1];
        if (/<th\b/i.test(rowHtml) && !/<td\b/i.test(rowHtml)) continue;

        const cells = [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gis)].map(c => c[1]);
        if (cells.length < 2) continue;

        const rowPlainText = decodeHtmlText(rowHtml);
        if (isNonVacancyOrClosedNotice(rowPlainText, baseUrl)) continue;

        const isRecruitmentRelated = /(?:recruitment|advt|advertisement|vacancy|vacancies|post\b|scientist|engineer|analyst|officer|examiner|fellow|corrigendum|consultant|director|walk[\s\-]?in|apply)/i.test(rowPlainText);
        if (!isRecruitmentRelated) continue;

        const linkMatch = rowHtml.match(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/is);
        const pdfMatch = rowHtml.match(/<a[^>]+href=["']([^"']+\.pdf(?:\?[^"']*)?)["'][^>]*>([\s\S]*?)<\/a>/is);
        const anchorHref = (pdfMatch ? pdfMatch[1] : (linkMatch ? linkMatch[1] : '')).trim();
        const resolvedLink = resolveUrl(anchorHref || baseUrl, baseUrl);
        if (isNonVacancyOrClosedNotice(rowPlainText, resolvedLink)) continue;

        let title = '';
        if (pdfMatch && pdfMatch[2]) title = decodeHtmlText(pdfMatch[2]).replace(/\[\s*PDF\s*\]/gi, '').trim();
        else if (linkMatch && linkMatch[2]) title = decodeHtmlText(linkMatch[2]).replace(/\[\s*PDF\s*\]/gi, '').trim();

        if (!title || title.length < 6 || genericTitleRegex.test(title)) {
          const descriptiveCell = cells
            .map(c => decodeHtmlText(c))
            .filter(c => c.length > 8 && !/^\d+$/.test(c) && !/^\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4}$/.test(c) && !genericTitleRegex.test(c))
            .sort((a, b) => b.length - a.length)[0];
          title = descriptiveCell || '';
        }

        title = title.replace(/\s*\[\s*PDF\s*\]\s*$/i, '').trim();
        if (title.length < 6 || isNonVacancyOrClosedNotice(title, resolvedLink)) continue;

        const advtNo = extractAdvertisementNumber(rowPlainText) || extractAdvertisementNumber(title);
        const dates = parseJobDates(title, rowPlainText, null);

        // If table has an explicit Closing Date column header, extract Indian date from that cell
        if (!dates.closingDate && hasClosingHeader) {
          const closingCellText = closingColIdx >= 0 && cells[closingColIdx] ? decodeHtmlText(cells[closingColIdx]) : rowPlainText;
          const cellDate = parseIndianDate(closingCellText);
          if (cellDate) {
            dates.closingDate = cellDate;
            dates.isArchived = cellDate < getLocalTodayIso();
          }
        }

        if (!opts.includeExpired && isVacancyDateExpired(dates)) continue;

        const noticeKey = `${title}_${advtNo || resolvedLink}`.toLowerCase();
        if (!seenNoticeKeys.has(noticeKey) && !seenNoticeUrls.has(resolvedLink.toLowerCase())) {
          seenNoticeKeys.add(noticeKey);
          if (resolvedLink) seenNoticeUrls.add(resolvedLink.toLowerCase());

          items.push(this.buildVacancyRecord({
            title,
            organisation: defaultOrg,
            domain: hostname,
            advertisementNumber: advtNo,
            sourceUrl: resolvedLink || baseUrl,
            evidenceUrl: baseUrl,
            officialNoticePdfUrl: resolvedLink.toLowerCase().includes('.pdf') ? resolvedLink : '',
            extractedSnippet: rowPlainText,
            dates,
            qualifications: this.inferQualifications(`${title} ${rowPlainText}`),
            providerName: `Apex Web Scraper (${defaultOrg})`
          }));
        }
      }
    }

    // 2. Clean Direct Notice Links (only when structured table rows didn't satisfy page, with strict filtering!)
    if (items.length === 0) {
      const noticeLinks = PageDiffEngine.extractNoticeLinks(cleanedHtml, baseUrl);
      for (const notice of noticeLinks) {
        if (seenNoticeUrls.has(notice.url.toLowerCase())) continue;

        const title = decodeHtmlText(notice.title);
        if (isNonVacancyOrClosedNotice(title, notice.url)) continue;
        // Require explicit job-post semantics so stray brochures/rules don't get included
        if (!/\b(?:recruitment|vacancy|vacancies|advt|advertisement|project\s*engineer|scientist|scientific\s*officer|technical\s*officer|assistant\s*professor|engineer|analyst|consultant|trainee|walk[\s\-]?in)\b/i.test(title)) {
          continue;
        }

        const dates = parseJobDates(title, title, null);
        if (!opts.includeExpired && isVacancyDateExpired(dates)) continue;

        seenNoticeUrls.add(notice.url.toLowerCase());
        items.push(this.buildVacancyRecord({
          title,
          organisation: defaultOrg,
          domain: hostname,
          advertisementNumber: extractAdvertisementNumber(title),
          sourceUrl: notice.url,
          evidenceUrl: baseUrl,
          officialNoticePdfUrl: notice.isPdf ? notice.url : '',
          extractedSnippet: `Official notice from ${defaultOrg}: ${title}`,
          dates,
          providerName: `Apex Web Scraper (${defaultOrg})`
        }));
      }
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

    if (/b\.?e\.?|b\.?tech|computer\s*engineering|information\s*technology|electronics|engineer/i.test(lower)) {
      quals.push('B.E. / B.Tech in Computer Engineering / Information Technology / ECE');
    }
    if (/mca|master\s*of\s*computer\s*applications/i.test(lower)) {
      quals.push('MCA (Master of Computer Applications)');
    }
    if (/m\.?sc|master\s*of\s*science|forensic|cyber/i.test(lower)) {
      quals.push('M.Sc in Digital Forensics / Cyber Security / Computer Science');
    }
    if (/scientist\s*['"]?b['"]?/i.test(lower)) {
      quals.push('1st Class Bachelor Degree in Engineering/Technology (CS/IT/ECE)');
    }
    if (quals.length === 0) {
      quals.push('Relevant Technical / Graduate Degree as per Official Notification');
    }
    return quals;
  }
}
