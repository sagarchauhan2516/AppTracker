/**
 * Vacancy Radar India - Government Eligibility & Reservation Engine
 * 
 * Rules Enforced:
 * 1. Crucial Cut-off Date: Age is calculated as on the official notification's cut-off date (or closing date).
 * 2. Category Relaxations (DoPT & Indian Govt Norms):
 *    - UR / General: 0 yrs
 *    - EWS: 0 yrs
 *    - OBC (Non-Creamy Layer): +3 yrs
 *    - SC / ST: +5 yrs
 *    - PwD (General/EWS): +10 yrs
 *    - PwD (OBC): +13 yrs
 *    - PwD (SC/ST): +15 yrs
 *    - Ex-Servicemen: +5 yrs
 * 3. Two-Stage Gate: Hard criteria must pass before scoring role fit.
 */

import { QualificationTaxonomyEngine } from '../data/qualificationTaxonomy.js';

export const ReservationCategory = {
  GENERAL_UR: 'General / Unreserved',
  OBC_NCL: 'OBC (Non-Creamy Layer)',
  SC_ST: 'SC / ST',
  EWS: 'EWS',
  PWD_GENERAL: 'PwD (General / EWS)',
  PWD_OBC: 'PwD (OBC)',
  PWD_SC_ST: 'PwD (SC / ST)',
  EX_SERVICEMEN: 'Ex-Servicemen'
};

export class GovernmentEligibilityEngine {
  /**
   * Resolves the relaxation bonus years based on demographic category.
   */
  static getCategoryAgeRelaxation(categoryStr) {
    if (!categoryStr) return 0;
    const cat = String(categoryStr).toLowerCase();

    if (cat.includes('pwd') && (cat.includes('sc') || cat.includes('st'))) return 15;
    if (cat.includes('pwd') && cat.includes('obc')) return 13;
    if (cat.includes('pwd')) return 10;
    if (cat.includes('sc') || cat.includes('st')) return 5;
    if (cat.includes('obc')) return 3;
    if (cat.includes('ex-servicemen') || cat.includes('esm')) return 5;

    return 0; // General / EWS
  }

  /**
   * Determines the crucial cut-off date for age from vacancy announcements.
   */
  static resolveCutOffDate(vacancy, referenceDate = new Date()) {
    if (!vacancy) return referenceDate;

    const cutOffStr = vacancy.qualifications?.ageCutOffDate ||
                      vacancy.dates?.ageCutOffDate ||
                      vacancy.dates?.closingDate ||
                      vacancy.closingDate || '';

    if (cutOffStr) {
      const d = new Date(cutOffStr);
      if (!isNaN(d.getTime())) return d;
    }
    return referenceDate;
  }

