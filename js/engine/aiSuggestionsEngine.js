/**
 * Vacancy Radar India - AI Suggestions Engine
 * Supplies role-aware, high-relevance AI recommendations for:
 * 1. Technical Keywords (tools, skills, frameworks, legal acts)
 * 2. Official Apex Portals & Employer Websites
 * 3. Exclusion / Negative Keywords
 * 4. Custom User Attributes
 * 
 * Supports both zero-latency local intelligence and live Gemini AI enrichment.
 */

export const AI_SUGGESTIONS_CATALOG = {
  // 1. Digital Forensics & Incident Response
  dfir: {
    matchTerms: ['forensic', 'dfir', 'investigator', 'cyber crime', 'evidence', 'fsl', 'cfsl'],
    roles: [
      'Cyber Forensics Examiner',
      'Digital Evidence Specialist',
      'Incident Response Analyst (DFIR)',
      'Forensic Data Investigator',
      'Mobile & Disk Forensics Expert',
      'Malware Reverse Engineer'
    ],
    keywords: [
      'Volatility',
      'EnCase',
      'Autopsy',
      'FTK Imager',
      'Memory Forensics',
      'Network Forensics',
      'Malware Analysis',
      'YARA Rules',
      'Wireshark',
      'X-Ways Forensics',
      'Cellebrite UFED',
      'Section 65B Evidence',
      'Incident Response',
      'SIEM Threat Hunting',
      'Disk Imaging',
      'Timeline Analysis'
    ],
    websites: [
      { domain: 'cdac.in', org: 'Centre for Development of Advanced Computing (C-DAC)' },
      { domain: 'nfsu.ac.in', org: 'National Forensic Sciences University (NFSU)' },
      { domain: 'cfslcbi.gov.in', org: 'Central Forensic Science Laboratory (CFSL CBI)' },
      { domain: 'cert-in.org.in', org: 'Indian Computer Emergency Response Team (CERT-In)' },
      { domain: 'drdo.gov.in', org: 'DRDO RAC Recruitment' },
      { domain: 'upsc.gov.in', org: 'Union Public Service Commission (UPSC)' },
      { domain: 'mha.gov.in', org: 'Ministry of Home Affairs (Cyber Division)' },
      { domain: 'nic.in', org: 'National Informatics Centre (NIC)' },
      { domain: 'deloitte.com', org: 'Deloitte Forensics & Disputes' },
      { domain: 'pwc.in', org: 'PwC India Cyber & Forensics' },
      { domain: 'ey.com', org: 'EY Forensics & Integrity Services' }
    ]
  },

  // 2. Software Development & Engineering
  software: {
    matchTerms: ['software', 'developer', 'programmer', 'web', 'backend', 'frontend', 'full stack', 'coding', 'engineer'],
    roles: [
      'Software Development Engineer (SDE)',
      'Project Engineer (Software Systems)',
      'Backend Systems Architect',
      'Full Stack Web Developer',
      'Technical Officer (Software Systems)',
      'Scientist / Engineer (Computer Science)',
      'Application Developer (Cloud / Mobile)'
    ],
    keywords: [
      'Python',
      'Node.js',
      'React',
      'TypeScript',
      'Java Spring Boot',
      'PostgreSQL',
      'Docker',
      'Kubernetes',
      'REST APIs',
      'Microservices Architecture',
      'Git Version Control',
      'Linux Kernel',
      'System Design',
      'CI/CD Pipelines',
      'Cloud AWS / Azure',
      'Redis Caching',
      'Data Structures & Algorithms'
    ],
    websites: [
      { domain: 'cdac.in', org: 'Centre for Development of Advanced Computing (C-DAC)' },
      { domain: 'nic.in', org: 'National Informatics Centre (NIC)' },
      { domain: 'stpi.in', org: 'Software Technology Parks of India (STPI)' },
      { domain: 'cris.org.in', org: 'Centre for Railway Information Systems (CRIS)' },
      { domain: 'isro.gov.in', org: 'Indian Space Research Organisation (ISRO)' },
      { domain: 'drdo.gov.in', org: 'Defence Research and Development Organisation (DRDO)' },
      { domain: 'bel-india.in', org: 'Bharat Electronics Limited (BEL)' },
      { domain: 'ecil.co.in', org: 'Electronics Corporation of India Limited (ECIL)' },
      { domain: 'railtel.in', org: 'RailTel Corporation of India' },
      { domain: 'iitd.ac.in', org: 'Indian Institute of Technology Delhi' },
      { domain: 'tcs.com', org: 'Tata Consultancy Services (TCS)' },
      { domain: 'infosys.com', org: 'Infosys Limited' }
    ]
  },

  // 3. Cyber Security, SOC & Network Defence
  cybersec: {
    matchTerms: ['security', 'soc', 'infosec', 'network security', 'cyber security', 'ciso'],
    roles: [
      'SOC Analyst (L1 / L2)',
      'Cyber Security Engineer',
      'Threat Intelligence Analyst',
      'Security Operations Specialist',
      'Network Security Administrator',
      'Information Security Auditor'
    ],
    keywords: [
      'SOC Operations',
      'SIEM Splunk',
      'QRadar',
      'Next-Gen Firewall',
      'IDS / IPS Snort',
      'CrowdStrike EDR',
      'Threat Intelligence',
      'Vulnerability Assessment',
      'OWASP Top 10',
      'TCP/IP & Packet Analysis',
      'MITRE ATT&CK',
      'ISO 27001',
      'Zero Trust Security'
    ],
    websites: [
      { domain: 'cert-in.org.in', org: 'Indian Computer Emergency Response Team (CERT-In)' },
      { domain: 'nciipc.gov.in', org: 'National Critical Information Infrastructure Protection Centre' },
      { domain: 'nic.in', org: 'National Informatics Centre (Cyber Security)' },
      { domain: 'drdo.gov.in', org: 'DRDO Cyber Defence' },
      { domain: 'bel-india.in', org: 'BEL Cyber Security Division' },
      { domain: 'cdac.in', org: 'C-DAC Cyber Security Group' },
      { domain: 'wipro.com', org: 'Wipro Cyber Security' }
    ]
  },

  // 4. VAPT & Ethical Hacking
  vapt: {
    matchTerms: ['vapt', 'penetration', 'ethical', 'hacker', 'exploit', 'red team', 'bug bounty'],
    roles: [
      'VAPT Lead Engineer',
      'Penetration Tester (Web / API)',
      'Red Team Operator',
      'Offensive Security Specialist',
      'Application Security Assessor'
    ],
    keywords: [
      'Burp Suite Pro',
      'Metasploit Framework',
      'Nmap Network Scanner',
      'Kali Linux',
      'Web Application Pentesting',
      'API Security Testing',
      'Privilege Escalation',
      'Network Pentesting',
      'Reverse Engineering',
      'CVE Vulnerability Analysis',
      'SQL Injection',
      'XSS Exploit Analysis'
    ],
    websites: [
      { domain: 'cert-in.org.in', org: 'CERT-In Empanelled Auditors' },
      { domain: 'drdo.gov.in', org: 'DRDO Scientific Bodies' },
      { domain: 'cdac.in', org: 'C-DAC Information Security' },
      { domain: 'nfsu.ac.in', org: 'NFSU Cyber Defense' },
      { domain: 'ey.com', org: 'EY Attack & Penetration Testing' },
      { domain: 'kpmg.com', org: 'KPMG Cyber Threat Management' }
    ]
  },

  // 5. Data Science, Machine Learning & AI
  ai: {
    matchTerms: ['data', 'ai', 'ml', 'machine learning', 'analytics', 'intelligence', 'deep learning'],
    roles: [
      'Data Scientist / AI Specialist',
      'Machine Learning Engineer',
      'Project Scientist (AI / ML)',
      'Big Data Analytics Consultant',
      'Computer Vision Researcher',
      'NLP Systems Developer'
    ],
    keywords: [
      'Python',
      'Machine Learning',
      'Deep Learning',
      'PyTorch',
      'TensorFlow',
      'NLP Spacy',
      'Computer Vision OpenCV',
      'Pandas & NumPy',
      'SQL Database Queries',
      'Big Data Spark',
      'Data Pipelines ETL',
      'Model Deployment FastAPI',
      'Scikit-learn'
    ],
    websites: [
      { domain: 'cdac.in', org: 'C-DAC AI & Supercomputing Group' },
      { domain: 'drdo.gov.in', org: 'DRDO Centre for AI & Robotics (CAIR)' },
      { domain: 'nic.in', org: 'NIC Centre of Excellence in AI' },
      { domain: 'isro.gov.in', org: 'ISRO Space Data Analytics' },
      { domain: 'csir.res.in', org: 'CSIR Research Laboratories' },
      { domain: 'iitm.ac.in', org: 'IIT Madras AI Labs' }
    ]
  }
};

