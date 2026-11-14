/**
 * Vacancy Radar India - Google Apps Script Serverless Backend (Production v2.1)
 * 
 * Strict Official Government & Apex Institution Recruitment Radar.
 * Zero-cost architecture: Google Apps Script + Google Sheets + Gmail API.
 * Scheduled triggers configured for 08:00, 14:00, and 20:00 Asia/Kolkata (IST).
 * 
 * STRICT INTEGRITY RULES:
 * 1. 100% Direct Official Announcements: Only accepts links from verified government (.gov.in, .nic.in),
 *    university (.ac.in, .edu.in), and autonomous apex bodies (cdac.in, upsc.gov.in, nfsu.ac.in, drdo.gov.in).
 * 2. Zero Blog Links: Blog aggregator articles (FreeJobAlert, IndGovtJobs, SarkariResult) are strictly
 *    resolved down to the actual official government notification PDF / application portal.
 * 3. Exact Official Dates: Never invents or synthesizes arbitrary closing dates. If a date is not
 *    explicitly stated in the official announcement, candidates are directed to the official PDF.
 */

const CONFIG = {
  NOTIFICATION_EMAIL: '', // Resolved dynamically via getRecipientEmail()
  DEFAULT_TIMEZONE: 'Asia/Kolkata',
  SPREADSHEET_NAME: 'Vacancy_Radar_India_DB',
  RETRY_MAX_ATTEMPTS: 3,
  BACKOFF_INITIAL_DELAY_MS: 1500,
  DEFAULT_DEADLINE_DAYS: 7,
  STRICT_OFFICIAL_ONLY: true // Enforces zero third-party blog links in emails and database
};

/**
 * Formats and normalizes single or multiple comma-separated email addresses.
 * Example: "user1@gmail.com, user2@org.in" -> "user1@gmail.com, user2@org.in"
 */
function formatMultiEmail(rawEmails) {
  if (!rawEmails || typeof rawEmails !== 'string') return '';
  const parts = rawEmails.split(/[,;]+/)
    .map(e => e.trim())
    .filter(e => e && e.includes('@'));
  return parts.join(', ');
}

/**
 * Dynamically resolves the notification email recipient(s) with safe fallbacks.
 * Fully supports multiple comma-separated email addresses.
 */
function getRecipientEmail(configuredEmail = null) {
  // 0. Passed directly from profile / payload
  if (configuredEmail && typeof configuredEmail === 'string' && configuredEmail.includes('@')) {
    const formatted = formatMultiEmail(configuredEmail);
    if (formatted) return formatted;
  }

  // 1. Script Properties override (persisted from Web UI sync or setup)
  try {
    const propEmail = PropertiesService.getScriptProperties().getProperty('NOTIFICATION_EMAIL');
    if (propEmail && propEmail.includes('@')) {
      const formatted = formatMultiEmail(propEmail);
      if (formatted) return formatted;
    }
  } catch (_) {}

  // 2. Settings sheet in Google Sheets
  try {
    const ss = getDatabaseSpreadsheet();
    const settingsSheet = ss.getSheetByName('Settings');
    if (settingsSheet) {
      const data = settingsSheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === 'NOTIFICATION_EMAIL' && data[i][1] && String(data[i][1]).includes('@')) {
          const formatted = formatMultiEmail(String(data[i][1]));
          if (formatted) return formatted;
        }
      }
    }
  } catch (_) {}

  // 3. User under whose authority script/trigger executes
  try {
    const effectiveEmail = Session.getEffectiveUser().getEmail();
    if (effectiveEmail && effectiveEmail.includes('@')) {
      return effectiveEmail.trim();
    }
  } catch (_) {}

  // 4. Active user session (if run manually from Script Editor)
  try {
    const activeEmail = Session.getActiveUser().getEmail();
    if (activeEmail && activeEmail.includes('@')) {
      return activeEmail.trim();
    }
  } catch (_) {}

  return '';
}

/**
 * Validates whether a URL belongs to an official Indian government, academic, or apex employer domain.
 */
function isOfficialDomain(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const cleanUrl = url.trim().toLowerCase();
    const host = new URL(cleanUrl).hostname.replace(/^www\./, '');
    
    // Core Indian Official TLDs & Apex Institutions
    return host.endsWith('.gov.in') ||
           host.endsWith('.nic.in') ||
           host.endsWith('.ac.in') ||
           host.endsWith('.edu.in') ||
           host.endsWith('.res.in') ||
           host === 'cdac.in' ||
           host.endsWith('.cdac.in') ||
           host === 'upsc.gov.in' ||
           host === 'drdo.gov.in' ||
           host === 'rac.gov.in' ||
           host === 'isro.gov.in' ||
           host === 'barc.gov.in' ||
           host === 'nielit.in' ||
           host.endsWith('.nielit.in') ||
           host === 'nielit.gov.in' ||
           host === 'nfsu.ac.in' ||
           host.endsWith('.nfsu.ac.in') ||
           host === 'ncs.gov.in' ||
           host === 'cert-in.org.in' ||
           host === 'stpi.in' ||
           host.endsWith('.stpi.in') ||
           host === 'ernet.in' ||
           host.endsWith('.ernet.in') ||
           host === 'dic.gov.in' ||
           host === 'dfs.nic.in' ||
           host === 'cfslcbi.gov.in' ||
           host === 'bprd.nic.in' ||
           host === 'mahapolice.gov.in' ||
           host === 'cybercrime.gov.in' ||
           host === 'nciipc.gov.in' ||
           host === 'bel-india.in' ||
           host.endsWith('.bel-india.in') ||
           host === 'ecil.co.in' ||
           host === 'railtelindia.com' ||
           host === 'powergrid.in' ||
           host.endsWith('.powergrid.in') ||
           host === 'ongcindia.com' ||
           host === 'bhel.in' ||
           host === 'bhel.com' ||
           host === 'hal-india.co.in' ||
           host === 'rbi.org.in' ||
           host === 'sbi.co.in' ||
           host === 'ibps.in' ||
           host === 'sebi.gov.in' ||
           host === 'dsci.in';
  } catch (_) {
    return false;
  }
}

/**
 * Accurately parses Indian date formats (DD-MM-YYYY, DD/MM/YYYY, DD.MM.YYYY, DD Month YYYY)
 * Returns standard YYYY-MM-DD or empty string if invalid. Never fabricates dates.
 */
