/**
 * Vacancy Radar India - Role Presets Catalog
 * Pre-configured search profiles tailored to both Private Sector (Big 4, Tech MNCs, Startups)
 * and Public Sector (Apex Bodies, PSUs, Banking, Law Enforcement).
 */

export const ROLE_PRESETS = [
  // 1. Software & Full Stack Engineering (Private + Public)
  {
    id: 'preset-swe',
    name: 'Software Engineering & Full Stack Development',
    description: 'Targeted at tech MNCs, Big 4 tech consulting, startups, and government IT bodies (NIC, C-DAC). Covers Java, Python, React, Cloud & Microservices.',
    icon: 'code',
    sector: 'PRIVATE_AND_PUBLIC',
    roles: [
      'Software Engineer',
      'Full Stack Developer',
      'Backend Engineer',
      'Frontend Engineer (React/TypeScript)',
      'Java Spring Boot Developer',
      'Python Software Developer',
      'Systems Engineer'
    ],
    keywords: [
      'Java',
      'Spring Boot',
      'Python',
      'React.js',
      'Node.js',
      'Microservices',
      'REST APIs',
      'SQL / PostgreSQL',
      'Docker',
      'Git',
      'Data Structures & Algorithms',
      'System Design'
    ],
    education: {
      degreeLevel: 'B.E. / B.Tech / M.C.A.',
      eligibleBranches: [
        'Computer Engineering',
        'Computer Science & Engineering',
        'Information Technology',
        'Electronics & Telecommunication'
      ],
      aggregateMarksPct: 60.0
    },
    experience: {
      minYears: 0,
      maxYears: 4,
      currentRole: 'Software Developer'
    },
    targetFocus: {
      enabled: false,
      mode: 'PRIORITY_BOOST',
      targetDomains: ['tcs.com', 'infosys.com', 'wipro.com', 'accenture.com', 'deloitte.com', 'cdac.in', 'nic.in'],
      targetOrganisations: ['TCS', 'Infosys', 'Wipro', 'Accenture', 'Deloitte', 'C-DAC', 'NIC']
    }
  },

  // 2. Data Science & Artificial Intelligence / Machine Learning
  {
    id: 'preset-ai-ml',
    name: 'Data Science, Artificial Intelligence & ML',
    description: 'Aimed at private AI labs, analytics consultancies, and national research institutes. Covers ML pipelines, LLMs, NLP, and predictive modeling.',
    icon: 'cpu',
    sector: 'PRIVATE_AND_PUBLIC',
    roles: [
      'Data Scientist',
      'Machine Learning Engineer',
      'AI Research Engineer',
      'Data Analyst',
      'Generative AI Specialist',
      'NLP Engineer'
    ],
    keywords: [
      'Machine Learning',
      'Deep Learning',
      'Python',
      'PyTorch',
      'TensorFlow',
      'Generative AI / LLMs',
      'Natural Language Processing (NLP)',
      'SQL & Big Data',
      'Pandas / NumPy',
      'Computer Vision',
      'MLOps'
    ],
    education: {
      degreeLevel: 'B.E. / B.Tech / M.Tech / M.Sc Statistics',
      eligibleBranches: [
        'Computer Science & Engineering',
        'Artificial Intelligence & Data Science',
        'Mathematics & Computing',
        'Information Technology'
      ],
      aggregateMarksPct: 65.0
    },
    experience: {
      minYears: 1,
      maxYears: 4,
      currentRole: 'Data Scientist'
    },
    targetFocus: {
      enabled: false,
      mode: 'PRIORITY_BOOST',
      targetDomains: ['deloitte.com', 'ey.com', 'tcs.com', 'google.com', 'cdac.in', 'isro.gov.in'],
      targetOrganisations: ['Deloitte Analytics', 'EY AI Lab', 'TCS Research', 'C-DAC', 'ISRO']
    }
  },

  // 3. Big 4 & Private Advisory / Technology Consulting
  {
    id: 'preset-consulting',
    name: 'Big 4 & Private Advisory (Tech / Risk Consulting)',
    description: 'Focused on premier professional services firms (Deloitte, PwC, EY, KPMG, BDO, GT). Encompasses cyber risk, IT audit, digital transformation, and forensic tech.',
    icon: 'briefcase',
    sector: 'PRIVATE',
    roles: [
      'Technology Consultant',
      'Risk Advisory Analyst',
      'Cyber Risk Consultant',
      'Forensic Technology Associate',
      'IT Audit & Governance Specialist',
      'Management Consultant (Technology)'
    ],
    keywords: [
      'Technology Consulting',
      'Risk Advisory',
      'IT Audit',
      'Deloitte',
      'PwC',
      'Ernst & Young',
      'KPMG',
      'Cyber Risk Assessment',
      'Forensic Technology',
      'ISO 27001 / SOC 2',
      'Client Advisory',
      'Business Strategy'
    ],
    education: {
      degreeLevel: 'B.E. / B.Tech / MBA / Chartered Accountant',
      eligibleBranches: [
        'Computer Science',
        'Information Technology',
        'Electronics',
        'Information Security'
      ],
      aggregateMarksPct: 65.0
    },
    experience: {
      minYears: 1,
      maxYears: 5,
      currentRole: 'Advisory Associate'
    },
    targetFocus: {
      enabled: true,
      mode: 'STRICT_TARGET',
      targetDomains: ['deloitte.com', 'pwc.in', 'ey.com', 'kpmg.com', 'kroll.com', 'bdo.in', 'grantthornton.in'],
      targetOrganisations: ['Deloitte India', 'PwC India', 'EY India', 'KPMG India', 'Kroll', 'BDO India', 'Grant Thornton']
    }
  },

  // 4. Cloud Engineering, DevOps & Site Reliability (SRE)
  {
    id: 'preset-devops',
    name: 'Cloud Architecture, DevOps & SRE',
    description: 'Geared towards private cloud platforms, SaaS companies, and enterprise IT. Focuses on Kubernetes, CI/CD, Infrastructure as Code, and AWS/Azure/GCP.',
    icon: 'cloud',
    sector: 'PRIVATE_AND_PUBLIC',
    roles: [
      'DevOps Engineer',
      'Cloud Infrastructure Specialist',
      'Site Reliability Engineer (SRE)',
      'Platform Engineer',
      'Cloud Security Associate'
    ],
    keywords: [
      'Amazon Web Services (AWS)',
      'Microsoft Azure',
      'Docker',
      'Kubernetes (K8s)',
      'CI/CD Pipelines (GitHub Actions / Jenkins)',
      'Terraform / IaC',
      'Linux Administration',
      'Ansible',
      'Monitoring (Prometheus / Grafana)'
    ],
    education: {
      degreeLevel: 'B.E. / B.Tech in CSE / IT',
      eligibleBranches: ['Computer Science', 'Information Technology', 'Telecommunication'],
      aggregateMarksPct: 60.0
    },
    experience: {
      minYears: 1,
      maxYears: 4,
      currentRole: 'DevOps Engineer'
    },
    targetFocus: {
      enabled: false,
      mode: 'PRIORITY_BOOST',
      targetDomains: ['accenture.com', 'tcs.com', 'infosys.com', 'amazon.jobs', 'nic.in'],
      targetOrganisations: ['Accenture', 'TCS', 'Infosys', 'Amazon India', 'NIC']
    }
  },

  // 5. Banking, Financial Services & Fintech Technical Roles
  {
    id: 'preset-banking',
    name: 'Banking, Fintech & Financial Technology',
    description: 'Covers technical officers and fintech engineers across Reserve Bank of India (RBI), SBI, SEBI, private banks (HDFC, ICICI), and payment gateways.',
    icon: 'building-2',
    sector: 'PRIVATE_AND_PUBLIC',
    roles: [
      'IT Officer (Scale I / II)',
      'Information Security Officer (BFSI)',
      'Fintech Backend Developer',
      'Payment Systems Analyst',
      'Financial Cyber Fraud Specialist'
    ],
    keywords: [
      'Core Banking Solutions (Finacle)',
      'Payment Gateway APIs',
      'RBI Cyber Security Framework',
      'PCI-DSS Compliance',
      'Information Security',
      'Banking Fraud Analytics',
      'NPCI UPI Architecture',
      'Financial Risk Technology'
    ],
    education: {
      degreeLevel: 'B.E. / B.Tech in CSE / IT / MCA',
      eligibleBranches: ['Computer Engineering', 'Information Technology', 'Cyber Security'],
      aggregateMarksPct: 60.0
    },
    experience: {
      minYears: 1,
      maxYears: 5,
      currentRole: 'Banking IT Specialist'
    },
    targetFocus: {
      enabled: true,
      mode: 'PRIORITY_BOOST',
      targetDomains: ['rbi.org.in', 'sbi.co.in', 'sebi.gov.in', 'hdfcbank.com', 'icicibank.com', 'npci.org.in'],
      targetOrganisations: ['Reserve Bank of India (RBI)', 'State Bank of India (SBI)', 'SEBI', 'HDFC Bank', 'ICICI Bank', 'NPCI']
    }
  },

  // 6. Digital Forensics & Incident Response (DFIR)
  {
    id: 'preset-dfir',
    name: 'Digital Forensics & Incident Response (DFIR)',
    description: 'Expertise in disk imaging, chain of custody, Section 65B Indian Evidence Act certification, and forensic lab tools across government and private DFIR labs.',
    icon: 'search',
    sector: 'PRIVATE_AND_PUBLIC',
    roles: [
      'Digital Forensics Examiner',
      'Cyber Forensics Analyst',
      'Digital Evidence Examiner',
      'Forensic Scientist (Cyber / Digital)',
      'Incident Response Analyst',
      'DFIR Consultant',
      'Junior Cyber Security Officer'
    ],
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
      'Memory Forensics'
    ],
    education: {
      degreeLevel: 'Bachelor of Engineering (B.E.) / B.Tech',
      eligibleBranches: [
        'Computer Engineering',
        'Computer Science & Engineering',
        'Information Technology',
        'Cyber Security',
        'Digital Forensics & Information Security'
      ],
      aggregateMarksPct: 65.0
    },
    experience: {
      minYears: 1,
      maxYears: 4,
      currentRole: 'Digital Forensics Evidence Examiner'
    },
    targetFocus: {
      enabled: false,
      mode: 'PRIORITY_BOOST',
      targetDomains: ['cdac.in', 'upsc.gov.in', 'nfsu.ac.in', 'drdo.gov.in', 'cfslcbi.gov.in', 'deloitte.com', 'kroll.com'],
      targetOrganisations: ['C-DAC', 'UPSC', 'NFSU', 'DRDO', 'CFSL', 'Deloitte DFIR', 'Kroll Cyber']
    }
  },

  // 7. Security Operations & Threat Hunting (SOC Analyst)
  {
    id: 'preset-soc',
    name: 'Security Operations & Threat Hunting (SOC Analyst)',
    description: 'Aimed at enterprise SOCs (MNCs, banks), CERT-In, NCIIPC, and national critical infrastructure defense monitoring.',
    icon: 'shield-alert',
    sector: 'PRIVATE_AND_PUBLIC',
    roles: [
      'SOC Analyst (L1/L2)',
      'Security Operations Engineer',
      'Incident Responder',
      'Threat Hunting Specialist',
      'Cyber Security Operations Officer'
    ],
    keywords: [
      'SIEM',
      'Splunk',
      'Microsoft Sentinel',
      'Incident Response',
      'Threat Hunting',
      'Log Analysis',
      'EDR / XDR',
      'Network Traffic Analysis (Wireshark)',
      'MITRE ATT&CK Framework',
      'Threat Intelligence'
    ],
    education: {
      degreeLevel: 'Bachelor of Engineering (B.E.) / B.Tech',
      eligibleBranches: [
        'Computer Science & Engineering',
        'Information Technology',
        'Cyber Security',
        'Electronics & Telecommunication'
      ],
      aggregateMarksPct: 60.0
    },
    experience: {
      minYears: 1,
      maxYears: 4,
      currentRole: 'SOC Security Analyst'
    },
    targetFocus: {
      enabled: false,
      mode: 'PRIORITY_BOOST',
      targetDomains: ['cert-in.org.in', 'cdac.in', 'nic.in', 'drdo.gov.in', 'tcs.com', 'wipro.com'],
      targetOrganisations: ['CERT-In', 'C-DAC', 'NIC', 'DRDO', 'TCS Cyber Defense']
    }
  },

  // 8. Vulnerability Assessment & Penetration Tester (VAPT)
  {
    id: 'preset-vapt',
    name: 'Vulnerability Assessment & Penetration Tester (VAPT)',
    description: 'Targeted at application security assessments, offensive security, and vulnerability remediation across private tech firms and public agencies.',
    icon: 'crosshair',
    sector: 'PRIVATE_AND_PUBLIC',
    roles: [
      'VAPT Analyst',
      'Penetration Tester',
      'Application Security Engineer',
      'Ethical Hacker',
      'Cyber Security Auditor'
    ],
    keywords: [
      'VAPT',
      'Web Application Security',
      'Burp Suite Pro',
      'OWASP Top 10',
      'Network Penetration Testing',
      'Metasploit',
      'Vulnerability Scanning (Nessus)',
      'API Security Testing',
      'Secure Code Review'
    ],
    education: {
      degreeLevel: 'B.E. / B.Tech in CSE / IT',
      eligibleBranches: ['Computer Engineering', 'Computer Science', 'Information Technology'],
      aggregateMarksPct: 60.0
    },
    experience: {
      minYears: 1,
      maxYears: 4,
      currentRole: 'VAPT Security Analyst'
    },
    targetFocus: {
      enabled: false,
      mode: 'PRIORITY_BOOST',
      targetDomains: ['cdac.in', 'nic.in', 'nielit.gov.in', 'deloitte.com', 'pwc.in'],
      targetOrganisations: ['C-DAC', 'NIC', 'NIELIT', 'Deloitte AppSec']
    }
  },

  // 9. Cyber Crime Investigator & Evidence Analyst
  {
    id: 'preset-investigator',
    name: 'Cyber Crime Investigator & Evidence Analyst',
    description: 'Designed for state cyber police cells, home departments, and law enforcement agencies requiring CDR/IPDR analysis and electronic evidence triage.',
    icon: 'shield-check',
    sector: 'PUBLIC',
    roles: [
      'Cyber Crime Investigation Specialist',
      'Technical Evidence Analyst',
      'Cyber Police Consultant',
      'Digital Evidence Officer',
      'LEA Cyber Forensic Assistant'
    ],
    keywords: [
      'Cyber Crime Investigation',
      'Call Detail Record (CDR) Analysis',
      'IPDR Analysis',
      'OSINT Investigation',
      'Section 65B Certificate',
      'Mobile Triage',
      'IT Act 2000 & Amendments',
      'Social Media Forensics',
      'Chain of Custody'
    ],
    education: {
      degreeLevel: 'Bachelor of Engineering (B.E.) / B.Tech / B.Sc Forensics',
      eligibleBranches: ['Computer Engineering', 'Information Technology', 'Cyber Security', 'Computer Science'],
      aggregateMarksPct: 60.0
    },
    experience: {
      minYears: 1,
      maxYears: 5,
      currentRole: 'Cyber Crime Investigator'
    },
    targetFocus: {
      enabled: true,
      mode: 'PRIORITY_BOOST',
      targetDomains: ['mahapolice.gov.in', 'upsc.gov.in', 'nfsu.ac.in', 'nic.in'],
      targetOrganisations: ['State Cyber Police', 'Home Department', 'UPSC', 'NFSU']
    }
  },

  // 10. Junior Forensic Scientist (Cyber Division / FSL)
  {
    id: 'preset-fsl',
    name: 'Junior Forensic Scientist (Cyber Division / FSL)',
    description: 'Focused on Central and State Forensic Science Laboratories (CFSL/FSL), NFSU, and judicial scientific evidence examination.',
    icon: 'scale',
    sector: 'PUBLIC',
    roles: [
      'Junior Forensic Scientist (Cyber)',
      'Assistant Scientific Officer (Digital Forensics)',
      'Scientific Assistant (Cyber & Digital Media)',
      'Laboratory Assistant (Computer Forensics)'
    ],
    keywords: [
      'Forensic Science Laboratory',
      'Central Forensic Science Laboratory (CFSL)',
      'Digital Media Forensics',
      'Cryptanalysis',
      'Hardware Forensics',
      'Audio Video Forensics',
      'Scientific Evidence Report',
      'Court Deposition'
    ],
    education: {
      degreeLevel: 'B.E./B.Tech Computer Science / M.Sc Forensic Science',
      eligibleBranches: ['Computer Engineering', 'Information Technology', 'Cyber Security', 'Forensic Science'],
      aggregateMarksPct: 65.0
    },
    experience: {
      minYears: 0,
      maxYears: 3,
      currentRole: 'Forensic Science Assistant'
    },
    targetFocus: {
      enabled: true,
      mode: 'STRICT_TARGET',
      targetDomains: ['nfsu.ac.in', 'upsc.gov.in', 'cfslcbi.gov.in', 'cdac.in'],
      targetOrganisations: ['National Forensic Sciences University (NFSU)', 'UPSC', 'CFSL', 'DFSS']
    }
  },

  // 11. Custom / Clean Slate Role Profile (Any Field)
  {
    id: 'preset-custom',
    name: 'Custom / Blank Role Profile (Any Field)',
    description: 'Define your own custom role for any technical, creative, private, or public field with custom titles, keywords, and website focus.',
    icon: 'sparkles',
    sector: 'CUSTOM',
    roles: ['Technical Officer / Specialist'],
    keywords: ['Technical Skills', 'Project Experience'],
    education: {
      degreeLevel: 'Graduate Degree',
      eligibleBranches: ['Computer Science', 'Engineering', 'Science', 'Commerce'],
      aggregateMarksPct: 60.0
    },
    experience: {
      minYears: 0,
      maxYears: 5,
      currentRole: 'Professional Specialist'
    },
    targetFocus: {
      enabled: false,
      mode: 'STRICT_TARGET',
      targetDomains: [],
      targetOrganisations: []
    }
  }
];

