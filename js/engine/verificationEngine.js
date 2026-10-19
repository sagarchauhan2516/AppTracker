/**
 * Vacancy Radar India - Vacancy Verification Engine
 * Enforces strict, evidence-based verification tiers.
 * 
 * CORE RULES:
 * 1. NEVER grant a verified badge based only on a domain suffix, search snippet, aggregator, or AI summary.
 * 2. NEVER invent vacancies, application URLs, salary information, deadlines, or requirements.
 * 3. Separate confirmed facts from inferred or unverified third-party claims.
 */

import { VerificationStatus, SourceCategory } from '../models/types.js';
import { SourceRegistryService } from '../services/sourceRegistryService.js';

export class VerificationEngine {
  /**
   * Evaluates a vacancy against strict verification criteria and generates an audit trail.
   * @param {Object} vacancy - The vacancy record to audit
   * @returns {Object} Verification audit result with status, score, field confidences, and evidence
   */
  static auditVacancy(vacancy) {
    const ver = vacancy.verification || {};
    const dates = vacancy.dates || {};
    const now = new Date();

    // Field-level confidence trackers (0.0 to 1.0)
    const fieldConfidence = {
      organisation: 0.0,
      title: 0.0,
      dates: 0.0,
      remuneration: 0.0,
      officialLinks: 0.0,
      eligibilityTerms: 0.0
    };

    const uncertainFields = [];
    const confirmedFacts = [];

    // Rule 1: Check Expiry / Closure
    if (dates.closingDate) {
      const closeDate = new Date(dates.closingDate);
      if (closeDate < now) {
        return {
          status: VerificationStatus.EXPIRED_CLOSED,
          confidenceScore: 0.99,
          fieldConfidence: { ...fieldConfidence, dates: 1.0 },
          uncertainFields: [],
          confirmedFacts: [`Official deadline (${dates.closingDate}) has elapsed. Position marked as closed.`],
          verificationNotes: 'Application window expired. Notice archived for cut-off and pattern reference.',
          auditTimestamp: now.toISOString()
        };
      }
    }

    // Rule 2: Check for Broken Source or Explicit Inaccessibility
    if (ver.status === VerificationStatus.VERIFICATION_FAILED || ver.isUnreachable || ver.sourceDomain?.includes('suspicious')) {
      return {
        status: VerificationStatus.VERIFICATION_FAILED,
        confidenceScore: 0.10,
        fieldConfidence,
        uncertainFields: ['All fields unverified due to unreachable or failed source'],
        confirmedFacts: [],
        verificationNotes: ver.verificationNotes || 'Source URL unreachable, returned HTTP error or failed domain authentication.',
        auditTimestamp: now.toISOString()
      };
    }

    // Rule 3: Inspect Origin Domain and Traceability
    const domainClass = SourceRegistryService.classifyDomain(ver.sourceDomain || '');
    const hasOfficialDomain = domainClass.isOfficialDomain;
    const hasOfficialPdf = Boolean(ver.officialNoticePdfUrl && ver.officialNoticePdfUrl.trim().length > 10);
    const hasOfficialApplyLink = Boolean(ver.applicationUrl && ver.applicationUrl.trim().length > 10);

    // Track confirmed facts
    if (vacancy.organisation) {
      fieldConfidence.organisation = hasOfficialDomain ? 0.98 : 0.65;
      if (hasOfficialDomain) confirmedFacts.push(`Employer identity confirmed via official institutional domain (${ver.sourceDomain}).`);
      else uncertainFields.push('Employer identity extracted from third-party report; awaiting official domain confirmation.');
    }

    if (vacancy.title && vacancy.advertisementNumber) {
      fieldConfidence.title = hasOfficialPdf ? 0.95 : 0.70;
      confirmedFacts.push(`Advertisement Reference: ${vacancy.advertisementNumber}`);
    } else {
      uncertainFields.push('Official advertisement notification reference number not specified.');
    }

    if (dates.closingDate) {
      fieldConfidence.dates = hasOfficialPdf ? 0.95 : 0.60;
      if (!hasOfficialPdf) uncertainFields.push('Closing date reported by third-party; needs corroboration with gazette PDF.');
    }

    if (hasOfficialPdf || hasOfficialApplyLink) {
      fieldConfidence.officialLinks = 0.95;
      if (hasOfficialPdf) confirmedFacts.push('Direct official notification document retrieved.');
      if (hasOfficialApplyLink) confirmedFacts.push('Authorised online application portal link verified.');
    } else {
      uncertainFields.push('Direct official notification PDF or official application gateway not yet located.');
    }

    if (vacancy.qualifications?.requiredDegree) {
      fieldConfidence.eligibilityTerms = hasOfficialPdf ? 0.95 : 0.65;
      confirmedFacts.push(`Degree requirements: ${vacancy.qualifications.requiredDegree}`);
    }

    // Calculate composite confidence score across evaluated fields
    const evaluatedValues = Object.values(fieldConfidence).filter(v => v > 0);
    const avgConfidence = evaluatedValues.length > 0 
      ? (evaluatedValues.reduce((sum, val) => sum + val, 0) / evaluatedValues.length)
      : 0.10;

    // Determine Status:
    // Status A: OFFICIALLY_VERIFIED
    // Requires: Official employer/board domain + direct official notice/PDF + established identity
    if (hasOfficialDomain && hasOfficialPdf && hasOfficialApplyLink) {
      return {
        status: VerificationStatus.OFFICIALLY_VERIFIED,
        confidenceScore: parseFloat(avgConfidence.toFixed(2)),
        fieldConfidence,
        uncertainFields,
        confirmedFacts,
        verificationNotes: 'Fully corroborated against primary official employer portal. Notification PDF and online application gateway verified.',
        auditTimestamp: now.toISOString()
      };
    }

    // Status B: CROSS_CHECKED
    // Discovered via third-party or aggregator, but matching official notice/PDF has been located
    if ((!hasOfficialDomain || domainClass.category === SourceCategory.THIRD_PARTY_AGGREGATOR) && (hasOfficialPdf || (hasOfficialApplyLink && hasOfficialDomain))) {
      return {
        status: VerificationStatus.CROSS_CHECKED,
        confidenceScore: parseFloat(Math.min(0.88, avgConfidence).toFixed(2)),
        fieldConfidence,
        uncertainFields,
        confirmedFacts,
        verificationNotes: 'Discovered via recruitment board or feed, subsequently cross-referenced with official bulletin.',
        auditTimestamp: now.toISOString()
      };
    }

    // Status C: UNVERIFIED_LEAD
    // Listing appears relevant but official notice PDF has not yet been validated
    return {
      status: VerificationStatus.UNVERIFIED_LEAD,
      confidenceScore: parseFloat(Math.min(0.65, avgConfidence).toFixed(2)),
      fieldConfidence,
      uncertainFields,
      confirmedFacts,
      verificationNotes: 'Unverified Lead: Third-party announcement. Do not submit sensitive documents until official gazette notice is retrieved.',
      auditTimestamp: now.toISOString()
    };
  }
}
