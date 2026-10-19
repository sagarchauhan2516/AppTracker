/**
 * Vacancy Radar India - Core Domain Types & Schemas
 */

export const VerificationStatus = {
  OFFICIALLY_VERIFIED: 'OFFICIALLY_VERIFIED', // Retrieved official notice, employer identity established, link verified
  CROSS_CHECKED: 'CROSS_CHECKED',             // Found on aggregator, matched against official notice, some minor fields unverified
  UNVERIFIED_LEAD: 'UNVERIFIED_LEAD',         // Promising listing, official notification not yet verified
  VERIFICATION_FAILED: 'VERIFICATION_FAILED', // Broken link, inaccessible, contradictory details
  EXPIRED_CLOSED: 'EXPIRED_CLOSED'            // Deadline elapsed or confirmed closed by employer
};

export const SourceCategory = {
  OFFICIAL_EMPLOYER: 'OFFICIAL_EMPLOYER',       // e.g. cdac.in, nic.in, drdo.gov.in
  RECRUITMENT_BOARD: 'RECRUITMENT_BOARD',       // e.g. upsc.gov.in, ssc.gov.in, state psc
  AUTHORISED_PORTAL: 'AUTHORISED_PORTAL',       // e.g. ncs.gov.in, cdn.digialm.com
  THIRD_PARTY_AGGREGATOR: 'THIRD_PARTY_AGGREGATOR' // e.g. job boards, news feeds
};

export const EligibilityStatus = {
  LIKELY_ELIGIBLE: 'LIKELY_ELIGIBLE',
  POTENTIAL_MATCH: 'POTENTIAL_MATCH',
  APPEARS_INELIGIBLE: 'APPEARS_INELIGIBLE',
  INSUFFICIENT_INFO: 'INSUFFICIENT_INFO'
};

export const EmploymentType = {
  PERMANENT: 'Permanent',
  CONTRACTUAL: 'Contractual',
  FIXED_TERM: 'Fixed Term',
  PROJECT_BASED: 'Project Based',
  FULL_TIME: 'Full Time',
  PART_TIME: 'Part Time',
  INTERNSHIP: 'Internship',
  APPRENTICESHIP: 'Apprenticeship'
};

export const Sector = {
  CENTRAL_GOVT: 'Central Government',
  STATE_GOVT: 'State Government',
  PSU: 'Public Sector Undertaking (PSU)',
  AUTONOMOUS_GOVT: 'Autonomous Govt Institution',
  PRIVATE: 'Private Sector',
  ACADEMIC_RESEARCH: 'Academic / Research Institute'
};

export const ApplicationTrackerStatus = {
  SAVED: 'SAVED',
  REVIEWING: 'REVIEWING',
  APPLIED: 'APPLIED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  INTERVIEW_SCHEDULED: 'INTERVIEW_SCHEDULED',
  OFFERED: 'OFFERED',
  REJECTED: 'REJECTED',
  ARCHIVED: 'ARCHIVED'
};

export const VacancyLifecycleStatus = {
  NEW_DISCOVERED: 'NEW_DISCOVERED',
  ACTIVE: 'ACTIVE',
  CORRIGENDUM_EXTENDED: 'CORRIGENDUM_EXTENDED',
  CLOSING_SOON_7D: 'CLOSING_SOON_7D',
  CLOSING_SOON_3D: 'CLOSING_SOON_3D',
  CLOSING_SOON_1D: 'CLOSING_SOON_1D',
  EXPIRED_CLOSED: 'EXPIRED_CLOSED',
  WITHDRAWN_CANCELLED: 'WITHDRAWN_CANCELLED'
};
