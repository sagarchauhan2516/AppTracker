/**
 * Multi-Domain Profile Definitions
 * Supports any candidate profile across Software Development, Data Science, AI/ML, Cloud/DevOps,
 * Cyber Security, and Digital Forensics.
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
    aggregateMarksPct: 70.0,
    cgpa: 7.5
  },

  experience: {
    minYears: 1,
    maxYears: 4,
    currentRole: 'Digital Forensics Evidence Examiner',
    priorExperienceMonths: 24
  },

  demographics: {
    age: 26,
    category: 'General / Unreserved',
    applicableAgeRelaxations: false
  },

  sectors: [
    'Central Government',
    'State Government',
    'Public Sector Undertaking (PSU)',
    'Autonomous Govt Institution',
    'Private Sector',
    'Academic / Research Institute'
  ],

  employmentTypes: [
    'Permanent',
    'Contractual',
    'Fixed Term',
    'Project Based',
    'Full Time'
  ],

  locations: {
    allIndia: true,
    preferredStates: ['Maharashtra', 'Delhi NCR', 'Karnataka', 'Gujarat', 'Telangana'],
    preferredCities: ['Pune', 'Mumbai', 'New Delhi', 'Bengaluru', 'Hyderabad', 'Gandhinagar'],
    allowRemote: true
  },

  salary: {
    minAnnualInr: 600000,
    acceptNotDisclosed: true
  },

  verificationFilter: 'ALL',
  alertFrequency: 'DAILY_THRICE',
  deadlineReminderDays: [7, 3, 1],

  targetFocus: {
    enabled: false,
    mode: 'PRIORITY_BOOST',
    targetDomains: ['cdac.in', 'upsc.gov.in', 'nfsu.ac.in', 'drdo.gov.in', 'cfslcbi.gov.in'],
    targetOrganisations: [
      'Centre for Development of Advanced Computing (C-DAC)',
      'Union Public Service Commission (UPSC)',
      'National Forensic Sciences University (NFSU)'
    ]
  },

  scheduleSettings: {
    emailAddress: 'sagarmc2516@gmail.com',
    notificationEmails: ['sagarmc2516@gmail.com'],
    emailAlertsEnabled: true,
    telegramChatId: '5451190370',
    telegramAlertsEnabled: true,
    deadlineLeadDays: 7,
    preset: 'DAILY_THRICE',
    hours: [8, 14, 20],
    autoSyncGoogleSheets: true
  }
};

export const initialDefaultProfiles = [
  // 1. Software Engineering & Full Stack
  {
    id: 'profile-software-engineer',
    name: 'Software Engineering & Full Stack Developer',
    isActive: false,
    createdAt: '2026-10-15T12:00:00Z',
    updatedAt: '2026-10-15T12:00:00Z',
    roles: [
      'Software Engineer',
      'Full Stack Developer',
      'Backend Engineer',
      'Frontend Developer',
      'Project Engineer (Software Systems)',
      'Scientist / Engineer (Computer Science)',
      'Technical Officer (IT / Software)'
    ],
    keywords: [
      'Python',
      'Node.js',
      'React.js',
      'TypeScript',
      'Java Spring Boot',
      'PostgreSQL',
      'REST APIs',
      'Microservices',
      'Docker',
      'Git',
      'System Design',
      'Data Structures & Algorithms'
    ],
    education: {
      degreeLevel: 'B.E. / B.Tech / M.C.A.',
      eligibleBranches: [
        'Computer Science & Engineering',
        'Computer Engineering',
        'Information Technology',
        'Electronics & Telecommunication'
      ],
      aggregateMarksPct: 60.0,
      cgpa: 7.0
    },
    experience: {
      minYears: 0,
      maxYears: 5,
      currentRole: 'Software Developer',
      priorExperienceMonths: 24
    },
    demographics: {
      age: 26,
      category: 'General / Unreserved',
      applicableAgeRelaxations: false
    },
    sectors: ['Central Government', 'State Government', 'Public Sector Undertaking (PSU)', 'Autonomous Govt Institution', 'Private Sector'],
    employmentTypes: ['Permanent', 'Contractual', 'Full Time'],
    locations: { allIndia: true, preferredStates: ['Delhi NCR', 'Karnataka', 'Maharashtra', 'Telangana'], allowRemote: true },
    salary: { minAnnualInr: 600000, acceptNotDisclosed: true },
    verificationFilter: 'ALL',
    alertFrequency: 'DAILY_THRICE',
    deadlineReminderDays: [7, 3, 1],
    targetFocus: {
      enabled: false,
      mode: 'PRIORITY_BOOST',
      targetDomains: ['cdac.in', 'nic.in', 'stpi.in', 'cris.org.in', 'isro.gov.in', 'drdo.gov.in', 'bel-india.in', 'tcs.com', 'infosys.com'],
      targetOrganisations: ['C-DAC', 'NIC', 'CRIS', 'ISRO', 'DRDO', 'BEL']
    },
    scheduleSettings: {
      emailAddress: 'sagarmc2516@gmail.com',
      notificationEmails: ['sagarmc2516@gmail.com'],
      emailAlertsEnabled: true,
      telegramChatId: '5451190370',
      telegramAlertsEnabled: true,
      deadlineLeadDays: 7,
      preset: 'DAILY_THRICE',
      hours: [8, 14, 20],
      autoSyncGoogleSheets: true
    }
  },

  // 2. Data Science & Machine Learning (AI)
  {
    id: 'profile-data-ai',
    name: 'Data Science, Machine Learning & AI Specialist',
    isActive: false,
    createdAt: '2026-10-15T12:00:00Z',
    updatedAt: '2026-10-15T12:00:00Z',
    roles: [
      'Data Scientist',
      'Machine Learning Engineer',
      'AI Research Engineer',
      'Project Scientist (AI / ML)',
      'Data Analyst',
      'NLP / Computer Vision Specialist'
    ],
    keywords: [
      'Machine Learning',
      'Deep Learning',
      'Python',
      'PyTorch',
      'TensorFlow',
      'NLP',
      'Generative AI / LLMs',
      'SQL',
      'Pandas & NumPy',
      'Computer Vision',
      'Data Pipelines'
    ],
    education: {
      degreeLevel: 'B.E. / B.Tech / M.Tech / M.Sc Statistics',
      eligibleBranches: ['Computer Science & Engineering', 'Artificial Intelligence & Data Science', 'Mathematics & Computing'],
      aggregateMarksPct: 65.0,
      cgpa: 7.2
    },
    experience: {
      minYears: 1,
      maxYears: 4,
      currentRole: 'Data Scientist',
      priorExperienceMonths: 20
    },
    demographics: {
      age: 26,
      category: 'General / Unreserved',
      applicableAgeRelaxations: false
    },
    sectors: ['Central Government', 'State Government', 'Public Sector Undertaking (PSU)', 'Autonomous Govt Institution', 'Private Sector', 'Academic / Research Institute'],
    employmentTypes: ['Permanent', 'Contractual', 'Full Time'],
    locations: { allIndia: true, preferredStates: ['Delhi NCR', 'Karnataka', 'Maharashtra', 'Telangana'], allowRemote: true },
    salary: { minAnnualInr: 700000, acceptNotDisclosed: true },
    verificationFilter: 'ALL',
    alertFrequency: 'DAILY_THRICE',
    deadlineReminderDays: [7, 3, 1],
    targetFocus: {
      enabled: false,
      mode: 'PRIORITY_BOOST',
      targetDomains: ['cdac.in', 'drdo.gov.in', 'nic.in', 'isro.gov.in', 'csir.res.in', 'iitm.ac.in'],
      targetOrganisations: ['C-DAC AI Group', 'DRDO CAIR', 'NIC AI CoE', 'ISRO']
    },
    scheduleSettings: {
      emailAddress: 'sagarmc2516@gmail.com',
      notificationEmails: ['sagarmc2516@gmail.com'],
      emailAlertsEnabled: true,
      telegramChatId: '5451190370',
      telegramAlertsEnabled: true,
      deadlineLeadDays: 7,
      preset: 'DAILY_THRICE',
      hours: [8, 14, 20],
      autoSyncGoogleSheets: true
    }
  },

  // 3. Digital Forensics & Incident Response (Default Active)
  defaultProfile,

  // 4. Cloud Solutions, DevOps & SRE
  {
    id: 'profile-cloud-devops',
    name: 'Cloud Solutions, DevOps & Infrastructure',
    isActive: false,
    createdAt: '2026-10-15T12:00:00Z',
    updatedAt: '2026-10-15T12:00:00Z',
    roles: [
      'DevOps Engineer',
      'Cloud Infrastructure Specialist',
      'Site Reliability Engineer (SRE)',
      'System Administrator (Cloud / Linux)',
      'Platform Engineer'
    ],
    keywords: [
      'Amazon Web Services (AWS)',
      'Microsoft Azure',
      'Docker',
      'Kubernetes (K8s)',
      'CI/CD Pipelines',
      'Terraform',
      'Linux Administration',
      'Prometheus',
      'Grafana',
      'Ansible'
    ],
    education: {
      degreeLevel: 'B.E. / B.Tech / B.Sc IT',
      eligibleBranches: ['Computer Science', 'Information Technology', 'Electronics'],
      aggregateMarksPct: 60.0,
      cgpa: 6.8
    },
    experience: {
      minYears: 1,
      maxYears: 5,
      currentRole: 'DevOps Engineer',
      priorExperienceMonths: 24
    },
    demographics: {
      age: 26,
      category: 'General / Unreserved',
      applicableAgeRelaxations: false
    },
    sectors: ['Central Government', 'State Government', 'Public Sector Undertaking (PSU)', 'Private Sector'],
    employmentTypes: ['Permanent', 'Contractual', 'Full Time'],
    locations: { allIndia: true, preferredStates: ['Delhi NCR', 'Karnataka', 'Maharashtra'], allowRemote: true },
    salary: { minAnnualInr: 650000, acceptNotDisclosed: true },
    verificationFilter: 'ALL',
    alertFrequency: 'DAILY_THRICE',
    deadlineReminderDays: [7, 3, 1],
    targetFocus: {
      enabled: false,
      mode: 'PRIORITY_BOOST',
      targetDomains: ['nic.in', 'cdac.in', 'railtel.in', 'cris.org.in'],
      targetOrganisations: ['NIC', 'C-DAC', 'RailTel', 'CRIS']
    },
    scheduleSettings: {
      emailAddress: 'sagarmc2516@gmail.com',
      notificationEmails: ['sagarmc2516@gmail.com'],
      emailAlertsEnabled: true,
      telegramChatId: '5451190370',
      telegramAlertsEnabled: true,
      deadlineLeadDays: 7,
      preset: 'DAILY_THRICE',
      hours: [8, 14, 20],
      autoSyncGoogleSheets: true
    }
  },

  // 5. Cyber Security & SOC Defence
  {
    id: 'profile-cyber-soc',
    name: 'Cyber Security, SOC Analyst & Threat Defense',
    isActive: false,
    createdAt: '2026-10-15T12:00:00Z',
    updatedAt: '2026-10-15T12:00:00Z',
    roles: [
      'SOC Analyst (L1 / L2)',
      'Cyber Security Engineer',
      'Threat Intelligence Analyst',
      'Information Security Auditor',
      'Network Security Specialist'
    ],
    keywords: [
      'SOC Operations',
      'SIEM Splunk',
      'QRadar',
      'Next-Gen Firewall',
      'Vulnerability Assessment',
      'OWASP Top 10',
      'CrowdStrike EDR',
      'MITRE ATT&CK',
      'ISO 27001',
      'TCP/IP & Packet Analysis'
    ],
    education: {
      degreeLevel: 'B.E. / B.Tech / MCA',
      eligibleBranches: ['Computer Science', 'Information Security', 'Information Technology'],
      aggregateMarksPct: 65.0,
      cgpa: 7.0
    },
    experience: {
      minYears: 1,
      maxYears: 4,
      currentRole: 'SOC Analyst',
      priorExperienceMonths: 18
    },
    demographics: {
      age: 26,
      category: 'General / Unreserved',
      applicableAgeRelaxations: false
    },
    sectors: ['Central Government', 'State Government', 'Public Sector Undertaking (PSU)', 'Private Sector', 'Autonomous Govt Institution'],
    employmentTypes: ['Permanent', 'Contractual', 'Full Time'],
    locations: { allIndia: true, preferredStates: ['Delhi NCR', 'Karnataka', 'Maharashtra'], allowRemote: true },
    salary: { minAnnualInr: 600000, acceptNotDisclosed: true },
    verificationFilter: 'ALL',
    alertFrequency: 'DAILY_THRICE',
    deadlineReminderDays: [7, 3, 1],
    targetFocus: {
      enabled: false,
      mode: 'PRIORITY_BOOST',
      targetDomains: ['cert-in.org.in', 'nciipc.gov.in', 'nic.in', 'drdo.gov.in', 'bel-india.in', 'cdac.in'],
      targetOrganisations: ['CERT-In', 'NCIIPC', 'NIC Cyber Security', 'DRDO']
    },
    scheduleSettings: {
      emailAddress: 'sagarmc2516@gmail.com',
      notificationEmails: ['sagarmc2516@gmail.com'],
      emailAlertsEnabled: true,
      telegramChatId: '5451190370',
      telegramAlertsEnabled: true,
      deadlineLeadDays: 7,
      preset: 'DAILY_THRICE',
      hours: [8, 14, 20],
      autoSyncGoogleSheets: true
    }
  }
];
