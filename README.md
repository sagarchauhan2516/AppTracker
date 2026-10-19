# Vacancy Radar India 📡

**Dynamic Vacancy Discovery, Verification, and Application Tracking Portal for Indian Technical Careers.**

Tailored specifically for an Indian **B.E. Computer Engineering graduate** with experience as a **Digital Forensics Evidence Examiner**, with support for custom search profiles, automated keyword expansion, candidate source classification, strict 5-tier verification, and 24/7 serverless monitoring.

---

## 🌟 Key Architecture & Capabilities

### 1. Visual Search Profile Builder (Zero Code Editing)
- Configure target roles, technical skills, eligible degree branches, minimum aggregate percentage, experience range, age limits, and reservation quotas visually in the browser.
- Supports multiple independent profiles with instant switching and cloning.

### 2. Explainable Dynamic Keyword Expansion Engine
- Automatically expands seed terms into standard abbreviations (*DFIR*), formal designations (*Forensic Scientist - Cyber, Digital Evidence Examiner*), forensic suites (*EnCase, FTK, Autopsy, Cellebrite UFED, Volatility*), and statutory Indian legal terms (*Section 65B Indian Evidence Act, Chain of Custody*).
- Records the explicit rationale and match percentage for every generated term.
- Dynamically constructs production search queries targeted for Central Government apex bodies (`site:gov.in`), PSUs / Autonomous institutes (`site:cdac.in`, `site:nfsu.ac.in`), State Police Cyber Cells / FSLs, and National Career Service (`site:ncs.gov.in`).

### 3. Candidate Source Registry & Domain Classification
- Categorizes domains into:
  - **Official Employer Domains** (`cdac.in`, `drdo.gov.in`, `nfsu.ac.in`)
  - **Recruitment Boards** (`upsc.gov.in`, `ssc.gov.in`, `calicut.nielit.in`)
  - **Authorised Application Portals** (`ncs.gov.in`, `cdn.digialm.com`)
  - **Third-Party Aggregators**
- **Strict Anti-Aggregator Integrity Rule**: A third-party site *never* becomes an official source merely because it links to a government employer.
- Health monitor tracks latency, consecutive failures, and enables one-click revalidation.

### 4. Strict 5-Tier Verification Badge Engine
- **`OFFICIALLY_VERIFIED`**: Original advertisement retrieved directly from official domain, official notification PDF corroborated, and application link validated.
- **`CROSS_CHECKED`**: Aggregator lead matched and confirmed against an official employer notice, flagging any unverified fields.
- **`UNVERIFIED_LEAD`**: Promising listing lacking official notification corroboration.
- **`VERIFICATION_FAILED`**: Inaccessible source, broken link, or contradictory terms.
- **`EXPIRED_CLOSED`**: Confirmed closed deadline or expired application window.
- **Field-Level Evidence Confidence**: Independent confidence scores (0% to 100%) for Employer Domain, Advertisement Reference & Title, Closing Timeline, Direct Links, and Stated Eligibility Terms.
- **Confirmed Facts vs Uncertainties**: Every vacancy audit separates proven facts from open caveats.

### 5. Transparent Multi-Dimensional Match Scoring
- Evaluates role alignment, degree branch (B.E./B.Tech Computer Engineering/CSE/IT), aggregate marks, forensic skills, experience, and location.
- Standardized labels: `Likely Eligible`, `Potential Match (Verify Terms)`, `Appears Ineligible`, and `Insufficient Info`.
- Explains *why* the candidate matches rather than providing only a raw number.

### 6. Interactive Command Dashboard & Application Tracker
- Direct one-click **`📄 PDF Notice`** and **`🌐 Apply`** links on cards.
- Cross-source duplicate detection and suppression.
- Multi-stage application tracking (`SAVED`, `APPLIED`, `UNDER_REVIEW`, `INTERVIEW_SCHEDULED`, `ARCHIVED`) with notes and registration IDs.
- Execution history and failure diagnostics tab.

### 7. Free-First 24/7 Cloud Automation (Google Apps Script)
- Scheduled checks at approximately **08:00, 14:00, and 20:00 Asia/Kolkata (IST)** running in Google's cloud even when your personal computer is off.
- Free personal database in Google Sheets (`Vacancy_Radar_India_DB`).
- Automated Gmail HTML alert digests for verified opportunities and $\le 7$-day deadlines.
- Strict ₹0.00 spending safety guard.

---

## 🚀 Quick Start

### 1. Launch the Portal Locally
```bash
# Start the zero-dependency local static server
npm start
# or: node server.js
```
Open `http://localhost:3000` (or `http://localhost:3001` if port 3000 is occupied).

### 2. Run the Automated Test Suite
```bash
node tests/engine.test.js
```
Expected output: `6 / 6 PASSED (100% SUCCESS)`.

### 3. Deploy 24/7 Cloud Automation
Refer to [`DEPLOYMENT.md`](DEPLOYMENT.md) for step-by-step setup instructions for Google Apps Script + Google Sheets + Gmail notifications.

---

## 📁 Repository Structure

```
AppTracker/
├── index.html                     # Responsive web portal entry point
├── server.js                      # Zero-dependency local development server with dynamic port fallback
├── package.json                   # Project configuration
├── .env.example                   # Environment configuration template
├── DEPLOYMENT.md                  # Complete deployment & 24/7 automation guide
├── README.md                      # Project documentation
├── css/
│   └── style.css                  # Modern dark glassmorphic design system & verification badges
├── js/
│   ├── app.js                     # Main application controller & dashboard interactions
│   ├── models/
│   │   └── types.js               # Domain schemas, verification statuses, and categories
│   ├── data/
│   │   ├── defaultProfile.js      # Seed profile for B.E. Comp Eng + DFIR graduate
│   │   ├── initialSources.js      # Initial candidate source registry seed
│   │   └── testVacancies.js       # Fixture dataset labeled [TEST DATA] for all 5 statuses
│   ├── engine/
│   │   ├── keywordExpansion.js    # Explainable keyword expansion & query generator
│   │   ├── verificationEngine.js  # Strict 5-tier evidence audit engine
│   │   ├── matchingEngine.js      # Multi-dimensional candidate eligibility scoring
│   │   └── duplicateDetector.js   # Cross-source duplicate detection & suppression
│   ├── providers/
│   │   ├── searchProviderInterface.js # Modular provider base interface
│   │   ├── publicFeedsProvider.js     # Free public RSS/Atom career feed scanner
│   │   └── customSearchApiProvider.js # Guarded Search API provider with spending cap
│   ├── services/
│   │   ├── storageService.js      # Persistence manager with browser + Node.js fallback
│   │   └── sourceRegistryService.js # Domain classifier & health revalidator
│   └── ui/
│       └── profileBuilder.js      # Visual Search Profile Builder UI component
├── google-apps-script/
│   ├── Code.gs                    # 24/7 Serverless scheduler (08:00, 14:00, 20:00 IST) & Gmail alerts
│   └── appsscript.json            # Manifest with Asia/Kolkata timezone & free OAuth scopes
└── tests/
    └── engine.test.js             # Automated unit & integration test suite
```
