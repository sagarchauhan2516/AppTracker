import test from 'node:test';
import assert from 'node:assert';
import { VerificationEngine } from '../js/engine/verificationEngine.js';
import { SourceRegistryService } from '../js/services/sourceRegistryService.js';
import { VerificationStatus, SourceCategory } from '../js/models/types.js';

test('Verification Accuracy: Official domain with only applicationUrl qualifies as OFFICIALLY_VERIFIED', () => {
  const cdacJob = {
    title: 'Project Engineer (Cyber Security)',
    organisation: 'Centre for Development of Advanced Computing (C-DAC)',
    advertisementNumber: 'CDAC(P)/Recruit/2026/02',
    domain: 'cdac.in',
    sourceUrl: 'https://careers.cdac.in/post-details/104',
    officialNoticePdfUrl: '',
    dates: {
      publishedAt: '2026-11-15',
      closingDate: '2026-12-31'
    },
    qualifications: ['B.E. in Computer Engineering / Information Technology'],
    verification: {
      sourceDomain: 'cdac.in',
      applicationUrl: 'https://careers.cdac.in/post-details/104'
    }
  };

  const audit = VerificationEngine.auditVacancy(cdacJob);
  assert.strictEqual(audit.status, VerificationStatus.OFFICIALLY_VERIFIED);
  assert(audit.confidenceScore >= 0.92, 'Confidence score must be >= 0.92 for official apex portal');
  assert(audit.confirmedFacts.some(f => f.includes('online application portal link verified')));
});

test('Verification Accuracy: Official domain with only notification PDF qualifies as OFFICIALLY_VERIFIED', () => {
  const nfsuJob = {
    title: 'Assistant Professor (Digital Forensics)',
    organisation: 'National Forensic Sciences University (NFSU)',
    advertisementNumber: 'NFSU/EST/2026/08',
    domain: 'nfsu.ac.in',
    sourceUrl: 'https://nfsu.ac.in/career',
    officialNoticePdfUrl: 'https://nfsu.ac.in/data/pdfs/advt_forensics_2026.pdf',
    dates: {
      publishedAt: '2026-11-15',
      closingDate: '2026-12-15'
    },
    qualifications: ['M.Sc / Ph.D in Cyber Forensics / Information Security'],
    verification: {
      sourceDomain: 'nfsu.ac.in',
      officialNoticePdfUrl: 'https://nfsu.ac.in/data/pdfs/advt_forensics_2026.pdf'
    }
  };

  const audit = VerificationEngine.auditVacancy(nfsuJob);
  assert.strictEqual(audit.status, VerificationStatus.OFFICIALLY_VERIFIED);
  assert(audit.confidenceScore >= 0.92);
  assert(audit.confirmedFacts.some(f => f.includes('Direct official notification document retrieved')));
});

test('Verification Accuracy: Third-party aggregator is NEVER granted OFFICIALLY_VERIFIED', () => {
  const aggregatorJob = {
    title: 'DRDO Scientist B Recruitment 2026 - Apply Online 250 Posts',
    organisation: 'Sarkari Result Daily',
    advertisementNumber: 'DRDO-2026-SR',
    domain: 'sarkariresult.com',
    sourceUrl: 'https://www.sarkariresult.com/drdo-recruitment-2026',
    dates: {
      publishedAt: '2026-11-10',
      closingDate: '2026-12-10'
    },
    verification: {
      sourceDomain: 'sarkariresult.com',
      applicationUrl: 'https://www.sarkariresult.com/drdo-recruitment-2026'
    }
  };

  const audit = VerificationEngine.auditVacancy(aggregatorJob);
  assert.notStrictEqual(audit.status, VerificationStatus.OFFICIALLY_VERIFIED);
  assert.strictEqual(audit.status, VerificationStatus.UNVERIFIED_LEAD);
  assert(audit.confidenceScore < 0.70);
  assert(audit.uncertainFields.length > 0);
});

test('Verification Accuracy: Third-party discovery with corroborated .gov.in PDF gets CROSS_CHECKED', () => {
  const crossCheckedJob = {
    title: 'Junior Research Fellow (JRF) - Cyber Forensics',
    organisation: 'Defence Research and Development Organisation',
    advertisementNumber: 'DRDO/RAC/2026/JRF-01',
    domain: 'jobalert-india.com',
    sourceUrl: 'https://jobalert-india.com/drdo-jrf',
    officialNoticePdfUrl: 'https://rac.gov.in/download/advt_jrf_cyber_2026.pdf',
    dates: {
      publishedAt: '2026-11-12',
      closingDate: '2026-12-20'
    },
    verification: {
      sourceDomain: 'jobalert-india.com',
      officialNoticePdfUrl: 'https://rac.gov.in/download/advt_jrf_cyber_2026.pdf'
    }
  };

  const audit = VerificationEngine.auditVacancy(crossCheckedJob);
  assert.strictEqual(audit.status, VerificationStatus.CROSS_CHECKED);
  assert(audit.confidenceScore >= 0.70 && audit.confidenceScore <= 0.88);
});

test('SourceRegistryService: Recognizes all essential Indian technical apex bodies, boards and PSUs', () => {
  const testDomains = [
    { domain: 'careers.cdac.in', expectedOfficial: true, category: SourceCategory.OFFICIAL_EMPLOYER },
    { domain: 'cert-in.org.in', expectedOfficial: true, category: SourceCategory.OFFICIAL_EMPLOYER },
    { domain: 'nfsu.ac.in', expectedOfficial: true, category: SourceCategory.OFFICIAL_EMPLOYER },
    { domain: 'rac.gov.in', expectedOfficial: true, category: SourceCategory.RECRUITMENT_BOARD },
    { domain: 'upsc.gov.in', expectedOfficial: true, category: SourceCategory.RECRUITMENT_BOARD },
    { domain: 'bel-india.in', expectedOfficial: true, category: SourceCategory.OFFICIAL_EMPLOYER },
    { domain: 'ecil.co.in', expectedOfficial: true, category: SourceCategory.OFFICIAL_EMPLOYER },
    { domain: 'ncs.gov.in', expectedOfficial: true, category: SourceCategory.AUTHORISED_PORTAL },
    { domain: 'freejobalert.com', expectedOfficial: false, category: SourceCategory.THIRD_PARTY_AGGREGATOR },
    { domain: 'freshersworld.com', expectedOfficial: false, category: SourceCategory.THIRD_PARTY_AGGREGATOR },
    { domain: 'fake-upsc.gov.in.xyz-jobs.com', expectedOfficial: false, category: SourceCategory.THIRD_PARTY_AGGREGATOR }
  ];

  for (const t of testDomains) {
    const classification = SourceRegistryService.classifyDomain(t.domain);
    assert.strictEqual(
      classification.isOfficialDomain,
      t.expectedOfficial,
      `Domain ${t.domain} official status mismatch`
    );
    assert.strictEqual(
      classification.category,
      t.category,
      `Domain ${t.domain} category mismatch`
    );
  }
});
