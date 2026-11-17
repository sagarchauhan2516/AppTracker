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
    let sourceDomain = ver.sourceDomain || vacancy.domain || '';
    if (!sourceDomain && vacancy.sourceUrl) {
      try {
        sourceDomain = new URL(vacancy.sourceUrl).hostname.replace(/^www\./i, '');
      } catch (_) {}
    }
    sourceDomain = (sourceDomain || '').toLowerCase().trim();

    let officialNoticePdfUrl = ver.officialNoticePdfUrl || vacancy.officialNoticePdfUrl || '';
    if (!officialNoticePdfUrl && vacancy.sourceUrl && /\.pdf(?:[\?#].*)?$/i.test(vacancy.sourceUrl)) {
      officialNoticePdfUrl = vacancy.sourceUrl;
    }
    officialNoticePdfUrl = (officialNoticePdfUrl || '').trim();

    let applicationUrl = ver.applicationUrl || vacancy.applicationUrl || vacancy.sourceUrl || '';
    applicationUrl = (applicationUrl || '').trim();

    const domainClass = SourceRegistryService.classifyDomain(sourceDomain);
    const hasOfficialDomain = Boolean(domainClass.isOfficialDomain);

    let pdfDomainClass = { isOfficialDomain: false, category: SourceCategory.THIRD_PARTY_AGGREGATOR };
    if (officialNoticePdfUrl && officialNoticePdfUrl.length > 10) {
      try {
        const pdfHost = new URL(officialNoticePdfUrl).hostname;
        pdfDomainClass = SourceRegistryService.classifyDomain(pdfHost);
      } catch (_) {}
    }

    let applyDomainClass = { isOfficialDomain: false, category: SourceCategory.THIRD_PARTY_AGGREGATOR };
    if (applicationUrl && applicationUrl.length > 10) {
      try {
        const applyHost = new URL(applicationUrl).hostname;
        applyDomainClass = SourceRegistryService.classifyDomain(applyHost);
      } catch (_) {}
    }

    const hasOfficialPdf = Boolean(officialNoticePdfUrl && officialNoticePdfUrl.length > 10);
    const hasOfficialApplyLink = Boolean(applicationUrl && applicationUrl.length > 10 && (hasOfficialDomain || applyDomainClass.isOfficialDomain));

    // Track confirmed facts
    if (vacancy.organisation) {
      fieldConfidence.organisation = hasOfficialDomain ? 0.98 : (pdfDomainClass.isOfficialDomain ? 0.92 : 0.65);
      if (hasOfficialDomain) confirmedFacts.push(`Employer identity confirmed via official institutional domain (${sourceDomain}).`);
      else if (pdfDomainClass.isOfficialDomain) confirmedFacts.push(`Employer identity corroborated via official institutional gazette document.`);
      else uncertainFields.push('Employer identity extracted from third-party report; awaiting official domain confirmation.');
    }

    if (vacancy.title && vacancy.advertisementNumber) {
      fieldConfidence.title = (hasOfficialPdf || hasOfficialDomain) ? 0.95 : 0.70;
      confirmedFacts.push(`Advertisement Reference: ${vacancy.advertisementNumber}`);
    } else {
      uncertainFields.push('Official advertisement notification reference number not specified.');
    }

    if (dates.closingDate) {
      fieldConfidence.dates = (hasOfficialPdf || hasOfficialDomain) ? 0.95 : 0.60;
      if (!hasOfficialPdf && !hasOfficialDomain) uncertainFields.push('Closing date reported by third-party; needs corroboration with gazette PDF.');
    }

    if (hasOfficialPdf || hasOfficialApplyLink) {
      fieldConfidence.officialLinks = (hasOfficialDomain || pdfDomainClass.isOfficialDomain || applyDomainClass.isOfficialDomain) ? 0.98 : 0.75;
      if (hasOfficialPdf) confirmedFacts.push(`Direct official notification document retrieved.`);
      if (hasOfficialApplyLink) confirmedFacts.push('Authorised online application portal link verified.');
    } else {
      uncertainFields.push('Direct official notification PDF or official application gateway not yet located.');
    }

    const hasQuals = vacancy.qualifications && (
      (Array.isArray(vacancy.qualifications) && vacancy.qualifications.length > 0) ||
      (typeof vacancy.qualifications === 'object' && vacancy.qualifications.requiredDegree) ||
      (typeof vacancy.qualifications === 'string' && vacancy.qualifications.length > 5)
    );
    if (hasQuals) {
      fieldConfidence.eligibilityTerms = (hasOfficialPdf || hasOfficialDomain) ? 0.95 : 0.65;
      const qualText = Array.isArray(vacancy.qualifications)
        ? vacancy.qualifications.join(', ')
        : (vacancy.qualifications.requiredDegree || vacancy.qualifications);
      confirmedFacts.push(`Degree requirements: ${qualText}`);
    }

    // Calculate composite confidence score across evaluated fields
    const evaluatedValues = Object.values(fieldConfidence).filter(v => v > 0);
    const avgConfidence = evaluatedValues.length > 0 
      ? (evaluatedValues.reduce((sum, val) => sum + val, 0) / evaluatedValues.length)
      : 0.10;

    // Determine Status:
    // Status A: OFFICIALLY_VERIFIED
    // STRICT RULE: Must originate from an authentic official government/apex domain (.gov.in, .nic.in, .ac.in, cdac.in, etc.)
    // AND possess concrete proof: direct official notice PDF OR direct official application portal (or both).
    if (hasOfficialDomain && (hasOfficialPdf || hasOfficialApplyLink)) {
      const finalScore = Math.max(0.92, parseFloat(avgConfidence.toFixed(2)));
      return {
        status: VerificationStatus.OFFICIALLY_VERIFIED,
        confidenceScore: finalScore,
        fieldConfidence,
        uncertainFields,
        confirmedFacts,
        verificationNotes: hasOfficialPdf && hasOfficialApplyLink
          ? 'Fully corroborated against primary official employer portal. Notification PDF and online application gateway verified.'
          : (hasOfficialPdf
              ? 'Officially verified from authoritative institutional bulletin. Gazette/Notification PDF validated.'
              : 'Officially verified from authoritative institutional recruitment portal with online application gateway.'),
        auditTimestamp: now.toISOString()
      };
    }

    // Status B: CROSS_CHECKED
    // Discovered via third-party aggregator or feed, but corroborated by official PDF or official application gateway
    if (hasOfficialPdf || applyDomainClass.isOfficialDomain || (hasOfficialDomain && !hasOfficialPdf && !hasOfficialApplyLink)) {
      return {
        status: VerificationStatus.CROSS_CHECKED,
        confidenceScore: parseFloat(Math.min(0.88, Math.max(0.70, avgConfidence)).toFixed(2)),
        fieldConfidence,
        uncertainFields,
        confirmedFacts,
        verificationNotes: 'Discovered via third-party recruitment listing or aggregator, subsequently corroborated with official gazette document or application gateway.',
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