// Global negative/exclusion keyword suggestions
export const AI_NEGATIVE_SUGGESTIONS = [
  'Unpaid Internship',
  'Walk-in Only',
  'Sales / Telecaller',
  'BPO / Customer Support',
  'Non-Technical Data Entry',
  'Commission Only',
  'Field Sales Representative',
  'Night Shift Non-IT',
  'No Stipend'
];

// Global custom user attributes suggestions
export const AI_CUSTOM_META_SUGGESTIONS = [
  { key: 'Notice Period', val: 'Immediate / 15 Days', value: 'Immediate / 15 Days' },
  { key: 'Security Clearance', val: 'Secret / Govt Verified', value: 'Secret / Govt Verified' },
  { key: 'Target Pay Band', val: 'Level 7 to 10 (7th CPC)', value: 'Level 7 to 10 (7th CPC)' },
  { key: 'Preferred Directorate', val: 'CFSL / State Cyber Police', value: 'CFSL / State Cyber Police' },
  { key: 'Bond Period Willingness', val: 'Up to 1 Year', value: 'Up to 1 Year' },
  { key: 'GATE Score Year', val: '2024 / 2025 / 2026', value: '2024 / 2025 / 2026' }
];

export class AiSuggestionsEngine {
  /**
   * Determine matching catalog category based on profile roles, name, or keywords
   */
  static getCategoryForProfile(profile) {
    if (!profile) return AI_SUGGESTIONS_CATALOG.dfir;

    const query = [
      profile.name || '',
      ...(profile.roles || []),
      ...(profile.keywords || [])
    ].join(' ').toLowerCase();

    for (const [catKey, cat] of Object.entries(AI_SUGGESTIONS_CATALOG)) {
      if (cat.matchTerms.some(t => query.includes(t))) {
        return cat;
      }
    }

    return AI_SUGGESTIONS_CATALOG.software; // Default fallback
  }

