/**
 * Vacancy Radar India - Government Technical Qualification Taxonomy & Equivalence Matrix
 * Standardizes Indian public sector (UPSC, DRDO, C-DAC, NIC, State Police) degree equivalencies.
 */

export const DegreeLevel = {
  PHD: 5,
  POST_GRADUATE: 4, // M.Tech, M.E., MCA, M.Sc.
  GRADUATE: 3,      // B.E., B.Tech, B.S. 4-year
  UNDERGRADUATE: 2, // BCA, B.Sc., Diploma (3-year polytechnic)
  FOUNDATIONAL: 1   // 10+2, ITI
};

export const TechnicalDisciplines = {
  COMPUTER_SCIENCE_IT: 'COMPUTER_SCIENCE_IT',
  CYBER_SECURITY_FORENSICS: 'CYBER_SECURITY_FORENSICS',
  ELECTRONICS_COMMUNICATION: 'ELECTRONICS_COMMUNICATION',
  ELECTRICAL_INSTRUMENTATION: 'ELECTRICAL_INSTRUMENTATION',
  MATHEMATICS_DATA_SCIENCE: 'MATHEMATICS_DATA_SCIENCE'
};

/**
 * Normalizes degree text into a canonical taxonomy token and level.
 */
export const QUALIFICATION_TAXONOMY = [
  // 1. Computer Science & Information Technology
  {
    discipline: TechnicalDisciplines.COMPUTER_SCIENCE_IT,
    level: DegreeLevel.GRADUATE,
    canonicalName: 'B.E. / B.Tech in Computer Science / IT',
    synonyms: [
      'b.e computer', 'b.tech computer', 'b.e. computer', 'b.tech. computer',
      'computer science', 'computer engineering', 'information technology',
      'b.e. it', 'b.tech it', 'b.e cse', 'b.tech cse', 'b.tech (cse)', 'b.e (cse)',
      'b.tech (it)', 'b.e (it)', 'b.tech software', 'b.e software'
    ]
  },
  {
    discipline: TechnicalDisciplines.COMPUTER_SCIENCE_IT,
    level: DegreeLevel.POST_GRADUATE,
    canonicalName: 'MCA / M.Sc. (Computer Science / IT)',
    synonyms: [
      'mca', 'master of computer applications', 'm.sc computer', 'm.sc. computer',
      'm.sc it', 'm.sc. it', 'm.sc information technology', 'm.tech computer',
      'm.tech cse', 'm.tech it', 'm.e computer', 'm.e cse'
    ]
  },
  {
    discipline: TechnicalDisciplines.COMPUTER_SCIENCE_IT,
    level: DegreeLevel.UNDERGRADUATE,
    canonicalName: 'BCA / B.Sc. (Computer Science)',
    synonyms: [
      'bca', 'bachelor of computer applications', 'b.sc computer', 'b.sc. computer',
      'b.sc it', 'b.sc. it', 'diploma in computer', 'diploma computer engineering'
    ]
  },

  // 2. Cyber Security & Digital Forensics
  {
    discipline: TechnicalDisciplines.CYBER_SECURITY_FORENSICS,
    level: DegreeLevel.POST_GRADUATE,
    canonicalName: 'M.Sc. / M.Tech in Cyber Security / Digital Forensics',
    synonyms: [
      'digital forensics', 'cyber security', 'information security',
      'm.sc digital forensics', 'm.sc. digital forensics', 'm.tech cyber security',
      'm.tech information security', 'forensic science', 'cyber intelligence',
      'pg diploma in cyber forensics', 'dfis', 'cyber forensics'
    ]
  },
  {
    discipline: TechnicalDisciplines.CYBER_SECURITY_FORENSICS,
    level: DegreeLevel.GRADUATE,
    canonicalName: 'B.Tech in Cyber Security / Information Security',
    synonyms: [
      'b.tech cyber security', 'b.e cyber security', 'b.tech information security',
      'b.tech (cyber security)'
    ]
  },

  // 3. Electronics & Communication
  {
    discipline: TechnicalDisciplines.ELECTRONICS_COMMUNICATION,
    level: DegreeLevel.GRADUATE,
    canonicalName: 'B.E. / B.Tech in Electronics & Communication',
    synonyms: [
      'electronics', 'electronics and communication', 'ece', 'b.tech ece', 'b.e ece',
      'telecommunication', 'electronics & telecommunication', 'etc', 'b.tech electronics'
    ]
  },
  {
    discipline: TechnicalDisciplines.ELECTRONICS_COMMUNICATION,
    level: DegreeLevel.POST_GRADUATE,
    canonicalName: 'M.Tech in Electronics / VLSI / Embedded Systems',
    synonyms: [
      'm.tech electronics', 'm.tech ece', 'm.tech vlsi', 'm.tech embedded',
      'm.sc electronics', 'm.sc. electronics'
    ]
  }
];

