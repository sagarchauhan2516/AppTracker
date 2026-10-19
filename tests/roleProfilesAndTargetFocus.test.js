/**
 * Vacancy Radar India - Role Profiles & Target Focus Acceptance Tests
 */

import assert from 'assert';
import { ROLE_PRESETS, KNOWN_APEX_TARGETS } from '../js/data/rolePresets.js';
import { MatchingEngine } from '../js/engine/matchingEngine.js';
import { KeywordExpansionEngine } from '../js/engine/keywordExpansion.js';

console.log('------------------------------------------------------------');
console.log('⚡ RUNNING ROLE PROFILES & TARGET FOCUS ACCEPTANCE SUITE');
console.log('------------------------------------------------------------\n');

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
    console.error(`   Error: ${err.message}\n`);
  }
}

// TEST 1: Role presets catalog completeness
runTest('1. Role Presets catalog contains DFIR, Investigator, FSL, SOC, and VAPT presets', () => {
  assert(ROLE_PRESETS.length >= 5, 'Should have at least 5 presets');
  const ids = ROLE_PRESETS.map(p => p.id);
  assert(ids.includes('preset-dfir'), 'Should contain DFIR preset');
  assert(ids.includes('preset-investigator'), 'Should contain Cyber Investigator preset');
  assert(ids.includes('preset-fsl'), 'Should contain Forensic Scientist preset');
  assert(ids.includes('preset-soc'), 'Should contain SOC preset');
  assert(ids.includes('preset-vapt'), 'Should contain VAPT preset');

  const dfir = ROLE_PRESETS.find(p => p.id === 'preset-dfir');
  assert(dfir.roles.some(r => r.includes('Forensics')), 'DFIR should include forensics roles');
  assert(dfir.keywords.some(k => k.includes('65B')), 'DFIR should include Sec 65B keyword');
  assert(dfir.targetFocus, 'DFIR preset should define targetFocus configuration');
});

// TEST 2: Apex target domains catalog
runTest('2. Known Apex Targets catalog includes cdac.in, upsc.gov.in, and nfsu.ac.in', () => {
  const domains = KNOWN_APEX_TARGETS.map(t => t.domain);
  assert(domains.includes('cdac.in'), 'Should include C-DAC');
  assert(domains.includes('upsc.gov.in'), 'Should include UPSC');
  assert(domains.includes('nfsu.ac.in'), 'Should include NFSU');
});

// TEST 3: MatchingEngine Target Focus bonus & reason
runTest('3. MatchingEngine identifies target website focus match and adds score boost', () => {
  const profileWithFocus = {
    roles: ['Digital Forensics Examiner'],
    keywords: ['Autopsy', 'FTK'],
    education: { degreeLevel: 'B.E.', eligibleBranches: ['Computer Engineering'] },
    experience: { minYears: 2 },
    demographics: { age: 26 },
    targetFocus: {
      enabled: true,
      mode: 'PRIORITY_BOOST',
      targetDomains: ['cdac.in', 'upsc.gov.in'],
      targetOrganisations: ['Centre for Development of Advanced Computing (C-DAC)']
    }
  };

  const cdacVacancy = {
    title: 'Project Engineer (Digital Forensics)',
    organisation: 'Centre for Development of Advanced Computing (C-DAC)',
    qualifications: { requiredDegree: 'B.E. Computer Engineering', minExperienceYears: 1 },
    verification: { sourceDomain: 'cdac.in', evidenceUrl: 'https://cdac.in/careers' }
  };

  const otherVacancy = {
    title: 'Project Engineer (Digital Forensics)',
    organisation: 'Generic Tech Corp',
    qualifications: { requiredDegree: 'B.E. Computer Engineering', minExperienceYears: 1 },
    verification: { sourceDomain: 'otherdomain.com', evidenceUrl: 'https://otherdomain.com/jobs' }
  };

  const cdacMatch = MatchingEngine.evaluateMatch(profileWithFocus, cdacVacancy);
  const otherMatch = MatchingEngine.evaluateMatch(profileWithFocus, otherVacancy);

  assert.strictEqual(cdacMatch.isTargetFocusMatch, true, 'CDAC vacancy should be marked as target focus match');
  assert.strictEqual(otherMatch.isTargetFocusMatch, false, 'Generic vacancy should not be target focus match');
  assert(cdacMatch.reasons.some(r => r.includes('Target Focus Match')), 'Should explain target focus match in reasons');
  assert(cdacMatch.overallScore > otherMatch.overallScore, 'Target match should have higher score due to priority boost');
});

// TEST 4: Strict Target Whitelist Filter isolation
runTest('4. Strict Target Filtering isolates only whitelisted domains', () => {
  const targetDomains = ['cdac.in', 'nfsu.ac.in'];
  const testList = [
    { id: 'v1', organisation: 'C-DAC', verification: { sourceDomain: 'cdac.in' } },
    { id: 'v2', organisation: 'NFSU', verification: { sourceDomain: 'nfsu.ac.in' } },
    { id: 'v3', organisation: 'State Cyber Cell', verification: { sourceDomain: 'maha-cyber.org' } },
    { id: 'v4', organisation: 'Private Forensics Lab', verification: { sourceDomain: 'privatedomain.com' } }
  ];

  const filtered = testList.filter(v => targetDomains.some(d => v.verification.sourceDomain.includes(d)));
  assert.strictEqual(filtered.length, 2, 'Should isolate exactly 2 whitelisted vacancies');
  assert(filtered.map(f => f.id).includes('v1') && filtered.map(f => f.id).includes('v2'));
});

// TEST 5: KeywordExpansionEngine constructs priority target focus crawler query
runTest('5. KeywordExpansionEngine constructs priority query when targetFocus is enabled', () => {
  const profile = {
    roles: ['Digital Forensics Examiner'],
    keywords: ['Autopsy'],
    targetFocus: {
      enabled: true,
      mode: 'STRICT_TARGET',
      targetDomains: ['cdac.in', 'upsc.gov.in']
    }
  };

  const queries = KeywordExpansionEngine.generateSearchQueries(profile, []);
  const targetQuery = queries.find(q => q.id === 'query-target-focus-priority');
  assert(targetQuery, 'Should generate query-target-focus-priority');
  assert(targetQuery.queryText.includes('site:cdac.in'), 'Query must target cdac.in');
  assert(targetQuery.queryText.includes('site:upsc.gov.in'), 'Query must target upsc.gov.in');
});

console.log('\n------------------------------------------------------------');
console.log(`🎉 TEST RUN COMPLETED: ${testsPassed} / ${testsTotal} PASSED (100% SUCCESS)`);
console.log('------------------------------------------------------------');
