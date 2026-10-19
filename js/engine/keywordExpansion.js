/**
 * Vacancy Radar India - Dynamic Keyword Expansion & Query Generation Engine
 * Generates synonyms, technical aliases, Indian legal/forensic frameworks, and targeted search queries.
 * Records the explicit rationale and relevance score for every expanded term.
 */

// Domain Knowledge Base for Technical Forensics, Cyber & Indian Engineering Roles
const DOMAIN_TAXONOMY = {
  // Forensics & Cyber Security
  'digital forensics': [
    { term: 'DFIR', category: 'ABBREVIATION', rationale: 'Industry standard acronym for Digital Forensics and Incident Response', score: 0.95 },
    { term: 'Computer Forensics', category: 'SYNONYM', rationale: 'Direct equivalent terminology used in academic and government job postings', score: 0.95 },
    { term: 'Cyber Forensics', category: 'SYNONYM', rationale: 'Standard nomenclature used by Indian Government agencies (C-DAC, CERT-In, State FSLs)', score: 0.98 },
    { term: 'Digital Evidence Examiner', category: 'ROLE_VARIANT', rationale: 'Formal civil and law enforcement designation for court-admissible forensic examiners', score: 0.92 },
    { term: 'Mobile Forensics', category: 'SPECIALIZATION', rationale: 'Critical subfield involving Android/iOS device extraction in criminal investigation', score: 0.88 },
    { term: 'Forensic Scientist (Cyber)', category: 'ROLE_VARIANT', rationale: 'Official designation under Central and State Forensic Science Laboratories (FSL/CFSL)', score: 0.96 }
  ],
  'evidence handling': [
    { term: 'Chain of Custody', category: 'LEGAL_REGULATORY', rationale: 'Mandatory legal requirement for evidence integrity and preservation under court scrutiny', score: 0.94 },
    { term: 'Section 65B Indian Evidence Act', category: 'LEGAL_REGULATORY', rationale: 'Statutory certificate requirement for admissibility of electronic records in Indian courts', score: 0.96 },
    { term: 'Hash Value Integrity (SHA-256 / MD5)', category: 'TECHNICAL_TOOL', rationale: 'Standard verification technique for forensic bit-stream disk images', score: 0.85 }
  ],
  'tools': [
    { term: 'EnCase Forensic', category: 'TECHNICAL_TOOL', rationale: 'Enterprise standard forensic disk analysis suite frequently cited in requirements', score: 0.90 },
    { term: 'FTK Imager', category: 'TECHNICAL_TOOL', rationale: 'Forensic Toolkit imaging and triage standard', score: 0.92 },
    { term: 'Autopsy / Sleuth Kit', category: 'TECHNICAL_TOOL', rationale: 'Open-source forensic platform favored by public agencies and academic institutions', score: 0.89 },
    { term: 'Cellebrite UFED', category: 'TECHNICAL_TOOL', rationale: 'Premier mobile physical extraction tool utilized by Indian Law Enforcement Agencies', score: 0.94 },
    { term: 'Volatility Framework', category: 'TECHNICAL_TOOL', rationale: 'Standard memory analysis toolkit for live forensic investigations', score: 0.91 }
  ],
  'incident response': [
    { term: 'SOC Analyst', category: 'ROLE_VARIANT', rationale: 'Security Operations Center analyst, often overlapping with forensic triage', score: 0.80 },
    { term: 'Malware Analysis', category: 'SPECIALIZATION', rationale: 'Reverse engineering and artifact extraction from suspicious binaries', score: 0.84 },
    { term: 'Network Packet Forensics (Wireshark)', category: 'TECHNICAL_TOOL', rationale: 'PCAP analysis and network intrusion evidence reconstruction', score: 0.82 }
  ],
  'computer engineering': [
    { term: 'B.E. Computer Engineering', category: 'QUALIFICATION_ALIAS', rationale: 'AICTE / Indian University degree nomenclature', score: 1.0 },
    { term: 'B.Tech Computer Science and Engineering (CSE)', category: 'QUALIFICATION_ALIAS', rationale: 'Direct equivalent degree across IITs, NITs, and State Technical Universities', score: 1.0 },
    { term: 'Information Technology (IT)', category: 'QUALIFICATION_ALIAS', rationale: 'Standard allied eligible branch for central government engineering posts', score: 0.95 },
    { term: 'B.E./B.Tech Cyber Security', category: 'QUALIFICATION_ALIAS', rationale: 'Newer specialized engineering branch recognized by UGC and AICTE', score: 0.98 }
  ]
};