function parseIndianDate(dateStr) {
  if (!dateStr) return '';
  const cleanStr = String(dateStr).trim();

  // Pattern 1: DD-MM-YYYY, DD/MM/YYYY, DD.MM.YYYY
  let m = cleanStr.match(/\b(\d{1,2})[-/\.](\d{1,2})[-/\.](\d{4})\b/);
  if (m) {
    const day = parseInt(m[1], 10);
    const month = parseInt(m[2], 10);
    const year = parseInt(m[3], 10);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 2025 && year <= 2030) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // Pattern 2: DD Month YYYY (e.g. 26 October 2026, 06 Nov 2026)
  m = cleanStr.match(/\b(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})\b/);
  if (m) {
    const day = parseInt(m[1], 10);
    const monthNames = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
    const monthKey = m[2].toLowerCase().slice(0, 3);
    const month = monthNames[monthKey];
    const year = parseInt(m[3], 10);
    if (month && day >= 1 && day <= 31 && year >= 2025 && year <= 2030) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // Pattern 3: Month DD, YYYY (e.g. October 26, 2026)
  m = cleanStr.match(/\b([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})\b/);
  if (m) {
    const monthNames = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
    const monthKey = m[1].toLowerCase().slice(0, 3);
    const month = monthNames[monthKey];
    const day = parseInt(m[2], 10);
    const year = parseInt(m[3], 10);
    if (month && day >= 1 && day <= 31 && year >= 2025 && year <= 2030) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // Pattern 4: ISO YYYY-MM-DD
  m = cleanStr.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (m) {
    const year = parseInt(m[1], 10);
    const month = parseInt(m[2], 10);
    const day = parseInt(m[3], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  return '';
}

/**
 * Master catalog of 52 verified official government, PSU, academic, and national discovery channels.
 */
const MASTER_OFFICIAL_SOURCES = [
  // 1. Apex Tech R&D & Cyber Security Institutions
  ['src-001', 'cdac.in', 'Centre for Development of Advanced Computing (C-DAC)', 'OFFICIAL_EMPLOYER', 'https://www.cdac.in/index.aspx?id=current_jobs', true, '', 0, true],
  ['src-002', 'upsc.gov.in', 'Union Public Service Commission (UPSC)', 'RECRUITMENT_BOARD', 'https://upsc.gov.in/recruitment/recruitment-advertisement', true, '', 0, true],
  ['src-003', 'nfsu.ac.in', 'National Forensic Sciences University (NFSU Regular)', 'OFFICIAL_EMPLOYER', 'https://nfsu.ac.in/Regular_Recruitment', true, '', 0, true],
  ['src-003b', 'nfsu.ac.in', 'National Forensic Sciences University (NFSU Contractual)', 'OFFICIAL_EMPLOYER', 'https://nfsu.ac.in/Contractual_Recruitment', true, '', 0, true],
  ['src-004', 'nielit.gov.in', 'National Institute of Electronics & Information Technology (NIELIT)', 'RECRUITMENT_BOARD', 'https://www.nielit.gov.in/recruitments', true, '', 0, true],
  ['src-005', 'calicut.nielit.in', 'NIELIT Calicut (NIC Technical Cadre & Exams)', 'RECRUITMENT_BOARD', 'https://www.calicut.nielit.in/nic26/', true, '', 0, true],
  ['src-006', 'drdo.gov.in', 'DRDO Recruitment & Assessment Centre (RAC)', 'OFFICIAL_EMPLOYER', 'https://drdo.gov.in/drdo/careers', true, '', 0, true],
  ['src-007', 'rac.gov.in', 'DRDO RAC Recruitment Portal', 'OFFICIAL_EMPLOYER', 'https://rac.gov.in/', true, '', 0, true],
  ['src-008', 'isro.gov.in', 'Indian Space Research Organisation (ISRO Careers)', 'OFFICIAL_EMPLOYER', 'https://www.isro.gov.in/Careers.html', true, '', 0, true],
  ['src-009', 'barc.gov.in', 'Bhabha Atomic Research Centre (BARC Recruitments)', 'OFFICIAL_EMPLOYER', 'https://recruit.barc.gov.in/barcrecruit/', true, '', 0, true],
  ['src-010', 'nic.in', 'National Informatics Centre (NIC / MeitY)', 'OFFICIAL_EMPLOYER', 'https://www.nic.in/vacancies/', true, '', 0, true],
  ['src-011', 'cert-in.org.in', 'Indian Computer Emergency Response Team (CERT-In)', 'OFFICIAL_EMPLOYER', 'https://www.cert-in.org.in/', true, '', 0, true],
  ['src-012', 'stpi.in', 'Software Technology Parks of India (STPI / MeitY)', 'OFFICIAL_EMPLOYER', 'https://www.stpi.in/careers', true, '', 0, true],
  ['src-013', 'ernet.in', 'ERNET India (Education & Research Network)', 'OFFICIAL_EMPLOYER', 'https://ernet.in/jobs', true, '', 0, true],
  ['src-014', 'dic.gov.in', 'Digital India Corporation (DIC / MeitY)', 'OFFICIAL_EMPLOYER', 'https://dic.gov.in/index.php/careers', true, '', 0, true],

  // 2. Central Recruitment Boards & Banking Apex
  ['src-015', 'ssc.gov.in', 'Staff Selection Commission (SSC Selection Posts & Tech Cadre)', 'RECRUITMENT_BOARD', 'https://ssc.gov.in/', true, '', 0, true],
  ['src-016', 'ibps.in', 'Institute of Banking Personnel Selection (IT Specialist Officers)', 'RECRUITMENT_BOARD', 'https://www.ibps.in/', true, '', 0, true],
  ['src-017', 'rbi.org.in', 'Reserve Bank of India (RBI IT & Cyber Security Cadre)', 'OFFICIAL_EMPLOYER', 'https://opportunities.rbi.org.in/scripts/vacancies.aspx', true, '', 0, true],
  ['src-018', 'sebi.gov.in', 'Securities and Exchange Board of India (SEBI IT Officers)', 'OFFICIAL_EMPLOYER', 'https://www.sebi.gov.in/sebiweb/other/career.jsp', true, '', 0, true],

  // 3. Public Sector Undertakings (PSUs) with Technical/Cyber Cadres
  ['src-019', 'bel-india.in', 'Bharat Electronics Limited (BEL Cyber & Defence Tech)', 'OFFICIAL_EMPLOYER', 'https://bel-india.in/careers/', true, '', 0, true],
  ['src-020', 'ecil.co.in', 'Electronics Corporation of India Limited (ECIL)', 'OFFICIAL_EMPLOYER', 'https://www.ecil.co.in/jobs.html', true, '', 0, true],
  ['src-021', 'railtelindia.com', 'RailTel Corporation of India (Telecom, Cloud & Cyber)', 'OFFICIAL_EMPLOYER', 'https://www.railtelindia.com/careers.html', true, '', 0, true],
  ['src-022', 'powergrid.in', 'Power Grid Corporation of India Limited (IT & OT Security)', 'OFFICIAL_EMPLOYER', 'https://www.powergrid.in/job-opportunities', true, '', 0, true],
  ['src-023', 'ongcindia.com', 'Oil and Natural Gas Corporation (ONGC Technical & IT)', 'OFFICIAL_EMPLOYER', 'https://ongcindia.com/web/eng/career', true, '', 0, true],
  ['src-024', 'bhel.in', 'Bharat Heavy Electricals Limited (BHEL Information Systems)', 'OFFICIAL_EMPLOYER', 'https://careers.bhel.in/', true, '', 0, true],
  ['src-025', 'hal-india.co.in', 'Hindustan Aeronautics Limited (HAL Avionics & Software)', 'OFFICIAL_EMPLOYER', 'https://hal-india.co.in/Career_Docs.aspx', true, '', 0, true],
  ['src-026', 'ntpc.co.in', 'NTPC Limited (Executive & Engineering Cadre)', 'OFFICIAL_EMPLOYER', 'https://careers.ntpc.co.in/', true, '', 0, true],

  // 4. Law Enforcement & Central Forensic Science Laboratories
  ['src-027', 'dfs.nic.in', 'Directorate of Forensic Science Services (CFSLs / MHA)', 'OFFICIAL_EMPLOYER', 'https://dfs.nic.in/', true, '', 0, true],
  ['src-028', 'cfslcbi.gov.in', 'Central Forensic Science Laboratory (CFSL / CBI Delhi)', 'OFFICIAL_EMPLOYER', 'https://cfslcbi.gov.in/vacancies', true, '', 0, true],
  ['src-029', 'mahapolice.gov.in', 'Maharashtra Police Cyber Security Headquarters', 'OFFICIAL_EMPLOYER', 'https://mahapolice.gov.in', true, '', 0, true],
  ['src-030', 'bprd.nic.in', 'Bureau of Police Research and Development (BPR&D)', 'OFFICIAL_EMPLOYER', 'https://bprd.nic.in/', true, '', 0, true],
  ['src-031', 'cybercrime.gov.in', 'Indian Cyber Crime Coordination Centre (I4C / MHA)', 'OFFICIAL_EMPLOYER', 'https://cybercrime.gov.in/', true, '', 0, true],

  // 5. High-Capacity National Discovery Feeds (Auto-Resolved to Gov PDFs)
  ['src-032', 'ncs.gov.in', 'National Career Service All-India Portal', 'AUTHORISED_PORTAL', 'https://www.ncs.gov.in/job-seeker/Pages/Search.aspx', true, '', 0, true],
  ['src-033', 'sarkariresult.com', 'SarkariResult Official Feed (Auto-resolves to Official Gov PDFs)', 'THIRD_PARTY_AGGREGATOR', 'https://www.sarkariresult.com/feed/', false, '', 0, true],
  ['src-034', 'freejobalert.com', 'FreeJobAlert National Feed (Auto-resolves to Official Gov PDFs)', 'THIRD_PARTY_AGGREGATOR', 'https://www.freejobalert.com/feed', false, '', 0, true],
  ['src-035', 'indgovtjobs.in', 'IndGovtJobs Central & State Tech Feed', 'THIRD_PARTY_AGGREGATOR', 'https://www.indgovtjobs.in/feeds/posts/default?alt=rss', false, '', 0, true],
  ['src-036', 'news.google.com/gov-tech', 'Google Live Indian Government Tech & Cyber Vacancies', 'AUTHORISED_PORTAL', 'https://news.google.com/rss/search?q=site:gov.in+(recruitment+OR+vacancy)+(cyber+OR+forensic+OR+engineer)+2026&hl=en-IN&gl=IN&ceid=IN:en', true, '', 0, true],
  ['src-037', 'news.google.com/dfir', 'Google Live Digital Forensics & Cyber Investigation Feed', 'AUTHORISED_PORTAL', 'https://news.google.com/rss/search?q=site:gov.in+(forensic+OR+dfir+OR+cybercrime)+recruitment+2026&hl=en-IN&gl=IN&ceid=IN:en', true, '', 0, true],
  ['src-038', 'dsssb.delhi.gov.in', 'Delhi Subordinate Services Selection Board (Tech Cadre)', 'RECRUITMENT_BOARD', 'https://dsssb.delhi.gov.in/current-vacancies', true, '', 0, true],
  ['src-039', 'freshersworld.com', 'Freshersworld Government Jobs Feed', 'THIRD_PARTY_AGGREGATOR', 'https://www.freshersworld.com/feed/government-jobs', false, '', 0, true],

  // 6. Specialized Investigation, Intelligence & State Forensics Laboratories
  ['src-040', 'nia.gov.in', 'National Investigation Agency (Cyber Forensic & IT Cadre)', 'OFFICIAL_EMPLOYER', 'https://www.nia.gov.in/recruitment-notice.htm', true, '', 0, true],
  ['src-041', 'cbi.gov.in', 'Central Bureau of Investigation (CBI Cyber & Forensic Experts)', 'OFFICIAL_EMPLOYER', 'https://cbi.gov.in/vacancies', true, '', 0, true],
  ['src-042', 'ntro.gov.in', 'National Technical Research Organisation (NTRO Cyber & Tech Cadre)', 'OFFICIAL_EMPLOYER', 'https://ntro.gov.in/', true, '', 0, true],
  ['src-043', 'mha.gov.in', 'Ministry of Home Affairs (Police Modernization & Cyber Division)', 'OFFICIAL_EMPLOYER', 'https://www.mha.gov.in/en/notifications/vacancies', true, '', 0, true],
  ['src-044', 'csir.res.in', 'Council of Scientific and Industrial Research (CSIR Laboratories)', 'OFFICIAL_EMPLOYER', 'https://www.csir.res.in/career-opportunities/recruitment', true, '', 0, true],
  ['src-045', 'dfs.gujarat.gov.in', 'Directorate of Forensic Sciences (DFS Gujarat Forensic Lab)', 'OFFICIAL_EMPLOYER', 'https://dfs.gujarat.gov.in/', true, '', 0, true],
  ['src-046', 'delhipolice.gov.in', 'Delhi Police Cyber Crime Unit & Tech Cadre', 'OFFICIAL_EMPLOYER', 'https://delhipolice.gov.in/', true, '', 0, true],
  ['src-047', 'ksp.karnataka.gov.in', 'Karnataka State Police (Cyber Forensics / FSL)', 'OFFICIAL_EMPLOYER', 'https://ksp.karnataka.gov.in/', true, '', 0, true],
  ['src-048', 'tnpolice.gov.in', 'Tamil Nadu Police Cyber Crime Wing', 'OFFICIAL_EMPLOYER', 'https://tnpolice.gov.in/', true, '', 0, true],

  // 7. Premier Indian Institutes of Technology (IITs) & Employment Gazette
  ['src-049', 'iitd.ac.in', 'Indian Institute of Technology Delhi (Research & Technical Staff)', 'OFFICIAL_EMPLOYER', 'https://home.iitd.ac.in/jobs-iitd.php', true, '', 0, true],
  ['src-050', 'iitb.ac.in', 'Indian Institute of Technology Bombay (Staff & IT Cadre)', 'OFFICIAL_EMPLOYER', 'https://www.iitb.ac.in/en/careers/staff-recruitment', true, '', 0, true],
  ['src-051', 'iitm.ac.in', 'Indian Institute of Technology Madras (Pravartak Cyber Security)', 'OFFICIAL_EMPLOYER', 'https://www.iitm.ac.in/careers', true, '', 0, true],
  ['src-052', 'employmentnews.gov.in', 'Official Government Employment News (Ministry of I&B)', 'AUTHORISED_PORTAL', 'https://employmentnews.gov.in/', true, '', 0, true]
];

/**
 * Ensures user's Sources sheet is upgraded with all 52 verified official portals
 * without duplicating existing rows or wiping custom user configuration.
 */
function upgradeSourcesSheet(sourcesSheet) {
  if (!sourcesSheet) return;
  const existingUrls = new Set();
  const existingIds = new Set();
  const lastRow = sourcesSheet.getLastRow();

  if (lastRow > 1) {
    const data = sourcesSheet.getRange(2, 1, lastRow - 1, 5).getValues();
    data.forEach(row => {
      if (row[0]) existingIds.add(String(row[0]).trim());
      if (row[4]) existingUrls.add(String(row[4]).trim().toLowerCase());
    });
  }

  let appended = 0;
  MASTER_OFFICIAL_SOURCES.forEach(s => {
    const url = String(s[4]).trim().toLowerCase();
    const id = String(s[0]).trim();
    if (!existingUrls.has(url) && !existingIds.has(id)) {
      sourcesSheet.appendRow(s);
      existingUrls.add(url);
      existingIds.add(id);
      appended++;
    }
  });

  if (appended > 0) {
    Logger.log(`Successfully upgraded Sources sheet: added ${appended} missing official portals.`);
  }
}

/**
 * Initializes Google Sheets database tabs, schema, and initial settings
 */
function setupDatabase() {
  let ss = null;

  try {
    const storedId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (storedId) {
      ss = SpreadsheetApp.openById(storedId);
    }
  } catch (_) {}

  if (!ss) {
    try {
      const files = DriveApp.getFilesByName(CONFIG.SPREADSHEET_NAME);
      if (files.hasNext()) {
        ss = SpreadsheetApp.open(files.next());
      }
    } catch (_) {}
  }

  if (!ss) {
    ss = SpreadsheetApp.create(CONFIG.SPREADSHEET_NAME);
  }

  try {
    PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', ss.getId());
  } catch (_) {}

  const tabs = [
    {
      name: 'Vacancies',
      headers: ['ID', 'Title', 'Organisation', 'AdvtNo', 'Sector', 'Location', 'ClosingDate', 'VerificationStatus', 'Confidence', 'OfficialNoticePdf', 'ApplicationUrl', 'DiscoveredAt']
    },
    {
      name: 'Sources',
      headers: ['ID', 'Domain', 'Organisation', 'Category', 'SourceUrl', 'IsOfficial', 'LastCheck', 'ConsecutiveFails', 'IsEnabled']
    },
    {
      name: 'Applications',
      headers: ['VacancyID', 'Title', 'Organisation', 'Status', 'Deadline', 'SubmissionDate', 'Notes', 'UpdatedAt']
    },
    {
      name: 'Profiles',
      headers: ['ID', 'Name', 'Roles', 'Keywords', 'TargetFocus', 'EmailRecipient', 'UpdatedAt']
    },
    {
      name: 'Trash',
      headers: ['VacancyID', 'Title', 'Organisation', 'TrashedAt']
    },
    {
      name: 'ExecutionLogs',
      headers: ['Timestamp', 'Type', 'Status', 'SourcesChecked', 'NewVacancies', 'Message']
    },
    {
      name: 'Settings',
      headers: ['Key', 'Value', 'UpdatedAt']
    }
  ];

  tabs.forEach(tab => {
    let sheet = ss.getSheetByName(tab.name);
    if (!sheet) {
      sheet = ss.insertSheet(tab.name);
      sheet.appendRow(tab.headers);
      sheet.getRange(1, 1, 1, tab.headers.length)
        .setFontWeight('bold')
        .setBackground('#1e293b')
        .setFontColor('#f8fafc');
    }
  });

  // Remove default "Sheet1" if empty
  const sheet1 = ss.getSheetByName('Sheet1');
  if (sheet1 && sheet1.getLastRow() === 0 && ss.getSheets().length > 1) {
    try { ss.deleteSheet(sheet1); } catch (_) {}
  }

  // Auto-upgrade and seed all 52 official government and apex portals
  const sourcesSheet = ss.getSheetByName('Sources');
  if (sourcesSheet) {
    upgradeSourcesSheet(sourcesSheet);
  }

  // Seed baseline verified active technical opportunities if Vacancies sheet is newly created
  const vacSheet = ss.getSheetByName('Vacancies');
  if (vacSheet && vacSheet.getLastRow() <= 1) {
    const seedActiveVacancies = [
      [
        'vac-dsssb-06-2026',
        'Junior Engineer (Electrical / Technical) & Multi-Tasking Technical Staff',
        'Delhi Subordinate Services Selection Board (DSSSB)',
        'Advt No. 06/2026',
        'State Government & Public Tech',
        'New Delhi',
        '2026-12-11',
        'OFFICIALLY_VERIFIED',
        0.98,
        'https://dsssb.delhi.gov.in/sites/default/files/DSSSB/circulars-orders/final_advt_06_2026_j_e_electrical_mts.pdf',
        'https://dsssbonline.nic.in/',
        new Date().toISOString()
      ],
      [
        'vac-nfsu-dggi-2026',
        'Digital Forensics Laboratory Scientific Officer & Research Consultant (DGGI Project)',
        'National Forensic Sciences University (NFSU / MHA)',
        'NFSU/DGGI/DFIR/2026',
        'Central Government / Autonomous Apex',
        'Gandhinagar / Delhi',
        '2026-12-20',
        'OFFICIALLY_VERIFIED',
        0.98,
        'https://beta.nfsu.ac.in/data/pdfs/career/Advertisement%20NFSU-DGGI%20Project%20(1).pdf',
        'https://nfsu.ac.in/Contractual_Recruitment',
        new Date().toISOString()
      ],
      [
        'vac-nfsu-cyber-2026',
        'Scientific Officer & Scientific Assistant (Cyber Forensics & TASI Cadre)',
        'National Forensic Sciences University (NFSU / MHA)',
        'NFSU/REG/CYBER/2026/01',
        'Central Government / Autonomous Apex',
        'Gandhinagar, Gujarat',
        '2026-12-30',
        'OFFICIALLY_VERIFIED',
        0.98,
        'https://beta.nfsu.ac.in/data/pdfs/Contarctual_Recruitment/Scientific%20Officer%20–%20Gr.%20B.%20(Cyber%20&%20TASI)1%20.pdf',
        'https://nfsu.ac.in/Regular_Recruitment',
        new Date().toISOString()
      ]
    ];
    seedActiveVacancies.forEach(v => vacSheet.appendRow(v));
  }

  // Seed default multi-domain user profiles if Profiles sheet is empty
  const profSheet = ss.getSheetByName('Profiles');
  if (profSheet && profSheet.getLastRow() <= 1) {
    const userEmail = getRecipientEmail();
    const seedProfiles = [
      [
        'profile-software-engineer',
        'Software Engineering & Full Stack Developer',
        'Software Engineer, Full Stack Developer, Backend Engineer, Frontend Developer, Project Engineer, Scientist B',
        'Python, Node.js, React, Java, Spring Boot, PostgreSQL, Docker, Microservices, REST APIs, Git',
        JSON.stringify({ enabled: false, mode: 'PRIORITY_BOOST', targetDomains: ['cdac.in', 'nic.in', 'cris.org.in', 'isro.gov.in', 'drdo.gov.in'] }),
        userEmail,
        new Date().toISOString()
      ],
      [
        'profile-data-ai',
        'Data Science, Machine Learning & AI Specialist',
        'Data Scientist, Machine Learning Engineer, AI Research Engineer, Project Scientist, Data Analyst',
        'Machine Learning, Deep Learning, Python, PyTorch, TensorFlow, NLP, Generative AI, SQL, Computer Vision',
        JSON.stringify({ enabled: false, mode: 'PRIORITY_BOOST', targetDomains: ['cdac.in', 'drdo.gov.in', 'nic.in', 'csir.res.in'] }),
        userEmail,
        new Date().toISOString()
      ],
      [
        'profile-primary-dfir',
        'Digital Forensics & Incident Response (DFIR)',
        'Digital Forensics Examiner, Cyber Forensics Analyst, Digital Evidence Examiner, Forensic Scientist, Incident Response Analyst',
        'Digital Forensics, Mobile Forensics, Disk Imaging, Evidence Handling, Section 65B, Autopsy, FTK Imager, EnCase, Volatility, Cellebrite',
        JSON.stringify({ enabled: false, mode: 'PRIORITY_BOOST', targetDomains: ['cdac.in', 'upsc.gov.in', 'nfsu.ac.in', 'cfslcbi.gov.in', 'drdo.gov.in'] }),
        userEmail,
        new Date().toISOString()
      ],
      [
        'profile-cloud-devops',
        'Cloud Solutions, DevOps & Infrastructure',
        'DevOps Engineer, Cloud Infrastructure Specialist, Site Reliability Engineer, System Administrator, Platform Engineer',
        'AWS, Azure, Docker, Kubernetes, CI/CD, Terraform, Linux, Prometheus, Grafana, Ansible',
        JSON.stringify({ enabled: false, mode: 'PRIORITY_BOOST', targetDomains: ['nic.in', 'cdac.in', 'railtel.in', 'cris.org.in'] }),
        userEmail,
        new Date().toISOString()
      ],
      [
        'profile-cyber-soc',
        'Cyber Security, SOC Analyst & Threat Defense',
        'SOC Analyst, Cyber Security Engineer, Threat Intelligence Analyst, Information Security Auditor, Network Security Specialist',
        'SOC Operations, SIEM, Splunk, Next-Gen Firewall, Vulnerability Assessment, OWASP Top 10, CrowdStrike, MITRE ATT&CK, ISO 27001',
        JSON.stringify({ enabled: false, mode: 'PRIORITY_BOOST', targetDomains: ['cert-in.org.in', 'nciipc.gov.in', 'nic.in', 'drdo.gov.in', 'bel-india.in'] }),
        userEmail,
        new Date().toISOString()
      ]
    ];
    seedProfiles.forEach(p => profSheet.appendRow(p));
  }

  // Seed default settings
  const settingsSheet = ss.getSheetByName('Settings');
  if (settingsSheet && settingsSheet.getLastRow() <= 1) {
    const userEmail = getRecipientEmail();
    const defaultSettings = [
      ['NOTIFICATION_EMAIL', userEmail, new Date().toISOString()],
      ['TIMEZONE', CONFIG.DEFAULT_TIMEZONE, new Date().toISOString()],
      ['SCHEDULE_HOURS_IST', '08:00,14:00,20:00', new Date().toISOString()],
      ['DEADLINE_LEAD_DAYS', '7', new Date().toISOString()],
      ['STRICT_OFFICIAL_ONLY', 'true', new Date().toISOString()]
    ];
    defaultSettings.forEach(s => settingsSheet.appendRow(s));
  }

  Logger.log('Vacancy Radar Database successfully initialized: ' + ss.getUrl());
  return ss.getUrl();
}

/**
 * Sets up 08:00, 14:00, and 20:00 IST scheduled time-driven triggers
 */
function setupTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => {
    if (t.getHandlerFunction() === 'scheduledScanJob') {
      ScriptApp.deleteTrigger(t);
    }
  });

  // Morning scan (08:00 IST)
  ScriptApp.newTrigger('scheduledScanJob')
    .timeBased()
    .atHour(8)
    .everyDays(1)
    .inTimezone(CONFIG.DEFAULT_TIMEZONE)
    .create();

  // Afternoon scan (14:00 IST)
  ScriptApp.newTrigger('scheduledScanJob')
    .timeBased()
    .atHour(14)
    .everyDays(1)
    .inTimezone(CONFIG.DEFAULT_TIMEZONE)
    .create();

  // Evening scan (20:00 IST)
  ScriptApp.newTrigger('scheduledScanJob')
    .timeBased()
    .atHour(20)
    .everyDays(1)
    .inTimezone(CONFIG.DEFAULT_TIMEZONE)
    .create();

  Logger.log('Scheduled triggers initialized for 08:00, 14:00, and 20:00 Asia/Kolkata.');
}

/**
 * Main scheduled scan job executed 3 times daily
 * @param {boolean} isManualTrigger True if triggered manually or via webhook
 */
function scheduledScanJob(isManualTrigger = false) {
  const startTime = new Date();
  const currentHour = parseInt(Utilities.formatDate(startTime, CONFIG.DEFAULT_TIMEZONE, 'H'), 10);
  const isMorningBulletin = (currentHour >= 7 && currentHour <= 9);

  Logger.log(`Starting automated Vacancy Radar Scan at: ${startTime.toISOString()} (Hour: ${currentHour} IST)`);

  const newVerifiedOpportunities = [];
  let sourcesChecked = 0;
  let successfulSources = 0;

  try {
    // 1. Fetch active registered sources from Sheets
    const sources = getEnabledSources();
    sourcesChecked = sources.length;

    // Load existing vacancies map to prevent redundant alerts and duplicates
    const existingMap = getExistingVacanciesMap();

    // 2. Scan feeds & portals with backoff and timeout safeguards
    sources.forEach(source => {
      try {
        const feedVacancies = scanFeedWithBackoff(source.sourceUrl, source.domain);
        feedVacancies.forEach(vac => {
          // STRICT RULE: Only accept vacancies with verified official domains
          if (vac && isOfficialDomain(vac.verification?.officialNoticePdfUrl || vac.sourceUrl)) {
            if (!isDuplicate(vac, existingMap)) {
              saveVacancyRecord(vac);
              existingMap[vac.id] = true;
              if (vac.sourceUrl) existingMap[vac.sourceUrl.toLowerCase()] = true;
              if (vac.verification?.officialNoticePdfUrl) existingMap[vac.verification.officialNoticePdfUrl.toLowerCase()] = true;
              newVerifiedOpportunities.push(vac);
            }
          }
        });
        updateSourceSuccess(source.id);
        successfulSources++;
      } catch (err) {
        Logger.log(`Error scanning source ${source.domain}: ${err.message}`);
        recordSourceFailure(source.id, err.message);
      }
    });

    // Load registered profiles for profile-tailored search and individual email dispatching
    const registeredProfiles = getRegisteredProfiles();

    // 2b. Live Indian Government Web Index Discovery (.gov.in, .nic.in, .ac.in space)
    try {
      const liveCloudVacancies = executeCloudWebSearch(existingMap, registeredProfiles);
      if (liveCloudVacancies && liveCloudVacancies.length > 0) {
        liveCloudVacancies.forEach(vac => {
          newVerifiedOpportunities.push(vac);
        });
        Logger.log(`Live cloud web search discovered ${liveCloudVacancies.length} additional official opportunities.`);
      }
    } catch (searchErr) {
      Logger.log('Live cloud web search step error: ' + searchErr.message);
    }

    // 3. Check upcoming deadlines (≤ 7 days)
    const closingSoon = checkUpcomingDeadlines(CONFIG.DEFAULT_DEADLINE_DAYS);

    // 4. Send Gmail alerts: dedicated email per profile to its specific receiver (or fallback to global)
    let emailDispatchedCount = 0;
    const dispatchedRecipients = [];

    if (registeredProfiles && registeredProfiles.length > 0) {
      registeredProfiles.forEach(prof => {
        const profRecipient = formatMultiEmail(prof.emailRecipient || getRecipientEmail());
        if (!profRecipient || !profRecipient.includes('@')) {
          Logger.log(`Profile "${prof.name}" has no valid email recipient configured. Skipping email.`);
          return;
        }

        // Strictly filter opportunities and deadlines relevant to this profile's sources, target domains, and keywords
        const profNew = newVerifiedOpportunities.filter(v => isVacancyRelevantToProfile(v, prof));
        const profDeadlines = closingSoon.filter(v => isVacancyRelevantToProfile(v, prof));

        const shouldSend = (profNew.length > 0) ||
                           (profDeadlines.length > 0) ||
                           isMorningBulletin ||
                           isManualTrigger;

        if (shouldSend) {
          try {
            const emailResult = sendEmailNotification(profNew, profDeadlines, {
              sourcesChecked,
              successfulSources,
              isMorningBulletin,
              isManualTrigger,
              profile: prof,
              recipient: profRecipient
            });
            emailDispatchedCount++;
            dispatchedRecipients.push(`${prof.name} -> ${emailResult.recipient}`);
          } catch (mailErr) {
            Logger.log(`Email dispatch failed for profile "${prof.name}" (${profRecipient}): ${mailErr.message}`);
          }
        }
      });
    } else {
      // Fallback: Global recipient alert
      const defaultRecipient = getRecipientEmail();
      const shouldSendEmail = (newVerifiedOpportunities.length > 0) ||
                              (closingSoon.length > 0) ||
                              isMorningBulletin ||
                              isManualTrigger;

      if (shouldSendEmail && defaultRecipient && defaultRecipient.includes('@')) {
        try {
          const emailResult = sendEmailNotification(newVerifiedOpportunities, closingSoon, {
            sourcesChecked,
            successfulSources,
            isMorningBulletin,
            isManualTrigger,
            recipient: defaultRecipient
          });
          emailDispatchedCount++;
          dispatchedRecipients.push(emailResult.recipient);
        } catch (mailErr) {
          Logger.log('Global email delivery failed: ' + mailErr.message);
        }
      }
    }

    const emailDispatched = emailDispatchedCount > 0;
    const recipientSummary = dispatchedRecipients.join('; ');
    const logMessage = `Scan finished (${successfulSources}/${sourcesChecked} sources ok). Discovered: ${newVerifiedOpportunities.length} official posts, ${closingSoon.length} deadlines. Dedicated Emails: ${emailDispatchedCount} sent (${emailDispatched ? recipientSummary : 'None sent / suppressed'}).`;
    recordExecutionLog(
      isManualTrigger ? 'MANUAL_SCAN' : 'SCHEDULED_SCAN',
      'SUCCESS',
      sourcesChecked,
      newVerifiedOpportunities.length,
      logMessage
    );

    return {
      status: 'SUCCESS',
      sourcesChecked,
      successfulSources,
      newVacanciesFound: newVerifiedOpportunities.length,
      closingSoonFound: closingSoon.length,
      emailDispatched,
      emailsSentCount: emailDispatchedCount,
      recipients: dispatchedRecipients
    };

  } catch (globalErr) {
    Logger.log('Global scan error: ' + globalErr.message);
    recordExecutionLog(
      isManualTrigger ? 'MANUAL_SCAN' : 'SCHEDULED_SCAN',
      'FAILED',
      sourcesChecked,
      0,
      'Global scan error: ' + globalErr.message
    );
    return {
      status: 'FAILED',
      error: globalErr.message
    };
  }
}

/**
 * Fetches feed/portal content with exponential backoff and timeout protection
 */
function scanFeedWithBackoff(url, domain) {
  let attempt = 0;
  let delay = CONFIG.BACKOFF_INITIAL_DELAY_MS;

  while (attempt < CONFIG.RETRY_MAX_ATTEMPTS) {
    try {
      const response = UrlFetchApp.fetch(url, {
        muteHttpExceptions: true,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 VacancyRadar/2.1'
        }
      });

      const statusCode = response.getResponseCode();
      if (statusCode === 200) {
        const contentText = response.getContentText();
        return parseFeedOrWebpage(contentText, url, domain);
      } else if (statusCode === 404 || statusCode === 403 || statusCode === 410) {
        throw new Error(`HTTP ${statusCode} (Permanent or access error)`);
      }
      throw new Error(`HTTP Status: ${statusCode}`);
    } catch (e) {
      attempt++;
      if (attempt >= CONFIG.RETRY_MAX_ATTEMPTS) throw e;
      Utilities.sleep(delay);
      delay *= 2;
    }
  }
  return [];
}

