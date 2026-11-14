import test from 'node:test';
import assert from 'node:assert';
import { defaultProfile, initialDefaultProfiles } from '../js/data/defaultProfile.js';

// Universal matching logic identical to Code.gs isVacancyRelevantToProfile
function isVacancyRelevantToProfile(vac, profile) {
  if (!vac || !profile) return true;

  const vacTitle = String(vac.title || '').toLowerCase();
  const vacOrg = String(vac.organisation || '').toLowerCase();
  const vacSector = String(vac.sector || '').toLowerCase();
  const vacSnippet = String(vac.extractedSnippet || '').toLowerCase();
  const vacDesc = `${vacSector} ${vacTitle} ${vacOrg} ${vacSnippet}`;

  // 0. Hard Negative Exclusions Guard
  const negativePattern = /\b(?:result|admit card|answer key|counselling|cutoff|score card|hall ticket|marksheet|short listed|syllabus|typing test|peon|driver|cook|sweeper|safai|cleaner|plumber|carpenter|gardener)\b/i;
  if (negativePattern.test(vacTitle)) {
    return false;
  }

  const targetFocus = profile.targetFocus || {};
  const isTargetEnabled = (targetFocus.enabled === true || String(targetFocus.enabled).toLowerCase() === 'true');
  const targetDomains = Array.isArray(targetFocus.targetDomains) ? targetFocus.targetDomains.map(d => String(d).toLowerCase().trim()) : [];
  const targetOrgs = Array.isArray(targetFocus.targetOrganisations) ? targetFocus.targetOrganisations.map(o => String(o).toLowerCase().trim()) : [];

  let vacDomain = '';
  try {
    const u = vac.verification?.officialNoticePdfUrl || vac.sourceUrl || '';
    if (u) vacDomain = new URL(u).hostname.replace(/^www\./i, '').toLowerCase();
  } catch (_) {}

  if (isTargetEnabled && targetFocus.mode === 'STRICT_TARGET') {
    if (targetDomains.length > 0 || targetOrgs.length > 0) {
      const domainMatch = targetDomains.some(td => vacDomain && (vacDomain === td || vacDomain.endsWith('.' + td)));
      const orgMatch = targetOrgs.some(to => vacOrg && vacOrg.includes(to));
      if (!domainMatch && !orgMatch) {
        return false;
      }
    }
  }

  const roles = (profile.roles || []).map(r => String(r).toLowerCase().trim()).filter(Boolean);
  const keywords = (profile.keywords || []).map(k => String(k).toLowerCase().trim()).filter(Boolean);

  if (roles.length === 0 && keywords.length === 0) return true;
  if (roles.some(role => vacDesc.includes(role))) return true;
  if (keywords.some(kw => vacDesc.includes(kw))) return true;

  // Dynamic Profile-Aware Token & Stem Matching (Works for ANY Profile)
  const dynamicStems = [];
  roles.forEach(r => {
    r.toLowerCase().split(/[\s\-_/,\(\)]+/).forEach(t => {
      if (t.length >= 3 && !['with', 'from', 'level', 'post', 'lead', 'team', 'senior', 'junior', 'grade', 'project', 'specialist', 'officer', 'engineer'].includes(t)) {
        dynamicStems.push(t);
      }
    });
  });
  keywords.forEach(k => {
    k.toLowerCase().split(/[\s\-_/,\(\)]+/).forEach(t => {
      if (t.length >= 3 && !['with', 'from', 'level', 'post', 'tools'].includes(t)) {
        dynamicStems.push(t);
      }
    });
  });

  const universalRoleStems = ['engineer', 'developer', 'analyst', 'scientist', 'officer', 'specialist', 'expert', 'consultant', 'technic', 'programmer', 'architect', 'associate', 'fellow', 'faculty', 'professor', 'examiner', 'manager', 'lead', 'mts'];
  const hasRoleStem = universalRoleStems.some(s => vacDesc.includes(s));
  const matchedProfileStems = dynamicStems.filter(stem => vacDesc.includes(stem));

  if (matchedProfileStems.length >= 2) return true;
  if (matchedProfileStems.length >= 1 && hasRoleStem) return true;

  // Multi-Domain Technical Stems & Apex Bodies
  const isSoftwareProfile = dynamicStems.some(s => ['software', 'python', 'java', 'react', 'web', 'backend', 'developer', 'coding', 'fullstack'].includes(s));
  if (isSoftwareProfile) {
    const swStems = ['software', 'developer', 'programmer', 'computer', 'information technology', 'systems', 'cloud', 'application'];
    if (swStems.some(s => vacDesc.includes(s)) && hasRoleStem) return true;
    const apexTechDomains = ['cdac.in', 'nic.in', 'nielit.in', 'nielit.gov.in', 'drdo.gov.in', 'stpi.in', 'cris.org.in'];
    if (apexTechDomains.some(atd => vacDomain && (vacDomain === atd || vacDomain.endsWith('.' + atd))) && hasRoleStem) return true;
  }

  const isAiDataProfile = dynamicStems.some(s => ['data', 'analytics', 'machine', 'learning', 'deep', 'pytorch', 'ai', 'intelligence'].includes(s));
  if (isAiDataProfile) {
    const dataStems = ['data', 'analytics', 'statistic', 'machine learning', 'artificial intelligence', 'python'];
    if (dataStems.some(s => vacDesc.includes(s)) && hasRoleStem) return true;
  }

  const isCyberProfile = dynamicStems.some(s => ['forensic', 'cyber', 'security', 'dfir', 'evidence', 'incident', 'malware', 'vapt', 'soc'].includes(s));
  if (isCyberProfile) {
    const domainStems = ['forensic', 'cyber', 'security', 'dfir', 'incident', 'evidence', 'malware', 'vapt', 'soc', 'investigat', 'digital', 'cctv'];
    if (domainStems.some(s => vacDesc.includes(s)) && hasRoleStem) return true;
    const apexForensicDomains = ['nfsu.ac.in', 'cfslcbi.gov.in', 'dfs.nic.in', 'cert-in.org.in', 'cybercrime.gov.in', 'dfs.gujarat.gov.in', 'bprd.nic.in'];
    if (apexForensicDomains.some(ad => vacDomain && (vacDomain === ad || vacDomain.endsWith('.' + ad)))) return true;
  }

  if (targetDomains.length > 0) {
    const domainMatch = targetDomains.some(td => vacDomain && (vacDomain === td || vacDomain.endsWith('.' + td)));
    if (domainMatch && (hasRoleStem || matchedProfileStems.length > 0)) return true;
  }

  return false;
}