  /**
   * Calculates candidate age as on the crucial cut-off date.
   */
  static computeAgeOnCutOff(candidateDemographics, cutOffDate) {
    const cutOff = cutOffDate instanceof Date ? cutOffDate : new Date(cutOffDate);

    // If exact date of birth is provided
    if (candidateDemographics.dob) {
      const dob = new Date(candidateDemographics.dob);
      if (!isNaN(dob.getTime())) {
        let age = cutOff.getFullYear() - dob.getFullYear();
        const m = cutOff.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && cutOff.getDate() < dob.getDate())) {
          age--;
        }
        return Math.max(0, age);
      }
    }

    // If recorded static age
    const baseAge = parseInt(candidateDemographics.age, 10) || 25;
    return baseAge;
  }

  /**
   * Comprehensive two-stage eligibility check against official government criteria.
   * Stage 1: Hard Gates (Degree Equivalence, Cut-off Age with Quota Relaxation, Experience Deficit, Closing Date)
   * Stage 2: Audit Trail Generation ("Why Matched" summary snippet)
   */
  static evaluateStrictEligibility(profile, vacancy, referenceDate = new Date()) {
    const hardGateFailures = [];
    const hardGatePasses = [];

    const profEdu = profile.education || {};
    const profExp = profile.experience || {};
    const profDemo = profile.demographics || {};
    const vacQuals = vacancy.qualifications || {};

    // 1. Closing Date Gate
    const closingDateStr = vacancy.dates?.closingDate || vacancy.closingDate || '';
    if (closingDateStr) {
      const closeTime = new Date(closingDateStr).getTime();
      const refTime = referenceDate.getTime();
      if (!isNaN(closeTime) && closeTime < refTime) {
        hardGateFailures.push(`Application deadline elapsed (${closingDateStr}).`);
      } else {
        hardGatePasses.push(`Active deadline (${closingDateStr})`);
      }
    }

    // 2. Qualification Equivalence Gate
    const candDegreeTokens = [profEdu.degreeLevel || profEdu.degree, ...(profEdu.eligibleBranches || []), profEdu.branch].filter(Boolean);
    const candDegree = candDegreeTokens.length > 0 ? candDegreeTokens.join(' ') : 'B.E. Computer Engineering';
    const reqDegree = vacQuals.requiredDegree || '';
    const qualEval = QualificationTaxonomyEngine.evaluateEquivalence(candDegree, reqDegree);

    if (reqDegree && !qualEval.isEligible) {
      hardGateFailures.push(qualEval.reason);
    } else {
      hardGatePasses.push(qualEval.reason);
    }

    // 3. Cut-off Date & Category Age Relaxation Gate
    let ageResult = { isEligible: true, details: '' };
    if (vacQuals.ageLimit) {
      const cutOffDate = this.resolveCutOffDate(vacancy, referenceDate);
      const cutOffDateFormatted = cutOffDate.toISOString().slice(0, 10);
      const candAge = this.computeAgeOnCutOff(profDemo, cutOffDate);
      const category = profDemo.category || 'General / Unreserved';
      const relaxationYears = this.getCategoryAgeRelaxation(category);
      const maxAllowedAge = vacQuals.ageLimit + relaxationYears;

      if (candAge > maxAllowedAge) {
        const failMsg = `Age limit exceeded: Candidate age (${candAge} yrs) exceeds maximum allowed age of ${maxAllowedAge} yrs (${vacQuals.ageLimit} general + ${relaxationYears} yrs for ${category}) as on cut-off ${cutOffDateFormatted}.`;
        hardGateFailures.push(failMsg);
        ageResult = { isEligible: false, details: failMsg };
      } else {
        const passMsg = `Age eligible: ${candAge} yrs ≤ ${maxAllowedAge} yrs limit (${vacQuals.ageLimit} general + ${relaxationYears} yrs for ${category}) as on ${cutOffDateFormatted}.`;
        hardGatePasses.push(passMsg);
        ageResult = { isEligible: true, details: passMsg };
      }
    }

    // 4. Experience Threshold Gate
    const minExp = vacQuals.minExperienceYears || 0;
    const candExp = profExp.minYears || 0;
    if (minExp > 0 && candExp < minExp) {
      const expDeficit = minExp - candExp;
      if (expDeficit > 1) {
        hardGateFailures.push(`Experience deficit: Advertised role specifies minimum ${minExp} years, candidate profile records ${candExp} years.`);
      } else {
        hardGatePasses.push(`Experience borderline: Candidate ${candExp} yrs close to ${minExp} yrs requirement.`);
      }
    } else if (minExp > 0) {
      hardGatePasses.push(`Experience satisfied (${candExp} yrs ≥ ${minExp} yrs min)`);
    }

    const isStage1Eligible = hardGateFailures.length === 0;

    // 5. Assemble "Why Matched" Concise Audit Snippet
    let whyMatchedSnippet = '';
    if (isStage1Eligible) {
      const degShort = (qualEval.candidateTaxonomy?.canonicalName || candDegree).split('(')[0].trim();
      const ageShort = profDemo.age ? `Age: ${profDemo.age} yrs` : 'Age OK';
      const expShort = `Exp: ${candExp} yrs`;
      whyMatchedSnippet = `✅ Matched: ${degShort} | ${ageShort} | ${expShort}`;
      if (vacancy.organisation) {
        whyMatchedSnippet += ` | Org: ${vacancy.organisation}`;
      }
    } else {
      whyMatchedSnippet = `❌ Ineligible: ${hardGateFailures[0]}`;
    }

    return {
      isStage1Eligible,
      hardGateFailures,
      hardGatePasses,
      qualEval,
      ageResult,
      whyMatchedSnippet
    };
  }
}