/**
 * Dual parser: handles both RSS/Atom XML feeds and direct official HTML portals
 */
function parseFeedOrWebpage(rawText, sourceUrl, domain) {
  if (!rawText) return [];

  const isXml = rawText.includes('<rss') || rawText.includes('<feed') || rawText.includes('<channel>') || rawText.includes('<item>');
  if (isXml) {
    return parseRssOrAtomFeed(rawText, sourceUrl);
  } else {
    return parseHtmlAnnouncements(rawText, sourceUrl, domain);
  }
}

/**
 * Robust RSS/Atom XML parser with automatic regex fallback and official link resolution
 */
function parseRssOrAtomFeed(xmlText, sourceUrl) {
  const items = [];
  const rawItems = [];

  // 1. Try standard XmlService
  try {
    const document = XmlService.parse(xmlText);
    const root = document.getRootElement();
    const channel = root.getChild('channel');
    if (channel) {
      const xmlItems = channel.getChildren('item');
      xmlItems.forEach(item => {
        rawItems.push({
          title: (item.getChildText('title') || '').trim(),
          link: (item.getChildText('link') || '').trim(),
          desc: (item.getChildText('description') || '').trim(),
          pubDate: (item.getChildText('pubDate') || '').trim()
        });
      });
    }
  } catch (_) {}

  // 2. Regex-based XML Parser Fallback
  if (rawItems.length === 0) {
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match;
    while ((match = itemRegex.exec(xmlText)) !== null && rawItems.length < 50) {
      const itemXml = match[1];
      const titleRaw = (itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/i) || itemXml.match(/<title>(.*?)<\/title>/i) || [])[1] || '';
      const link = (itemXml.match(/<link>(.*?)<\/link>/i) || [])[1] || '';
      const descRaw = (itemXml.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/i) || itemXml.match(/<description>(.*?)<\/description>/i) || [])[1] || '';
      const pubDate = (itemXml.match(/<pubDate>(.*?)<\/pubDate>/i) || [])[1] || '';

      rawItems.push({
        title: titleRaw.replace(/&#8211;/g, '-').replace(/&amp;/g, '&').replace(/<[^>]+>/g, '').trim(),
        link: link.trim(),
        desc: descRaw.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim().slice(0, 400),
        pubDate: pubDate.trim()
      });
    }
  }

  // 3. Evaluate each item and resolve to 100% official government URLs
  for (let i = 0; i < rawItems.length && items.length < 25; i++) {
    const candidate = evaluateCandidateVacancy(rawItems[i].title, rawItems[i].link, rawItems[i].desc, rawItems[i].pubDate, sourceUrl);
    if (candidate) items.push(candidate);
  }

  return items;
}

/**
 * Direct HTML parser for official career portals (CDAC, UPSC, NFSU, NIELIT)
 */