test('Semantic Matching: matches real-world Indian technical & cyber vacancies for DFIR graduate', () => {
  const vac1 = {
    title: 'Recruitment for the post of Junior Scientific Officer (Cyber Forensics)',
    organisation: 'CFSL / Directorate of Forensic Science Services',
    sector: 'Central Government',
    sourceUrl: 'https://dfs.nic.in/vacancies/jso_cyber.pdf'
  };
  assert.strictEqual(isVacancyRelevantToProfile(vac1, defaultProfile), true, 'Must match JSO Cyber Forensics');

  const vac2 = {
    title: 'Project Engineer (Cyber Security & Network Forensics)',
    organisation: 'Centre for Development of Advanced Computing (C-DAC)',
    sector: 'Autonomous Society',
    sourceUrl: 'https://www.cdac.in/careers/advt_02.pdf'
  };
  assert.strictEqual(isVacancyRelevantToProfile(vac2, defaultProfile), true, 'Must match C-DAC Project Engineer');

  const vac3 = {
    title: 'NFSU-DGGI Digital Forensics Laboratory Research Officer',
    organisation: 'National Forensic Sciences University',
    sector: 'Central University',
    sourceUrl: 'https://beta.nfsu.ac.in/data/pdfs/career/advt.pdf'
  };
  assert.strictEqual(isVacancyRelevantToProfile(vac3, defaultProfile), true, 'Must match NFSU DGGI Forensics post');

  // Negative tests
  const negResult = {
    title: 'Final Result: Cyber Forensics Examination 2026',
    organisation: 'UPSC',
    sourceUrl: 'https://upsc.gov.in/results'
  };
  assert.strictEqual(isVacancyRelevantToProfile(negResult, defaultProfile), false, 'Must reject Exam Results');

  const negAdmit = {
    title: 'Download Admit Card for Technical Assistant (Computer)',
    organisation: 'DSSSB',
    sourceUrl: 'https://dsssb.delhi.gov.in/admit'
  };
  assert.strictEqual(isVacancyRelevantToProfile(negAdmit, defaultProfile), false, 'Must reject Admit Cards');

  const negPeon = {
    title: 'Recruitment for 10 Posts of Peon / Safai Karamchari',
    organisation: 'State Forensic Lab',
    sourceUrl: 'https://dfs.gujarat.gov.in'
  };
  assert.strictEqual(isVacancyRelevantToProfile(negPeon, defaultProfile), false, 'Must reject non-technical manual posts');
});

test('Semantic Matching: matches general Software Engineering and Data Science profiles dynamically', () => {
  const sweProfile = initialDefaultProfiles.find(p => p.id === 'profile-software-engineer');
  const aiProfile = initialDefaultProfiles.find(p => p.id === 'profile-data-ai');

  // Case 1: Software profile matches C-DAC Project Engineer (Full Stack / Python)
  const sweVac1 = {
    title: 'Recruitment for Project Engineer (Full Stack Python / React Systems)',
    organisation: 'C-DAC',
    sector: 'Autonomous Society',
    sourceUrl: 'https://cdac.in/careers/advt_swe.pdf'
  };
  assert.strictEqual(isVacancyRelevantToProfile(sweVac1, sweProfile), true, 'Software profile must match Project Engineer');

  // Case 2: Software profile matches NIC Scientist-B (Computer Science)
  const sweVac2 = {
    title: 'Scientist B (Computer Science & Information Technology)',
    organisation: 'National Informatics Centre (NIC)',
    sector: 'Central Government',
    sourceUrl: 'https://nic.in/recruitment/scientist_b.pdf'
  };
  assert.strictEqual(isVacancyRelevantToProfile(sweVac2, sweProfile), true, 'Software profile must match NIC Scientist-B');

  // Case 3: Data Science profile matches DRDO CAIR Project Scientist (AI / Machine Learning)
  const aiVac = {
    title: 'Appointment of Project Scientist (Artificial Intelligence & Machine Learning)',
    organisation: 'DRDO - Centre for Artificial Intelligence and Robotics (CAIR)',
    sector: 'Central Government',
    sourceUrl: 'https://drdo.gov.in/cair/advt_ai.pdf'
  };
  assert.strictEqual(isVacancyRelevantToProfile(aiVac, aiProfile), true, 'AI profile must match DRDO Project Scientist AI');

  // Case 4: Negative filter is still enforced for software candidate
  const sweNegResult = {
    title: 'Provisional Answer Key: Software Engineer Recruitment Exam 2026',
    organisation: 'NIC',
    sourceUrl: 'https://nic.in/answer_key'
  };
  assert.strictEqual(isVacancyRelevantToProfile(sweNegResult, sweProfile), false, 'Must reject answer keys for SWE profile too');
});
