import test from 'node:test';
import assert from 'node:assert';
import { defaultProfile } from '../js/data/defaultProfile.js';

// Extracted matching logic identical to Code.gs isVacancyRelevantToProfile
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

  // Semantic & Token-Based Matching
  const domainStems = ['forensic', 'cyber', 'security', 'dfir', 'incident', 'evidence', 'malware', 'vapt', 'soc', 'investigat', 'digital', 'cctv'];
  const roleStems = ['examiner', 'analyst', 'officer', 'scientist', 'engineer', 'specialist', 'expert', 'consultant', 'technic', 'programmer', 'developer', 'associate', 'fellow', 'faculty', 'professor'];
  const techStems = ['computer', 'software', 'information technology', 'system', 'network', 'data'];

  const hasDomainStem = domainStems.some(s => vacDesc.includes(s));
  const hasRoleStem = roleStems.some(s => vacDesc.includes(s));
  const hasTechStem = techStems.some(s => vacDesc.includes(s));

  if (hasDomainStem && (hasRoleStem || hasTechStem)) return true;

  const apexForensicDomains = ['nfsu.ac.in', 'cfslcbi.gov.in', 'dfs.nic.in', 'cert-in.org.in', 'cybercrime.gov.in', 'dfs.gujarat.gov.in', 'bprd.nic.in'];
  const isApexForensic = apexForensicDomains.some(ad => vacDomain && (vacDomain === ad || vacDomain.endsWith('.' + ad)));
  if (isApexForensic && (hasRoleStem || hasTechStem || hasDomainStem)) return true;

  const apexTechDomains = ['cdac.in', 'nic.in', 'nielit.in', 'nielit.gov.in', 'drdo.gov.in', 'rac.gov.in'];
  const isApexTech = apexTechDomains.some(atd => vacDomain && (vacDomain === atd || vacDomain.endsWith('.' + atd)));
  if (isApexTech && hasTechStem && hasRoleStem) return true;

  if (targetDomains.length > 0) {
    const domainMatch = targetDomains.some(td => vacDomain && (vacDomain === td || vacDomain.endsWith('.' + td)));
    if (domainMatch && (hasRoleStem || hasTechStem || hasDomainStem)) return true;
  }

  return false;
}

test('Semantic Matching: matches real-world Indian technical & cyber vacancies for DFIR graduate', () => {
  // Case 1: Scientific Officer (Cyber Forensics)
  const vac1 = {
    title: 'Recruitment for the post of Junior Scientific Officer (Cyber Forensics)',
    organisation: 'CFSL / Directorate of Forensic Science Services',
    sector: 'Central Government',
    sourceUrl: 'https://dfs.nic.in/vacancies/jso_cyber.pdf'
  };
  assert.strictEqual(isVacancyRelevantToProfile(vac1, defaultProfile), true, 'Must match JSO Cyber Forensics');

  // Case 2: Project Engineer (Cyber Security) from C-DAC
  const vac2 = {
    title: 'Project Engineer (Cyber Security & Network Forensics)',
    organisation: 'Centre for Development of Advanced Computing (C-DAC)',
    sector: 'Autonomous Society',
    sourceUrl: 'https://www.cdac.in/careers/advt_02.pdf'
  };
  assert.strictEqual(isVacancyRelevantToProfile(vac2, defaultProfile), true, 'Must match C-DAC Project Engineer');

  // Case 3: NFSU DGGI Forensics Laboratory
  const vac3 = {
    title: 'NFSU-DGGI Digital Forensics Laboratory Research Officer',
    organisation: 'National Forensic Sciences University',
    sector: 'Central University',
    sourceUrl: 'https://beta.nfsu.ac.in/data/pdfs/career/advt.pdf'
  };
  assert.strictEqual(isVacancyRelevantToProfile(vac3, defaultProfile), true, 'Must match NFSU DGGI Forensics post');

  // Case 4: Negative filter - Exam Result
  const negResult = {
    title: 'Final Result: Cyber Forensics Examination 2026',
    organisation: 'UPSC',
    sourceUrl: 'https://upsc.gov.in/results'
  };
  assert.strictEqual(isVacancyRelevantToProfile(negResult, defaultProfile), false, 'Must reject Exam Results');

  // Case 5: Negative filter - Admit Card
  const negAdmit = {
    title: 'Download Admit Card for Technical Assistant (Computer)',
    organisation: 'DSSSB',
    sourceUrl: 'https://dsssb.delhi.gov.in/admit'
  };
  assert.strictEqual(isVacancyRelevantToProfile(negAdmit, defaultProfile), false, 'Must reject Admit Cards');

  // Case 6: Negative filter - Non-technical manual post
  const negPeon = {
    title: 'Recruitment for 10 Posts of Peon / Safai Karamchari',
    organisation: 'State Forensic Lab',
    sourceUrl: 'https://dfs.gujarat.gov.in'
  };
  assert.strictEqual(isVacancyRelevantToProfile(negPeon, defaultProfile), false, 'Must reject non-technical manual posts');
});