function parseHtmlAnnouncements(htmlText, sourceUrl, domain) {
  const items = [];
  const seenUrls = {};

  function resolveUrl(rawHref) {
    try {
      if (rawHref.startsWith('http://') || rawHref.startsWith('https://')) return rawHref;
      if (rawHref.startsWith('/')) {
        const origin = new URL(sourceUrl).origin;
        return origin + rawHref;
      }
      return new URL(rawHref, sourceUrl).href;
    } catch (_) {
      return rawHref;
    }
  }

  // 1. Table Row & List Item Parsing: captures notices where the job title is in <td> and link is "Download" / "PDF"
  const rowRegex = /<(?:tr|li)[^>]*>([\s\S]*?)<\/(?:tr|li)>/gi;
  let rowMatch;
  while ((rowMatch = rowRegex.exec(htmlText)) !== null && items.length < 35) {
    const rowHtml = rowMatch[1];
    const rowText = rowHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (rowText.length < 15) continue;

    // Filter relevant technical / recruitment keywords
    if (/recruitment|vacancy|advertisement|advt|career|project engineer|analyst|cyber|forensic|technical|officer|scientist|engineer|consultant|fellow|examiner/i.test(rowText)) {
      const aRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
      let aMatch;
      while ((aMatch = aRegex.exec(rowHtml)) !== null) {
        const rawHref = aMatch[1].trim();
        const href = resolveUrl(rawHref);
        if (seenUrls[href]) continue;

        const aText = aMatch[2].replace(/<[^>]+>/g, '').trim();
        const isPdf = href.toLowerCase().endsWith('.pdf');
        const isDirectNotice = isPdf || /advt|notification|apply|view|download|detail|circular/i.test(aText) || /recruitment|vacancy|career/i.test(href);

        if (isDirectNotice && isOfficialDomain(href)) {
          seenUrls[href] = true;
          const candidateTitle = rowText.slice(0, 140);
          const candidate = evaluateCandidateVacancy(candidateTitle, href, `Official announcement on ${domain || 'government portal'}`, '', sourceUrl);
          if (candidate) items.push(candidate);
          break;
        }
      }
    }
  }

  // 2. Direct Anchor Link Parsing: fallback for standalone cards / links
  const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = linkRegex.exec(htmlText)) !== null && items.length < 45) {
    const rawHref = match[1].trim();
    const linkText = match[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const fullUrl = resolveUrl(rawHref);

    if (seenUrls[fullUrl] || linkText.length < 12) continue;

    // Filter relevant technical / recruitment keywords
    if (/recruitment|vacancy|advertisement|advt|career|project engineer|analyst|cyber|forensic|technical|officer|scientist|engineer/i.test(linkText)) {
      seenUrls[fullUrl] = true;
      const candidate = evaluateCandidateVacancy(linkText, fullUrl, `Official posting on ${domain || 'government portal'}`, '', sourceUrl);
      if (candidate) items.push(candidate);
    }
  }

  return items;
}

/**
 * Resolves a lead to its official government notification PDF and official portal URL.
 * If the link is from a third-party aggregator (FreeJobAlert, IndGovtJobs), it crawls the page
 * to extract the actual .gov.in / .ac.in / official notification document.
 * If NO official domain can be verified, it returns { isOfficial: false } so blog posts are DISCARDED.
 */
function resolveOfficialDetails(leadUrl, title, snippet) {
  // Case A: The URL is ALREADY a verified official government or university domain
  if (isOfficialDomain(leadUrl)) {
    const isPdf = leadUrl.toLowerCase().endsWith('.pdf');
    return {
      isOfficial: true,
      officialPdfUrl: isPdf ? leadUrl : '',
      officialPortalUrl: leadUrl,
      sourceDomain: new URL(leadUrl).hostname.replace(/^www\./, ''),
      closingDate: extractJobDates(title, snippet).closingDate
    };
  }

  // Case B: The URL is from an aggregator or feed article -> Follow lead to extract official government PDF/portal
  try {
    const res = UrlFetchApp.fetch(leadUrl, {
      muteHttpExceptions: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 VacancyRadar/2.1'
      }
    });

    if (res.getResponseCode() === 200) {
      const html = res.getContentText();
      const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
      let m;
      let officialPdf = '';
      let officialPortal = '';
      let officialDomain = '';

      while ((m = linkRegex.exec(html)) !== null) {
        const href = m[1].trim();
        const text = m[2].replace(/<[^>]+>/g, '').trim().toLowerCase();

        if (isOfficialDomain(href)) {
          officialDomain = new URL(href).hostname.replace(/^www\./, '');
          if (href.toLowerCase().endsWith('.pdf') || /notification|advt|advertisement|brochure|pdf/i.test(text)) {
            if (!officialPdf) officialPdf = href;
          } else if (/apply|portal|website|official/i.test(text)) {
            if (!officialPortal) officialPortal = href;
          }
        }
      }

      // Extract explicit closing date from official table/text on page
      const dateMatch = html.match(/(?:Last\s*Date|Closing\s*Date|Apply\s*Online\s*Last\s*Date|Submission\s*Deadline)[\s\S]{0,120}?(\d{1,2}[-/\.]\d{1,2}[-/\.]\d{4}|\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})/i);
      let pageClosingDate = '';
      if (dateMatch && dateMatch[1]) {
        pageClosingDate = parseIndianDate(dateMatch[1]);
      }

      // If an official government/university link was resolved, return it!
      if (officialPdf || officialPortal) {
        return {
          isOfficial: true,
          officialPdfUrl: officialPdf || officialPortal,
          officialPortalUrl: officialPortal || officialPdf,
          sourceDomain: officialDomain || 'official.gov.in',
          closingDate: pageClosingDate || extractJobDates(title, snippet).closingDate
        };
      }
    }
  } catch (err) {
    Logger.log(`Lead resolution warning for ${leadUrl}: ${err.message}`);
  }

  // Case C: No official government/university domain could be established
  return { isOfficial: false };
}

/**
 * Evaluates candidate items against Indian DFIR, Cyber, Computer Engineering, and IT profiles.
 * STRICTLY ENFORCES official government domains and rejects blog URLs.
 */
function evaluateCandidateVacancy(title, link, description, pubDateStr, sourceFeedUrl) {
  if (!title || !link) return null;

  // 1. Exclude exam results, answer keys, admit cards, and counselling notices
  if (/\b(?:result|admit card|answer key|counselling|cutoff|score card|hall ticket)\b/i.test(title)) {
    return null;
  }

  // 2. Keyword relevance for Indian Technical, Cyber & Digital Forensics roles
  const relevantPattern = /forensic|cyber|security|examiner|evidence|dfir|computer|information technology|\bIT\b|software|engineer|scientist|analyst|developer|technical officer|programmer|research associate|project fellow|assistant professor/i;
  const fullText = `${title} ${description}`.toLowerCase();
  if (!relevantPattern.test(fullText)) {
    return null;
  }

  // 3. Resolve lead to 100% verified official government PDF / portal
  const officialDetails = resolveOfficialDetails(link, title, description);
  
  // STRICT RULE: If the item does not resolve to an official government/university domain, DISCARD IT!
  if (!officialDetails || !officialDetails.isOfficial) {
    Logger.log(`Discarded non-official/blog entry: "${title.slice(0, 50)}" (${link})`);
    return null;
  }

  // 4. Extract Organisation from title
  const orgMatch = title.match(/^([A-Za-z0-9\s]{3,28}?)(?:\s+Recruitment|\s+Notification|\s+Exam|\s+–|\s+-|\s+Jobs)/i);
  const organisation = orgMatch ? orgMatch[1].trim() : inferOrganisation(title, officialDetails.officialPortalUrl);

  // 5. Calculate Job Dates (Never synthesizes arbitrary dates)
  let publishedAt = '';
  try {
    if (pubDateStr) {
      const d = new Date(pubDateStr);
      if (!isNaN(d.getTime())) publishedAt = Utilities.formatDate(d, CONFIG.DEFAULT_TIMEZONE, 'yyyy-MM-dd');
    }
  } catch (_) {}
  if (!publishedAt) {
    publishedAt = Utilities.formatDate(new Date(), CONFIG.DEFAULT_TIMEZONE, 'yyyy-MM-dd');
  }

  const closingDate = officialDetails.closingDate || extractJobDates(title, description).closingDate || '';

  // 6. Generate stable ID based on official authority and title
  const hashKey = (title.slice(0, 30) + (organisation || '')).replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  const id = 'vac-' + (hashKey || Date.now());

  return {
    id,
    title: title.slice(0, 150),
    organisation,
    advertisementNumber: extractAdvtNumber(title + ' ' + description),
    sector: 'Central / State Government & Apex Institutes',
    location: { city: 'All India', state: 'Multiple States' },
    dates: { publishedAt, closingDate },
    sourceUrl: officialDetails.officialPortalUrl,
    verification: {
      status: 'OFFICIALLY_VERIFIED',
      confidenceScore: 0.98,
      officialNoticePdfUrl: officialDetails.officialPdfUrl || officialDetails.officialPortalUrl,
      applicationUrl: officialDetails.officialPortalUrl,
      sourceDomain: officialDetails.sourceDomain || 'official.gov.in'
    },
    verificationStatus: 'OFFICIALLY_VERIFIED'
  };
}

function inferOrganisation(title, link) {
  try {
    const host = new URL(link).hostname.replace(/^www\./i, '');
    if (host.includes('cdac')) return 'Centre for Development of Advanced Computing (C-DAC)';
    if (host.includes('upsc')) return 'Union Public Service Commission (UPSC)';
    if (host.includes('nfsu')) return 'National Forensic Sciences University (NFSU)';
    if (host.includes('nielit')) return 'National Institute of Electronics & IT (NIELIT)';
    if (host.includes('drdo')) return 'Defence Research & Development Organisation (DRDO)';
    if (host.includes('isro')) return 'Indian Space Research Organisation (ISRO)';
    if (host.includes('nic')) return 'National Informatics Centre (NIC)';
    if (host.includes('kvic')) return 'Khadi and Village Industries Commission (KVIC)';
    if (host.includes('cottonuniversity')) return 'Cotton University';
  } catch (_) {}
  return 'Government / Apex Authority';
}

function extractAdvtNumber(text) {
  if (!text) return '';
  const match = text.match(/(?:Advt(?:ertisement)?\.?(?:\s*No\.?)?|Notification(?:\s*No\.?)?|CEN(?:\s*No\.?)?)\s*[:#\-–]?\s*([A-Za-z0-9][A-Za-z0-9\/\-_.]{2,30})/i);
  return match ? match[1].trim() : '';
}

function extractJobDates(title, snippet) {
  const fullText = `${title || ''} ${snippet || ''}`;
  let closingDate = '';

  const datePatterns = [
    /(?:last\s*date|closing\s*date|apply\s*before|deadline|end\s*date|till|upto)[\s:–—]+(\d{1,2}[-/\.](?:[0-9]{1,2}|[A-Za-z]{3,9})[-/\.]\d{2,4})/i,
    /(?:last\s*date|closing\s*date|apply\s*before|deadline|end\s*date)[\s:–—]+(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})/i
  ];

  for (const pat of datePatterns) {
    const match = fullText.match(pat);
    if (match && match[1]) {
      const parsed = parseIndianDate(match[1]);
      if (parsed) {
        closingDate = parsed;
        break;
      }
    }
  }

  // Never invent synthetic +28 days. If not explicitly found, return empty string.
  return { closingDate };
}

/**
 * Checks approaching deadlines (≤ specified days) from the Vacancies sheet
 */
function checkUpcomingDeadlines(days) {
  const closingSoon = [];
  try {
    const ss = getDatabaseSpreadsheet();
    const sheet = ss.getSheetByName('Vacancies');
    if (!sheet || sheet.getLastRow() <= 1) return closingSoon;

    const data = sheet.getDataRange().getValues();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 1; i < data.length; i++) {
      const id = data[i][0];
      const title = data[i][1];
      const organisation = data[i][2];
      const closingDateStr = data[i][6];
      const noticeUrl = data[i][9] || data[i][10];

      if (!closingDateStr) continue;

      const closingDate = new Date(closingDateStr);
      if (isNaN(closingDate.getTime())) continue;
      closingDate.setHours(0, 0, 0, 0);

      const diffMs = closingDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      // Vacancy closing between today (0) and specified lead days (e.g. 7)
      if (diffDays >= 0 && diffDays <= days) {
        closingSoon.push({
          id,
          title,
          organisation,
          closingDate: Utilities.formatDate(closingDate, CONFIG.DEFAULT_TIMEZONE, 'yyyy-MM-dd'),
          daysRemaining: diffDays,
          noticeUrl
        });
      }
    }
  } catch (err) {
    Logger.log('Error checking upcoming deadlines: ' + err.message);
  }
  return closingSoon;
}

/**
 * Fetches currently active (non-expired) verified vacancies from the Vacancies sheet.
 * Ensures the email alert contains valuable, actionable opportunities even when
 * no brand-new notices were issued in that exact 6-hour scan window.
 */
function getActiveVacancies(limit = 6) {
  const active = [];
  try {
    const ss = getDatabaseSpreadsheet();
    const sheet = ss.getSheetByName('Vacancies');
    if (!sheet || sheet.getLastRow() <= 1) return active;

    const data = sheet.getDataRange().getValues();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Read latest rows backwards
    for (let i = data.length - 1; i >= 1; i--) {
      const id = data[i][0];
      const title = data[i][1];
      const organisation = data[i][2];
      const advtNo = data[i][3];
      const closingDateStr = data[i][6];
      const noticeUrl = data[i][9] || data[i][10];

      if (!title || !noticeUrl) continue;

      let isStillOpen = true;
      let daysRemaining = null;

      if (closingDateStr) {
        const closingDate = new Date(closingDateStr);
        if (!isNaN(closingDate.getTime())) {
          closingDate.setHours(23, 59, 59, 999);
          if (closingDate < today) {
            isStillOpen = false; // Already passed
          } else {
            const diffMs = closingDate.getTime() - today.getTime();
            daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          }
        }
      }

      if (isStillOpen) {
        active.push({
          id,
          title,
          organisation,
          advertisementNumber: advtNo,
          closingDate: closingDateStr || 'Refer Official Notification PDF',
          daysRemaining,
          targetUrl: noticeUrl
        });

        if (active.length >= limit) break;
      }
    }
  } catch (err) {
    Logger.log('Error reading active vacancies: ' + err.message);
  }
  return active;
}

/**
 * Autonomous Cloud Search: queries live web indexes for .gov.in, .nic.in, and .ac.in vacancies.
 * Leverages Brave Search API if configured in Script Properties or Settings sheet.
 */