  /**
   * Get role suggestions for profile
   */
  static getRoleSuggestions(profile) {
    const cat = this.getCategoryForProfile(profile);
    const existing = (profile.roles || []).map(r => r.toLowerCase());
    return cat.roles.filter(r => !existing.includes(r.toLowerCase()));
  }

  /**
   * Get keyword suggestions for profile
   */
  static getKeywordSuggestions(profile) {
    const cat = this.getCategoryForProfile(profile);
    const existing = (profile.keywords || []).map(k => k.toLowerCase());
    return cat.keywords.filter(k => !existing.includes(k.toLowerCase()));
  }

  /**
   * Get target website suggestions for profile
   */
  static getWebsiteSuggestions(profile) {
    const cat = this.getCategoryForProfile(profile);
    const existingDomains = (profile.targetFocus?.targetDomains || []).map(d => d.toLowerCase());
    return cat.websites.filter(w => !existingDomains.includes(w.domain.toLowerCase()));
  }

  /**
   * Get negative keyword suggestions
   */
  static getNegativeSuggestions(profile) {
    const existing = (profile.negativeKeywords || []).map(k => k.toLowerCase());
    return AI_NEGATIVE_SUGGESTIONS.filter(k => !existing.includes(k.toLowerCase()));
  }

  /**
   * Fetch fresh AI suggestions dynamically from Gemini / server endpoint
   */
  static async fetchLiveAiSuggestions(roleQuery) {
    try {
      const res = await fetch('/api/ai-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'RECOMMEND_PROFILE', roleQuery })
      });
      const data = await res.json();
      if (data.ok && data.data) {
        return data.data;
      }
    } catch (_) {}
    return null;
  }
}

/**
 * Continuous Learning Engine (Serverless Cloud AI & Dynamic In-Context Learning)
 * Eliminates offline model overhead while continuously teaching Gemini 1.5 Flash
 * new portal structures, DoPT reservation patterns, and Indian govt circular formats.
 */
