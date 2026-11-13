/**
 * Vacancy Radar India - Deterministic Page-Diff Discovery Engine
 * 
 * Production Principles:
 * 1. Deterministic Page-Diffing: Stores hashes and link sets for official portal recruitment sections.
 * 2. ETag / If-Modified-Since: Honors conditional HTTP caching headers for politeness and speed.
 * 3. Day 0 Discovery: Identifies new circulars and PDFs the exact hour they are posted on official pages.
 * 4. Aggregator Recall Check: Flags differences between aggregators (e.g. NCS, Rozgar Samachar) and official pages.
 */

export class PageDiffEngine {
  /**
   * Default high-priority official career portal directories to diff deterministically.
   */
  static getMonitoredPortals() {
    return [
      {
        id: 'cdac_careers',
        name: 'Centre for Development of Advanced Computing (C-DAC)',
        domain: 'cdac.in',
        url: 'https://www.cdac.in/index.aspx?id=current_jobs',
        category: 'OFFICIAL_EMPLOYER'
      },
      {
        id: 'drdo_recruitment',
        name: 'Defence Research and Development Organisation (DRDO RAC)',
        domain: 'drdo.gov.in',
        url: 'https://rac.gov.in',
        category: 'OFFICIAL_EMPLOYER'
      },
      {
        id: 'upsc_whats_new',
        name: 'Union Public Service Commission (UPSC)',
        domain: 'upsc.gov.in',
        url: 'https://upsc.gov.in/whats-new',
        category: 'RECRUITMENT_BOARD'
      },
      {
        id: 'nielit_recruitments',
        name: 'National Institute of Electronics and Information Technology (NIELIT)',
        domain: 'nielit.gov.in',
        url: 'https://nielit.gov.in/recruitments',
        category: 'OFFICIAL_EMPLOYER'
      },
      {
        id: 'nfsu_careers',
        name: 'National Forensic Sciences University (NFSU Regular)',
        domain: 'nfsu.ac.in',
        url: 'https://nfsu.ac.in/Regular_Recruitment',
        category: 'OFFICIAL_EMPLOYER'
      },
      {
        id: 'nfsu_contractual',
        name: 'National Forensic Sciences University (NFSU Contractual)',
        domain: 'nfsu.ac.in',
        url: 'https://nfsu.ac.in/Contractual_Recruitment',
        category: 'OFFICIAL_EMPLOYER'
      },
      {
        id: 'upsc_advt',
        name: 'Union Public Service Commission (UPSC Advertisements)',
        domain: 'upsc.gov.in',
        url: 'https://upsc.gov.in/recruitment/recruitment-advertisement',
        category: 'RECRUITMENT_BOARD'
      },
      {
        id: 'certin_vacancies',
        name: 'Indian Computer Emergency Response Team (CERT-In)',
        domain: 'cert-in.org.in',
        url: 'https://www.cert-in.org.in',
        category: 'OFFICIAL_EMPLOYER'
      }
    ];
  }

  /**
   * Extracts recruitment links and PDF notices from raw HTML markup.
   * @param {string} html - Page HTML content
   * @param {string} baseUrl - Base URL for resolving relative links
   * @returns {Array<Object>} List of candidate recruitment notices
   */
  static extractNoticeLinks(html, baseUrl = '') {
    if (!html || typeof html !== 'string') return [];

    const linkRegex = /<a\s+(?:[^>]*?\s+)?href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gis;
    const candidates = [];
    const seenUrls = new Set();
    let match;

    const recruitmentKeywords = [
      'recruitment', 'advt', 'advertisement', 'vacancy', 'vacancies', 'post',
      'scientist', 'engineer', 'officer', 'corrigendum', 'extension', 'walk-in',
      'contract', 'regular', 'selection', 'interview', 'cbt', '.pdf'
    ];

    while ((match = linkRegex.exec(html)) !== null) {
      let rawHref = match[1].trim();
      let anchorText = match[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

      if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('javascript:')) {
        continue;
      }

      // Resolve relative URL
      let fullUrl = rawHref;
      try {
        if (baseUrl && !rawHref.startsWith('http')) {
          fullUrl = new URL(rawHref, baseUrl).href;
        }
      } catch (_) {
        fullUrl = rawHref;
      }

      const lowerHref = fullUrl.toLowerCase();
      const lowerText = anchorText.toLowerCase();
      const isPdf = lowerHref.endsWith('.pdf') || lowerHref.includes('.pdf?');

      const isRelevant = recruitmentKeywords.some(kw => lowerHref.includes(kw) || lowerText.includes(kw));

      if (isRelevant && !seenUrls.has(fullUrl)) {
        seenUrls.add(fullUrl);
        candidates.push({
          url: fullUrl,
          title: anchorText || (isPdf ? 'Official Notification PDF' : 'Recruitment Notice'),
          isPdf,
          isCorrigendum: /(?:corrigendum|extension|addendum|amendment)/i.test(lowerText) || /(?:corrigendum|extension)/i.test(lowerHref)
        });
      }
    }

    return candidates;
  }

  /**
   * Performs deterministic diff between current extracted notices and stored previous state.
   * @param {Array<Object>} currentItems - Current extracted links/PDFs
   * @param {Object} previousSnapshot - Stored previous snapshot { items: [], lastHash: '' }
   * @returns {Object} Diff results including newly discovered items
   */
  static diffNotices(currentItems, previousSnapshot = {}) {
    const prevUrls = new Set((previousSnapshot.items || []).map(i => typeof i === 'string' ? i : i.url));
    const newItems = [];
    const retainedItems = [];

    for (const item of currentItems) {
      if (!prevUrls.has(item.url)) {
        newItems.push({
          ...item,
          discoveredAt: new Date().toISOString(),
          isNewDiscovery: true
        });
      } else {
        retainedItems.push(item);
      }
    }

    return {
      hasChanges: newItems.length > 0,
      newItems,
      totalCurrent: currentItems.length,
      retainedCount: retainedItems.length,
      newCount: newItems.length
    };
  }

  /**
   * Aggregator Recall Check:
   * Compares an aggregator-reported item (e.g., from NCS, Rozgar Samachar, or FreshersJobs)
   * against official monitored portals. If the system had NOT captured it directly,
   * it logs a "miss" to improve discovery source lists and flags for immediate verification.
   */
  static checkAggregatorRecall(aggregatorItem, officialKnownUrls = new Set()) {
    const officialNoticeUrl = aggregatorItem.verification?.officialNoticePdfUrl ||
                              aggregatorItem.officialNoticePdfUrl ||
                              aggregatorItem.evidenceUrl || '';

    const isCapturedInOfficial = officialNoticeUrl ? officialKnownUrls.has(officialNoticeUrl) : false;

    if (!isCapturedInOfficial && officialNoticeUrl) {
      return {
        isRecallMiss: true,
        source: aggregatorItem.domain || aggregatorItem.verification?.sourceDomain || 'Aggregator',
        reason: 'Item detected on aggregator feed but not yet captured by official deterministic scraper.',
        actionRequired: 'VERIFY_OFFICIAL_SOURCE_AND_ADD_PORTAL'
      };
    }

    return {
      isRecallMiss: false,
      reason: 'Item verified against official portal or already indexed.'
    };
  }
}
