/**
 * Vacancy Radar India - Duplicate Notice Detection & Suppression Engine
 * Identifies duplicate recruitment announcements across multiple sources
 * and merges them into canonical notices with consolidated evidence links.
 */

export class DuplicateDetector {
  /**
   * Generates a normalized signature for a vacancy to detect cross-source duplicates.
   * @param {Object} vacancy - The vacancy object
   * @returns {string} Unique fingerprint signature
   */
  static generateSignature(vacancy) {
    if (vacancy.advertisementNumber && vacancy.advertisementNumber.trim().length > 3) {
      // High-precision signature based on Advertisement Reference Number
      return 'advt:' + vacancy.advertisementNumber.toLowerCase().replace(/[^a-z0-9]/g, '');
    }

    // Fallback signature based on normalized organisation + title tokens
    const normOrg = (vacancy.organisation || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15);
    const normTitle = (vacancy.title || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20);
    return `org_title:${normOrg}_${normTitle}`;
  }

  /**
   * Scans a list of vacancies, identifies duplicates, and marks or groups them.
   * @param {Array<Object>} vacancies - Raw list of vacancies
   * @returns {Object} { canonicalVacancies: Array, duplicatesDetectedCount: number }
   */
  static processDuplicates(vacancies = []) {
    const signatureMap = new Map();
    let duplicatesDetectedCount = 0;

    for (const vac of vacancies) {
      const sig = this.generateSignature(vac);

      if (signatureMap.has(sig)) {
        duplicatesDetectedCount++;
        const canonical = signatureMap.get(sig);

        // Record duplicate cross-reference
        canonical.duplicateSources = canonical.duplicateSources || [];
        canonical.duplicateSources.push({
          sourceDomain: vac.verification?.sourceDomain || 'Aggregator',
          evidenceUrl: vac.verification?.evidenceUrl || vac.sourceUrl,
          discoveredAt: vac.verification?.verifiedAt || new Date().toISOString()
        });

        // If the duplicate has a better verification status, promote the canonical
        if (vac.verification?.status === 'OFFICIALLY_VERIFIED' && canonical.verification?.status !== 'OFFICIALLY_VERIFIED') {
          canonical.verification = vac.verification;
        }

        canonical.hasDuplicatesMerged = true;
      } else {
        signatureMap.set(sig, {
          ...vac,
          hasDuplicatesMerged: false,
          duplicateSources: []
        });
      }
    }

    return {
      canonicalVacancies: Array.from(signatureMap.values()),
      duplicatesDetectedCount
    };
  }
}
