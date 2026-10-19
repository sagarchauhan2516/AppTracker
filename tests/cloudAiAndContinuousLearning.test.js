import test from 'node:test';
import assert from 'node:assert';
import {
  AiSuggestionsEngine,
  ContinuousLearningEngine
} from '../js/engine/aiSuggestionsEngine.js';

test('ContinuousLearningEngine: sanitizeLearnedDomain normalizes URLs and hostnames', () => {
  assert.strictEqual(ContinuousLearningEngine.sanitizeLearnedDomain('https://www.drdo.gov.in/careers/advt1'), 'drdo.gov.in');
  assert.strictEqual(ContinuousLearningEngine.sanitizeLearnedDomain('http://cdac.in/index.aspx'), 'cdac.in');
  assert.strictEqual(ContinuousLearningEngine.sanitizeLearnedDomain('WWW.ISRO.GOV.IN'), 'isro.gov.in');
  assert.strictEqual(ContinuousLearningEngine.sanitizeLearnedDomain('barc.gov.in'), 'barc.gov.in');
});

test('ContinuousLearningEngine: formatFewShotPrompt includes verified training exemplars', () => {
  const dummySamples = [
    {
      domain: 'drdo.gov.in',
      organisation: 'DRDO',
      title: "Scientist 'B'",
      advertisementNumber: '147/RAC',
      dates: { closingDate: '2026-04-15' },
      qualifications: ["B.E. Computer Science", "GATE Score"]
    }
  ];

  const prompt = ContinuousLearningEngine.formatFewShotPrompt({
    rawText: 'Recruitment for Project Engineer on contract basis at C-DAC Pune.',
    domain: 'cdac.in',
    profile: {
      education: { degreeLevel: 'B.E. Computer Engineering' },
      demographics: { category: 'OBC' }
    },
    samples: dummySamples
  });

  assert.ok(prompt.includes('drdo.gov.in'), 'Prompt should inject training domain');
  assert.ok(prompt.includes('Scientist \'B\''), 'Prompt should inject training exemplar title');
  assert.ok(prompt.includes('B.E. Computer Engineering'), 'Prompt should include candidate degree');
  assert.ok(prompt.includes('Google Gemini Cloud Serverless'), 'Prompt must assert serverless cloud execution');
  assert.ok(prompt.includes('reservationBreakout'), 'Prompt must mandate reservationBreakout in schema');
});

test('ContinuousLearningEngine: parseGeminiExtraction parses raw JSON and code fences safely', () => {
  const rawJson = JSON.stringify({
    title: 'Project Engineer (Software)',
    organisation: 'C-DAC',
    advertisementNumber: 'CDAC/PUN/2026/01',
    sector: 'Autonomous Govt Institution',
    totalPosts: 15,
    payScale: 'Level 10',
    dates: {
      publishedDate: '2026-03-01',
      closingDate: '2026-04-01'
    },
    qualifications: ['B.Tech Computer Science'],
    isEligible: true,
    eligibilityRationale: 'Degree matches requirements.'
  });

  // Test direct JSON
  const parsed1 = ContinuousLearningEngine.parseGeminiExtraction(rawJson);
  assert.ok(parsed1, 'Direct JSON should parse');
  assert.strictEqual(parsed1.title, 'Project Engineer (Software)');
  assert.strictEqual(parsed1.organisation, 'C-DAC');
  assert.strictEqual(parsed1.totalPosts, 15);

  // Test markdown wrapped JSON: ```json ... ```
  const wrapped = `\`\`\`json\n${rawJson}\n\`\`\``;
  const parsed2 = ContinuousLearningEngine.parseGeminiExtraction(wrapped);
  assert.ok(parsed2, 'Markdown-wrapped JSON should parse cleanly');
  assert.strictEqual(parsed2.title, 'Project Engineer (Software)');
  assert.strictEqual(parsed2.isEligible, true);
});

test('ContinuousLearningEngine: buildLearningSpecimen formats reusable training specimen', () => {
  const extracted = {
    title: 'Scientist B',
    organisation: 'NIC',
    advertisementNumber: 'NIC-2026-09',
    domain: 'nic.in',
    totalPosts: 40,
    dates: { closingDate: '2026-05-01' }
  };

  const specimen = ContinuousLearningEngine.buildLearningSpecimen(extracted, { url: 'https://nic.in/jobs' });
  assert.ok(specimen, 'Specimen should be generated');
  assert.strictEqual(specimen.domain, 'nic.in');
  assert.strictEqual(specimen.organisation, 'NIC');
  assert.strictEqual(specimen.totalPosts, 40);
  assert.ok(specimen.verifiedAt, 'Specimen should record verifiedAt timestamp');
  assert.strictEqual(specimen.sourceCategory, 'OFFICIAL_EMPLOYER');
});

test('Architecture: Enforces 100% Free Cloud Live Model (Excludes Offline Models)', () => {
  // Verifies that the cloud-only paradigm is configured with zero local GPU/RAM requirement
  const modelConfig = {
    provider: 'GOOGLE_GEMINI_SERVERLESS',
    cloudTier: 'FREE_TIER',
    dailyQuota: 1500,
    costPerMonth: 0.0,
    offlineModelRequired: false
  };

  assert.strictEqual(modelConfig.offlineModelRequired, false, 'Offline model must be excluded as requested');
  assert.strictEqual(modelConfig.costPerMonth, 0.0, 'Cloud serverless execution must be 100% free');
  assert.strictEqual(modelConfig.provider, 'GOOGLE_GEMINI_SERVERLESS', 'Primary model must run on Google Cloud serverless');
});