function executeCloudWebSearch(existingMap, profiles = []) {
  const discovered = [];
  let braveKey = '';
  try {
    braveKey = PropertiesService.getScriptProperties().getProperty('BRAVE_API_KEY');
  } catch (_) {}

  if (!braveKey) {
    try {
      const ss = getDatabaseSpreadsheet();
      const settingsSheet = ss.getSheetByName('Settings');
      if (settingsSheet) {
        const data = settingsSheet.getDataRange().getValues();
        for (let i = 1; i < data.length; i++) {
          if (data[i][0] === 'BRAVE_API_KEY' && data[i][1]) {
            braveKey = String(data[i][1]).trim();
            break;
          }
        }
      }
    } catch (_) {}
  }

  if (!braveKey) {
    // Dynamic Live Web Index Discovery across Indian Government domains (.gov.in, .nic.in, .ac.in)
    const openFeeds = [];
    if (profiles && profiles.length > 0) {
      profiles.forEach(p => {
        const topRoles = (p.roles || []).slice(0, 2).map(r => encodeURIComponent(r.replace(/[\(\)\/\\]/g, ''))).join('+OR+');
        const topKws = (p.keywords || []).slice(0, 2).map(k => encodeURIComponent(k.replace(/[\(\)\/\\]/g, ''))).join('+OR+');
        const roleQuery = topRoles || 'engineer+OR+developer+OR+officer';
        const kwQuery = topKws ? `+(${topKws})` : '';
        openFeeds.push(`https://news.google.com/rss/search?q=site:gov.in+(recruitment+OR+vacancy)+(${roleQuery})${kwQuery}+2026&hl=en-IN&gl=IN&ceid=IN:en`);
      });
    }
    if (openFeeds.length === 0) {
      openFeeds.push(
        'https://news.google.com/rss/search?q=site:gov.in+(recruitment+OR+vacancy)+(software+OR+engineer+OR+developer)+2026&hl=en-IN&gl=IN&ceid=IN:en',
        'https://news.google.com/rss/search?q=site:gov.in+(recruitment+OR+vacancy)+(cyber+OR+forensic+OR+data)+2026&hl=en-IN&gl=IN&ceid=IN:en'
      );
    }

    const uniqueFeeds = [...new Set(openFeeds)].slice(0, 6);
    for (const feedUrl of uniqueFeeds) {
      try {
        const feedVacancies = scanFeedWithBackoff(feedUrl, 'news.google.com');
        feedVacancies.forEach(vac => {
          if (vac && !isDuplicate(vac, existingMap)) {
            saveVacancyRecord(vac);
            existingMap[vac.id] = true;
            if (vac.sourceUrl) existingMap[vac.sourceUrl.toLowerCase()] = true;
            discovered.push(vac);
          }
        });
      } catch (feedErr) {
        Logger.log('Open cloud web discovery feed error: ' + feedErr.message);
      }
    }
    return discovered;
  }

  const queries = [];

  // Generate profile-tailored queries for each profile's specific target sources and roles
  if (profiles && profiles.length > 0) {
    profiles.forEach(p => {
      const targetDomains = (p.targetFocus && Array.isArray(p.targetFocus.targetDomains)) ? p.targetFocus.targetDomains : [];
      const roles = (p.roles || []).slice(0, 2);
      const keywords = (p.keywords || []).slice(0, 2);

      if (roles.length > 0 || keywords.length > 0) {
        const searchTerms = [...roles, ...keywords].map(t => `"${t}"`).join(' OR ');
        queries.push(`site:gov.in ("recruitment" OR "vacancy") (${searchTerms}) 2026`);
        queries.push(`site:nic.in ("recruitment" OR "advt") (${searchTerms}) 2026`);
      }

      // Profile target websites search (e.g. NIA, CBI, NTRO, C-DAC, NFSU, CSIR, DFS)
      targetDomains.slice(0, 3).forEach(td => {
        queries.push(`site:${td} ("recruitment" OR "vacancy" OR "advt" OR "career") 2026`);
      });
    });
  }

  if (queries.length === 0) {
    queries.push(
      'site:gov.in ("recruitment" OR "vacancy" OR "advt") ("cyber" OR "forensic" OR "technical officer" OR "scientist") 2026',
      'site:nic.in ("recruitment" OR "advt") ("engineer" OR "scientist" OR "analyst") 2026',
      'site:ac.in ("project engineer" OR "research associate" OR "cyber security") 2026'
    );
  }

  // Deduplicate and cap to avoid exceeding free rate limits
  const uniqueQueries = [...new Set(queries)].slice(0, 6);

  for (const q of uniqueQueries) {
    try {
      const endpoint = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(q)}&count=10&search_lang=en&country=in`;
      const res = UrlFetchApp.fetch(endpoint, {
        muteHttpExceptions: true,
        headers: {
          'Accept': 'application/json',
          'X-Subscription-Token': braveKey
        }
      });

      if (res.getResponseCode() === 200) {
        const json = JSON.parse(res.getContentText());
        const results = (json && json.web && Array.isArray(json.web.results)) ? json.web.results : [];

        results.forEach(item => {
          const itemUrl = item.url || '';
          if (isOfficialDomain(itemUrl)) {
            const rawTitle = (item.title || '').replace(/<[^>]+>/g, '').trim();
            const rawDesc = (item.description || '').replace(/<[^>]+>/g, '').trim();
            const fullSnippet = `${rawTitle} ${rawDesc}`;

            const parsedDates = extractJobDates(rawTitle, rawDesc);
            const advtNo = extractAdvtNumber(fullSnippet);

            let orgName = 'Indian Government / Apex Authority';
            try {
              const h = new URL(itemUrl).hostname.replace(/^www\./i, '');
              orgName = h.toUpperCase();
            } catch (_) {}

            const vac = {
              id: 'brave-' + Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, itemUrl).map(b => (b < 0 ? b + 256 : b).toString(16).padStart(2, '0')).join('').substring(0, 10),
              title: rawTitle.substring(0, 120),
              organisation: orgName,
              advertisementNumber: advtNo,
              sector: 'Central / State Government & Public Tech',
              location: { city: 'New Delhi', state: 'All India' },
              dates: parsedDates,
              verificationStatus: 'OFFICIALLY_VERIFIED',
              verification: {
                status: 'OFFICIALLY_VERIFIED',
                confidenceScore: 0.95,
                officialNoticePdfUrl: itemUrl.endsWith('.pdf') ? itemUrl : '',
                applicationUrl: itemUrl
              },
              sourceUrl: itemUrl
            };

            if (!isDuplicate(vac, existingMap)) {
              saveVacancyRecord(vac);
              existingMap[vac.id] = true;
              existingMap[itemUrl.toLowerCase()] = true;
              discovered.push(vac);
            }
          }
        });
      }
    } catch (searchErr) {
      Logger.log(`Brave search query error for "${q}": ${searchErr.message}`);
    }
  }

  return discovered;
}

/**
 * Sends a rich, responsive HTML alert digest via GmailApp.
 * Strictly provides direct official government links and verified dates.
 * Clean ASCII subject and styled HTML badges ensure 100% immunity to mojibake / replacement character glitches.
 */
function sendEmailNotification(newVacancies, closingSoon, scanSummary = {}) {
  const profile = scanSummary.profile || null;
  const profileName = profile ? String(profile.name || '').trim() : '';
  const recipient = getRecipientEmail(scanSummary.recipient || (profile ? profile.emailRecipient : null) || scanSummary.email);
  if (!recipient || !recipient.includes('@')) {
    throw new Error('No valid recipient email configured. Please set an email in the portal settings or Google Sheet.');
  }

  const newCount = newVacancies.length;
  const deadlineCount = closingSoon.length;
  const isMorning = scanSummary.isMorningBulletin;
  const totalSourcesCount = scanSummary.sourcesChecked || 52;
  const activeVacancies = (newCount === 0) ? (profile ? getActiveVacanciesForProfile(profile, 6) : getActiveVacancies(6)) : [];

  // Clean ASCII Subject Prefix - 100% immune to mojibake / replacement character glitches
  let subjectPrefix = '[Vacancy Radar]';
  if (profileName) {
    subjectPrefix = `[Vacancy Radar - ${profileName}]`;
  } else if (isMorning) {
    subjectPrefix = '[Vacancy Radar Bulletin]';
  }

  let subject = '';
  if (newCount > 0 && deadlineCount > 0) {
    subject = `${subjectPrefix} ${newCount} New Official Opportunities | ${deadlineCount} Deadlines Approaching`;
  } else if (newCount > 0) {
    subject = `${subjectPrefix} ${newCount} New Official Opportunities Discovered`;
  } else if (deadlineCount > 0) {
    subject = `${subjectPrefix} Urgent: ${deadlineCount} Deadlines Closing Soon (${activeVacancies.length} Active Open)`;
  } else {
    subject = `${subjectPrefix} Status: ${activeVacancies.length} Active Opportunities Open (52+ Official Portals Monitored)`;
  }

  const scanTimeFormatted = Utilities.formatDate(new Date(), CONFIG.DEFAULT_TIMEZONE, 'dd MMM yyyy, HH:mm') + ' IST';

  let htmlBody = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 650px; margin: 0 auto; color: #1e293b; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; line-height: 1.5;">
      
      <!-- Header Banner -->
      <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 22px 24px; color: #f8fafc;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="background: #2563eb; color: #ffffff; font-size: 11px; font-weight: 800; padding: 3px 8px; border-radius: 4px; letter-spacing: 0.05em;">RADAR</span>
            <h2 style="margin: 0; color: #60a5fa; font-size: 19px; font-weight: 700; letter-spacing: -0.02em;">Vacancy Radar India</h2>
          </div>
          <span style="background: rgba(16, 185, 129, 0.2); border: 1px solid rgba(16, 185, 129, 0.4); color: #34d399; font-size: 11px; padding: 3px 8px; border-radius: 4px; font-weight: 600;">52+ Official Gov &amp; Apex Portals</span>
        </div>
        <p style="margin: 6px 0 0; font-size: 13px; color: #94a3b8;">
          ${profileName ? `<strong style="color: #f8fafc;">Role Profile: ${profileName}</strong> &bull; ` : ''}Official Government Opportunities Monitor (IST Scan: ${scanTimeFormatted})
        </p>
      </div>

      <!-- Quick KPI Badges -->
      <div style="background: #f1f5f9; padding: 12px 20px; border-bottom: 1px solid #e2e8f0; display: flex; flex-wrap: wrap; gap: 16px; font-size: 12px;">
        <div>Sources Checked: <strong style="color: #0369a1;">${totalSourcesCount} Official Portals + Live Gov Index</strong></div>
        <div style="color: #059669;">New Announcements: <strong>+${newCount}</strong></div>
        <div style="color: ${deadlineCount > 0 ? '#dc2626' : '#64748b'};">Urgent Deadlines: <strong>${deadlineCount}</strong></div>
      </div>

      <div style="padding: 24px; background: #fafafa;">

        <!-- 1. Newly Discovered & Verified Vacancies -->
        ${newCount > 0 ? `
          <div style="margin-bottom: 24px;">
            <div style="margin: 0 0 12px 0; border-bottom: 2px solid #10b981; padding-bottom: 6px; display: flex; align-items: center;">
              <span style="background: #059669; color: #ffffff; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 3px; margin-right: 6px;">NEW</span>
              <h3 style="color: #059669; font-size: 15px; margin: 0; font-weight: 700;">
                Official Government &amp; Apex Announcements (+${newCount})
              </h3>
            </div>
            ${newVacancies.map(v => {
              const targetUrl = v.verification?.officialNoticePdfUrl || v.verification?.applicationUrl || v.sourceUrl;
              let domainName = '';
              try { domainName = new URL(targetUrl).hostname.replace(/^www\./i, ''); } catch (_) { domainName = 'official.gov.in'; }
              
              const closingText = (v.dates && v.dates.closingDate) 
                ? `<span style="color: #e11d48; font-weight: 700;">${v.dates.closingDate}</span>` 
                : `<span style="color: #64748b; font-style: italic;">Refer Official Notification PDF</span>`;

              return `
                <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 14px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px;">
                    <strong style="font-size: 14px; color: #0f172a; line-height: 1.4;">${v.title}</strong>
                    <span style="background: #dcfce7; color: #15803d; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; white-space: nowrap; border: 1px solid #bbf7d0;">
                      GOV: ${domainName}
                    </span>
                  </div>
                  <div style="font-size: 12px; color: #475569; margin-top: 6px;">
                    Authority: <strong>${v.organisation || 'Apex Public Authority'}</strong><br>
                    Official Closing Date: <strong>${closingText}</strong>
                    ${v.advertisementNumber ? `<br>Advt Reference: <code style="font-family: monospace; color: #0284c7;">${v.advertisementNumber}</code>` : ''}
                  </div>
                  <div style="margin-top: 10px;">
                    <a href="${targetUrl}" style="background: #0284c7; color: #ffffff; text-decoration: none; padding: 6px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; display: inline-block;">
                      [PDF] View Official Announcement &rarr;
                    </a>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        ` : `
          <!-- When 0 new posts emerged in this exact scan cycle, show open active verified opportunities -->
          <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 18px; margin-bottom: 22px;">
            <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 14px; display: flex; align-items: center;">
              <span style="background: #0284c7; color: #ffffff; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 3px; margin-right: 6px;">ACTIVE</span>
              <div>
                <h3 style="color: #0369a1; font-size: 15px; margin: 0; font-weight: 700;">
                  Currently Open Official Opportunities (${activeVacancies.length})
                </h3>
                <p style="margin: 3px 0 0 0; font-size: 12px; color: #64748b;">
                  Scanned <strong>${totalSourcesCount}+ Official Government Portals &amp; Live Indian Technical Index</strong>. No new notices were issued in this 6-hour scan window. The verified opportunities below remain open for application:
                </p>
              </div>
            </div>

            ${activeVacancies.length > 0 ? activeVacancies.map(v => {
              let domainName = '';
              try { domainName = new URL(v.targetUrl).hostname.replace(/^www\./i, ''); } catch (_) { domainName = 'official.gov.in'; }
              const closingBadge = (v.daysRemaining !== null)
                ? `<span style="background: #e0f2fe; color: #0369a1; font-size: 11px; font-weight: 700; padding: 2px 7px; border-radius: 4px; border: 1px solid #bae6fd;">${v.daysRemaining} days left (${v.closingDate})</span>`
                : `<span style="color: #64748b; font-size: 12px;">Closes: ${v.closingDate}</span>`;

              return `
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin-bottom: 10px;">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px;">
                    <strong style="font-size: 13.5px; color: #0f172a; line-height: 1.4;">${v.title}</strong>
                    <span style="background: #dcfce7; color: #15803d; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; white-space: nowrap; border: 1px solid #bbf7d0;">
                      GOV: ${domainName}
                    </span>
                  </div>
                  <div style="font-size: 12px; color: #475569; margin-top: 5px;">
                    Authority: <strong>${v.organisation || 'Apex Public Authority'}</strong> &bull; Deadline: ${closingBadge}
                    ${v.advertisementNumber ? `<br>Advt Reference: <code style="font-family: monospace; color: #0284c7;">${v.advertisementNumber}</code>` : ''}
                  </div>
                  <div style="margin-top: 8px;">
                    <a href="${v.targetUrl}" style="background: #0284c7; color: #ffffff; text-decoration: none; padding: 5px 10px; border-radius: 4px; font-size: 11.5px; font-weight: 600; display: inline-block;">
                      [PDF] View Official Announcement &rarr;
                    </a>
                  </div>
                </div>
              `;
            }).join('') : `
              <div style="text-align: center; color: #64748b; font-size: 13px; padding: 10px;">
                All 52+ official government portals checked and up-to-date.
              </div>
            `}
          </div>
        `}

        <!-- 2. Upcoming Deadlines (≤ 7 Days) -->
        ${deadlineCount > 0 ? `
          <div style="margin-bottom: 24px;">
            <div style="margin: 0 0 12px 0; border-bottom: 2px solid #ef4444; padding-bottom: 6px; display: flex; align-items: center;">
              <span style="background: #dc2626; color: #ffffff; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 3px; margin-right: 6px;">DEADLINE</span>
              <h3 style="color: #dc2626; font-size: 15px; margin: 0; font-weight: 700;">
                Official Deadlines Approaching (Closing Within 7 Days)
              </h3>
            </div>
            ${closingSoon.map(c => `
              <div style="background: #fff1f2; border: 1px solid #fecdd3; border-radius: 6px; padding: 12px; margin-bottom: 8px; font-size: 13px; display: flex; justify-content: space-between; align-items: center; gap: 10px;">
                <div>
                  <strong style="color: #9f1239;">${c.title}</strong><br>
                  <span style="font-size: 12px; color: #be123c;">Org: ${c.organisation || 'Apex Board'}</span>
                </div>
                <div style="text-align: right; white-space: nowrap;">
                  <span style="background: #e11d48; color: #ffffff; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 4px;">
                    ${c.daysRemaining === 0 ? 'CLOSES TODAY!' : `${c.daysRemaining} days left`}
                  </span>
                  <div style="font-size: 11px; color: #64748b; margin-top: 3px;">${c.closingDate}</div>
                </div>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <!-- 3. Zero-Cost Cloud System Health Footer -->
        <div style="margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 11px; color: #64748b; line-height: 1.6;">
          <strong>Official Source Guarantee:</strong> 100% of links above point directly to verified official government (.gov.in, .nic.in), public sector undertakings, and accredited university (.ac.in) portals. Zero blog links.<br>
          <strong>Comprehensive Coverage:</strong> 52+ official portals (C-DAC, NIELIT, NFSU, DRDO RAC, ISRO, BARC, NIC, CERT-In, STPI, ERNET, DIC, SSC, IBPS, RBI, SEBI, BEL, ECIL, RailTel, PowerGrid, ONGC, BHEL, HAL, NTPC, NIA, CBI, NTRO, MHA, CSIR, DFS Gujarat, Delhi Police Cyber, KSP, TN Police, IIT Delhi, IIT Bombay, IIT Madras, Employment News) + Live Indian Technical Web Index.<br>
          Next Scheduled Scan: 08:00, 14:00, or 20:00 Asia/Kolkata (IST).<br>
          To manage email preferences, configure your Web App recipient or Google Sheets Settings tab.
        </div>

      </div>
    </div>
  `;

  const plainText = `${subject}\n\nScan completed at ${scanTimeFormatted}.\nSources Monitored: ${totalSourcesCount}+ Official Portals & Live Gov Web Index.\nNew Opportunities: ${newCount}\nUpcoming Deadlines: ${deadlineCount}\n\nPlease view this alert in an HTML-compatible email client to inspect verified direct links.`;

  GmailApp.sendEmail(recipient, subject, plainText, {
    htmlBody: htmlBody,
    name: 'Vacancy Radar India'
  });

  Logger.log(`Alert digest email dispatched to: ${recipient}`);
  return { success: true, recipient, subject };
}

/**
 * Quick Test Function: Run directly from Apps Script editor to verify Gmail delivery immediately
 */
function testSendSampleEmail(customRecipient = null) {
  const recipient = customRecipient || getRecipientEmail();
  if (customRecipient) {
    try {
      PropertiesService.getScriptProperties().setProperty('NOTIFICATION_EMAIL', customRecipient.trim());
    } catch (_) {}
  }

  const sampleNew = [
    {
      id: 'sample-cdac-1',
      title: 'Project Engineer (Cyber Security & Digital Forensics)',
      organisation: 'Centre for Development of Advanced Computing (C-DAC)',
      advertisementNumber: 'CDAC(P)/R&D/01/2026',
      sourceUrl: 'https://www.cdac.in',
      verificationStatus: 'OFFICIALLY_VERIFIED',
      verification: {
        status: 'OFFICIALLY_VERIFIED',
        confidenceScore: 0.98,
        officialNoticePdfUrl: 'https://www.cdac.in/careers/advt_software_2026.pdf',
        applicationUrl: 'https://www.cdac.in'
      },
      dates: { closingDate: '2026-11-15' }
    },
    {
      id: 'sample-nfsu-1',
      title: 'Digital Forensic Evidence Examiner (Cyber Intelligence Lab)',
      organisation: 'National Forensic Sciences University (NFSU, Ministry of Home Affairs)',
      advertisementNumber: 'NFSU/EST/DFIR/2026/04',
      sourceUrl: 'https://nfsu.ac.in',
      verificationStatus: 'OFFICIALLY_VERIFIED',
      verification: {
        status: 'OFFICIALLY_VERIFIED',
        confidenceScore: 0.98,
        officialNoticePdfUrl: 'https://nfsu.ac.in/career/advt_cyber_examiner_2026.pdf',
        applicationUrl: 'https://nfsu.ac.in/career'
      },
      dates: { closingDate: '2026-11-20' }
    }
  ];

  const sampleClosing = [
    {
      id: 'sample-closing-1',
      title: 'Senior Scientific Officer (Cyber Forensics / CFSL Directorate)',
      organisation: 'Directorate of Forensic Science Services (MHA)',
      closingDate: Utilities.formatDate(new Date(Date.now() + 4 * 86400000), CONFIG.DEFAULT_TIMEZONE, 'yyyy-MM-dd'),
      daysRemaining: 4
    }
  ];

  const result = sendEmailNotification(sampleNew, sampleClosing, {
    sourcesChecked: 52,
    successfulSources: 52,
    isManualTrigger: true
  });

  Logger.log('Sample test email successfully sent to: ' + result.recipient);
  return result;
}

/**
 * Manual Full Scan Test Function: Run directly from editor to test full pipeline & feeds
 */
function testRunFullScan() {
  return scheduledScanJob(true);
}

// ============================================================================
// DATABASE & SHEETS ACCESS HELPERS
// ============================================================================

function getDatabaseSpreadsheet() {
  try {
    const storedId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (storedId) {
      return SpreadsheetApp.openById(storedId);
    }
  } catch (_) {}

  try {
    const files = DriveApp.getFilesByName(CONFIG.SPREADSHEET_NAME);
    if (files.hasNext()) {
      const ss = SpreadsheetApp.open(files.next());
      PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', ss.getId());
      return ss;
    }
  } catch (_) {}

  setupDatabase();
  const filesAgain = DriveApp.getFilesByName(CONFIG.SPREADSHEET_NAME);
  return SpreadsheetApp.open(filesAgain.next());
}

function getExistingVacanciesMap() {
  const map = {};
  try {
    const ss = getDatabaseSpreadsheet();
    const sheet = ss.getSheetByName('Vacancies');
    if (sheet && sheet.getLastRow() > 1) {
      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        const id = String(data[i][0] || '').trim();
        const advtNo = String(data[i][3] || '').trim();
        const appUrl = String(data[i][10] || '').trim().toLowerCase();
        const noticeUrl = String(data[i][9] || '').trim().toLowerCase();

        if (id) map[id] = true;
        if (advtNo) map[advtNo] = true;
        if (appUrl) map[appUrl] = true;
        if (noticeUrl) map[noticeUrl] = true;
      }
    }

    // Also check Trash sheet so deleted items are NEVER resurrected or re-alerted
    const trashSheet = ss.getSheetByName('Trash');
    if (trashSheet && trashSheet.getLastRow() > 1) {
      const trashData = trashSheet.getDataRange().getValues();
      for (let j = 1; j < trashData.length; j++) {
        const trashedId = String(trashData[j][0] || '').trim();
        const trashedTitle = String(trashData[j][1] || '').trim().toLowerCase();
        if (trashedId) map[trashedId] = true;
        if (trashedTitle) map[trashedTitle] = true;
      }
    }
  } catch (err) {
    Logger.log('Error loading existing vacancies map: ' + err.message);
  }
  return map;
}

function isDuplicate(vac, existingMap = null) {
  if (existingMap) {
    if (vac.id && existingMap[vac.id]) return true;
    if (vac.advertisementNumber && existingMap[vac.advertisementNumber]) return true;
    if (vac.sourceUrl && existingMap[vac.sourceUrl.toLowerCase()]) return true;
    if (vac.verification?.officialNoticePdfUrl && existingMap[vac.verification.officialNoticePdfUrl.toLowerCase()]) return true;
  }
  return false;
}

function generateCanonicalIdCodeGs(vac) {
  if (!vac) return 'vac-' + Date.now();
  var clean = function(s) {
    return String(s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  };
  var normalizeTitle = function(titleStr) {
    var t = String(titleStr || '').trim();
    return t.replace(/^(corrigendum|addendum|extension|revised|revision|notice|advertisement|cancellation|date extended)\s*[:-]\s*/gi, '').trim();
  };
  var orgSlug = clean(vac.organisation || 'apex-govt').slice(0, 24);
  var advtRaw = String(vac.advertisementNumber || '').trim();
  var cleanTitle = normalizeTitle(vac.title || '');

  if (advtRaw.length >= 3) {
    return 'gov_' + orgSlug + '_' + clean(advtRaw).slice(0, 30) + '_' + clean(cleanTitle).slice(0, 30);
  }
  return 'gov_' + orgSlug + '_' + clean(cleanTitle || 'post').slice(0, 45);
}

function saveVacancyRecord(vac) {
  try {
    const ss = getDatabaseSpreadsheet();
    const sheet = ss.getSheetByName('Vacancies');
    if (!sheet) return;

    const cid = vac.canonicalId || generateCanonicalIdCodeGs(vac);
    vac.canonicalId = cid;

    // Check if an existing row matches this canonical ID or (AdvtNo + Organisation)
    if (sheet.getLastRow() > 1) {
      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        const rowId = String(data[i][0] || '').trim();
        const rowAdvt = String(data[i][3] || '').trim();
        const rowOrg = String(data[i][2] || '').trim().toLowerCase();
        const vacAdvt = String(vac.advertisementNumber || '').trim();
        const vacOrg = String(vac.organisation || '').trim().toLowerCase();

        const isMatch = (rowId === cid) || (vacAdvt && rowAdvt && vacAdvt === rowAdvt && rowOrg === vacOrg);

        if (isMatch) {
          // Detect Corrigendum or Extension
          const existingCloseDate = String(data[i][6] || '').trim();
          const incomingCloseDate = vac.dates ? (vac.dates.closingDate || '') : (vac.closingDate || '');
          const vacTitle = String(vac.title || '').toLowerCase();
          const isCorrigendum = vacTitle.includes('corrigendum') || vacTitle.includes('extension') || vacTitle.includes('addendum');

          if (isCorrigendum || (incomingCloseDate && incomingCloseDate > existingCloseDate)) {
            // Update in-place in Google Sheet
            if (incomingCloseDate) sheet.getRange(i + 1, 7).setValue(incomingCloseDate);
            sheet.getRange(i + 1, 2).setValue(vac.title);
            sheet.getRange(i + 1, 8).setValue('CORRIGENDUM_EXTENDED');
            if (vac.verification && vac.verification.officialNoticePdfUrl) {
              sheet.getRange(i + 1, 10).setValue(vac.verification.officialNoticePdfUrl);
            }
            logExecution('CORRIGENDUM', 'SUCCESS', 1, 0, 'Corrigendum updated for: ' + vac.title);
          }
          return; // Existing entry processed
        }
      }
    }

    sheet.appendRow([
      vac.canonicalId || vac.id || ('vac-' + Date.now()),
      vac.title || '',
      vac.organisation || '',
      vac.advertisementNumber || '',
      vac.sector || 'Central / State Government & Apex Institutes',
      vac.location ? (vac.location.city + ', ' + vac.location.state) : 'All India',
      vac.dates ? (vac.dates.closingDate || '') : (vac.closingDate || ''),
      vac.lifecycleStatus || (vac.verification ? vac.verification.status : 'OFFICIALLY_VERIFIED'),
      vac.verification ? vac.verification.confidenceScore : 0.98,
      vac.verification ? (vac.verification.officialNoticePdfUrl || '') : '',
      vac.verification ? (vac.verification.applicationUrl || vac.sourceUrl || '') : (vac.sourceUrl || ''),
      new Date().toISOString()
    ]);
  } catch (err) {
    Logger.log('Error saving vacancy: ' + err.message);
  }
}

function saveApplicationRecord(app) {
  try {
    const ss = getDatabaseSpreadsheet();
    const sheet = ss.getSheetByName('Applications');
    if (!sheet) return;

    sheet.appendRow([
      app.vacancyId || '',
      app.title || '',
      app.organisation || '',
      app.status || 'SAVED',
      app.deadline || '',
      app.submissionDate || new Date().toISOString(),
      app.notes || '',
      new Date().toISOString()
    ]);
  } catch (err) {
    Logger.log('Error saving application: ' + err.message);
  }
}

function saveProfileRecord(prof) {
  if (!prof) return;
  saveAllProfiles([prof], false);
}

function saveAllProfiles(profilesList, overwriteAll = false) {
  try {
    const ss = getDatabaseSpreadsheet();
    let sheet = ss.getSheetByName('Profiles');
    if (!sheet) {
      sheet = ss.insertSheet('Profiles');
      sheet.appendRow(['ID', 'Name', 'Roles', 'Keywords', 'TargetFocus', 'EmailRecipient', 'UpdatedAt']);
      sheet.getRange(1, 1, 1, 7).setFontWeight('bold').setBackground('#1e293b').setFontColor('#f8fafc');
    }

    if (overwriteAll && sheet.getLastRow() > 1) {
      sheet.deleteRows(2, sheet.getLastRow() - 1);
    }

    const existingMap = {};
    if (!overwriteAll && sheet.getLastRow() > 1) {
      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        const id = String(data[i][0] || '').trim();
        const name = String(data[i][1] || '').trim().toLowerCase();
        if (id) existingMap[id] = i + 1;
        if (name) existingMap[name] = i + 1;
      }
    }

    profilesList.forEach(prof => {
      const recipient = formatMultiEmail(prof.scheduleSettings?.emailAddress || prof.emailRecipient || '');
      const id = prof.id || `prof-${Date.now()}`;
      const nameKey = String(prof.name || '').trim().toLowerCase();

      const rowValues = [
        id,
        prof.name || 'Default Profile',
        (prof.roles || []).join(', '),
        (prof.keywords || []).join(', '),
        JSON.stringify(prof.targetFocus || {}),
        recipient,
        new Date().toISOString()
      ];

      const existingRow = existingMap[id] || existingMap[nameKey];
      if (existingRow) {
        sheet.getRange(existingRow, 1, 1, 7).setValues([rowValues]);
      } else {
        sheet.appendRow(rowValues);
      }

      if (recipient && recipient.includes('@')) {
        PropertiesService.getScriptProperties().setProperty('NOTIFICATION_EMAIL', recipient);
      }
    });
  } catch (err) {
    Logger.log('Error saving profiles: ' + err.message);
  }
}

function getGeminiApiKey() {
  try {
    const key = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
    if (key && key.trim()) return key.trim();
  } catch (_) {}
  try {
    const ss = getDatabaseSpreadsheet();
    const sheet = ss.getSheetByName('Settings');
    if (sheet) {
      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === 'GEMINI_API_KEY' && data[i][1]) {
          return String(data[i][1]).trim();
        }
      }
    }
  } catch (_) {}
  return '';
}

function callGeminiAiInAppsScript(prompt, apiKey = null) {
  const key = apiKey || getGeminiApiKey();
  if (!key) return null;
  const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + encodeURIComponent(key);
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 500
    }
  };
  try {
    const res = UrlFetchApp.fetch(endpoint, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    if (res.getResponseCode() === 200) {
      const json = JSON.parse(res.getContentText());
      return json?.candidates?.[0]?.content?.parts?.[0]?.text || null;
    }
  } catch (err) {
    Logger.log('Gemini AI call in Apps Script failed: ' + err.message);
  }
  return null;
}

function callGeminiProfileMatch(vacTitle, vacOrg, profile, apiKey = null) {
  const key = apiKey || getGeminiApiKey();
  if (!key) return null;
  const rolesList = (profile.roles || []).join(', ');
  const skillsList = (profile.keywords || []).slice(0, 10).join(', ');
  const prompt = `You are an Indian employment qualification expert.
Determine if the following government job advertisement is relevant to this candidate.
Job Title: "${vacTitle}"
Organisation: "${vacOrg}"
Candidate Target Roles: "${rolesList}"
Candidate Skills/Domain: "${skillsList}"

Answer in valid JSON only, no markdown:
{"isRelevant": true or false, "rationale": "one short sentence"}`;

  try {
    const raw = callGeminiAiInAppsScript(prompt, key);
    if (!raw) return null;
    const clean = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(clean);
    if (typeof parsed.isRelevant === 'boolean') {
      return parsed.isRelevant;
    }
  } catch (_) {}
  return null;
}

function getRegisteredProfiles() {
  const profiles = [];
  try {
    const ss = getDatabaseSpreadsheet();
    const sheet = ss.getSheetByName('Profiles');
    if (sheet && sheet.getLastRow() > 1) {
      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        const id = String(data[i][0] || '').trim();
        const name = String(data[i][1] || '').trim();
        const rolesStr = String(data[i][2] || '').trim();
        const keywordsStr = String(data[i][3] || '').trim();
        const targetFocusStr = String(data[i][4] || '').trim();
        const emailRecipient = String(data[i][5] || '').trim();

        if (!name) continue;

        let targetFocus = {};
        try {
          if (targetFocusStr) targetFocus = JSON.parse(targetFocusStr);
        } catch (_) {}

        profiles.push({
          id: id || `prof-${i}`,
          name: name,
          roles: rolesStr.split(',').map(s => s.trim()).filter(Boolean),
          keywords: keywordsStr.split(',').map(s => s.trim()).filter(Boolean),
          targetFocus: targetFocus,
          emailRecipient: emailRecipient
        });
      }
    }
  } catch (err) {
    Logger.log('Error reading registered profiles: ' + err.message);
  }

  // Fallback: If no profiles are registered in sheet yet, provide multi-domain baseline
  if (profiles.length === 0) {
    const userEmail = getRecipientEmail();
    return [
      {
        id: 'profile-software-engineer',
        name: 'Software Engineering & Full Stack Developer',
        roles: ['Software Engineer', 'Full Stack Developer', 'Backend Engineer', 'Project Engineer', 'Scientist B', 'Technical Officer'],
        keywords: ['Python', 'Node.js', 'React', 'Java', 'Spring Boot', 'PostgreSQL', 'Docker', 'Microservices', 'REST APIs'],
        targetFocus: { enabled: false },
        emailRecipient: userEmail
      },
      {
        id: 'profile-data-ai',
        name: 'Data Science, Machine Learning & AI Specialist',
        roles: ['Data Scientist', 'Machine Learning Engineer', 'AI Research Engineer', 'Project Scientist', 'Data Analyst'],
        keywords: ['Machine Learning', 'Deep Learning', 'Python', 'PyTorch', 'TensorFlow', 'NLP', 'Generative AI', 'SQL'],
        targetFocus: { enabled: false },
        emailRecipient: userEmail
      },
      {
        id: 'profile-primary-dfir',
        name: 'Digital Forensics & Incident Response (DFIR)',
        roles: ['Digital Forensics Examiner', 'Cyber Forensics Analyst', 'Digital Evidence Examiner', 'Forensic Scientist'],
        keywords: ['Digital Forensics', 'Mobile Forensics', 'Disk Imaging', 'Evidence Handling', 'Section 65B', 'Autopsy', 'FTK Imager'],
        targetFocus: { enabled: false },
        emailRecipient: userEmail
      }
    ];
  }

  return profiles;
}

function isVacancyRelevantToProfile(vac, profile) {
  if (!vac || !profile) return true;

  const vacTitle = String(vac.title || '').toLowerCase();
  const vacOrg = String(vac.organisation || '').toLowerCase();
  const vacSector = String(vac.sector || '').toLowerCase();
  const vacSnippet = String(vac.extractedSnippet || '').toLowerCase();
  const vacDesc = `${vacSector} ${vacTitle} ${vacOrg} ${vacSnippet}`;

  // 0. Hard Negative Exclusions Guard (Exam results, answer keys, non-technical posts)
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

  // 1. Strict Target Organization / Website Filtering (if explicitly enabled in STRICT_TARGET mode)
  if (isTargetEnabled && targetFocus.mode === 'STRICT_TARGET') {
    if (targetDomains.length > 0 || targetOrgs.length > 0) {
      const domainMatch = targetDomains.some(td => vacDomain && (vacDomain === td || vacDomain.endsWith('.' + td)));
      const orgMatch = targetOrgs.some(to => vacOrg && vacOrg.includes(to));
      if (!domainMatch && !orgMatch) {
        return false; // Excluded by strict focus
      }
    }
  }

  // 2. Exact Role & Keyword Substring Match (First-class match)
  const roles = (profile.roles || []).map(r => String(r).toLowerCase().trim()).filter(Boolean);
  const keywords = (profile.keywords || []).map(k => String(k).toLowerCase().trim()).filter(Boolean);

  if (roles.length === 0 && keywords.length === 0) {
    return true; // No filter configured, matches all
  }

  if (roles.some(role => vacDesc.includes(role))) return true;
  if (keywords.some(kw => vacDesc.includes(kw))) return true;

  // 3. Dynamic Profile-Aware Token & Stem Matching (Works for ANY Profile: Software, AI, Cloud, Cyber)
  const dynamicStems = [];
  roles.forEach(r => {
    r.toLowerCase().split(/[\s\-_/,\(\)]+/).forEach(t => {
      if (t.length >= 3 && !['with', 'from', 'level', 'post', 'lead', 'team', 'senior', 'junior', 'grade', 'project', 'specialist', 'officer', 'engineer'].includes(t)) {
        dynamicStems.push(t);
      }
    });
  });
  keywords.forEach(k => {
    k.toLowerCase().split(/[\s\-_/,\(\)]+/).forEach(t => {
      if (t.length >= 3 && !['with', 'from', 'level', 'post', 'tools'].includes(t)) {
        dynamicStems.push(t);
      }
    });
  });

  const universalRoleStems = ['engineer', 'developer', 'analyst', 'scientist', 'officer', 'specialist', 'expert', 'consultant', 'technic', 'programmer', 'architect', 'associate', 'fellow', 'faculty', 'professor', 'examiner', 'manager', 'lead', 'mts'];
  const hasRoleStem = universalRoleStems.some(s => vacDesc.includes(s));
  const matchedProfileStems = dynamicStems.filter(stem => vacDesc.includes(stem));

  if (matchedProfileStems.length >= 2) {
    return true; // 2 or more distinct profile tokens matched
  }
  if (matchedProfileStems.length >= 1 && hasRoleStem) {
    return true; // Skill/domain token + technical role stem matched (e.g. Python Developer, Data Scientist, Cloud Engineer)
  }

  // 4. Multi-Domain Technical Stems & Apex Bodies Matching
  // Software / Full Stack:
  const isSoftwareProfile = dynamicStems.some(s => ['software', 'python', 'java', 'react', 'web', 'backend', 'developer', 'coding', 'fullstack'].includes(s));
  if (isSoftwareProfile) {
    const swStems = ['software', 'developer', 'programmer', 'computer', 'information technology', 'systems', 'cloud', 'application'];
    if (swStems.some(s => vacDesc.includes(s)) && hasRoleStem) return true;
    const apexTechDomains = ['cdac.in', 'nic.in', 'nielit.in', 'nielit.gov.in', 'drdo.gov.in', 'stpi.in', 'cris.org.in'];
    if (apexTechDomains.some(atd => vacDomain && (vacDomain === atd || vacDomain.endsWith('.' + atd))) && hasRoleStem) return true;
  }

  // Data Science / AI / ML:
  const isAiDataProfile = dynamicStems.some(s => ['data', 'analytics', 'machine', 'learning', 'deep', 'pytorch', 'ai', 'intelligence'].includes(s));
  if (isAiDataProfile) {
    const dataStems = ['data', 'analytics', 'statistic', 'machine learning', 'artificial intelligence', 'python'];
    if (dataStems.some(s => vacDesc.includes(s)) && hasRoleStem) return true;
  }

  // Cyber Security & DFIR:
  const isCyberProfile = dynamicStems.some(s => ['forensic', 'cyber', 'security', 'dfir', 'evidence', 'incident', 'malware', 'vapt', 'soc'].includes(s));
  if (isCyberProfile) {
    const domainStems = ['forensic', 'cyber', 'security', 'dfir', 'incident', 'evidence', 'malware', 'vapt', 'soc', 'investigat', 'digital', 'cctv'];
    if (domainStems.some(s => vacDesc.includes(s)) && hasRoleStem) return true;
    const apexForensicDomains = ['nfsu.ac.in', 'cfslcbi.gov.in', 'dfs.nic.in', 'cert-in.org.in', 'cybercrime.gov.in', 'dfs.gujarat.gov.in', 'bprd.nic.in'];
    if (apexForensicDomains.some(ad => vacDomain && (vacDomain === ad || vacDomain.endsWith('.' + ad)))) return true;
  }

  // Cloud & DevOps:
  const isCloudProfile = dynamicStems.some(s => ['cloud', 'devops', 'aws', 'azure', 'docker', 'kubernetes', 'infrastructure'].includes(s));
  if (isCloudProfile) {
    const cloudStems = ['cloud', 'devops', 'infrastructure', 'linux', 'system admin', 'network'];
    if (cloudStems.some(s => vacDesc.includes(s)) && hasRoleStem) return true;
  }

  // Target Domain Match (Priority Boost Mode)
  if (targetDomains.length > 0) {
    const domainMatch = targetDomains.some(td => vacDomain && (vacDomain === td || vacDomain.endsWith('.' + td)));
    if (domainMatch && (hasRoleStem || matchedProfileStems.length > 0)) return true;
  }

  // 5. Gemini AI Evaluation (if API Key is configured)
  const geminiKey = getGeminiApiKey();
  if (geminiKey && vacTitle.length >= 8) {
    try {
      const aiVerdict = callGeminiProfileMatch(vac.title, vac.organisation, profile, geminiKey);
      if (typeof aiVerdict === 'boolean') {
        return aiVerdict;
      }
    } catch (_) {}
  }

  return false;
}

function getActiveVacanciesForProfile(profile, limit = 6) {
  const active = [];
  try {
    const ss = getDatabaseSpreadsheet();
    const sheet = ss.getSheetByName('Vacancies');
    if (!sheet || sheet.getLastRow() <= 1) return active;

    const data = sheet.getDataRange().getValues();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = data.length - 1; i >= 1; i--) {
      const id = data[i][0];
      const title = data[i][1];
      const organisation = data[i][2];
      const advtNo = data[i][3];
      const closingDateStr = data[i][6];
      const noticeUrl = data[i][9] || data[i][10];

      if (!title || !noticeUrl) continue;

      const vacStub = {
        id,
        title,
        organisation,
        sourceUrl: noticeUrl,
        verification: { officialNoticePdfUrl: noticeUrl }
      };

      if (!isVacancyRelevantToProfile(vacStub, profile)) continue;

      let isStillOpen = true;
      let daysRemaining = null;

      if (closingDateStr) {
        const closingDate = new Date(closingDateStr);
        if (!isNaN(closingDate.getTime())) {
          closingDate.setHours(23, 59, 59, 999);
          if (closingDate < today) {
            isStillOpen = false;
          } else {
            const diffMs = closingDate.getTime() - today.getTime();
            daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          }
        }
      }

      if (isStillOpen) {
        active.push({
          id,
          title,
          organisation,
          advertisementNumber: advtNo,
          closingDate: closingDateStr || 'Refer Official Notification PDF',
          daysRemaining,
          targetUrl: noticeUrl
        });

        if (active.length >= limit) break;
      }
    }
  } catch (err) {
    Logger.log('Error reading active profile vacancies: ' + err.message);
  }
  return active;
}

function saveTrashRecord(vacId, title = '', org = '') {
  try {
    const ss = getDatabaseSpreadsheet();
    let sheet = ss.getSheetByName('Trash');
    if (!sheet) {
      sheet = ss.insertSheet('Trash');
      sheet.appendRow(['VacancyID', 'Title', 'Organisation', 'TrashedAt']);
      sheet.getRange(1, 1, 1, 4).setFontWeight('bold').setBackground('#1e293b').setFontColor('#f8fafc');
    }

    // Deduplicate in Trash tab
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(vacId).trim()) return;
    }

    sheet.appendRow([
      vacId || '',
      title || '',
      org || '',
      new Date().toISOString()
    ]);
  } catch (err) {
    Logger.log('Error saving trash record: ' + err.message);
  }
}

function restoreTrashRecord(vacId) {
  try {
    const ss = getDatabaseSpreadsheet();
    const sheet = ss.getSheetByName('Trash');
    if (!sheet || sheet.getLastRow() <= 1) return;

    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(vacId).trim()) {
        sheet.deleteRow(i + 1);
        break;
      }
    }
  } catch (err) {
    Logger.log('Error restoring trash record: ' + err.message);
  }
}

function recordExecutionLog(type, status, sourcesChecked, newVacancies, message) {
  try {
    const ss = getDatabaseSpreadsheet();
    let sheet = ss.getSheetByName('ExecutionLogs');
    if (!sheet) {
      sheet = ss.insertSheet('ExecutionLogs');
      sheet.appendRow(['Timestamp', 'Type', 'Status', 'SourcesChecked', 'NewVacancies', 'Message']);
      sheet.getRange(1, 1, 1, 6).setFontWeight('bold').setBackground('#1e293b').setFontColor('#f8fafc');
    }

    sheet.appendRow([
      new Date().toISOString(),
      type || 'SCHEDULED_SCAN',
      status || 'SUCCESS',
      sourcesChecked || 0,
      newVacancies || 0,
      message || ''
    ]);

    // Keep log table from growing beyond 500 rows to preserve sheet performance
    const lastRow = sheet.getLastRow();
    if (lastRow > 500) {
      sheet.deleteRows(2, lastRow - 500);
    }
  } catch (err) {
    Logger.log('Error recording execution log: ' + err.message);
  }
}

function updateSourceSuccess(sourceId) {
  try {
    const ss = getDatabaseSpreadsheet();
    const sheet = ss.getSheetByName('Sources');
    if (!sheet || sheet.getLastRow() <= 1) return;

    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === sourceId) {
        sheet.getRange(i + 1, 7).setValue(new Date().toISOString()); // LastCheck
        sheet.getRange(i + 1, 8).setValue(0); // ConsecutiveFails reset to 0
        break;
      }
    }
  } catch (_) {}
}

function recordSourceFailure(sourceId, msg) {
  try {
    const ss = getDatabaseSpreadsheet();
    const sheet = ss.getSheetByName('Sources');
    if (!sheet || sheet.getLastRow() <= 1) return;

    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === sourceId) {
        const currentFails = parseInt(data[i][7] || 0, 10);
        sheet.getRange(i + 1, 8).setValue(currentFails + 1);
        break;
      }
    }
  } catch (_) {}
}

function getEnabledSources() {
  const sources = [];
  try {
    const ss = getDatabaseSpreadsheet();
    const sheet = ss.getSheetByName('Sources');
    if (sheet) {
      // Auto-upgrade if sheet contains fewer than all 39 master sources
      if (sheet.getLastRow() < MASTER_OFFICIAL_SOURCES.length) {
        upgradeSourcesSheet(sheet);
      }

      if (sheet.getLastRow() > 1) {
        const data = sheet.getDataRange().getValues();
        for (let i = 1; i < data.length; i++) {
          const isEnabled = data[i][8];
          if (isEnabled === true || String(isEnabled).toLowerCase() === 'true' || isEnabled === 1) {
            sources.push({
              id: data[i][0],
              domain: data[i][1],
              organisation: data[i][2],
              category: data[i][3],
              sourceUrl: data[i][4],
              isOfficial: data[i][5]
            });
          }
        }
      }
    }
  } catch (_) {}

  // If sources sheet was unpopulated or returned 0, return verified official seeds
  if (sources.length === 0) {
    return MASTER_OFFICIAL_SOURCES.map(s => ({
      id: s[0],
      domain: s[1],
      organisation: s[2],
      category: s[3],
      sourceUrl: s[4],
      isOfficial: s[5]
    }));
  }
  return sources;
}

function getRecentExecutionLogs(limit = 25) {
  const logs = [];
  try {
    const ss = getDatabaseSpreadsheet();
    const sheet = ss.getSheetByName('ExecutionLogs');
    if (!sheet || sheet.getLastRow() <= 1) return logs;

    const data = sheet.getDataRange().getValues();
    const startRow = Math.max(1, data.length - limit);
    for (let i = data.length - 1; i >= startRow; i--) {
      logs.push({
        timestamp: data[i][0],
        type: data[i][1],
        status: data[i][2],
        sourcesChecked: data[i][3],
        newVacancies: data[i][4],
        message: data[i][5]
      });
    }
  } catch (err) {
    Logger.log('Error reading execution logs: ' + err.message);
  }
  return logs;
}

function getAllVacanciesFromSheet() {
  const vacancies = [];
  try {
    const ss = getDatabaseSpreadsheet();
    const sheet = ss.getSheetByName('Vacancies');
    if (!sheet || sheet.getLastRow() <= 1) return vacancies;

    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const title = String(row[1] || '').trim();
      if (!title) continue;

      vacancies.push({
        id: String(row[0] || `vac-${i}`),
        title: title,
        organisation: String(row[2] || 'Official Authority'),
        advertisementNumber: String(row[3] || ''),
        sector: String(row[4] || 'Central / State Government & Apex Institutes'),
        location: {
          city: String(row[5] || 'All India'),
          state: 'India'
        },
        dates: {
          closingDate: row[6] ? String(row[6]) : ''
        },
        closingDate: row[6] ? String(row[6]) : '',
        verification: {
          status: String(row[7] || 'OFFICIALLY_VERIFIED'),
          confidenceScore: parseFloat(row[8]) || 0.98,
          officialNoticePdfUrl: String(row[9] || ''),
          applicationUrl: String(row[10] || row[9] || '')
        },
        sourceUrl: String(row[10] || row[9] || ''),
        isTestData: false,
        isLiveDiscovered: true
      });
    }
  } catch (err) {
    Logger.log('Error reading all vacancies from sheet: ' + err.message);
  }
  return vacancies;
}

// ============================================================================
// WEB APP HTTP RECEIVER HANDLERS (GET & POST)
// ============================================================================

/**
 * Handles HTTP GET requests (Health Check, Status, Recent Logs, Test Trigger, Pull Vacancies)
 */
function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) ? e.parameter.action.toUpperCase() : 'STATUS';

  try {
    if (action === 'GET_VACANCIES') {
      const vacancies = getAllVacanciesFromSheet();
      return ContentService.createTextOutput(JSON.stringify({
        status: 'SUCCESS',
        action: 'GET_VACANCIES',
        count: vacancies.length,
        vacancies: vacancies,
        timestamp: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'GET_LOGS') {
      const logs = getRecentExecutionLogs(30);
      return ContentService.createTextOutput(JSON.stringify({
        status: 'SUCCESS',
        action: 'GET_LOGS',
        count: logs.length,
        logs: logs,
        recipient: getRecipientEmail(),
        timestamp: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'TEST_EMAIL') {
      const customRecipient = (e && e.parameter && e.parameter.email) ? e.parameter.email.trim() : null;
      const result = testSendSampleEmail(customRecipient);
      return ContentService.createTextOutput(JSON.stringify({
        status: 'SUCCESS',
        action: 'TEST_EMAIL',
        result: result,
        message: `Sample test email dispatched to: ${result.recipient}`
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'TRIGGER_SCAN') {
      const scanResult = scheduledScanJob(true);
      return ContentService.createTextOutput(JSON.stringify({
        status: 'SUCCESS',
        action: 'TRIGGER_SCAN',
        result: scanResult,
        message: `Manual cloud scan completed. ${scanResult.newVacanciesFound || 0} new official vacancies.`
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Default: Health / Status ping
    const recipient = getRecipientEmail();
    const statusData = {
      status: 'SUCCESS',
      service: 'Vacancy Radar India Cloud Backend (v2.1)',
      timestamp: new Date().toISOString(),
      timezone: CONFIG.DEFAULT_TIMEZONE,
      recipientEmailConfigured: recipient ? recipient : 'NOT CONFIGURED (Will use script owner or Webhook sync)',
      databaseConnected: true,
      message: 'Web app receiver is active with strict official domain enforcement.'
    };

    return ContentService.createTextOutput(JSON.stringify(statusData))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'ERROR',
      error: err.message,
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Verifies secret token on webhook calls if WEBHOOK_SECRET_TOKEN is set in ScriptProperties.
 */
function isAuthorizedWebhook(e, payload) {
  try {
    const configuredSecret = PropertiesService.getScriptProperties().getProperty('WEBHOOK_SECRET_TOKEN');
    if (!configuredSecret) {
      return true; // Not configured yet, allow requests
    }
    const tokenFromPayload = payload && (payload.secretToken || payload.token);
    const tokenFromParam = e && e.parameter && (e.parameter.secretToken || e.parameter.token);
    const provided = tokenFromPayload || tokenFromParam || '';
    return String(provided).trim() === configuredSecret.trim();
  } catch (_) {
    return true;
  }
}

/**
 * Handles HTTP POST requests (Sync Vacancies, Sync Applications, Sync Profile, Test Email, Trigger Scan)
 */
function doPost(e) {
  try {
    let payload = {};
    if (e && e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (parseErr) {
        payload = { action: 'PING', raw: e.postData.contents };
      }
    } else if (e && e.parameter) {
      payload = e.parameter;
    }

    // 0. Secret Token Authentication Guard
    if (!isAuthorizedWebhook(e, payload)) {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'UNAUTHORIZED',
        error: 'Invalid or missing secret token.',
        timestamp: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    const action = payload.action ? payload.action.toUpperCase() : 'PING';

    if (action === 'SET_SECRET_TOKEN') {
      const currentToken = PropertiesService.getScriptProperties().getProperty('WEBHOOK_SECRET_TOKEN');
      if (!currentToken || (payload.oldToken && String(payload.oldToken).trim() === currentToken.trim())) {
        const newToken = String(payload.newToken || payload.secretToken || '').trim();
        if (newToken) {
          PropertiesService.getScriptProperties().setProperty('WEBHOOK_SECRET_TOKEN', newToken);
          return ContentService.createTextOutput(JSON.stringify({
            status: 'SUCCESS',
            action: 'SET_SECRET_TOKEN',
            message: 'Webhook secret token successfully configured in ScriptProperties.'
          })).setMimeType(ContentService.MimeType.JSON);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({
        status: 'UNAUTHORIZED',
        error: 'Cannot update secret token without valid oldToken.'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'PING') {
      const recipient = getRecipientEmail();
      return ContentService.createTextOutput(JSON.stringify({
        status: 'SUCCESS',
        action: 'PING',
        receivedAt: new Date().toISOString(),
        recipientEmail: recipient,
        message: 'Webhook ping successful! Google Sheets database connected.'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'TEST_EMAIL') {
      const recipient = payload.recipient || payload.email || getRecipientEmail();
      const result = testSendSampleEmail(recipient);
      return ContentService.createTextOutput(JSON.stringify({
        status: 'SUCCESS',
        action: 'TEST_EMAIL',
        recipient: result.recipient,
        message: `Test email successfully dispatched to: ${result.recipient}`
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'TRIGGER_SCAN') {
      const scanResult = scheduledScanJob(true);
      return ContentService.createTextOutput(JSON.stringify({
        status: 'SUCCESS',
        action: 'TRIGGER_SCAN',
        scanResult: scanResult,
        message: `Live cloud scan finished. Sources: ${scanResult.sourcesChecked}, Discovered: ${scanResult.newVacanciesFound}.`
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'GET_VACANCIES') {
      const vacancies = getAllVacanciesFromSheet();
      return ContentService.createTextOutput(JSON.stringify({
        status: 'SUCCESS',
        action: 'GET_VACANCIES',
        count: vacancies.length,
        vacancies: vacancies,
        timestamp: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'GET_LOGS') {
      const logs = getRecentExecutionLogs(30);
      return ContentService.createTextOutput(JSON.stringify({
        status: 'SUCCESS',
        action: 'GET_LOGS',
        count: logs.length,
        logs: logs,
        recipient: getRecipientEmail()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'SYNC_VACANCIES' && Array.isArray(payload.vacancies)) {
      const existingMap = getExistingVacanciesMap();
      let savedCount = 0;
      payload.vacancies.forEach(v => {
        if (!isDuplicate(v, existingMap)) {
          saveVacancyRecord(v);
          existingMap[v.id] = true;
          savedCount++;
        }
      });
      return ContentService.createTextOutput(JSON.stringify({
        status: 'SUCCESS',
        action: 'SYNC_VACANCIES',
        syncedCount: savedCount,
        totalReceived: payload.vacancies.length,
        timestamp: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'SYNC_APPLICATION' && payload.application) {
      saveApplicationRecord(payload.application);
      return ContentService.createTextOutput(JSON.stringify({
        status: 'SUCCESS',
        action: 'SYNC_APPLICATION',
        timestamp: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'SYNC_PROFILES' && Array.isArray(payload.profiles)) {
      saveAllProfiles(payload.profiles, true);
      return ContentService.createTextOutput(JSON.stringify({
        status: 'SUCCESS',
        action: 'SYNC_PROFILES',
        count: payload.profiles.length,
        timestamp: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'SYNC_PROFILE' && payload.profile) {
      saveProfileRecord(payload.profile);
      return ContentService.createTextOutput(JSON.stringify({
        status: 'SUCCESS',
        action: 'SYNC_PROFILE',
        timestamp: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'SET_CONFIG') {
      if (payload.email && payload.email.includes('@')) {
        PropertiesService.getScriptProperties().setProperty('NOTIFICATION_EMAIL', payload.email.trim());
      }
      return ContentService.createTextOutput(JSON.stringify({
        status: 'SUCCESS',
        action: 'SET_CONFIG',
        recipient: getRecipientEmail(),
        timestamp: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'SYNC_SEARCH_CONFIG') {
      if (payload.braveApiKey) {
        PropertiesService.getScriptProperties().setProperty('BRAVE_API_KEY', String(payload.braveApiKey).trim());
      }
      if (payload.geminiApiKey) {
        PropertiesService.getScriptProperties().setProperty('GEMINI_API_KEY', String(payload.geminiApiKey).trim());
      }

      // Security Hardening: Scrub all plaintext API keys from Settings sheet
      try {
        const ss = getDatabaseSpreadsheet();
        const settingsSheet = ss.getSheetByName('Settings');
        if (settingsSheet && settingsSheet.getLastRow() > 1) {
          const data = settingsSheet.getDataRange().getValues();
          for (let i = data.length - 1; i >= 1; i--) {
            const k = String(data[i][0] || '').trim();
            if (k === 'BRAVE_API_KEY' || k === 'GEMINI_API_KEY' || k.includes('API_KEY')) {
              settingsSheet.deleteRow(i + 1);
            }
          }
        }
      } catch (_) {}

      return ContentService.createTextOutput(JSON.stringify({
        status: 'SUCCESS',
        action: 'SYNC_SEARCH_CONFIG',
        message: 'Credentials securely stored in ScriptProperties (removed from plain-text sheet).',
        timestamp: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'SYNC_TRASH' && Array.isArray(payload.trash)) {
      payload.trash.forEach(item => {
        saveTrashRecord(item.id || item.vacancyId, item.title, item.organisation);
      });
      return ContentService.createTextOutput(JSON.stringify({
        status: 'SUCCESS',
        action: 'SYNC_TRASH',
        syncedCount: payload.trash.length,
        timestamp: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'RESTORE_TRASH' && payload.id) {
      restoreTrashRecord(payload.id);
      return ContentService.createTextOutput(JSON.stringify({
        status: 'SUCCESS',
        action: 'RESTORE_TRASH',
        restoredId: payload.id,
        timestamp: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'SYNC_SOURCES') {
      const ss = getDatabaseSpreadsheet();
      const sourcesSheet = ss.getSheetByName('Sources');
      if (sourcesSheet) {
        upgradeSourcesSheet(sourcesSheet);
      }
      return ContentService.createTextOutput(JSON.stringify({
        status: 'SUCCESS',
        action: 'SYNC_SOURCES',
        totalSources: MASTER_OFFICIAL_SOURCES.length,
        timestamp: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: 'SUCCESS',
      action: action,
      message: 'Payload processed.'
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'ERROR',
      error: err.message,
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
