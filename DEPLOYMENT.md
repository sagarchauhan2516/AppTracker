# Deployment & 24/7 Automation Guide — Vacancy Radar India

This guide explains how to deploy **Vacancy Radar India** using a **100% Free-First Architecture**:

```
[ Frontend: HTML/CSS/ES Modules ] ---> Free Static Hosting (GitHub Pages / Local / Netlify)
                |
                v
[ Backend: Google Apps Script ]   ---> 24/7 Serverless Cloud Trigger (08:00, 14:00, 20:00 IST)
                |
       +--------+--------+
       |                 |
       v                 v
[ Google Sheets ]   [ Gmail API ]
Personal Database    HTML Digest Alerts
```

---

## 1. Local Quick Start (Zero Build Step)

Vacancy Radar India is built with standard HTML5, CSS3, and ES6 JavaScript Modules. No Webpack, Vite, or Babel compilation steps are required.

```bash
# Clone or navigate to the project directory
cd AppTracker

# Start the zero-dependency local static server
npm start
# or: node server.js
```

Open your browser at:
```
http://localhost:3000   (or http://localhost:3001 if port 3000 is occupied)
```

---

## 2. Free Cloud Frontend Hosting (GitHub Pages)

You can host the portal interface permanently online for free:

1. Push your repository to GitHub.
2. In your GitHub repository, open **Settings** $\rightarrow$ **Pages**.
3. Under **Branch**, select `main` and folder `/ (root)`. Click **Save**.
4. Within 1 minute, your portal will be live at `https://<your-username>.github.io/<repo-name>/`.

---

## 3. 24/7 Cloud Automation via Google Apps Script (Free Tier)

To ensure the monitoring scheduler executes at **08:00, 14:00, and 20:00 Asia/Kolkata (IST)** across **all 39+ official portals + live government web index**:

### Step 3.1: Update Google Apps Script Project
1. Visit [script.google.com](https://script.google.com) and open your `Vacancy Radar India Backend` project.
2. In Project Settings (gear icon), ensure **"Show 'appsscript.json' manifest file in editor"** is checked.
3. Replace `appsscript.json` with the updated contents of [`google-apps-script/appsscript.json`](google-apps-script/appsscript.json) (includes `spreadsheets`, `gmail.send`, `drive`, and `userinfo.email` scopes).
4. Replace `Code.gs` with the updated contents of [`google-apps-script/Code.gs`](google-apps-script/Code.gs).
5. Click **Save** (disk icon or `Ctrl + S`).

### Step 3.2: Initialize the Database & Auto-Upgrade Sources
1. Select the function `setupDatabase` in the toolbar and click **Run**.
2. When prompted, click **Review Permissions** $\rightarrow$ select your Google account $\rightarrow$ click **Advanced** $\rightarrow$ **Go to Vacancy Radar India Backend (unsafe)** $\rightarrow$ **Allow**.
3. Google Apps Script will automatically create or update your `Vacancy_Radar_India_DB` spreadsheet:
   - **Auto-Upgrade to 39 Sources**: If your sheet previously only had 6–8 sources, `setupDatabase` automatically adds all 39 verified official portals (C-DAC, NIELIT, NFSU, DRDO RAC, ISRO, BARC, NIC, CERT-In, STPI, ERNET, DIC, SSC, IBPS, RBI, SEBI, BEL, ECIL, RailTel, PowerGrid, ONGC, BHEL, HAL, NTPC, CFSL/DFSS, Cybercrime MHA, NCS) without overwriting your existing data.
   - **Trash Table**: Automatically initializes the `Trash` tab to store deleted vacancies and permanently prevent their re-discovery or re-alerting.

### Step 3.3: Verify Gmail Delivery Immediately
1. In the toolbar, select `testSendSampleEmail` and click **Run**.
2. Check your Gmail inbox (or Spam folder). You will immediately receive a sample digest email with the header badge:
   `Sources Checked: 39 Official Portals + Live Gov Index`.
3. Notice that when no brand-new post emerged in that exact scan window, the email automatically includes **Active Official Opportunities Currently Open** with direct official links/PDFs.

### Step 3.4: Activate 08:00, 14:00, and 20:00 IST Triggers
1. In the toolbar, select `setupTriggers` and click **Run**.
2. Three independent time-driven triggers are now activated under your account for **08:00, 14:00, and 20:00 Asia/Kolkata (IST)**.
3. Every scheduled run logs its timestamp, source count (39+), discovered vacancies, and status into the `ExecutionLogs` sheet.

### Step 3.5: Deploy as Web App (For Live Portal Sync)
1. In Apps Script, click **Deploy** $\rightarrow$ **Manage deployments** $\rightarrow$ edit pencil icon $\rightarrow$ select **New version** $\rightarrow$ click **Deploy**.
   *(Or click **New deployment** if deploying for the first time with type **Web app**, Execute as: **Me**, Who has access: **Anyone**).*
2. Copy the **Web app URL** (`https://script.google.com/macros/s/AKfycb.../exec`).
3. In your Web Portal, open the **Unified Dashboard** $\rightarrow$ paste the Web App URL $\rightarrow$ click **Sync All to Sheets Now**.
   - This automatically syncs all 39 sources, your active profile, multiple alert emails, Brave API Key, and trashed vacancies directly to Google Apps Script.

---

---

## 4. 24/7 Cloud Automation via GitHub Actions (Zero-Cost Headless Runner)

While Google Apps Script runs within Google's cloud, it enforces a **strict 6-minute maximum execution timeout**, which can limit deep multi-portal crawling and PDF parsing. 

To overcome this, **Vacancy Radar India** includes a dedicated, cloud-native **GitHub Actions Scheduled Runner** (`.github/workflows/daily-scraper.yml`):

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ⏰ Scheduled GitHub Action (Bi-Daily: 09:30 IST & 17:30 IST + Manual Dispatch│
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. Boots clean Ubuntu Node.js 20 environment                                │
│ 2. Executes `node scripts/run-scraper-cli.js`                               │
│ 3. Sends conditional HTTP requests (ETag / If-Modified-Since) to 39+ portals│
│ 4. Diffs HTML content with `data/portal-snapshots.json`                     │
│ 5. Downloads and parses new circular PDFs with regex & Gemini free AI       │
│ 6. Evaluates candidate eligibility & Central Govt DoPT age relaxations      │
│ 7. Authenticates & pushes verified vacancies to Google Sheets via Webhook    │
│ 8. Broadcasts formatted Morning & Evening Digest to all Telegram chats     │
│ 9. Commits updated portal snapshots & PDF hashes back to Git                │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Free Quota Comparison:
* **GitHub Actions Free Allowance:** **2,000 minutes/month** (for standard public/private repos).
* **Application Consumption:** 2 scheduled runs/day × ~3 minutes/run = **~180 minutes/month** (<10% of free limit).
* **Cost:** **₹0.00 Guaranteed Forever**.

### How to Activate GitHub Actions in Your Repo:
1. **Push the project to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "feat: initial commit of Vacancy Radar India"
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git push -u origin main
   ```
2. **Add GitHub Repository Secrets:**
   In your GitHub repository, navigate to **Settings** $\rightarrow$ **Secrets and variables** $\rightarrow$ **Actions** $\rightarrow$ click **New repository secret** and add:
   - `GOOGLE_WEBHOOK_URL`: Your deployed Apps Script Web App URL (`https://script.google.com/macros/s/.../exec`).
   - `WEBHOOK_SECRET_TOKEN`: Your secret token configured in Apps Script (prevents unauthorized pushes).
   - `TELEGRAM_BOT_TOKEN`: Your Bot Token from `@BotFather` (e.g., `8846559143:AAEqSPXMqF6ZY-pUM4NpgT9zT8KmMlf-adg`).
   - `TELEGRAM_CHAT_ID`: Your comma-separated Chat IDs (e.g. `987654321, 123456789, @my_channel`).
   - `CDAC_CAREERS_KEY`: *(Optional)* CDAC portal token / key if configured.
   - `GEMINI_API_KEY`: *(Optional)* Your Google AI Studio API key (`AIzaSy...`) for deep PDF parsing.
3. **Continuous Integration (CI):**
   - The `.github/workflows/ci.yml` pipeline runs on every push and pull request to execute `npm test` automatically.
4. **Trigger Manual Test Run:**
   - Go to the **Actions** tab in your GitHub repository.
   - Click on **"Daily Vacancy Discovery & Sync"** on the left menu.
   - Click **Run workflow** $\rightarrow$ **Run workflow**.
   - Within 2 minutes, you will receive a Telegram Digest ping on your phone and new rows will appear in Google Sheets!

---

## 5. Quotas & Spending Protections

| Service | Free Quota | Application Usage | Cost |
| :--- | :--- | :--- | :--- |
| **GitHub Actions** | 2,000 min/month | ~180 min/month (2 runs/day) | **₹0.00 / Free** |
| **Telegram Bot API** | Unlimited | Instant push & bi-daily digest | **₹0.00 / Free** |
| **Google Apps Script** | 90 min/day runtime | ~2 min/day (2 syncs) | **₹0.00 / Free** |
| **Gmail Alerts** | 100 emails/day | 1–3 digests/day | **₹0.00 / Free** |
| **Google Sheets** | 15 GB Drive storage | < 5 MB tabular data | **₹0.00 / Free** |
| **Google Gemini AI** | 1,500 requests/day | ~5–15 requests/day | **₹0.00 / Free** |
| **SearXNG Metasearch** | Unlimited free mirrors | Priority 2 search fallback | **₹0.00 / Free** |
| **Brave Search API** | 2,000 queries/month free | Priority 3 live web search | **₹0.00 / Free** |

> [!IMPORTANT]
> The system operates under a **Strict Free-First Policy**. All 39 portals, SearXNG, and Telegram run completely free without any credit card or paid keys. Brave Search and Gemini add live web indexing and AI reasoning with generous free daily limits.

---

## 6. Verification Suite

Run the full automated test suite locally to verify all acceptance suites:

```bash
npm test
```
Expected output: `28 / 28 test suites PASSED (100% SUCCESS)`.

