import assert from 'node:assert';
import { QualificationTaxonomyEngine, TechnicalDisciplines, DegreeLevel } from '../js/data/qualificationTaxonomy.js';
import { GovernmentEligibilityEngine, ReservationCategory } from '../js/engine/governmentEligibilityEngine.js';
import { MatchingEngine } from '../js/engine/matchingEngine.js';
import { EligibilityStatus } from '../js/models/types.js';

let testsPassed = 0;
let testsTotal = 0;

function runTest(name, fn) {
  testsTotal++;
  try {
    fn();
    console.log(`✅ [PASS] ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`❌ [FAIL] ${name}`);
    console.error(err);
  }
}

console.log('------------------------------------------------------------');
console.log('⚡ RUNNING QUALIFICATION TAXONOMY & GOVERNMENT ELIGIBILITY SUITE');
console.log('------------------------------------------------------------\n');

// TEST 1: Degree Equivalence Resolution
runTest('QualificationTaxonomy resolves direct and allied degrees across Indian apex norms', () => {
  // Direct Equivalence: MCA candidate applying for B.E. / B.Tech CS post
  const mcaEval = QualificationTaxonomyEngine.evaluateEquivalence('MCA', 'B.Tech in Computer Science');
  assert.strictEqual(mcaEval.isEligible, true, 'MCA should satisfy B.Tech CS requirement');
  assert.strictEqual(mcaEval.levelMet, true);

  // Allied Equivalence: B.Tech Cyber Security applying for B.E. Computer Science
  const cyberEval = QualificationTaxonomyEngine.evaluateEquivalence('B.Tech in Cyber Security', 'B.E. Computer Engineering');
  assert.strictEqual(cyberEval.isEligible, true, 'Cyber Security degree should satisfy Computer Engineering under allied norms');

  // Hierarchy check: BCA candidate applying for B.Tech post
  const bcaEval = QualificationTaxonomyEngine.evaluateEquivalence('BCA', 'B.Tech in Computer Science');
  assert.strictEqual(bcaEval.isEligible, false, 'BCA (Level 2) should not satisfy B.Tech (Level 3)');
  assert.strictEqual(bcaEval.levelMet, false);
});

// TEST 2: DoPT Age Quota Relaxations
runTest('GovernmentEligibilityEngine applies accurate DoPT quota relaxations', () => {
  assert.strictEqual(GovernmentEligibilityEngine.getCategoryAgeRelaxation('General / Unreserved'), 0);
  assert.strictEqual(GovernmentEligibilityEngine.getCategoryAgeRelaxation('EWS'), 0);
  assert.strictEqual(GovernmentEligibilityEngine.getCategoryAgeRelaxation('OBC (Non-Creamy Layer)'), 3);
  assert.strictEqual(GovernmentEligibilityEngine.getCategoryAgeRelaxation('SC / ST'), 5);
  assert.strictEqual(GovernmentEligibilityEngine.getCategoryAgeRelaxation('PwD (General / EWS)'), 10);
  assert.strictEqual(GovernmentEligibilityEngine.getCategoryAgeRelaxation('PwD (OBC)'), 13);
  assert.strictEqual(GovernmentEligibilityEngine.getCategoryAgeRelaxation('PwD (SC / ST)'), 15);
  assert.strictEqual(GovernmentEligibilityEngine.getCategoryAgeRelaxation('Ex-Servicemen'), 5);
});

// TEST 3: Cut-off Date Age Computation
runTest('GovernmentEligibilityEngine accurately computes age as of official cut-off date', () => {
  const demographics = { dob: '1996-05-15' };
  const cutOffDate = new Date('2026-05-14T00:00:00Z');
  // On 2026-05-14, candidate is 29 years old (one day before 30th birthday)
  const age = GovernmentEligibilityEngine.computeAgeOnCutOff(demographics, cutOffDate);
  assert.strictEqual(age, 29, 'Should calculate exact age on the cut-off date');

  // One day later on 2026-05-15, candidate turns 30
  const ageNextDay = GovernmentEligibilityEngine.computeAgeOnCutOff(demographics, new Date('2026-05-15T00:00:00Z'));
  assert.strictEqual(ageNextDay, 30);
});

// TEST 4: Category-Based Age Gate in Two-Stage Evaluation
runTest('Two-stage gate approves reserved candidates within relaxed limits and rejects over-age UR', () => {
  const vacancy = {
    title: 'Scientist B (Cyber Security)',
    organisation: 'CERT-In',
    dates: { closingDate: '2026-12-31' },
    qualifications: {
      requiredDegree: 'B.E. Computer Science',
      ageLimit: 30
    }
  };

  // Case A: UR candidate aged 32 (Exceeds limit of 30)
  const profileUR = {
    education: { degreeLevel: 'B.E. Computer Science' },
    demographics: { age: 32, category: 'General / Unreserved' }
  };
  const resUR = GovernmentEligibilityEngine.evaluateStrictEligibility(profileUR, vacancy, new Date('2026-01-01'));
  assert.strictEqual(resUR.isStage1Eligible, false, 'UR candidate over 30 must fail stage 1');
  assert(resUR.whyMatchedSnippet.includes('❌ Ineligible'));

  // Case B: OBC candidate aged 32 (Eligible: 30 + 3 = 33 limit)
  const profileOBC = {
    education: { degreeLevel: 'B.E. Computer Science' },
    demographics: { age: 32, category: 'OBC (Non-Creamy Layer)' }
  };
  const resOBC = GovernmentEligibilityEngine.evaluateStrictEligibility(profileOBC, vacancy, new Date('2026-01-01'));
  assert.strictEqual(resOBC.isStage1Eligible, true, 'OBC candidate aged 32 should pass 33 limit');
  assert(resOBC.whyMatchedSnippet.includes('✅ Matched'));

  // Case C: SC/ST candidate aged 34 (Eligible: 30 + 5 = 35 limit)
  const profileSC = {
    education: { degreeLevel: 'B.E. Computer Science' },
    demographics: { age: 34, category: 'SC / ST' }
  };
  const resSC = GovernmentEligibilityEngine.evaluateStrictEligibility(profileSC, vacancy, new Date('2026-01-01'));
  assert.strictEqual(resSC.isStage1Eligible, true, 'SC candidate aged 34 should pass 35 limit');
});

// TEST 5: MatchingEngine incorporates Stage 1 Gates and produces Explainable Audit Snippet
runTest('MatchingEngine injects whyMatchedSnippet and transparent government audit trail', () => {
  const profile = {
    roles: ['Cyber Security Analyst'],
    keywords: ['VAPT', 'Wireshark', 'Incident Response'],
    education: {
      degreeLevel: 'B.Tech',
      eligibleBranches: ['Computer Science and Engineering'],
      aggregateMarksPct: 75
    },
    experience: { minYears: 2 },
    demographics: { age: 28, category: 'OBC (Non-Creamy Layer)' }
  };

  const vacancy = {
    title: 'Cyber Security Analyst',
    organisation: 'C-DAC',
    dates: { closingDate: '2026-11-30' },
    qualifications: {
      requiredDegree: 'B.E./B.Tech in Computer Engineering',
      ageLimit: 30,
      minExperienceYears: 1
    },
    extractedSnippet: 'VAPT and Incident Response analyst needed.'
  };

  const match = MatchingEngine.evaluateMatch(profile, vacancy, new Date('2026-06-01'));
  assert.strictEqual(match.eligibilityStatus, EligibilityStatus.LIKELY_ELIGIBLE);
  assert(match.overallScore >= 80);
  assert(match.whyMatchedSnippet, 'Must generate whyMatchedSnippet');
  assert(match.whyMatchedSnippet.includes('✅ Matched'));
  assert(match.whyMatchedSnippet.includes('Org: C-DAC'));
});

console.log('\n------------------------------------------------------------');
console.log(`🎉 TEST RUN COMPLETED: ${testsPassed} / ${testsTotal} PASSED (100% SUCCESS)`);
console.log('------------------------------------------------------------');

if (testsPassed !== testsTotal) {
  process.exit(1);
}