export const KNOWN_APEX_TARGETS = [
  // Big 4 & Premier Global Advisory (Private Sector)
  { domain: 'deloitte.com', org: 'Deloitte India (Cyber, Risk & Tech Advisory)', category: 'Private Big 4 Advisory' },
  { domain: 'pwc.in', org: 'PwC India (Technology & Forensic Consulting)', category: 'Private Big 4 Advisory' },
  { domain: 'ey.com', org: 'Ernst & Young India (Forensics & Technology)', category: 'Private Big 4 Advisory' },
  { domain: 'kpmg.com', org: 'KPMG India (Forensic & Technology Advisory)', category: 'Private Big 4 Advisory' },
  { domain: 'kroll.com', org: 'Kroll (Incident Response & Investigations)', category: 'Private DFIR Advisory' },
  { domain: 'bdo.in', org: 'BDO India (Cyber Defense & Advisory)', category: 'Private Tech Advisory' },
  { domain: 'grantthornton.in', org: 'Grant Thornton Bharat (Advisory & Forensics)', category: 'Private Tech Advisory' },

  // Top Tech Employers & Product Giants (Private Sector)
  { domain: 'tcs.com', org: 'Tata Consultancy Services (TCS Careers)', category: 'Private Tech Enterprise' },
  { domain: 'infosys.com', org: 'Infosys Limited (Careers Portal)', category: 'Private Tech Enterprise' },
  { domain: 'wipro.com', org: 'Wipro Limited (Technology Careers)', category: 'Private Tech Enterprise' },
  { domain: 'accenture.com', org: 'Accenture India (Consulting & Tech)', category: 'Private Global Enterprise' },
  { domain: 'google.com', org: 'Google India (Engineering & Operations)', category: 'Private Global Product' },
  { domain: 'amazon.jobs', org: 'Amazon India (Development Centre)', category: 'Private Global Product' },

  // Banking & Regulatory Apex Bodies
  { domain: 'rbi.org.in', org: 'Reserve Bank of India (RBI)', category: 'Central Banking Apex Body' },
  { domain: 'sbi.co.in', org: 'State Bank of India (SBI Recruitment)', category: 'Public Sector Banking' },
  { domain: 'sebi.gov.in', org: 'Securities and Exchange Board of India (SEBI)', category: 'Financial Regulatory Body' },
  { domain: 'hdfcbank.com', org: 'HDFC Bank (Technology & Risk)', category: 'Private Sector Banking' },
  { domain: 'icicibank.com', org: 'ICICI Bank (Digital & IT Careers)', category: 'Private Sector Banking' },

  // Apex Government & Research Institutions
  { domain: 'cdac.in', org: 'Centre for Development of Advanced Computing (C-DAC)', category: 'Govt Apex Tech R&D' },
  { domain: 'upsc.gov.in', org: 'Union Public Service Commission (UPSC)', category: 'Central Recruitment Board' },
  { domain: 'nfsu.ac.in', org: 'National Forensic Sciences University (NFSU)', category: 'Forensic Apex University' },
  { domain: 'drdo.gov.in', org: 'Defence Research and Development Organisation (DRDO)', category: 'Govt Defence R&D' },
  { domain: 'isro.gov.in', org: 'Indian Space Research Organisation (ISRO)', category: 'Govt Space R&D' },
  { domain: 'cfslcbi.gov.in', org: 'Central Forensic Science Laboratory (CFSL / CBI)', category: 'Central Forensics Lab' },
  { domain: 'mahapolice.gov.in', org: 'Maharashtra Cyber Police Headquarters', category: 'State Law Enforcement' },
  { domain: 'nielit.gov.in', org: 'National Institute of Electronics & IT (NIELIT)', category: 'Govt Examination Board' },
  { domain: 'nic.in', org: 'National Informatics Centre (NIC)', category: 'Central Government IT' },
  { domain: 'cert-in.org.in', org: 'Indian Computer Emergency Response Team (CERT-In)', category: 'Cyber Security Agency' },
  { domain: 'ncs.gov.in', org: 'National Career Service (Ministry of Labour)', category: 'Authorised Public Portal' },
  { domain: 'dsci.in', org: 'Data Security Council of India (NASSCOM/DSCI)', category: 'Industry Cyber Apex Body' },
  { domain: 'nia.gov.in', org: 'National Investigation Agency (Cyber & Tech Cadre)', category: 'Central Counter-Terrorism Agency' },
  { domain: 'cbi.gov.in', org: 'Central Bureau of Investigation (CBI Cyber Wing)', category: 'Central Investigation Agency' },
  { domain: 'ntro.gov.in', org: 'National Technical Research Organisation (NTRO)', category: 'Technical Intelligence Agency' },
  { domain: 'mha.gov.in', org: 'Ministry of Home Affairs (Police Modernization & Cyber)', category: 'Union Ministry' },
  { domain: 'csir.res.in', org: 'Council of Scientific and Industrial Research (CSIR)', category: 'National Scientific R&D' },
  { domain: 'dfs.gujarat.gov.in', org: 'Directorate of Forensic Sciences Gujarat (DFS)', category: 'State Forensics Laboratory' },
  { domain: 'delhipolice.gov.in', org: 'Delhi Police Cyber Crime & Tech Cadre', category: 'Capital Police Tech Division' },
  { domain: 'ksp.karnataka.gov.in', org: 'Karnataka State Police (Cyber Forensics / FSL)', category: 'State Police Forensics' },
  { domain: 'tnpolice.gov.in', org: 'Tamil Nadu Police Cyber Crime Wing', category: 'State Police Cyber Unit' },
  { domain: 'iitd.ac.in', org: 'Indian Institute of Technology Delhi (IIT Delhi)', category: 'Premier Institute of Tech' },
  { domain: 'employmentnews.gov.in', org: 'Official Government Employment News (I&B)', category: 'Central Gazette' }
];