/**
 * Checks whether candidate degree and requirement are considered equivalent
 * in standard Indian Government / PSU recruitment rules.
 */
export class QualificationTaxonomyEngine {
  /**
   * Resolves a raw string into a recognized taxonomy entry.
   */
  static resolveTaxonomy(degreeStr) {
    if (!degreeStr) return null;
    const lower = String(degreeStr).toLowerCase().replace(/[^a-z0-9\s\.\/\-\+]/g, ' ');

    for (const item of QUALIFICATION_TAXONOMY) {
      for (const syn of item.synonyms) {
        if (lower.includes(syn)) {
          return item;
        }
      }
    }
    return null;
  }

  /**
   * Evaluates if candidate qualification meets advertised qualification.
   * Returns: { isEligible: boolean, isExactMatch: boolean, reason: string, levelMet: boolean }
   */
  static evaluateEquivalence(candidateDegree, requiredDegree) {
    if (!requiredDegree) {
      return { isEligible: true, isExactMatch: false, reason: 'No specific degree restriction advertised.', levelMet: true };
    }
    if (!candidateDegree) {
      return { isEligible: false, isExactMatch: false, reason: 'Candidate degree not specified in profile.', levelMet: false };
    }

    const reqEntry = this.resolveTaxonomy(requiredDegree);
    const candEntry = this.resolveTaxonomy(candidateDegree);

    // If neither matched catalog, fall back to token overlap
    if (!reqEntry || !candEntry) {
      const cLower = String(candidateDegree).toLowerCase();
      const rLower = String(requiredDegree).toLowerCase();
      const tokenMatch = cLower.split(/\s+/).some(t => t.length > 3 && rLower.includes(t));
      return {
        isEligible: tokenMatch,
        isExactMatch: cLower === rLower,
        reason: tokenMatch
          ? `Qualification degree overlap detected between "${candidateDegree}" and advertised "${requiredDegree}".`
          : `Advertised degree "${requiredDegree}" requires manual verification against "${candidateDegree}".`,
        levelMet: true
      };
    }

    // Level check: Candidate degree level must be >= required level
    const levelMet = candEntry.level >= reqEntry.level;

    // Cross-discipline equivalence: CS/IT is broadly accepted for Cyber Forensics, and vice-versa
    const isDirectDisciplineMatch = candEntry.discipline === reqEntry.discipline;
    const isAlliedDisciplineMatch =
      (candEntry.discipline === TechnicalDisciplines.COMPUTER_SCIENCE_IT && reqEntry.discipline === TechnicalDisciplines.CYBER_SECURITY_FORENSICS) ||
      (candEntry.discipline === TechnicalDisciplines.CYBER_SECURITY_FORENSICS && reqEntry.discipline === TechnicalDisciplines.COMPUTER_SCIENCE_IT) ||
      (candEntry.discipline === TechnicalDisciplines.ELECTRONICS_COMMUNICATION && reqEntry.discipline === TechnicalDisciplines.COMPUTER_SCIENCE_IT);

    const isDisciplineEligible = isDirectDisciplineMatch || isAlliedDisciplineMatch;
    const isEligible = levelMet && isDisciplineEligible;

    let reason = '';
    if (isEligible) {
      reason = isDirectDisciplineMatch
        ? `Educational degree equivalence: ${candEntry.canonicalName} fully satisfies advertised ${reqEntry.canonicalName}.`
        : `Allied technical degree equivalence: ${candEntry.canonicalName} satisfies advertised ${reqEntry.canonicalName} under Indian AICTE/apex equivalency norms.`;
    } else if (!levelMet) {
      reason = `Degree level requirement not met: Advertised role specifies minimum level ${reqEntry.level} (${reqEntry.canonicalName}), candidate holds level ${candEntry.level}.`;
    } else {
      reason = `Discipline divergence: Advertised "${reqEntry.canonicalName}" does not align with candidate specialization "${candEntry.canonicalName}".`;
    }

    return {
      isEligible,
      isExactMatch: candEntry.canonicalName === reqEntry.canonicalName,
      levelMet,
      candidateTaxonomy: candEntry,
      requiredTaxonomy: reqEntry,
      reason
    };
  }
}