export class ContinuousLearningEngine {
  /**
   * Sanitize domain string or URL into clean canonical hostname
   */
  static sanitizeLearnedDomain(urlOrDomain) {
    if (!urlOrDomain) return '';
    try {
      let cleaned = urlOrDomain.trim();
      if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
        cleaned = `https://${cleaned}`;
      }
      const parsed = new URL(cleaned);
      return parsed.hostname.replace(/^www\./i, '').toLowerCase();
    } catch (_) {
      return urlOrDomain.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0].toLowerCase().trim();
    }
  }

  /**
   * Format dynamic few-shot prompt with latest verified training corpus specimens
   */
  static formatFewShotPrompt({ rawText, domain, profile = {}, samples = [] }) {
    const candidateDeg = profile?.education?.degreeLevel || 'B.E. Computer Engineering / MCA / Technical Graduate';
    const candidateExp = profile?.experience?.priorExperienceMonths || 24;
    const candidateCategory = profile?.demographics?.category || 'General (UR)';

    // Select up to 3 relevant few-shot exemplars
    const selectedSamples = (samples || []).slice(0, 3).map((s, idx) => `
[VERIFIED SPECIMEN #${idx + 1}]
Domain: ${s.domain}
Organisation: ${s.organisation}
Title: ${s.title}
Advt Number: ${s.advertisementNumber || 'N/A'}
Sector: ${s.sector || 'Central Government'}
Pay Scale: ${s.payScale || '7th CPC Level 10'}
Closing Date: ${s.dates?.closingDate || '2026-04-15'}
Qualifications: ${(s.qualifications || []).join('; ')}
`).join('\n');

    return `You are a precision Vacancy Extraction & Career Intelligence AI specializing in Indian Technical, PSU, Research, and Government Careers.
You are running directly on Google Gemini Cloud Serverless with continuous in-context learning enabled.

${selectedSamples ? `--- RECENT VERIFIED EXEMPLARS FROM CONTINUOUS LEARNING CORPUS ---\n${selectedSamples}\n--------------------------------------------------------------\n` : ''}

Analyze this raw Indian vacancy notice / circular text from domain "${domain || 'Apex Official Source'}":
"""
${(rawText || '').slice(0, 3500)}
"""

Candidate Profile:
- Degree / Branch: ${candidateDeg}
- Experience: ${candidateExp} months
- Category: ${candidateCategory}

Return ONLY a valid JSON object (no markdown, no backticks, no explanatory text) matching this EXACT schema:
{
  "title": "Clear concise job title (e.g. Scientist 'B', Project Engineer)",
  "organisation": "Official hiring authority name (e.g. DRDO, C-DAC, NIC)",
  "advertisementNumber": "Official notification/advt number or empty string",
  "sector": "Central Government | State Government | Public Sector Undertaking (PSU) | Autonomous Govt Institution | Private Sector",
  "totalPosts": 0,
  "payScale": "7th CPC Pay Matrix Level or consolidated salary if stated",
  "dates": {
    "publishedDate": "YYYY-MM-DD or empty string",
    "closingDate": "YYYY-MM-DD or empty string"
  },
  "qualifications": ["Key degree / certification requirements listed in notice"],
  "ageLimit": {
    "maxAgeUR": 30,
    "maxAgeOBC": 33,
    "maxAgeSCST": 35
  },
  "reservationBreakout": {
    "UR": 0,
    "EWS": 0,
    "OBC": 0,
    "SC": 0,
    "ST": 0
  },
  "selectionProcess": "Brief summary (e.g. Written Exam + Interview / Direct GATE Score)",
  "isEligible": true,
  "eligibilityRationale": "Clear 1-sentence verdict comparing candidate degree & experience against notice criteria",
  "confidenceScore": 0.95
}`;
  }

  /**
   * Parse and validate Gemini JSON response
   */
  static parseGeminiExtraction(rawText) {
    if (!rawText) return null;
    let clean = rawText.trim();
    // Strip markdown code fences if present
    clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

    try {
      const parsed = JSON.parse(clean);
      if (parsed && (parsed.title || parsed.organisation)) {
        return {
          title: parsed.title || 'Official Technical Opportunity',
          organisation: parsed.organisation || 'Official Employer',
          advertisementNumber: parsed.advertisementNumber || '',
          sector: parsed.sector || 'Central Government',
          totalPosts: Number(parsed.totalPosts) || 0,
          payScale: parsed.payScale || '',
          dates: {
            publishedDate: parsed.dates?.publishedDate || '',
            closingDate: parsed.dates?.closingDate || ''
          },
          qualifications: Array.isArray(parsed.qualifications) ? parsed.qualifications : [],
          ageLimit: parsed.ageLimit || {},
          reservationBreakout: parsed.reservationBreakout || {},
          selectionProcess: parsed.selectionProcess || '',
          isEligible: parsed.isEligible !== false,
          eligibilityRationale: parsed.eligibilityRationale || 'Verified against candidate qualifications.',
          confidenceScore: Number(parsed.confidenceScore) || 0.95
        };
      }
    } catch (_) {}
    return null;
  }

  /**
   * Format an extracted result into a reusable training specimen
   */
  static buildLearningSpecimen(extracted, meta = {}) {
    if (!extracted) return null;
    const domain = this.sanitizeLearnedDomain(extracted.domain || meta.url || '');
    return {
      id: `corpus-${domain}-${Date.now()}`,
      domain,
      organisation: extracted.organisation || domain,
      title: extracted.title || '',
      advertisementNumber: extracted.advertisementNumber || '',
      sector: extracted.sector || 'Central Government',
      totalPosts: extracted.totalPosts || 0,
      payScale: extracted.payScale || '',
      dates: extracted.dates || {},
      qualifications: extracted.qualifications || [],
      ageLimit: extracted.ageLimit || {},
      reservationBreakout: extracted.reservationBreakout || {},
      selectionProcess: extracted.selectionProcess || '',
      verifiedAt: new Date().toISOString(),
      sourceCategory: 'OFFICIAL_EMPLOYER'
    };
  }
}

