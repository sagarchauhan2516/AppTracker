/**
 * Seed Test Dataset for Vacancy Radar India
 * NOTE: All records are strictly marked as [TEST DATA] for prototyping and verification testing.
 */

import { VerificationStatus, SourceCategory, EligibilityStatus, EmploymentType, Sector } from '../models/types.js';

export const testVacancies = [
  {
    id: 'test-vac-001',
    isTestData: true,
    title: 'Project Engineer (Digital Forensics & Cyber Security)',
    organisation: 'Centre for Development of Advanced Computing (C-DAC)',
    advertisementNumber: 'CDAC/CORP/02/2026/DFIR',
    numberOfPosts: 8,
    sector: Sector.AUTONOMOUS_GOVT,
    employmentType: EmploymentType.CONTRACTUAL,
    location: {
      city: 'Pune',
      state: 'Maharashtra',
      isRemote: false,
      workMode: 'On-site'
    },
    qualifications: {
      requiredDegree: 'B.E. / B.Tech in Computer Engineering / CSE / IT',
      eligibleBranches: ['Computer Engineering', 'Computer Science & Engineering', 'Information Technology'],
      minMarksPercentage: 65.0,
      minExperienceYears: 1.0,
      maxExperienceYears: 3.0,
      ageLimit: 30
    },
    remuneration: {
      type: 'Consolidated Pay',
      amountText: '₹6,40,000 - ₹7,80,000 per annum + perks',
      minAnnualInr: 640000,
      maxAnnualInr: 780000
    },
    dates: {
      publishedAt: '2026-10-05',
      applicationOpensAt: '2026-10-06',
      closingDate: '2026-10-28', // Closing within 13 days
      isExtended: false
    },
    verification: {
      status: VerificationStatus.OFFICIALLY_VERIFIED,
      confidenceScore: 0.98,
      verifiedAt: '2026-10-14T08:30:00Z',
      verifiedBy: 'Official Portal Crawler & PDF Parser',
      sourceDomain: 'cdac.in',
      sourceCategory: SourceCategory.OFFICIAL_EMPLOYER,
      evidenceUrl: 'https://www.cdac.in/index.aspx?id=job_advt_corp_2026',
      officialNoticePdfUrl: 'https://www.cdac.in/careers/advt_02_2026_detailed_notification.pdf',
      applicationUrl: 'https://www.cdac.in/careers/apply_online.aspx?advt=CDAC-2026-02',
      verificationNotes: 'Official PDF notice extracted directly from cdac.in official career page. Advertisement number and eligibility terms corroborated.'
    },
    matchAnalysis: {
      overallScore: 94,
      eligibilityStatus: EligibilityStatus.LIKELY_ELIGIBLE,
      reasons: [
        'Direct degree match: B.E. Computer Engineering matches eligible branch list.',
        'Experience alignment: 2 years DFIR experience fits required 1-3 years range.',
        'Technical keywords: Matched "Digital Forensics", "Incident Response", "Memory Forensics".',
        'Location preference: Pune, Maharashtra aligns with primary state selection.'
      ],
      warnings: []
    }
  },
  {
    id: 'test-vac-002',
    isTestData: true,
    title: 'Assistant Scientific Officer (Digital Evidence & Cyber Forensics)',
    organisation: 'National Forensic Sciences University (NFSU)',
    advertisementNumber: 'NFSU/EST/04/2026/CYBER',
    numberOfPosts: 3,
    sector: Sector.CENTRAL_GOVT,
    employmentType: EmploymentType.PERMANENT,
    location: {
      city: 'Gandhinagar',
      state: 'Gujarat',
      isRemote: false,
      workMode: 'On-site'
    },
    qualifications: {
      requiredDegree: 'B.E. / B.Tech in Computer Engineering / Cyber Security or M.Sc Forensic Science (Cyber)',
      eligibleBranches: ['Computer Engineering', 'Computer Science', 'Cyber Security'],
      minMarksPercentage: 60.0,
      minExperienceYears: 2.0,
      maxExperienceYears: 5.0,
      ageLimit: 32
    },
    remuneration: {
      type: '7th CPC Pay Matrix',
      amountText: 'Pay Level 7 (₹44,900 - ₹1,42,400) + Central Govt DA & HRA',
      minAnnualInr: 750000,
      maxAnnualInr: 950000
    },
    dates: {
      publishedAt: '2026-10-02',
      applicationOpensAt: '2026-10-03',
      closingDate: '2026-10-21', // Closing within 6 days!
      isExtended: false
    },
    verification: {
      status: VerificationStatus.CROSS_CHECKED,
      confidenceScore: 0.86,
      verifiedAt: '2026-10-15T02:15:00Z',
      verifiedBy: 'Cross-Domain Corroboration Engine',
      sourceDomain: 'nfsu.ac.in',
      sourceCategory: SourceCategory.OFFICIAL_EMPLOYER,
      evidenceUrl: 'https://nfsu.ac.in/recruitment/non-teaching-2026',
      officialNoticePdfUrl: 'https://nfsu.ac.in/assets/uploads/recruitment/ASO_Cyber_Advt_04.pdf',
      applicationUrl: 'https://nfsu.ac.in/recruitment-portal',
      verificationNotes: 'First discovered via higher education aggregator; cross-referenced and corroborated against the NFSU official bulletin page.'
    },
    matchAnalysis: {
      overallScore: 89,
      eligibilityStatus: EligibilityStatus.LIKELY_ELIGIBLE,
      reasons: [
        'Degree criteria fulfilled: B.E. Computer Engineering accepted.',
        'Prior experience: Evidence examiner experience directly credited.',
        'Permanent post under Central University Pay Matrix Level 7.'
      ],
      warnings: ['Application closing in less than 7 days. Early submission advised.']
    }
  },
  {
    id: 'test-vac-003',
    isTestData: true,
    title: 'Cyber Crime Investigation & DFIR Consultant',
    organisation: 'State Cyber Police Headquarters / Home Dept',
    advertisementNumber: 'STATE-POL-CYBER/2026/09',
    numberOfPosts: 12,
    sector: Sector.STATE_GOVT,
    employmentType: EmploymentType.CONTRACTUAL,
    location: {
      city: 'Mumbai',
      state: 'Maharashtra',
      isRemote: false,
      workMode: 'Hybrid / On-site'
    },
    qualifications: {
      requiredDegree: 'B.E./B.Tech in Computer Engineering / IT with Hands-on Forensics Tools Experience',
      eligibleBranches: ['Computer Engineering', 'Information Technology'],
      minMarksPercentage: 60.0,
      minExperienceYears: 1.5,
      maxExperienceYears: 4.0,
      ageLimit: 35
    },
    remuneration: {
      type: 'Fixed Monthly Honorarium',
      amountText: '₹75,000 per month consolidated (₹9,00,000 LPA)',
      minAnnualInr: 900000,
      maxAnnualInr: 900000
    },
    dates: {
      publishedAt: '2026-10-10',
      applicationOpensAt: '2026-10-12',
      closingDate: '2026-10-31',
      isExtended: false
    },
    verification: {
      status: VerificationStatus.UNVERIFIED_LEAD,
      confidenceScore: 0.62,
      verifiedAt: '2026-10-14T18:00:00Z',
      verifiedBy: 'Web Crawler - Aggregator Discovery',
      sourceDomain: 'maha-cyber-careers.org (Unverified Domain)',
      sourceCategory: SourceCategory.THIRD_PARTY_AGGREGATOR,
      evidenceUrl: 'https://maha-cyber-careers.org/post/investigation-consultant-2026',
      officialNoticePdfUrl: null,
      applicationUrl: null,
      verificationNotes: 'Discovered from a regional public jobs listing board. Official notification on maharashtra.gov.in has not yet been isolated. Pending official gazette check.'
    },
    matchAnalysis: {
      overallScore: 82,
      eligibilityStatus: EligibilityStatus.POTENTIAL_MATCH,
      reasons: [
        'High role relevance: Specific need for 65B Certificate generation and mobile triage.',
        'Location matches target city (Mumbai).'
      ],
      warnings: [
        'Lead not officially verified yet. Do NOT submit payments or sensitive data to third-party portals until verified against official state portal.'
      ]
    }
  },
  {
    id: 'test-vac-004',
    isTestData: true,
    title: 'Senior Digital Evidence Analyst',
    organisation: 'Secured Digital Forensics Lab (Private Sector)',
    advertisementNumber: 'SDFL-PRV-2026-44',
    numberOfPosts: 2,
    sector: Sector.PRIVATE,
    employmentType: EmploymentType.FULL_TIME,
    location: {
      city: 'Bengaluru',
      state: 'Karnataka',
      isRemote: true,
      workMode: 'Remote'
    },
    qualifications: {
      requiredDegree: 'Bachelor Degree in Engineering or allied sciences',
      eligibleBranches: ['Computer Engineering', 'Computer Science', 'Information Security'],
      minMarksPercentage: 60.0,
      minExperienceYears: 2.0,
      maxExperienceYears: 5.0,
      ageLimit: null
    },
    remuneration: {
      type: 'CTC',
      amountText: '₹10,00,000 - ₹13,50,000 LPA',
      minAnnualInr: 1000000,
      maxAnnualInr: 1350000
    },
    dates: {
      publishedAt: '2026-09-20',
      applicationOpensAt: '2026-09-21',
      closingDate: '2026-10-19', // Closing in 4 days
      isExtended: false
    },
    verification: {
      status: VerificationStatus.VERIFICATION_FAILED,
      confidenceScore: 0.15,
      verifiedAt: '2026-10-15T06:00:00Z',
      verifiedBy: 'Source Health Checker',
      sourceDomain: 'secureforensics-india-labs.com',
      sourceCategory: SourceCategory.THIRD_PARTY_AGGREGATOR,
      evidenceUrl: 'https://secureforensics-india-labs.com/careers/44',
      officialNoticePdfUrl: null,
      applicationUrl: null,
      verificationNotes: 'Source URL returned HTTP 404 Not Found and domain DNS lookup reported suspicious registration anomalies. Marked as Failed.'
    },
    matchAnalysis: {
      overallScore: 40,
      eligibilityStatus: EligibilityStatus.INSUFFICIENT_INFO,
      reasons: [
        'Skills match role profile, but listing cannot be authenticated.'
      ],
      warnings: ['Source verification failed. Opportunity deactivated from primary recommendations.']
    }
  },
  {
    id: 'test-vac-005',
    isTestData: true,
    title: 'Scientist B (Cyber Forensics & Incident Response)',
    organisation: 'National Informatics Centre (NIC) / NIELIT',
    advertisementNumber: 'NIELIT/NIC/2026/01/SC-B',
    numberOfPosts: 24,
    sector: Sector.CENTRAL_GOVT,
    employmentType: EmploymentType.PERMANENT,
    location: {
      city: 'New Delhi',
      state: 'Delhi NCR',
      isRemote: false,
      workMode: 'On-site'
    },
    qualifications: {
      requiredDegree: 'B.E. / B.Tech in Computer Engineering / CSE / ECE',
      eligibleBranches: ['Computer Engineering', 'Computer Science', 'Electronics & Communication'],
      minMarksPercentage: 65.0,
      minExperienceYears: 0.0,
      maxExperienceYears: 2.0,
      ageLimit: 30
    },
    remuneration: {
      type: '7th CPC Pay Matrix',
      amountText: 'Pay Level 10 (₹56,100 - ₹1,77,500) + DA + HRA (Approx ₹12 LPA CTC)',
      minAnnualInr: 1100000,
      maxAnnualInr: 1250000
    },
    dates: {
      publishedAt: '2026-08-15',
      applicationOpensAt: '2026-08-20',
      closingDate: '2026-09-30', // PAST DEADLINE
      isExtended: false
    },
    verification: {
      status: VerificationStatus.EXPIRED_CLOSED,
      confidenceScore: 0.99,
      verifiedAt: '2026-10-01T00:00:00Z',
      verifiedBy: 'Deadline Expiry Monitor',
      sourceDomain: 'calicut.nielit.in',
      sourceCategory: SourceCategory.RECRUITMENT_BOARD,
      evidenceUrl: 'https://www.calicut.nielit.in/nic26/',
      officialNoticePdfUrl: 'https://www.calicut.nielit.in/nic26/Advt_Detailed_NIC2026.pdf',
      applicationUrl: 'https://www.calicut.nielit.in/nic26/registration',
      verificationNotes: 'Official recruitment drive completed. Application window officially closed on 30 Sept 2026.'
    },
    matchAnalysis: {
      overallScore: 92,
      eligibilityStatus: EligibilityStatus.LIKELY_ELIGIBLE,
      reasons: [
        'Candidate meets 100% of educational and age criteria.',
        'Central Govt Scientist B recruitment.'
      ],
      warnings: ['Recruitment window has closed. Kept in database for pattern tracking and past cut-off analysis.']
    }
  }
];
