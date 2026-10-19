/**
 * Default Seed Profile:
 * Persona: Indian B.E. Computer Engineering graduate with Digital Forensics Evidence Examiner experience.
 */

export const defaultProfile = {
  id: 'profile-primary-dfir',
  name: 'Digital Forensics & Incident Response (DFIR)',
  isActive: true,
  createdAt: '2026-10-15T12:00:00Z',
  updatedAt: '2026-10-15T12:00:00Z',
  
  // Job Roles & Target Titles
  roles: [
    'Digital Forensics Examiner',
    'Cyber Forensics Analyst',
    'Digital Evidence Examiner',
    'Forensic Scientist (Cyber / Digital)',
    'Incident Response Analyst',
    'DFIR Consultant',
    'Junior Cyber Security Officer',
    'Cyber Crime Investigation Specialist'
  ],

  // Key Technical Skills & Vocabulary
  keywords: [
    'Digital Forensics',
    'Computer Forensics',
    'Mobile Device Forensics',
    'Disk Imaging',
    'Evidence Handling',
    'Chain of Custody',
    'Section 65B Indian Evidence Act',
    'Autopsy',
    'FTK Imager',
    'EnCase',
    'Volatility',
    'Cellebrite UFED',
    'Incident Response',
    'Memory Forensics',
    'Network Packet Analysis',
    'Wireshark',
    'Malware Analysis'
  ],

  // Educational Eligibility
  education: {
    degreeLevel: 'Bachelor of Engineering (B.E.) / B.Tech',
    eligibleBranches: [
      'Computer Engineering',
      'Computer Science & Engineering',
      'Information Technology',
      'Cyber Security',
      'Digital Forensics & Information Security'
    ],
    aggregateMarksPct: 70.0, // Minimum aggregate marks achieved
    cgpa: 7.5
  },

  // Experience Range
  experience: {
    minYears: 1,
    maxYears: 4,
    currentRole: 'Digital Forensics Evidence Examiner',
    priorExperienceMonths: 24
  },

  // Category & Age Filters
  demographics: {
    age: 26,
    category: 'General / Unreserved',
    applicableAgeRelaxations: false
  },

  // Sector Preferences
  sectors: [
    'Central Government',
    'State Government',
    'Public Sector Undertaking (PSU)',
    'Autonomous Govt Institution',
    'Private Sector',
    'Academic / Research Institute'
  ],

  // Employment Nature
  employmentTypes: [
    'Permanent',
    'Contractual',
    'Fixed Term',
    'Project Based',
    'Full Time'
  ],

  // Location & Geographic Preferences
  locations: {
    allIndia: true,
    preferredStates: ['Maharashtra', 'Delhi NCR', 'Karnataka', 'Gujarat', 'Telangana'],
    preferredCities: ['Pune', 'Mumbai', 'New Delhi', 'Bengaluru', 'Hyderabad', 'Gandhinagar'],
    allowRemote: true
  },

  // Compensation Expectation (INR per annum or per month)
  salary: {
    minAnnualInr: 600000, // ₹6.0 LPA minimum expected
    acceptNotDisclosed: true
  },

  // Verification & Monitoring Preferences
  verificationFilter: 'ALL', // 'ALL' or 'VERIFIED_ONLY'
  alertFrequency: 'DAILY_THRICE', // 08:00, 14:00, 20:00 IST
  deadlineReminderDays: [7, 3, 1],

  // Target Organisation & Website Focus
  targetFocus: {
    enabled: false,
    mode: 'PRIORITY_BOOST', // 'STRICT_TARGET' or 'PRIORITY_BOOST'
    targetDomains: ['cdac.in', 'upsc.gov.in', 'nfsu.ac.in', 'drdo.gov.in', 'cfslcbi.gov.in'],
    targetOrganisations: [
      'Centre for Development of Advanced Computing (C-DAC)',
      'Union Public Service Commission (UPSC)',
      'National Forensic Sciences University (NFSU)'
    ]
  },

  // Profile-Specific Scan Schedule & Notification Alert Channels
  scheduleSettings: {
    emailAddress: 'sagarmc2516@gmail.com',
    notificationEmails: ['sagarmc2516@gmail.com'],
    emailAlertsEnabled: true,
    telegramChatId: '5451190370', // Profile-specific Telegram accounts (e.g. "987654321, 123456789, @my_channel")
    telegramAlertsEnabled: true,
    deadlineLeadDays: 7,
    preset: 'DAILY_THRICE',
    hours: [8, 14, 20],
    autoSyncGoogleSheets: true
  }
};