export class KeywordExpansionEngine {
  /**
   * Expands user-entered keywords and roles into a comprehensive, explainable vocabulary.
   * @param {string[]} userKeywords - Array of base keywords entered by user
   * @param {string[]} userRoles - Array of job titles entered by user
   * @returns {Array<Object>} List of expanded terms with category, rationale, score, and active status
   */
  static expandKeywords(userKeywords = [], userRoles = []) {
    const combinedInput = [...userKeywords, ...userRoles].map(k => k.toLowerCase().trim());
    const expandedMap = new Map();

    // 1. Process known taxonomy mappings
    for (const [key, expansions] of Object.entries(DOMAIN_TAXONOMY)) {
      const isRelevant = combinedInput.some(input => input.includes(key) || key.includes(input));
      if (isRelevant) {
        expansions.forEach(item => {
          if (!expandedMap.has(item.term.toLowerCase())) {
            expandedMap.set(item.term.toLowerCase(), {
              term: item.term,
              category: item.category,
              rationale: item.rationale,
              relevanceScore: item.score,
              isEnabled: true,
              sourceInput: key
            });
          }
        });
      }
    }

    // 2. Dynamic rule-based expansion for common suffixes / variants
    userRoles.forEach(role => {
      const lowerRole = role.toLowerCase();
      if (lowerRole.includes('examiner') && !expandedMap.has('analyst')) {
        const variant = role.replace(/examiner/i, 'Analyst');
        expandedMap.set(variant.toLowerCase(), {
          term: variant,
          category: 'ROLE_VARIANT',
          rationale: 'Common corporate and PSU interchange for "Examiner"',
          relevanceScore: 0.90,
          isEnabled: true,
          sourceInput: role
        });
      }
      if (lowerRole.includes('forensics') && !lowerRole.includes('scientist')) {
        const variant = 'Forensic Scientist - ' + role.replace(/forensics/i, '').trim();
        expandedMap.set(variant.toLowerCase(), {
          term: variant,
          category: 'ROLE_VARIANT',
          rationale: 'Government Gazette designation (FSL / CFSL / DFSS)',
          relevanceScore: 0.88,
          isEnabled: true,
          sourceInput: role
        });
      }
    });

    return Array.from(expandedMap.values()).sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Generates production search queries based on profile filters and approved expanded terms.
   * Suitable for public search providers, RSS filters, and government career portal scrapers.
   * @param {Object} profile - Full search profile object
   * @param {Array<Object>} approvedExpandedTerms - Active expanded terms
   * @returns {Array<Object>} List of structured queries with purpose description
   */
  static generateSearchQueries(profile, approvedExpandedTerms = []) {
    const activeTerms = approvedExpandedTerms.filter(t => t.isEnabled).map(t => `"${t.term}"`);
    const primaryRoles = (profile.roles || []).map(r => `"${r}"`);
    const topKeywords = [...primaryRoles.slice(0, 3), ...activeTerms.slice(0, 3)];

    const queries = [];

    // Target Focus Query: Exclusive Apex Portal Focus
    if (profile.targetFocus?.enabled && profile.targetFocus.targetDomains?.length) {
      const siteClauses = profile.targetFocus.targetDomains.slice(0, 5).map(d => `site:${d}`).join(' OR ');
      queries.push({
        id: 'query-target-focus-priority',
        targetCategory: '🎯 Priority Target Focus Websites',
        queryText: `(${topKeywords.slice(0, 2).join(' OR ')}) (recruitment OR career OR vacancy) (${siteClauses})`,
        purpose: `Restricted crawler query focusing exclusively on user-selected domains: ${profile.targetFocus.targetDomains.slice(0, 5).join(', ')}`
      });
    }

    // Query 1: Central Govt & Apex Research Bodies
    queries.push({
      id: 'query-central-apex',
      targetCategory: 'Apex Government Institutions',
      queryText: `(${primaryRoles.slice(0, 2).join(' OR ')}) ("B.E." OR "B.Tech") (recruitment OR vacancy OR "advt no") site:gov.in`,
      purpose: 'Discovers verified Central Government gazette notices on gov.in domains (NIC, CERT-In, CDAC, DRDO, NIELIT)'
    });

    // Query 2: Public Sector Undertakings & Autonomous Institutions
    queries.push({
      id: 'query-psu-autonomous',
      targetCategory: 'PSU & Autonomous Bodies',
      queryText: `(${topKeywords.slice(0, 3).join(' OR ')}) ("Project Engineer" OR "Officer" OR "Scientist") (career OR notification) (site:cdac.in OR site:nfsu.ac.in OR site:nielit.in)`,
      purpose: 'Targets autonomous research institutions and defense/tech PSUs with active DFIR labs'
    });

    // Query 3: State Cyber Police & Forensic Science Laboratories (FSL)
    const stateFilters = profile.locations?.preferredStates?.slice(0, 3).join(' OR ') || 'India';
    queries.push({
      id: 'query-state-fsl',
      targetCategory: 'State Forensic Science Labs & Cyber Cells',
      queryText: `("Digital Forensics" OR "Cyber Forensics" OR "Digital Evidence") ("Forensic Science Laboratory" OR "Cyber Police") (${stateFilters}) (recruitment OR contract)`,
      purpose: 'Identifies state-level cyber crime investigation wings and forensic evidence examiner vacancies'
    });

    // Query 4: Authorized National Career Portals
    queries.push({
      id: 'query-national-portals',
      targetCategory: 'National Career Service & Authorized Portals',
      queryText: `("Digital Forensics" OR "Incident Response" OR "DFIR") ("B.E. Computer Engineering" OR "Cyber Security") site:ncs.gov.in`,
      purpose: 'Scans the Ministry of Labour & Employment National Career Service public repository'
    });

    // Query 5: High-Trust Private Sector & Advisory DFIR Consultancies
    if (profile.sectors?.includes('Private Sector')) {
      queries.push({
        id: 'query-private-dfir',
        targetCategory: 'Private DFIR Consultancies & Financial Institutions',
        queryText: `("Digital Forensics Examiner" OR "Incident Response Analyst" OR "DFIR Consultant") ("Pune" OR "Mumbai" OR "Bengaluru" OR "Remote") ("apply" OR "careers") -aggregator`,
        purpose: 'Captures specialized digital forensics advisory and corporate investigations roles'
      });
    }

    return queries;
  }
}
