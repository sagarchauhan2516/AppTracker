import test from 'node:test';
import assert from 'node:assert';
import {
  AiSuggestionsEngine,
  AI_SUGGESTIONS_CATALOG,
  AI_NEGATIVE_SUGGESTIONS,
  AI_CUSTOM_META_SUGGESTIONS
} from '../js/engine/aiSuggestionsEngine.js';

test('AiSuggestionsEngine: returns appropriate role recommendations for software profile', () => {
  const profile = { name: 'Full Stack Engineer', roles: ['Software Developer'], keywords: ['Node.js'] };
  const roles = AiSuggestionsEngine.getRoleSuggestions(profile);
  assert.ok(roles.length > 0, 'Should suggest roles for software');
  assert.ok(roles.some(r => r.toLowerCase().includes('software') || r.toLowerCase().includes('engineer')), 'Should contain software engineering roles');
});

test('AiSuggestionsEngine: returns relevant keywords for cyber security and DFIR', () => {
  const dfirProfile = { name: 'Forensics Specialist', roles: ['DFIR Analyst'], keywords: [] };
  const keywords = AiSuggestionsEngine.getKeywordSuggestions(dfirProfile);
  assert.ok(keywords.includes('Volatility') || keywords.includes('Autopsy') || keywords.includes('Cellebrite UFED'), 'Should include forensic tools');

  const cyberProfile = { name: 'SOC Analyst', roles: ['SOC Analyst'], keywords: [] };
  const cyberKeywords = AiSuggestionsEngine.getKeywordSuggestions(cyberProfile);
  assert.ok(cyberKeywords.includes('Splunk SIEM') || cyberKeywords.includes('MITRE ATT&CK') || cyberKeywords.includes('EDR CrowdStrike'), 'Should include SOC tools');
});

test('AiSuggestionsEngine: returns official apex websites and portals', () => {
  const profile = { name: 'Cyber Researcher', roles: ['Cyber Crime Investigator'], keywords: [] };
  const websites = AiSuggestionsEngine.getWebsiteSuggestions(profile);
  assert.ok(websites.length > 0, 'Should return suggested websites');
  assert.ok(websites.some(w => w.domain === 'cdac.in' || w.domain === 'cert-in.org.in' || w.domain === 'nfsu.ac.in'), 'Should include known apex official domains');
});

test('AiSuggestionsEngine: provides negative filter suggestions and custom meta presets', () => {
  assert.ok(Array.isArray(AI_NEGATIVE_SUGGESTIONS), 'Negative suggestions should be an array');
  assert.ok(AI_NEGATIVE_SUGGESTIONS.includes('Unpaid Internship'));
  assert.ok(AI_NEGATIVE_SUGGESTIONS.includes('Sales / Telecaller'));

  assert.ok(Array.isArray(AI_CUSTOM_META_SUGGESTIONS), 'Meta suggestions should be an array');
  assert.ok(AI_CUSTOM_META_SUGGESTIONS.some(m => m.key === 'Notice Period'));
  assert.ok(AI_CUSTOM_META_SUGGESTIONS.some(m => m.key === 'Security Clearance'));
});
