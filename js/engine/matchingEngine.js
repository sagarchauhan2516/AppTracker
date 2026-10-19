/**
 * Vacancy Radar India - Candidate Eligibility & Match Scoring Engine
 * Computes a transparent, explainable relevance score and assigns standardized eligibility labels.
 * 
 * CORE RULES:
 * 1. Display match explanations rather than only a numerical score.
 * 2. Separate confirmed facts from missing/inferred info.
 * 3. Never reject a candidate merely because a nonessential field is missing.
 */

import { EligibilityStatus } from '../models/types.js';
import { GovernmentEligibilityEngine } from './governmentEligibilityEngine.js';

export class MatchingEngine {
  /**
   * Evaluates candidate profile alignment against a vacancy.
   * @param {Object} profile - User search profile
   * @param {Object} vacancy - Discovered vacancy object
   * @param {Date} referenceDate - Evaluation reference date (defaults to now)
   * @returns {Object} Transparent score, eligibility label, reasons, warnings, and missing fields
   */
  static evaluateMatch(profile, vacancy, referenceDate = new Date()) {
    let score = 0;
    const reasons = [];
    const warnings = [];
    const missingFields = [];
    let isEligibleCandidate = true;

    // Stage 1: Strict Government Eligibility Hard-Gates Evaluation
    const strictRes = GovernmentEligibilityEngine.evaluateStrictEligibility(profile, vacancy, referenceDate);
    if (!strictRes.isStage1Eligible) {
      isEligibleCandidate = false;
      warnings.push(...strictRes.hardGateFailures);
    }

    const vacQuals = vacancy.qualifications || {};
    const profEdu = profile.education || {};
    const profExp = profile.experience || {};
    const profDemo = profile.demographics || {};

    // 1. Role Relevance (Max 25 pts)
    const titleLower = (vacancy.title || '').toLowerCase();
    const matchedRole = (profile.roles || []).find(r => titleLower.includes(r.toLowerCase()));
    if (matchedRole) {
      score += 25;
      reasons.push(`Target role alignment: "${matchedRole}" closely aligns with advertised post.`);
    } else {
      // Partial title match
      const relatedTokens = ['forensic', 'cyber', 'evidence', 'incident', 'investigation', 'security', 'analyst', 'engineer'];
      const hasToken = relatedTokens.some(t => titleLower.includes(t));
      if (hasToken) {
        score += 15;
        reasons.push(`Allied role domain: Advertised title matches technical specialization area.`);
      } else {
        score += 5;
      }
    }

    // 2. Educational Branch & Degree Match (Max 25 pts)
    const qualEval = strictRes.qualEval;
    const requiredDegreeText = vacQuals.requiredDegree || '';

    if (qualEval.isEligible) {
      score += 25;
      reasons.push(qualEval.reason);
    } else if (requiredDegreeText) {
      score += 8;
      warnings.push(qualEval.reason);
    } else {
      score += 12;
      missingFields.push('Detailed eligible degree branches not listed in summary notice.');
    }

    // Marks check
    if (vacQuals.minMarksPercentage && profEdu.aggregateMarksPct) {
      if (profEdu.aggregateMarksPct >= vacQuals.minMarksPercentage) {
        reasons.push(`Aggregate marks: Candidate achieved ${profEdu.aggregateMarksPct}%, meeting the ${vacQuals.minMarksPercentage}% cut-off.`);
      } else {
        warnings.push(`Aggregate marks: Advertised threshold (${vacQuals.minMarksPercentage}%) exceeds recorded candidate aggregate (${profEdu.aggregateMarksPct}%).`);
        isEligibleCandidate = false;
      }
    }

    // 3. Technical Skills & Forensics Keywords (Max 20 pts)
    const combinedContent = `${vacancy.title} ${vacancy.extractedSnippet || ''} ${vacQuals.requiredDegree || ''}`.toLowerCase();
    const matchedKeywords = (profile.keywords || []).filter(kw => combinedContent.includes(kw.toLowerCase()));

    if (matchedKeywords.length >= 2) {
      score += 20;
      reasons.push(`Forensic skills matched: ${matchedKeywords.slice(0, 3).join(', ')}.`);
    } else if (matchedKeywords.length === 1) {
      score += 12;
      reasons.push(`Forensic skill matched: ${matchedKeywords[0]}.`);
    } else {
      score += 5;
    }

    // 4. Experience Range (Max 15 pts)
    const minExp = vacQuals.minExperienceYears || 0;
    const maxExp = vacQuals.maxExperienceYears || 99;
    const candExp = profExp.minYears || 0;

    if (candExp >= minExp && candExp <= maxExp) {
      score += 15;
      reasons.push(`Experience criteria met: Candidate experience (${candExp} yrs) satisfies advertised requirement (${minExp}-${maxExp} yrs).`);
    } else if (candExp < minExp) {
      if (minExp - candExp <= 1) {
        score += 8;
        warnings.push(`Candidate has ${candExp} yrs experience, advertised post requests ${minExp} yrs.`);
      } else {
        score += 2;
        warnings.push(`Experience deficit: Advertised role specifies minimum ${minExp} years.`);
        isEligibleCandidate = false;
      }
    } else {
      score += 12;
      reasons.push(`Experienced applicant: Exceeds minimum experience threshold (${minExp} yrs).`);
    }

    // 5. Location, Mode & Sector (Max 15 pts)
    let locScore = 0;
    const vacState = vacancy.location?.state || '';
    const vacCity = vacancy.location?.city || '';
    const isRemote = vacancy.location?.isRemote;

    if (profile.locations?.allIndia || isRemote) {
      locScore += 8;
    } else if (profile.locations?.preferredStates?.includes(vacState) || profile.locations?.preferredCities?.includes(vacCity)) {
      locScore += 8;
      reasons.push(`Preferred geographic location: ${vacCity || vacState}.`);
    }

    if (profile.sectors?.includes(vacancy.sector)) {
      locScore += 7;
      reasons.push(`Sector preference: ${vacancy.sector}.`);
    } else {
      locScore += 3;
    }
    score += locScore;

    // 6. Age & Relaxations (Calculated against official cut-off date with reservation relaxations)
    if (vacQuals.ageLimit) {
      if (strictRes.ageResult.isEligible) {
        reasons.push(strictRes.ageResult.details);
      } else {
        warnings.push(strictRes.ageResult.details);
      }
    }

    // 7. Target Organisation & Website Focus Alignment
    let isTargetFocusMatch = false;
    let matchedFocusName = null;
    if (profile.targetFocus?.enabled) {
      const domains = profile.targetFocus.targetDomains || [];
      const orgs = profile.targetFocus.targetOrganisations || [];
      const vDomain = (vacancy.verification?.sourceDomain || '').toLowerCase();
      const vOrg = (vacancy.organisation || '').toLowerCase();
      const vUrls = [
        vacancy.verification?.evidenceUrl || '',
        vacancy.verification?.officialNoticePdfUrl || '',
        vacancy.verification?.applicationUrl || ''
      ].join(' ').toLowerCase();

      // Check domain match
      const matchedDomain = domains.find(d => d && (vDomain.includes(d.toLowerCase()) || vUrls.includes(d.toLowerCase())));
      // Check org match
      const matchedOrg = orgs.find(o => o && (vOrg.includes(o.toLowerCase()) || o.toLowerCase().includes(vOrg)));

      if (matchedDomain || matchedOrg) {
        isTargetFocusMatch = true;
        matchedFocusName = matchedOrg || matchedDomain;
        reasons.unshift(`🎯 Target Focus Match: Recruited by your prioritized official organisation / domain (${matchedFocusName}).`);
        if (profile.targetFocus.mode !== 'STRICT_TARGET') {
          score += 15; // Priority boost
        }
      } else if (profile.targetFocus.mode === 'STRICT_TARGET') {
        warnings.push(`Outside current strict target focus whitelist.`);
      }
    }

    // Determine Standardized Eligibility Status Label
    let eligibilityStatus = EligibilityStatus.LIKELY_ELIGIBLE;

    if (score < 45 || !isEligibleCandidate) {
      eligibilityStatus = EligibilityStatus.APPEARS_INELIGIBLE;
    } else if (missingFields.length > 0 || warnings.length > 0) {
      eligibilityStatus = score >= 75 ? EligibilityStatus.LIKELY_ELIGIBLE : EligibilityStatus.POTENTIAL_MATCH;
    }

    if (!vacQuals.requiredDegree && !vacQuals.minExperienceYears) {
      eligibilityStatus = EligibilityStatus.INSUFFICIENT_INFO;
    }

    return {
      overallScore: Math.min(100, Math.max(10, score)),
      eligibilityStatus,
      reasons,
      warnings,
      missingFields,
      isTargetFocusMatch,
      matchedFocusName,
      isStage1Eligible: strictRes.isStage1Eligible,
      whyMatchedSnippet: strictRes.whyMatchedSnippet
    };
  }
}
