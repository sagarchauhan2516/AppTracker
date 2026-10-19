/**
 * Vacancy Radar India - Vacancy Lifecycle & Corrigendum Tracking Engine
 * 
 * Features:
 * 1. Canonical ID Generation: Deterministic slugify(org + advtNo + post)
 * 2. Corrigendum & Extension Tracking: Detects corrigenda, revised vacancies, and extended dates
 * 3. Lifecycle Milestones: Tracks OPEN -> CORRIGENDUM_EXTENDED -> CLOSING_SOON (7d, 3d, 1d) -> EXPIRED_CLOSED
 * 4. Audit Trail: Maintains immutable event history for every tracked vacancy
 */

import { VacancyLifecycleStatus } from '../models/types.js';

export class VacancyLifecycleEngine {
  /**
   * Generates a deterministic canonical ID for any vacancy notice.
   * Format: slugify(organisation + "_" + advertisementNumber + "_" + (postName || title))
   */
  static generateCanonicalId(vacancy) {
    if (!vacancy) return `vac_${Date.now()}`;

    const clean = (str) => String(str || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const normalizeTitle = (titleStr) => {
      let t = String(titleStr || '').trim();
      // Strip corrigendum, addendum, extension, revised prefixes
      t = t.replace(/^(corrigendum|addendum|extension|revised|revision|notice|advertisement|cancellation|date extended)\s*[:-]\s*/gi, '');
      return t.trim();
    };

    const orgSlug = clean(vacancy.organisation || 'apex-govt').slice(0, 24);
    const advtRaw = (vacancy.advertisementNumber || '').trim();
    const cleanTitle = normalizeTitle(vacancy.postName || vacancy.title || '');

    if (advtRaw && advtRaw.length >= 3) {
      const advtSlug = clean(advtRaw).slice(0, 30);
      const postSlug = clean(cleanTitle).slice(0, 30);
      return `gov_${orgSlug}_${advtSlug}_${postSlug}`;
    }

    // Fallback: org + title slug + domain hash
    const titleSlug = clean(cleanTitle || 'post').slice(0, 45);
    const domain = (vacancy.verification?.sourceDomain || vacancy.sourceUrl || '').toLowerCase();
    const domainHash = Math.abs(this._hashString(domain)).toString(36).slice(0, 6);
    return `gov_${orgSlug}_${titleSlug}_${domainHash}`;
  }

  /**
   * Evaluates the current lifecycle status of a vacancy based on closing date and metadata.
   */
  static evaluateLifecycleStatus(vacancy, referenceDate = new Date()) {
    if (!vacancy) return VacancyLifecycleStatus.ACTIVE;

    const refTime = referenceDate instanceof Date ? referenceDate.getTime() : new Date(referenceDate).getTime();
    const closingDateStr = vacancy.dates?.closingDate || vacancy.closingDate || '';

    // Check for explicit cancellation / withdrawal
    const textBlob = `${vacancy.title || ''} ${vacancy.notes || ''} ${vacancy.corrigendumNote || ''}`.toLowerCase();
    if (textBlob.includes('cancelled') || textBlob.includes('withdrawn') || textBlob.includes('advertisement scrapped')) {
      return VacancyLifecycleStatus.WITHDRAWN_CANCELLED;
    }

    if (vacancy.isCorrigendum || vacancy.hasCorrigendum) {
      return VacancyLifecycleStatus.CORRIGENDUM_EXTENDED;
    }

    if (!closingDateStr) {
      return vacancy.lifecycleStatus || VacancyLifecycleStatus.ACTIVE;
    }

    const closeTime = new Date(closingDateStr).getTime();
    if (isNaN(closeTime)) {
      return vacancy.lifecycleStatus || VacancyLifecycleStatus.ACTIVE;
    }

    const diffDays = Math.ceil((closeTime - refTime) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return VacancyLifecycleStatus.EXPIRED_CLOSED;
    } else if (diffDays <= 1) {
      return VacancyLifecycleStatus.CLOSING_SOON_1D;
    } else if (diffDays <= 3) {
      return VacancyLifecycleStatus.CLOSING_SOON_3D;
    } else if (diffDays <= 7) {
      return VacancyLifecycleStatus.CLOSING_SOON_7D;
    }

    return VacancyLifecycleStatus.ACTIVE;
  }

  /**
   * Merges an incoming notice into an existing tracked vacancy, detecting Corrigenda and Extensions.
   */
  static mergeWithLifecycleHistory(existing, incoming) {
    if (!existing) return incoming;

    const merged = { ...existing };
    merged.history = Array.isArray(existing.history) ? [...existing.history] : [];

    const existingCloseDate = existing.dates?.closingDate || existing.closingDate || '';
    const incomingCloseDate = incoming.dates?.closingDate || incoming.closingDate || '';

    // Check for Corrigendum / Date Extension
    const incomingText = `${incoming.title || ''} ${incoming.notes || ''} ${incoming.corrigendumNote || ''}`.toLowerCase();
    const isCorrigendumTitle = incomingText.includes('corrigendum') ||
                               incomingText.includes('addendum') ||
                               incomingText.includes('date extended') ||
                               incomingText.includes('extension') ||
                               incomingText.includes('revised vacancy');

    const hasDateExtended = existingCloseDate && incomingCloseDate && (new Date(incomingCloseDate) > new Date(existingCloseDate));

    if (isCorrigendumTitle || hasDateExtended) {
      merged.isCorrigendum = true;
      merged.hasCorrigendum = true;
      merged.lifecycleStatus = VacancyLifecycleStatus.CORRIGENDUM_EXTENDED;

      merged.history.push({
        event: 'CORRIGENDUM_EXTENDED',
        timestamp: new Date().toISOString(),
        previousClosingDate: existingCloseDate,
        newClosingDate: incomingCloseDate || existingCloseDate,
        corrigendumUrl: incoming.verification?.officialNoticePdfUrl || incoming.sourceUrl,
        note: incoming.corrigendumNote || (hasDateExtended ? `Last date extended to ${incomingCloseDate}` : 'Official Corrigendum / Addendum circular published.')
      });

      // Update closing date if extended
      if (incomingCloseDate && (new Date(incomingCloseDate) > new Date(existingCloseDate || 0))) {
        merged.closingDate = incomingCloseDate;
        merged.dates = { ...(merged.dates || {}), closingDate: incomingCloseDate };
      }

      // Append Corrigendum notice link
      if (incoming.verification?.officialNoticePdfUrl && incoming.verification.officialNoticePdfUrl !== existing.verification?.officialNoticePdfUrl) {
        merged.corrigendumPdfUrl = incoming.verification.officialNoticePdfUrl;
      }
    }

    // Merge duplicate sources evidence
    merged.duplicateSources = merged.duplicateSources || [];
    merged.duplicateSources.push({
      sourceDomain: incoming.verification?.sourceDomain || 'Portal',
      evidenceUrl: incoming.verification?.evidenceUrl || incoming.sourceUrl,
      discoveredAt: new Date().toISOString()
    });

    merged.lastSynchronizedAt = new Date().toISOString();
    return merged;
  }

  /**
   * Processes a batch of existing vacancies and incoming notices, updating canonical IDs and lifecycles.
   */
  static processBatchLifecycle(existingVacancies = [], incomingNotices = [], referenceDate = new Date()) {
    const canonicalMap = new Map();

    // Index existing by canonical ID
    for (const v of existingVacancies) {
      const cid = v.canonicalId || this.generateCanonicalId(v);
      v.canonicalId = cid;
      v.lifecycleStatus = this.evaluateLifecycleStatus(v, referenceDate);
      canonicalMap.set(cid, v);
    }

    let corrigendaFound = 0;
    let newlyDiscovered = 0;

    for (const incoming of incomingNotices) {
      const cid = incoming.canonicalId || this.generateCanonicalId(incoming);
      incoming.canonicalId = cid;

      if (canonicalMap.has(cid)) {
        const existing = canonicalMap.get(cid);
        const merged = this.mergeWithLifecycleHistory(existing, incoming);
        if (merged.lifecycleStatus === VacancyLifecycleStatus.CORRIGENDUM_EXTENDED && existing.lifecycleStatus !== VacancyLifecycleStatus.CORRIGENDUM_EXTENDED) {
          corrigendaFound++;
        }
        canonicalMap.set(cid, merged);
      } else {
        incoming.lifecycleStatus = this.evaluateLifecycleStatus(incoming, referenceDate);
        incoming.history = [{
          event: 'INITIAL_DISCOVERY',
          timestamp: new Date().toISOString(),
          note: `Discovered from ${incoming.verification?.sourceDomain || 'Official Portal'}`
        }];
        canonicalMap.set(cid, incoming);
        newlyDiscovered++;
      }
    }

    return {
      allVacancies: Array.from(canonicalMap.values()),
      newlyDiscovered,
      corrigendaFound
    };
  }

  /**
   * Simple hash for domain strings.
   */
  static _hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }
}
