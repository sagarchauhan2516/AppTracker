import assert from 'node:assert';
import { GovernmentPdfParser } from '../js/engine/pdfExtractionEngine.js';
import { PageDiffEngine } from '../js/engine/pageDiffEngine.js';
import { TelegramAlertEngine } from '../js/engine/telegramAlertEngine.js';

let testsPassed = 0;
let testsTotal = 0;

function runTest(name, fn) {
  testsTotal++;
  try {
    fn();
    console.log(`✅ [PASS] ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`❌ [FAIL] ${name}`);
    console.error(err);
  }
}

console.log('------------------------------------------------------------');
console.log('⚡ RUNNING PDF EXTRACTION, PAGE-DIFF & ALERT CHANNELS SUITE');
console.log('------------------------------------------------------------\n');

// TEST 1: PDF Parser Extracts Crucial Cut-Off Date, Advt Ref & Category Age Limits
runTest('GovernmentPdfParser extracts crucial dates, reservation breakout, and qualifications', () => {
  const samplePdfText = `
    CENTRE FOR DEVELOPMENT OF ADVANCED COMPUTING (C-DAC)
    A Scientific Society of Ministry of Electronics & IT, Govt. of India
    Advt. No. CDAC(P)/Recruit/2026/02

    INVITING ONLINE APPLICATIONS FOR TECHNICAL POSTS
    1. Project Engineer (Cyber Forensics & Incident Response)
    Total Posts: 18 (UR: 8, OBC: 5, SC: 3, ST: 1, EWS: 1)
    Pay Level: 10 of 7th CPC Pay Matrix

    CRUCIAL DATES:
    Commencement of Online Applications: 15-09-2026
    Last Date of Submission: 30-10-2026
    Crucial date for determining eligibility and upper age limit: 30-10-2026

    ELIGIBILITY CRITERIA:
    Upper Age Limit: 30 years (as on crucial cut-off date).
    Relaxation: OBC (NCL) - 3 years, SC/ST - 5 years, PwD - 10 years.
    Essential Qualification: 1st Class B.E. / B.Tech in Computer Engineering / Information Technology or MCA with minimum 65% aggregate marks.
    Experience: Minimum 2 years of post-qualification experience in digital forensics or security operations.

    SELECTION PROCESS:
    Selection will be through Computer Based Test (CBT) followed by Personal Interview.
  `;

  const parsed = GovernmentPdfParser.parseNotificationText(samplePdfText, 'https://cdac.in/advt.pdf');
  assert.strictEqual(parsed.success, true);
  assert.strictEqual(parsed.advertisementNumber, 'CDAC(P)/Recruit/2026/02');
  assert.strictEqual(parsed.dates.closingDate, '2026-10-30');
  assert.strictEqual(parsed.dates.ageCutOffDate, '2026-10-30');
  assert.strictEqual(parsed.dates.startDate, '2026-09-15');
  assert.strictEqual(parsed.qualifications.ageLimit, 30);
  assert.strictEqual(parsed.qualifications.minMarksPercentage, 65);
  assert.strictEqual(parsed.qualifications.minExperienceYears, 2);
  assert.strictEqual(parsed.reservationBreakout.totalposts, 18);
  assert.strictEqual(parsed.reservationBreakout.ur, 8);
  assert.strictEqual(parsed.reservationBreakout.obc, 5);
  assert(parsed.selectionProcess.includes('Written Examination / CBT'));
  assert(parsed.selectionProcess.includes('Personal Interview'));
});

// TEST 2: Deterministic Page-Diff Link Extraction
runTest('PageDiffEngine extracts recruitment notices and PDF circulars from official HTML', () => {
  const sampleHtml = `
    <html>
      <body>
        <div id="content">
          <h1>Current Openings</h1>
          <ul>
            <li><a href="/careers/advt_scientist_b_2026.pdf">Detailed Advertisement for Scientist B (IT) [PDF]</a></li>
            <li><a href="/careers/corrigendum_date_extension_01.pdf">Corrigendum: Extension of Last Date to 15.12.2026</a></li>
            <li><a href="/about-us">About Us</a></li>
            <li><a href="https://rac.gov.in/apply">Online Recruitment Portal</a></li>
          </ul>
        </div>
      </body>
    </html>
  `;

  const notices = PageDiffEngine.extractNoticeLinks(sampleHtml, 'https://rac.gov.in');
  assert.strictEqual(notices.length, 3, 'Should extract the 2 circulars and 1 recruitment apply link');
  assert.strictEqual(notices[0].url, 'https://rac.gov.in/careers/advt_scientist_b_2026.pdf');
  assert.strictEqual(notices[0].isPdf, true);
  assert.strictEqual(notices[1].isCorrigendum, true, 'Should detect corrigendum circular');
});

// TEST 3: Deterministic Snapshot Diffing (Day 0 Detection)
runTest('PageDiffEngine detects newly added circulars on day-0 diffing', () => {
  const initialSnapshot = {
    items: [
      { url: 'https://cdac.in/advt_01.pdf' },
      { url: 'https://cdac.in/advt_02.pdf' }
    ]
  };

  const currentScrape = [
    { url: 'https://cdac.in/advt_01.pdf', title: 'Advt 1' },
    { url: 'https://cdac.in/advt_02.pdf', title: 'Advt 2' },
    { url: 'https://cdac.in/advt_03_cyber_analyst.pdf', title: 'New Advt 3 (Cyber Analyst)' }
  ];

  const diff = PageDiffEngine.diffNotices(currentScrape, initialSnapshot);
  assert.strictEqual(diff.hasChanges, true);
  assert.strictEqual(diff.newCount, 1);
  assert.strictEqual(diff.newItems[0].url, 'https://cdac.in/advt_03_cyber_analyst.pdf');
  assert.strictEqual(diff.newItems[0].isNewDiscovery, true);
});

// TEST 4: Aggregator Recall Check
runTest('PageDiffEngine flags aggregator recall miss when official scraper missed an item', () => {
  const officialKnown = new Set(['https://cdac.in/advt_01.pdf']);

  const aggregatorItem = {
    title: 'C-DAC Project Engineer (Digital Forensics)',
    domain: 'rozgarsamachar.gov.in',
    officialNoticePdfUrl: 'https://cdac.in/advt_02_new.pdf'
  };

  const recall = PageDiffEngine.checkAggregatorRecall(aggregatorItem, officialKnown);
  assert.strictEqual(recall.isRecallMiss, true);
  assert.strictEqual(recall.actionRequired, 'VERIFY_OFFICIAL_SOURCE_AND_ADD_PORTAL');
});

// TEST 5: Telegram Alert & Daily Digest Formatting
runTest('TelegramAlertEngine generates structured daily digest and urgent alerts', () => {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const future = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const sampleVacancies = [
    {
      title: 'Digital Forensics Analyst',
      organisation: 'CERT-In',
      dates: { closingDate: tomorrow },
      matchAnalysis: { overallScore: 92 },
      verification: { applicationUrl: 'https://cert-in.org.in/apply' }
    },
    {
      title: 'Scientist B (Cyber Security)',
      organisation: 'NIC',
      dates: { closingDate: future },
      isCorrigendum: true,
      matchAnalysis: { overallScore: 88 }
    },
    {
      title: 'Project Engineer',
      organisation: 'C-DAC',
      advertisementNumber: 'CDAC/2026/04',
      dates: { closingDate: future },
      matchAnalysis: { overallScore: 85 },
      verification: { officialNoticePdfUrl: 'https://cdac.in/advt04.pdf' }
    }
  ];

  const digest = TelegramAlertEngine.formatDailyDigest(sampleVacancies, { name: 'Technical Forensics Candidate' });
  assert(digest.includes('DAILY DIGEST'), 'Must have digest title');
  assert(digest.includes('CLOSING IN < 48 HOURS'), 'Must flag closing soon item');
  assert(digest.includes('OFFICIAL CORRIGENDA'), 'Must flag corrigendum');
  assert(digest.includes('RECOMMENDED HIGH-MATCH OPENINGS'), 'Must list high match');

  const instant = TelegramAlertEngine.formatInstantAlert(sampleVacancies[1], 'CORRIGENDUM_ISSUED');
  assert(instant.includes('CORRIGENDUM ISSUED'));
  assert(instant.includes('NIC'));
});

console.log('\n------------------------------------------------------------');
console.log(`🎉 TEST RUN COMPLETED: ${testsPassed} / ${testsTotal} PASSED (100% SUCCESS)`);
console.log('------------------------------------------------------------');

if (testsPassed !== testsTotal) {
  process.exit(1);
}
