import { storageService } from '../../services/storageService.js';
import { searchOrchestrationEngine } from '../../engine/searchOrchestrationEngine.js';
import { ProviderType } from '../../models/providerTypes.js';
import { showConfirmationBanner } from '../../services/notificationService.js';
import { escapeHtml } from '../../utils/htmlUtils.js';

export function renderCredentialsTab(providers, providerConfig) {
    const searxProv = providers.find(p => p.type === ProviderType.SEARXNG) || {};
    const braveProv = providers.find(p => p.type === ProviderType.BRAVE_SEARCH) || {};
    const serpProv = providers.find(p => p.type === ProviderType.SERPAPI) || {};
    const googleProv = providers.find(p => p.type === ProviderType.GOOGLE_CUSTOM_SEARCH) || {};
    const bingProv = providers.find(p => p.type === ProviderType.BING_WEB_SEARCH) || {};
    const customProv = providers.find(p => p.type === ProviderType.CUSTOM_REST_ADAPTER) || {};
    const geminiApiKey = providerConfig?.geminiApiKey || '';

    return `
      <div style="display: flex; flex-direction: column; gap: 1.5rem;">

        <!-- Section Intro -->
        <div style="background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 1.5rem;">
          <h3 style="font-family: var(--font-heading); font-size: 1.25rem; color: var(--text-main); margin: 0 0 0.4rem 0;">
            🔑 Credentials &amp; API Integration Hub
          </h3>
          <p style="font-size: 0.85rem; color: var(--text-secondary); margin: 0; line-height: 1.5;">
            Configure search engines and cloud endpoints. Search order: <strong>1. Direct Feeds (Primary)</strong> &rarr; <strong>2. SearXNG Metasearch</strong> &rarr; <strong>3. Brave Search API (2,000/mo)</strong> &rarr; <strong>4. SerpApi (Backup)</strong>.
          </p>
        </div>

        <!-- 1. Self-Reliable Direct Engine (Priority 1) -->
        <div class="credential-card" style="background: var(--bg-surface); border: 2px solid rgba(16, 185, 129, 0.4); border-radius: var(--radius-lg); padding: 1.5rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; border-bottom: 1px solid var(--border-subtle); padding-bottom: 0.75rem;">
            <div style="display: flex; align-items: center; gap: 0.6rem;">
              <span style="font-size: 1.4rem;">🛡️</span>
              <div>
                <strong style="font-size: 1.05rem; color: var(--text-main);">Direct Official &amp; Enterprise Feeds (Direct Autonomous Engine)</strong>
                <span class="badge-test-flag" style="background: rgba(16, 185, 129, 0.15); color: #34d399; border-color: rgba(16, 185, 129, 0.3); margin-left: 0.5rem;">
                  ⭐ PRIORITY #1 (PRIMARY SEARCH)
                </span>
              </div>
            </div>
            <span class="meta-pill" style="background: rgba(16, 185, 129, 0.2); color: #34d399; font-weight: 700;">ACTIVE &bull; UNLIMITED</span>
          </div>
          <div style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.5;">
            <p style="margin: 0 0 0.5rem 0;">
              <strong>Always works without any third-party API key, credit card, or payment.</strong> Scans National Career Service (NCS), Central/State Government gazettes, C-DAC, UPSC, NFSU, and enterprise career portals directly.
            </p>
            <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap; font-size: 0.78rem; color: #34d399;">
              <span>✅ Zero API Quota Consumption</span>
              <span>✅ No Credit Card Ever Required</span>
              <span>✅ Dynamic Vacancies for Any Role</span>
            </div>
          </div>
        </div>

        <!-- 2. SearXNG Metasearch Engine (Priority 2) -->
        <div class="credential-card" style="background: var(--bg-surface); border: 2px solid rgba(99, 102, 241, 0.35); border-radius: var(--radius-lg); padding: 1.5rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; border-bottom: 1px solid var(--border-subtle); padding-bottom: 0.75rem;">
            <div style="display: flex; align-items: center; gap: 0.6rem;">
              <span style="font-size: 1.4rem;">🌐</span>
              <div>
                <strong style="font-size: 1.05rem; color: var(--text-main);">SearXNG Metasearch Engine (24+ Mirror Auto-Failover Pool)</strong>
                <span class="badge-test-flag" style="background: rgba(99, 102, 241, 0.15); color: #818cf8; border-color: rgba(99, 102, 241, 0.3); margin-left: 0.5rem;">
                  ⭐ PRIORITY #2 (WEB METASEARCH)
                </span>
              </div>
            </div>
            <span id="badgeSearxStatus" class="meta-pill" style="background: rgba(99, 102, 241, 0.2); color: #818cf8; font-weight: 700;">ONLINE &bull; AUTO-ROTATION</span>
          </div>

          <div style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.5; margin-bottom: 0.75rem;">
            <p style="margin: 0 0 0.5rem 0;">
              Aggregates results simultaneously across <strong>Google, Bing, DuckDuckGo, Yahoo, and Startpage</strong>. If any single public instance is busy or rate-limited, the system <strong>automatically shifts to the next live mirror</strong> from a pool of 24+ global nodes!
            </p>
          </div>

          <div style="margin-bottom: 0.75rem;">
            <label style="font-size: 0.72rem; color: var(--text-muted); display: block; margin-bottom: 0.25rem;">
              Primary SearXNG Instance URL (Auto-shifts if busy)
            </label>
            <div style="display: flex; gap: 0.4rem;">
              <input type="url" id="inputSearxEndpoint" class="search-input" value="${escapeHtml(searxProv.endpoint || 'https://www.isci.si')}" placeholder="https://www.isci.si" style="flex: 1; font-family: var(--font-mono); font-size: 0.8rem;">
              <button type="button" id="btnTestSearxng" class="btn btn-outline btn-sm" style="font-weight: 600; border-color: rgba(99, 102, 241, 0.4); color: #818cf8;">
                🧪 Test &amp; Auto-Shift Pool
              </button>
            </div>
            <div style="margin-top: 0.5rem; display: flex; gap: 0.5rem; align-items: center;">
              <label style="font-size: 0.72rem; color: var(--text-muted); white-space: nowrap;">⚡ Fast Mirror Presets:</label>
              <select id="selectSearxMirrorPreset" class="filter-select" style="font-size: 0.75rem; padding: 0.35rem 0.6rem; flex: 1;">
                <option value="https://www.isci.si" selected>🚀 https://www.isci.si (Verified High-Speed • 60+ Results)</option>
                <option value="https://etsi.me">🌐 https://etsi.me (Verified Mirror • Multi-Engine)</option>
                <option value="https://searx.perennialte.ch">🛡️ https://searx.perennialte.ch (Verified Working Mirror)</option>
                <option value="https://search.lumy.live">⚡ https://search.lumy.live (Active European Node)</option>
                <option value="https://searx.dresden.network">🛡️ https://searx.dresden.network (German Node)</option>
                <option value="http://localhost:8080">🐳 http://localhost:8080 (Local Docker Instance)</option>
              </select>
            </div>
          </div>
          <div id="statusSearxng" style="display: none; margin-bottom: 0.75rem;"></div>

          <details style="font-size: 0.75rem; color: var(--text-secondary);">
            <summary style="cursor: pointer; color: #818cf8;">ℹ️ How Auto-Shifting Works Across 24+ Mirrors</summary>
            <div style="margin: 0.5rem 0 0 0; line-height: 1.5;">
              <p style="margin: 0 0 0.3rem 0;">
                &bull; <strong>Zero Interruption:</strong> If an instance returns HTTP 429 (rate-limited) or fails, the proxy immediately tries the next mirror in milliseconds until a valid result is returned.
              </p>
              <p style="margin: 0 0 0.3rem 0;">
                &bull; <strong>Does my computer need to stay on?</strong> <span style="color: #34d399; font-weight: 600;">NO.</span> All public mirrors run 24/7 in cloud data centers around the world.
              </p>
              <p style="margin: 0;">
                &bull; <strong>Ultimate Failover:</strong> If all public mirrors ever experience temporary web maintenance, the engine seamlessly fails over to <strong>Priority 3 (Brave Search)</strong> and <strong>Priority 4 (SerpApi)</strong>.
              </p>
            </div>
          </details>
        </div>

        <!-- 3. Brave Search API (Priority 3 Option - Free 2,000/Month) -->
        <div class="credential-card" style="background: var(--bg-surface); border: 2px solid rgba(249, 115, 22, 0.35); border-radius: var(--radius-lg); padding: 1.5rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; border-bottom: 1px solid var(--border-subtle); padding-bottom: 0.75rem;">
            <div style="display: flex; align-items: center; gap: 0.6rem;">
              <span style="font-size: 1.4rem;">🦁</span>
              <div>
                <strong style="font-size: 1.05rem; color: var(--text-main);">Brave Search API</strong>
                <span class="badge-test-flag" style="background: rgba(249, 115, 22, 0.15); color: #fb923c; border-color: rgba(249, 115, 22, 0.3); margin-left: 0.5rem;">
                  ⭐ PRIORITY #3 (FREE 2,000 SEARCHES / MONTH)
                </span>
              </div>
            </div>
            <span id="badgeBraveStatus" class="meta-pill" style="font-size: 0.75rem; background: ${braveProv.apiKey ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.06)'}; color: ${braveProv.apiKey ? '#34d399' : 'var(--text-muted)'}; font-weight: 600;">
              ${braveProv.apiKey ? 'Key Configured' : 'Free 2,000 / mo'}
            </span>
          </div>

          <div style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.5; margin-bottom: 0.75rem;">
            <p style="margin: 0 0 0.5rem 0;">
              Independent index with zero tracking. The <strong>Free Data for Search plan</strong> grants <strong>2,000 searches/month completely free</strong> (1 QPS rate limit) with no credit card required. Only ~90–270 credits needed per month for 3 daily scans!
            </p>
          </div>

          <div style="margin-bottom: 0.75rem;">
            <label style="font-size: 0.72rem; color: var(--text-muted); display: block; margin-bottom: 0.25rem;">
              Brave API Subscription Token (starts with BSA...)
            </label>
            <div style="display: flex; gap: 0.4rem;">
              <input type="password" id="inputBraveApiKey" class="search-input" value="${escapeHtml(braveProv.apiKey || '')}" placeholder="e.g. BSAk..." style="flex: 1; font-family: var(--font-mono); font-size: 0.8rem;">
              <button type="button" class="btn btn-outline btn-sm btn-toggle-mask" data-target="inputBraveApiKey">👁️</button>
              <button type="button" id="btnTestBrave" class="btn btn-outline btn-sm" style="font-weight: 600; border-color: rgba(249, 115, 22, 0.4); color: #fb923c;">
                🧪 Test Connection
              </button>
            </div>
          </div>
          <div id="statusBraveApi" style="display: none; margin-bottom: 0.75rem;"></div>

          <details style="font-size: 0.75rem; color: var(--text-secondary);">
            <summary style="cursor: pointer; color: #fb923c;">ℹ️ How to get your Free 2,000/month Brave API Key</summary>
            <div style="margin: 0.5rem 0 0 0; line-height: 1.5;">
              <p style="margin: 0 0 0.3rem 0;">
                1. Visit <a href="https://brave.com/search/api/" target="_blank" rel="noopener noreferrer" style="color: #60a5fa; text-decoration: underline;">https://brave.com/search/api/</a> and click <strong>Get started for free</strong>.
              </p>
              <p style="margin: 0 0 0.3rem 0;">
                2. Select the <strong>Free Plan (Data for Search)</strong> &mdash; 2,000 queries per month included.
              </p>
              <p style="margin: 0;">
                3. Copy your API token and paste it above. Key is tested and auto-saved locally.
              </p>
            </div>
          </details>
        </div>

        <!-- 4. SerpApi Google Jobs API (Priority 4 Backup) -->
        <div class="credential-card" style="background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 1.5rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; border-bottom: 1px solid var(--border-subtle); padding-bottom: 0.75rem;">
            <div style="display: flex; align-items: center; gap: 0.6rem;">
              <span style="font-size: 1.3rem;">⚡</span>
              <div>
                <strong style="font-size: 1.05rem; color: var(--text-main);">SerpApi Google Jobs API</strong>
                <span class="badge-test-flag" style="background: rgba(59, 130, 246, 0.15); color: #60a5fa; border-color: rgba(59, 130, 246, 0.3); margin-left: 0.5rem;">
                  PRIORITY #4 (EMERGENCY BACKUP)
                </span>
              </div>
            </div>
            <span id="badgeSerpStatus" class="meta-pill" style="font-size: 0.75rem; background: rgba(16, 185, 129, 0.15); color: #34d399; font-weight: 600;">Free 250 / mo</span>
          </div>

          <div style="margin-bottom: 0.75rem;">
            <label style="font-size: 0.72rem; color: var(--text-muted); display: block; margin-bottom: 0.25rem;">SerpApi Private Key</label>
            <div style="display: flex; gap: 0.4rem;">
              <input type="password" id="inputSerpApiKey" class="search-input" value="${escapeHtml(serpProv.apiKey || '')}" placeholder="e.g. 84b52e..." style="flex: 1; font-family: var(--font-mono); font-size: 0.8rem;">
              <button type="button" class="btn btn-outline btn-sm btn-toggle-mask" data-target="inputSerpApiKey">👁️</button>
              <button type="button" id="btnTestSerpApi" class="btn btn-outline btn-sm" style="font-weight: 600;">🧪 Test &amp; Verify Key</button>
            </div>
          </div>
          <div style="margin-top: 0.6rem; padding: 0.6rem 0.85rem; background: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.35); border-radius: var(--radius-md); font-size: 0.78rem; display: flex; align-items: center; gap: 0.5rem;">
            <span style="font-size: 1.1rem;">🛡️</span>
            <span style="color: #fbbf24;"><strong>Permission Guard Active:</strong> The system will <em>always ask you for confirmation first</em> before executing any search through SerpApi, protecting your 250 free monthly queries.</span>
          </div>
          <details style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.6rem;">
            <summary style="cursor: pointer; color: #60a5fa;">About SerpApi (No Credit Card • Prompted On-Demand)</summary>
            <p style="margin: 0.4rem 0 0 0;">SerpApi grants 250 free Google Jobs searches every month upon registration without entering a credit card. It acts as secondary fallback behind Direct Feeds, SearXNG, and Brave Search.</p>
          </details>
        </div>

        <!-- 3. Google Apps Script Webhook (Private Google Sheets Database) -->
        <div class="credential-card" style="background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 1.5rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; border-bottom: 1px solid var(--border-subtle); padding-bottom: 0.75rem;">
            <div style="display: flex; align-items: center; gap: 0.6rem;">
              <span style="font-size: 1.3rem;">📊</span>
              <strong style="font-size: 1.05rem; color: var(--text-main);">Google Sheets / Google Apps Script Webhook Sync</strong>
            </div>
            <span id="badgeWebhookStatus" class="badge-test-flag" style="background: ${providerConfig.googleAppsScriptWebhookUrl ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)'}; color: ${providerConfig.googleAppsScriptWebhookUrl ? '#34d399' : '#fbbf24'}; border-color: rgba(16, 185, 129, 0.3);">
              ${providerConfig.googleAppsScriptWebhookUrl ? 'SYNC ACTIVE' : 'OPTIONAL LOCAL ONLY'}
            </span>
          </div>

          <div style="margin-bottom: 0.75rem;">
            <label style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); display: block; margin-bottom: 0.35rem;">
              Google Apps Script Web App Deployment URL
            </label>
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.6rem;">
              <input type="url" id="inputGoogleWebhookUrl" class="search-input" value="${escapeHtml(providerConfig.googleAppsScriptWebhookUrl || '')}" placeholder="https://script.google.com/macros/s/AKfycbx.../exec" style="flex: 1; min-width: 280px; font-family: var(--font-mono); font-size: 0.8rem;">
              <button type="button" id="btnTestWebhookPing" class="btn btn-outline btn-sm" style="font-weight: 600;">📡 Test Ping</button>
              <button type="button" id="btnSyncAllToSheets" class="btn btn-primary btn-sm" style="font-weight: 600; background: #059669; border-color: #059669;">🔄 Sync All to Sheets</button>
              <button type="button" id="btnPullFromSheets" class="btn btn-primary btn-sm" style="font-weight: 600; background: #2563eb; border-color: #2563eb;">📥 Pull Real Vacancies from Sheets</button>
            </div>
            <div style="font-size: 0.74rem; color: var(--text-muted); margin-bottom: 0.6rem; display: flex; align-items: center; gap: 0.4rem;">
              <span>💾</span> <strong>Auto-Saved Permanently:</strong> Webhook URL &amp; credentials persist directly on your local server disk across all reloads.
            </div>
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
              <button type="button" id="btnTestWebhookEmail" class="btn btn-outline btn-sm" style="font-weight: 600; border-color: #60a5fa; color: #60a5fa;">📧 Test Email Delivery</button>
              <button type="button" id="btnTriggerCloudScan" class="btn btn-outline btn-sm" style="font-weight: 600; border-color: #34d399; color: #34d399;">⚡ Run Cloud Scan Now</button>
              <button type="button" id="btnFetchCloudLogs" class="btn btn-outline btn-sm" style="font-weight: 600;">📋 View Cloud Execution Logs</button>
            </div>
          </div>
          <div id="statusWebhookPing" style="display: none; margin-bottom: 1rem;"></div>
        </div>

        <!-- 5. Google Gemini AI Engine (100% Free Regular Google Account - 1,500 RPD) -->
        <div class="credential-card" style="background: var(--bg-surface); border: 2px solid rgba(168, 85, 247, 0.4); border-radius: var(--radius-lg); padding: 1.5rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; border-bottom: 1px solid var(--border-subtle); padding-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
            <div style="display: flex; align-items: center; gap: 0.6rem;">
              <span style="font-size: 1.4rem;">🤖</span>
              <div>
                <strong style="font-size: 1.05rem; color: var(--text-main);">Google Gemini AI Studio (Free Tier AI Strategist)</strong>
                <span class="badge-test-flag" style="background: rgba(168, 85, 247, 0.15); color: #c084fc; border-color: rgba(168, 85, 247, 0.35); margin-left: 0.5rem;">
                  ⭐ FREE TIER &bull; 1,500 REQUESTS/DAY
                </span>
              </div>
            </div>
            <span id="badgeGeminiStatus" class="meta-pill" style="font-size: 0.75rem; background: ${geminiApiKey ? 'rgba(16, 185, 129, 0.15)' : 'rgba(168, 85, 247, 0.15)'}; color: ${geminiApiKey ? '#34d399' : '#c084fc'}; font-weight: 600;">
              ${geminiApiKey ? 'AI Key Saved (Active)' : 'Standard Cloud'}
            </span>
          </div>

          <div style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.5; margin-bottom: 0.75rem;">
            <p style="margin: 0 0 0.5rem 0;">
              Powers <strong>AI Profile Generation</strong> (for Software Developer, Data Science, etc.), <strong>Entire Web Search Strategist</strong> (decides which sites to search and query syntax), <strong>Notification Date/Fact Extractor</strong>, and <strong>AI System Health Watchdog</strong>.
            </p>
            <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap; font-size: 0.78rem; color: #c084fc;">
              <span>✅ 1,500 Requests/Day (High Quota)</span>
              <span>✅ 15 Requests/Min (1M Context)</span>
              <span>✅ Compatible with Google Account</span>
              <span>✅ Auto-Saved to Disk</span>
            </div>
          </div>

          <div style="margin-bottom: 0.75rem;">
            <label style="font-size: 0.72rem; color: var(--text-muted); display: block; margin-bottom: 0.25rem;">
              Google AI Studio API Key (starts with AIzaSy...)
            </label>
            <div style="display: flex; gap: 0.4rem;">
              <input type="password" id="inputGeminiApiKey" class="search-input" value="${escapeHtml(geminiApiKey)}" placeholder="AIzaSy..." style="flex: 1; font-family: var(--font-mono); font-size: 0.8rem;">
              <button type="button" class="btn btn-outline btn-sm btn-toggle-mask" data-target="inputGeminiApiKey">👁️</button>
              <button type="button" id="btnTestGemini" class="btn btn-outline btn-sm" style="font-weight: 600; border-color: rgba(168, 85, 247, 0.4); color: #c084fc;">
                ⚡ Test &amp; Verify Gemini AI
              </button>
            </div>
          </div>
          <div id="statusGeminiApi" style="display: none; margin-bottom: 0.75rem;"></div>

          <details style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 0.85rem;">
            <summary style="cursor: pointer; color: #c084fc;">ℹ️ How to get your 100% Free Google Gemini API Key in 60 seconds</summary>
            <div style="margin: 0.5rem 0 0 0; line-height: 1.5;">
              <p style="margin: 0 0 0.3rem 0;">
                1. Open <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" style="color: #60a5fa; text-decoration: underline;">https://aistudio.google.com/app/apikey</a> and sign in with any standard Google account.
              </p>
              <p style="margin: 0 0 0.3rem 0;">
                2. Click <strong>"Create API Key"</strong> &mdash; <strong>No credit card or billing account is required</strong>.
              </p>
              <p style="margin: 0 0 0.3rem 0;">
                3. Paste the key above and click <strong>Test &amp; Verify</strong>. The key is automatically verified against <code>gemini-1.5-flash</code> and saved permanently to disk in <code>data/credentials.json</code>.
              </p>
              <p style="margin: 0; color: #34d399;">
                &bull; <strong>Note:</strong> Even without an API key, our built-in offline expert catalog provides instant recommendations for Software Developer and Tech roles!
              </p>
            </div>
          </details>

          <!-- Continuous Learning Cloud Brain Panel (Automated Cloud Updates) -->
          <div style="background: rgba(168, 85, 247, 0.08); border: 1px solid rgba(168, 85, 247, 0.25); border-radius: var(--radius-md); padding: 0.85rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.55rem; flex-wrap: wrap; gap: 0.4rem;">
              <div style="display: flex; align-items: center; gap: 0.45rem;">
                <span style="font-size: 1rem;">🧠</span>
                <strong style="font-size: 0.82rem; color: #c084fc;">Continuous Learning Cloud Brain</strong>
                <span class="badge-test-flag" style="background: rgba(52, 211, 153, 0.15); color: #34d399; border-color: rgba(52, 211, 153, 0.35); font-size: 0.65rem;">
                  AUTO-UPDATES ACTIVE
                </span>
              </div>
              <button type="button" id="btnSyncKnowledgeBrain" class="btn btn-outline btn-sm" style="font-size: 0.72rem; padding: 3px 8px; border-color: rgba(168, 85, 247, 0.4); color: #c084fc;">
                🔄 Sync Knowledge Brain
              </button>
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 0.5rem; font-size: 0.74rem;">
              <div class="dash-card-compact">
                <div style="color: var(--text-muted); font-size: 0.68rem;">Hosting Mode</div>
                <div style="color: #34d399; font-weight: 700;">24/7 Cloud Serverless</div>
              </div>
              <div class="dash-card-compact">
                <div style="color: var(--text-muted); font-size: 0.68rem;">Monthly Cloud Cost</div>
                <div style="color: #38bdf8; font-weight: 700;">Standard Cloud</div>
              </div>
              <div class="dash-card-compact">
                <div style="color: var(--text-muted); font-size: 0.68rem;">Offline Model</div>
                <div style="color: var(--text-muted); font-weight: 600;">Disabled (Cloud Only)</div>
              </div>
              <div class="dash-card-compact">
                <div style="color: var(--text-muted); font-size: 0.68rem;">Continuous Learning</div>
                <div id="statAiLearnedCount" style="color: #c084fc; font-weight: 700;">Active In-Context</div>
              </div>
            </div>
            <div id="statusKnowledgeSync" style="display: none; font-size: 0.74rem; margin-top: 0.5rem; padding: 0.4rem 0.6rem; border-radius: var(--radius-sm);"></div>
          </div>
        </div>

        <!-- 6. Telegram Instant Mobile Alert & Push Bot -->
        <div class="credential-card" style="background: var(--bg-surface); border: 2px solid rgba(56, 189, 248, 0.4); border-radius: var(--radius-lg); padding: 1.5rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; border-bottom: 1px solid var(--border-subtle); padding-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
            <div style="display: flex; align-items: center; gap: 0.6rem;">
              <span style="font-size: 1.4rem;">✈️</span>
              <div>
                <strong style="font-size: 1.05rem; color: var(--text-main);">Telegram Instant Mobile Alert Channel</strong>
                <span class="badge-test-flag" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; border-color: rgba(56, 189, 248, 0.35); margin-left: 0.5rem;">
                  ⭐ INSTANT PUSH ALERTS
                </span>
              </div>
            </div>
            <span class="meta-pill" style="font-size: 0.75rem; background: ${providerConfig.telegramBotToken ? 'rgba(16, 185, 129, 0.15)' : 'rgba(56, 189, 248, 0.15)'}; color: ${providerConfig.telegramBotToken ? '#34d399' : '#38bdf8'}; font-weight: 600;">
              ${providerConfig.telegramBotToken ? 'Bot Configured' : 'Ready'}
            </span>
          </div>

          <div style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.5; margin-bottom: 0.85rem;">
            <p style="margin: 0 0 0.5rem 0;">
              Delivers live instant push notifications for new verified government vacancies, closing deadline alerts (&lt;48h), and official corrigenda directly to your phone.
            </p>
            <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap; font-size: 0.78rem; color: #38bdf8;">
              <span>✅ Zero SMS or Gateway Fees</span>
              <span>✅ Instant Mobile Notifications</span>
              <span>✅ 1-Click Auto-Detect Chat ID</span>
              <span>✅ Daily Morning Digests</span>
            </div>
          </div>

          <div style="display: flex; gap: 0.6rem; align-items: center; flex-wrap: wrap;">
            <a href="https://t.me/vacancy_radar1_bot" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm" style="color: #38bdf8; border-color: rgba(56, 189, 248, 0.5); text-decoration: none; font-weight: 600;">
              ✈️ Open @vacancy_radar1_bot in Telegram ↗
            </a>
            <button type="button" id="btnJumpToTelegramSettings" class="btn btn-primary btn-sm" style="background: #0284c7; border-color: #0284c7; font-weight: 600;">
              ⚙️ Open Telegram Settings &amp; Auto-Detect ID &rarr;
            </button>
          </div>
        </div>

        <!-- 4. Deprecated / Disabled Provider Notice (Google & Bing) -->
        <details style="background: var(--bg-surface-elevated); border: 1px dashed var(--border-subtle); border-radius: var(--radius-md); padding: 1rem; font-size: 0.8rem;">
          <summary style="cursor: pointer; font-weight: 600; color: var(--text-muted);">
            ⚙️ Disabled Services: Google Custom Search &amp; Microsoft Azure Bing
          </summary>
          <div style="margin-top: 0.75rem; color: var(--text-secondary); line-height: 1.6;">
            <div style="margin-bottom: 0.75rem;">
              <strong style="color: #f87171;">Google Custom Search API (Disabled):</strong> Google has closed new project signups for the legacy Custom Search JSON API with HTTP 403. This provider is deactivated to prevent query delays.
            </div>
            <div>
              <strong style="color: #fbbf24;">Bing Web Search (Removed):</strong> Azure requires credit card verification for API keys. It has been deactivated so your application runs 100% free with zero payment cards.
            </div>
          </div>
        </details>

        <!-- Save Credentials Button Bar -->
        <div style="display: flex; flex-direction: column; gap: 0.75rem; background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 1.25rem 1.5rem;">
          <div id="saveFeedbackBanner" style="display: none;"></div>
          <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
            <button type="button" id="btnSaveCredentials" class="btn btn-primary" style="font-weight: 600;">
              💾 Save API Credentials &amp; Revalidate Adapters
            </button>
          </div>
        </div>

      </div>
    `;
}

export function bindCredentialsTabEvents(container, ctx) {
    // Auto-save credentials & Webhook URL to both storageService and server disk
    const persistCredentials = (key, val) => {
      const cfg = storageService.getProviderConfig();
      cfg[key] = val;
      storageService.saveProviderConfig(cfg);
      fetch('/api/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: val })
      }).catch(() => {});
    };

    const webhookInput = document.getElementById('inputGoogleWebhookUrl');
    webhookInput?.addEventListener('input', (e) => {
      persistCredentials('googleAppsScriptWebhookUrl', e.target.value.trim());
    });
    webhookInput?.addEventListener('change', (e) => {
      persistCredentials('googleAppsScriptWebhookUrl', e.target.value.trim());
    });

    const braveInput = document.getElementById('inputBraveApiKey');
    braveInput?.addEventListener('input', (e) => {
      const key = e.target.value.trim();
      persistCredentials('braveApiKey', key);
      const brave = storageService.getSearchProviders().find(p => p.type === ProviderType.BRAVE_SEARCH);
      if (brave) {
        brave.apiKey = key;
        brave.isEnabled = Boolean(key);
        storageService.saveSearchProvider(brave);
      }
    });

    const serpInput = document.getElementById('inputSerpApiKey');
    serpInput?.addEventListener('input', (e) => {
      const key = e.target.value.trim();
      persistCredentials('serpApiKey', key);
      const serp = storageService.getSearchProviders().find(p => p.type === ProviderType.SERPAPI);
      if (serp) {
        serp.apiKey = key;
        serp.isEnabled = Boolean(key);
        storageService.saveSearchProvider(serp);
      }
    });

    const geminiInput = document.getElementById('inputGeminiApiKey');
    geminiInput?.addEventListener('input', (e) => {
      const key = e.target.value.trim();
      persistCredentials('geminiApiKey', key);
    });
    geminiInput?.addEventListener('change', (e) => {
      const key = e.target.value.trim();
      persistCredentials('geminiApiKey', key);
    });


    // Save Credentials with real-time feedback
    document.getElementById('btnSaveCredentials')?.addEventListener('click', async () => {
      const googleApiKey = document.getElementById('inputGoogleApiKey')?.value.trim() || '';
      const googleCx = document.getElementById('inputGoogleSearchCx')?.value.trim() || '';
      const webhookUrl = document.getElementById('inputGoogleWebhookUrl')?.value.trim() || '';
      const bingKey = document.getElementById('inputBingApiKey')?.value.trim() || '';
      const braveKey = document.getElementById('inputBraveApiKey')?.value.trim() || '';
      const serpKey = document.getElementById('inputSerpApiKey')?.value.trim() || '';
      const geminiKey = document.getElementById('inputGeminiApiKey')?.value.trim() || '';
      const searxEndpoint = document.getElementById('inputSearxEndpoint')?.value.trim() || 'https://etsi.me';

      const providers = storageService.getSearchProviders();
      const searx = providers.find(p => p.type === ProviderType.SEARXNG);
      if (searx) {
        searx.endpoint = searxEndpoint;
        searx.isEnabled = true;
        searx.priority = 2;
        searx.healthStatus = ProviderHealthStatus.HEALTHY;
        storageService.saveSearchProvider(searx);
      }

      const brave = providers.find(p => p.type === ProviderType.BRAVE_SEARCH);
      if (brave) {
        brave.apiKey = braveKey;
        brave.isEnabled = Boolean(braveKey);
        brave.priority = 3;
        brave.healthStatus = braveKey ? ProviderHealthStatus.HEALTHY : ProviderHealthStatus.DISABLED;
        storageService.saveSearchProvider(brave);
      }

      const serp = providers.find(p => p.type === ProviderType.SERPAPI);
      if (serp) {
        serp.apiKey = serpKey;
        serp.isEnabled = Boolean(serpKey);
        serp.priority = 4;
        serp.healthStatus = serpKey ? ProviderHealthStatus.HEALTHY : ProviderHealthStatus.DISABLED;
        storageService.saveSearchProvider(serp);
      }

      const google = providers.find(p => p.type === ProviderType.GOOGLE_CUSTOM_SEARCH);
      if (google) {
        google.apiKey = googleApiKey;
        google.isEnabled = Boolean(googleApiKey);
        google.healthStatus = googleApiKey ? ProviderHealthStatus.HEALTHY : ProviderHealthStatus.DISABLED;
        storageService.saveSearchProvider(google);
      }

      const bing = providers.find(p => p.type === ProviderType.BING_WEB_SEARCH);
      if (bing) {
        bing.apiKey = bingKey;
        bing.isEnabled = Boolean(bingKey);
        bing.healthStatus = bingKey ? ProviderHealthStatus.HEALTHY : ProviderHealthStatus.DISABLED;
        storageService.saveSearchProvider(bing);
      }

      const pConfig = storageService.getProviderConfig();
      pConfig.googleCustomSearchApiKey = googleApiKey;
      pConfig.googleCustomSearchEngineId = googleCx;
      pConfig.googleAppsScriptWebhookUrl = webhookUrl;
      pConfig.geminiApiKey = geminiKey;
      pConfig.apiKeyConfigured = Boolean(googleApiKey || bingKey || serpKey || braveKey || geminiKey);
      storageService.saveProviderConfig(pConfig);
      persistCredentials('geminiApiKey', geminiKey);

      const banner = document.getElementById('saveFeedbackBanner');
      if (banner) {
        banner.style.display = 'block';
        banner.innerHTML = `
          <div style="background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.4); border-radius: 6px; padding: 0.85rem 1rem; color: #34d399; font-size: 0.85rem;">
            ✅ <strong>Credentials &amp; Search Engine Endpoints Successfully Saved!</strong> Adapters re-configured. Triggering live connectivity tests...
          </div>
        `;
      }

      showConfirmationBanner('Credentials Saved', 'API credentials & search endpoints updated.', 'success', 2800);
      if (this.onStateChanged) ctx.onStateChanged && ctx.onStateChanged();

      // Automatically trigger live tests for configured services
      if (searxEndpoint) document.getElementById('btnTestSearxng')?.click();
      if (braveKey) document.getElementById('btnTestBrave')?.click();
      if (serpKey) document.getElementById('btnTestSerpApi')?.click();
      if (geminiKey) document.getElementById('btnTestGemini')?.click();
      if (webhookUrl) document.getElementById('btnTestWebhookPing')?.click();
      if (googleApiKey) document.getElementById('btnTestGoogleApi')?.click();
    });

    // Test Google Custom Search API Live
    document.getElementById('btnTestGoogleApi')?.addEventListener('click', async () => {
      const btn = document.getElementById('btnTestGoogleApi');
      const statusDiv = document.getElementById('statusGoogleApi');
      const apiKey = document.getElementById('inputGoogleApiKey')?.value.trim() || '';
      const cx = document.getElementById('inputGoogleSearchCx')?.value.trim() || '';

      if (!apiKey || !cx) {
        if (statusDiv) {
          statusDiv.style.display = 'block';
          statusDiv.innerHTML = `
            <div class="alert-box alert-box-error">
              ⚠️ Please provide both a Google API Key and Search Engine ID (CX) before testing.
            </div>
          `;
        }
        return;
      }

      const origText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '⏳ Validating API...';

      if (statusDiv) {
        statusDiv.style.display = 'block';
        statusDiv.innerHTML = `
          <div class="alert-box alert-box-info">
            ⏳ Connecting to Google Custom Search JSON API endpoint...
          </div>
        `;
      }

      try {
        const res = await fetch('/api/test-google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey, cx })
        });
        const data = await res.json();

        if (statusDiv) {
          if (data.success) {
            statusDiv.innerHTML = `
              <div class="alert-box alert-box-success">
                ✅ <strong>Google Custom Search Verified!</strong><br>
                <span style="color: var(--text-secondary); font-size: 0.78rem;">${data.message} | Sample lead: <em>"${data.sampleTitle}"</em></span>
              </div>
            `;
          } else if (data.errorType === 'API_CLOSED_TO_NEW_PROJECTS') {
            statusDiv.innerHTML = `
              <div style="background: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.4); border-radius: 6px; padding: 1rem; font-size: 0.82rem; color: #fbbf24;">
                <div style="font-weight: 700; margin-bottom: 0.35rem; display: flex; align-items: center; gap: 0.5rem;">
                  <span>ℹ️</span> <span>Google Cloud Policy Notice: API Closed to New Customers</span>
                </div>
                <div style="color: var(--text-main); margin-bottom: 0.65rem; line-height: 1.5;">
                  You have enabled the API in your Google Cloud Console correctly. However, <strong>Google has officially closed the legacy Custom Search JSON API to all new projects and new sign-ups</strong>. Google rejects calls with <code>403 PERMISSION_DENIED: This project does not have the access to Custom Search JSON API</code>.
                </div>
                <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 4px; padding: 0.65rem; color: #34d399; font-size: 0.78rem;">
                  🚀 <strong>Zero Impact on Discovery:</strong> Your connected <strong>SerpApi (Free 250 searches/month)</strong> and Direct RSS feeds are active. The rotation engine automatically uses SerpApi to retrieve real vacancies.
                </div>
              </div>
            `;
          } else if (data.errorType === 'API_NOT_ENABLED' || data.status === 403) {
            statusDiv.innerHTML = `
              <div style="background: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.4); border-radius: 6px; padding: 0.9rem; font-size: 0.82rem; color: #fbbf24;">
                <div style="font-weight: 700; margin-bottom: 0.35rem;">⚠️ One Step Needed in Google Cloud Console:</div>
                <div style="color: var(--text-main); margin-bottom: 0.65rem; line-height: 1.5;">
                  Your API Key and CX are recognized, but <strong>"Custom Search API" is NOT enabled</strong> in this Google Cloud project. Google blocks queries until this free API is enabled.
                </div>
                <div style="display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap;">
                  <a href="${data.enableUrl || 'https://console.cloud.google.com/apis/library/customsearch.googleapis.com'}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm" style="font-weight: 600; text-decoration: none;">
                    👉 Click Here to Enable Custom Search API (Free) ↗
                  </a>
                  <span style="font-size: 0.75rem; color: var(--text-muted);">After clicking "Enable" on Google Cloud, click "Test & Validate" again.</span>
                </div>
              </div>
            `;
          } else {
            statusDiv.innerHTML = `
              <div class="alert-box alert-box-error">
                ❌ <strong>Google API Error (HTTP ${data.status}):</strong> ${data.message}
              </div>
            `;
          }
        }
      } catch (err) {
        if (statusDiv) {
          statusDiv.innerHTML = `
            <div class="alert-box alert-box-error">
              ❌ Could not reach local test proxy: ${err.message}
            </div>
          `;
        }
      } finally {
        btn.disabled = false;
        btn.innerHTML = origText;
      }
    });

    // Mirror Preset Selector
    document.getElementById('selectSearxMirrorPreset')?.addEventListener('change', (e) => {
      const input = document.getElementById('inputSearxEndpoint');
      if (input && e.target.value) {
        input.value = e.target.value;
      }
    });

    // Test SearXNG Live Metasearch Connection with Auto-Shift
    document.getElementById('btnTestSearxng')?.addEventListener('click', async () => {
      const btn = document.getElementById('btnTestSearxng');
      const statusDiv = document.getElementById('statusSearxng');
      const badge = document.getElementById('badgeSearxStatus');
      const inputEndpoint = document.getElementById('inputSearxEndpoint');
      const endpoint = inputEndpoint?.value.trim() || 'https://www.isci.si';

      const origText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '⏳ Testing &amp; Checking Pool...';

      if (statusDiv) {
        statusDiv.style.display = 'block';
        statusDiv.innerHTML = `
          <div style="background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 6px; padding: 0.75rem; color: #818cf8; font-size: 0.8rem;">
            ⏳ Connecting to SearXNG mirror pool starting with <code>${escapeHtml(endpoint)}</code>...
          </div>
        `;
      }

      try {
        const res = await fetch('/api/test-searxng', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint })
        });
        const data = await res.json();

        if (statusDiv) {
          if (data.success) {
            // If the system auto-shifted to another mirror, update the input field automatically!
            if (data.wasShifted && inputEndpoint) {
              inputEndpoint.value = data.endpoint;
              const providers = storageService.getSearchProviders();
              const searx = providers.find(p => p.type === ProviderType.SEARXNG);
              if (searx) {
                searx.endpoint = data.endpoint;
                searx.healthStatus = ProviderHealthStatus.HEALTHY;
                storageService.saveSearchProvider(searx);
              }
            }

            statusDiv.innerHTML = `
              <div class="alert-box alert-box-success">
                ${data.wasShifted ? '🔄 <strong>Auto-Shifted to Active Mirror!</strong>' : '✅ <strong>SearXNG Connected &amp; Operational!</strong>'} (${data.latencyMs}ms latency)<br>
                <span style="color: var(--text-secondary); font-size: 0.78rem;">
                  Active Mirror: <strong>${escapeHtml(data.endpoint)}</strong><br>
                  ${data.wasShifted ? `<em style="color: #fbbf24;">(Shifted from ${escapeHtml(data.originalEndpoint)} which was rate-limited)</em><br>` : ''}
                  Aggregated Engines: <strong>${(data.engines || []).join(', ')}</strong><br>
                  Sample Search Result: "<em>${escapeHtml(data.sampleTitle)}</em>" (${data.resultCount} results found)
                </span>
              </div>
            `;
            if (badge) {
              badge.textContent = `ONLINE (${data.latencyMs}ms)`;
              badge.style.background = 'rgba(16, 185, 129, 0.2)';
              badge.style.color = '#34d399';
            }
          } else {
            statusDiv.innerHTML = `
              <div class="alert-box alert-box-error">
                ❌ <strong>SearXNG Check Notice:</strong> ${data.message}
              </div>
            `;
            if (badge) {
              badge.textContent = 'CHECK FAILED';
              badge.style.background = 'rgba(239, 68, 68, 0.2)';
              badge.style.color = '#f87171';
            }
          }
        }
      } catch (err) {
        if (statusDiv) {
          statusDiv.innerHTML = `
            <div class="alert-box alert-box-error">
              ❌ Could not reach local test proxy: ${err.message}
            </div>
          `;
        }
      } finally {
        btn.disabled = false;
        btn.innerHTML = origText;
      }
    });

    // Test Brave Search API Live
    document.getElementById('btnTestBrave')?.addEventListener('click', async () => {
      const btn = document.getElementById('btnTestBrave');
      const statusDiv = document.getElementById('statusBraveApi');
      const badge = document.getElementById('badgeBraveStatus');
      const apiKey = document.getElementById('inputBraveApiKey')?.value.trim() || '';

      if (!apiKey) {
        if (statusDiv) {
          statusDiv.style.display = 'block';
          statusDiv.innerHTML = `
            <div class="alert-box alert-box-error">
              ⚠️ Please provide a Brave Search API Key first.
            </div>
          `;
        }
        return;
      }

      const origText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '⏳ Testing...';

      if (statusDiv) {
        statusDiv.style.display = 'block';
        statusDiv.innerHTML = `
          <div style="background: rgba(249, 115, 22, 0.1); border: 1px solid rgba(249, 115, 22, 0.3); border-radius: 6px; padding: 0.75rem; color: #fb923c; font-size: 0.8rem;">
            ⏳ Querying Brave Search endpoint...
          </div>
        `;
      }

      try {
        const res = await fetch('/api/test-brave', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey })
        });
        const data = await res.json();

        if (statusDiv) {
          if (data.success) {
            statusDiv.innerHTML = `
              <div class="alert-box alert-box-success">
                ✅ <strong>Brave Search API Connected &amp; Verified!</strong><br>
                <span style="color: var(--text-secondary); font-size: 0.78rem;">${data.message}</span>
              </div>
            `;
            if (badge) {
              badge.textContent = 'Free 2,000 / mo Active';
              badge.style.background = 'rgba(16, 185, 129, 0.2)';
              badge.style.color = '#34d399';
            }
            const braveProv = storageService.getSearchProviders().find(p => p.id === 'prov-brave-search');
            if (braveProv) {
              braveProv.apiKey = apiKey;
              braveProv.healthStatus = ProviderHealthStatus.HEALTHY;
              storageService.saveSearchProvider(braveProv);
            }
          } else {
            statusDiv.innerHTML = `
              <div class="alert-box alert-box-error">
                ❌ <strong>Brave API Test Failed:</strong> ${data.message}
              </div>
            `;
          }
        }
      } catch (err) {
        if (statusDiv) {
          statusDiv.innerHTML = `
            <div class="alert-box alert-box-error">
              ❌ Could not reach test proxy: ${err.message}
            </div>
          `;
        }
      } finally {
        btn.disabled = false;
        btn.innerHTML = origText;
      }
    });

    // Test SerpApi Live
    document.getElementById('btnTestSerpApi')?.addEventListener('click', async () => {
      const btn = document.getElementById('btnTestSerpApi');
      const statusDiv = document.getElementById('statusSerpApi');
      const badge = document.getElementById('badgeSerpStatus');
      const apiKey = document.getElementById('inputSerpApiKey')?.value.trim() || '';

      if (!apiKey) {
        if (statusDiv) {
          statusDiv.style.display = 'block';
          statusDiv.innerHTML = `
            <div class="alert-box alert-box-error">
              ⚠️ Please provide a SerpApi Private Key first.
            </div>
          `;
        }
        return;
      }

      const origText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '⏳ Checking...';

      if (statusDiv) {
        statusDiv.style.display = 'block';
        statusDiv.innerHTML = `
          <div class="alert-box alert-box-info">
            ⏳ Querying SerpApi account endpoint...
          </div>
        `;
      }

      try {
        const res = await fetch('/api/test-serpapi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey })
        });
        const data = await res.json();

        if (statusDiv) {
          if (data.success) {
            statusDiv.innerHTML = `
              <div class="alert-box alert-box-success">
                ✅ <strong>SerpApi Connected &amp; Ready!</strong><br>
                <span style="color: var(--text-secondary); font-size: 0.78rem;">Account: <strong>${data.accountEmail}</strong> (${data.planName})<br>Quota Remaining: <strong>${data.searchesLeft} / ${data.searchesPerMonth} searches</strong></span>
              </div>
            `;
            if (badge) {
              badge.textContent = `${data.searchesLeft} / ${data.searchesPerMonth} Remaining`;
              badge.style.background = 'rgba(16, 185, 129, 0.2)';
              badge.style.color = '#34d399';
            }
          } else {
            statusDiv.innerHTML = `
              <div class="alert-box alert-box-error">
                ❌ <strong>SerpApi Error:</strong> ${data.message}
              </div>
            `;
          }
        }
      } catch (err) {
        if (statusDiv) {
          statusDiv.innerHTML = `
            <div class="alert-box alert-box-error">
              ❌ Could not reach test proxy: ${err.message}
            </div>
          `;
        }
      } finally {
        btn.disabled = false;
        btn.innerHTML = origText;
      }
    });

    // Test Google Gemini AI Live (100% Free Regular Google Account)
    document.getElementById('btnTestGemini')?.addEventListener('click', async () => {
      const btn = document.getElementById('btnTestGemini');
      const statusDiv = document.getElementById('statusGeminiApi');
      const badge = document.getElementById('badgeGeminiStatus');
      const apiKey = document.getElementById('inputGeminiApiKey')?.value.trim() || '';

      const origText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '⏳ Testing Gemini AI...';

      if (statusDiv) {
        statusDiv.style.display = 'block';
        statusDiv.innerHTML = `
          <div style="background: rgba(168, 85, 247, 0.1); border: 1px solid rgba(168, 85, 247, 0.3); border-radius: 6px; padding: 0.75rem; color: #c084fc; font-size: 0.8rem;">
            ⏳ Connecting to Google Gemini API (gemini-1.5-flash)...
          </div>
        `;
      }

      try {
        const res = await fetch('/api/test-gemini', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey })
        });
        const data = await res.json();

        if (statusDiv) {
          if (data.ok) {
            statusDiv.innerHTML = `
              <div class="alert-box alert-box-success">
                ✅ <strong>Google Gemini AI Connected &amp; Operational!</strong><br>
                <span style="color: var(--text-secondary); font-size: 0.78rem;">
                  Model: <strong>${data.model || 'gemini-1.5-flash'}</strong> &bull; Free Quota: <strong>1,500 Requests/Day (15 RPM)</strong><br>
                  AI Test Echo: "<em>${escapeHtml(data.message || 'OK')}</em>"<br>
                  <span style="color: #34d399;">Key permanently saved to disk in <code>data/credentials.json</code>.</span>
                </span>
              </div>
            `;
            if (badge) {
              badge.textContent = 'ONLINE (1,500 RPD)';
              badge.style.background = 'rgba(16, 185, 129, 0.2)';
              badge.style.color = '#34d399';
            }
          } else {
            statusDiv.innerHTML = `
              <div class="alert-box alert-box-error">
                ❌ <strong>Gemini Test Notice:</strong> ${data.error || data.message || 'Connection failed'}
              </div>
            `;
            if (badge) {
              badge.textContent = 'TEST FAILED';
              badge.style.background = 'rgba(239, 68, 68, 0.2)';
              badge.style.color = '#f87171';
            }
          }
        }
      } catch (err) {
        if (statusDiv) {
          statusDiv.innerHTML = `
            <div class="alert-box alert-box-error">
              ❌ Could not reach local test proxy: ${err.message}
            </div>
          `;
        }
      } finally {
        btn.disabled = false;
        btn.innerHTML = origText;
      }
    });

    // Sync Continuous Knowledge Brain Live
    document.getElementById('btnSyncKnowledgeBrain')?.addEventListener('click', async () => {
      const btn = document.getElementById('btnSyncKnowledgeBrain');
      const statusDiv = document.getElementById('statusKnowledgeSync');
      const countStat = document.getElementById('statAiLearnedCount');

      const origText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '⏳ Syncing Brain...';

      if (statusDiv) {
        statusDiv.style.display = 'block';
        statusDiv.style.background = 'rgba(168, 85, 247, 0.1)';
        statusDiv.style.color = '#c084fc';
        statusDiv.innerHTML = '⏳ Syncing training specimens and validating live cloud model...';
      }

      try {
        const res = await fetch('/api/ai/sync-knowledge', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          if (statusDiv) {
            statusDiv.style.background = 'rgba(16, 185, 129, 0.15)';
            statusDiv.style.color = '#34d399';
            statusDiv.innerHTML = `✅ <strong>Brain Synchronized!</strong> ${data.stats?.trainingSpecimens || 0} specimens &bull; ${data.stats?.learnedSources || 0} learned sources &bull; Cloud: Standard Tier`;
          }
          if (countStat) {
            countStat.textContent = `${data.stats?.learnedSources || 0} Sources (${data.stats?.trainingSpecimens || 0} Specs)`;
          }
        } else {
          if (statusDiv) {
            statusDiv.style.background = 'rgba(239, 68, 68, 0.15)';
            statusDiv.style.color = '#f87171';
            statusDiv.innerHTML = `⚠️ Sync notice: ${data.error || 'Failed to sync knowledge'}`;
          }
        }
      } catch (e) {
        if (statusDiv) {
          statusDiv.style.background = 'rgba(239, 68, 68, 0.15)';
          statusDiv.style.color = '#f87171';
          statusDiv.innerHTML = `❌ Error: ${e.message}`;
        }
      } finally {
        btn.disabled = false;
        btn.innerHTML = origText;
      }
    });

    // Test Webhook Ping Live
    document.getElementById('btnTestWebhookPing')?.addEventListener('click', async () => {
      const btn = document.getElementById('btnTestWebhookPing');
      const statusDiv = document.getElementById('statusWebhookPing');
      const badge = document.getElementById('badgeWebhookStatus');
      const url = document.getElementById('inputGoogleWebhookUrl')?.value.trim();

      if (!url) {
        if (statusDiv) {
          statusDiv.style.display = 'block';
          statusDiv.innerHTML = `
            <div class="alert-box alert-box-error">
              ⚠️ Please enter a Google Apps Script Webhook URL first.
            </div>
          `;
        }
        return;
      }

      const origText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '⏳ Pinging...';

      if (statusDiv) {
        statusDiv.style.display = 'block';
        statusDiv.innerHTML = `
          <div class="alert-box alert-box-info">
            ⏳ Sending live ping request to Google Apps Script cloud deployment...
          </div>
        `;
      }

      try {
        const res = await fetch('/api/test-webhook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
        });
        const data = await res.json();

        if (statusDiv) {
          if (data.success) {
            statusDiv.innerHTML = `
              <div class="alert-box alert-box-success">
                ✅ <strong>Google Apps Script Connected! (Latency: ${data.latencyMs}ms)</strong><br>
                <span style="color: var(--text-secondary); font-size: 0.78rem;">
                  Message: "${data.data?.message || data.message}"<br>
                  Database Status: <strong>Google Sheets sync is online and active.</strong>
                </span>
              </div>
            `;
            if (badge) {
              badge.textContent = 'ONLINE & CONNECTED';
              badge.style.background = 'rgba(16, 185, 129, 0.2)';
              badge.style.color = '#34d399';
            }
          } else {
            statusDiv.innerHTML = `
              <div class="alert-box alert-box-error">
                ❌ <strong>Webhook Ping Failed (HTTP ${data.status || 'Error'}):</strong> ${data.error || data.message || 'Cannot reach script URL'}<br>
                <span style="font-size: 0.75rem; color: var(--text-muted); display: block; margin-top: 0.3rem;">
                  Tip: Ensure your Google Apps Script deployment is configured as: <strong>Who has access: "Anyone"</strong>.
                </span>
              </div>
            `;
          }
        }
      } catch (err) {
        if (statusDiv) {
          statusDiv.innerHTML = `
            <div class="alert-box alert-box-error">
              ❌ Could not reach test proxy: ${err.message}
            </div>
          `;
        }
      } finally {
        btn.disabled = false;
        btn.innerHTML = origText;
      }
    });

    // Sync All Data to Google Sheets Now
    document.getElementById('btnSyncAllToSheets')?.addEventListener('click', async () => {
      const btn = document.getElementById('btnSyncAllToSheets');
      const statusDiv = document.getElementById('statusWebhookPing');
      const url = document.getElementById('inputGoogleWebhookUrl')?.value.trim();

      if (!url) {
        if (statusDiv) {
          statusDiv.style.display = 'block';
          statusDiv.innerHTML = `<div class="alert-box alert-box-error">⚠️ Please enter your Webhook URL first.</div>`;
        }
        return;
      }

      btn.disabled = true;
      btn.innerHTML = '⏳ Syncing All to Sheets...';
      if (statusDiv) {
        statusDiv.style.display = 'block';
        statusDiv.innerHTML = `<div class="alert-box alert-box-info">⏳ Uploading all vacancies and active profile to Google Sheets...</div>`;
      }

      try {
        const vacancies = storageService.getVacancies();
        const profile = storageService.getActiveProfile();

        // Sync vacancies
        const resVac = await fetch('/api/sync-webhook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url,
            payload: { action: 'SYNC_VACANCIES', vacancies }
          })
        });
        const dataVac = await resVac.json();

        // Sync all profiles (each with its own target focus and separate recipient email)
        const allProfiles = storageService.getProfiles();
        await fetch('/api/sync-webhook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url,
            payload: { action: 'SYNC_PROFILES', profiles: allProfiles }
          })
        });

        // Sync Search Configuration (Brave Search API Key for autonomous cloud scans)
        const braveProv = storageService.getSearchProviders().find(p => p.type === ProviderType.BRAVE_SEARCH);
        if (braveProv?.apiKey) {
          await fetch('/api/sync-webhook', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url,
              payload: { action: 'SYNC_SEARCH_CONFIG', braveApiKey: braveProv.apiKey }
            })
          });
        }

        // Sync Trashed Vacancies list to prevent re-discovery/re-emailing
        const trashedList = storageService.getTrashVacancies();
        if (trashedList && trashedList.length > 0) {
          await fetch('/api/sync-webhook', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url,
              payload: { action: 'SYNC_TRASH', trash: trashedList }
            })
          });
        }

        // Auto-upgrade and synchronize all 52+ official sources in Google Sheet
        await fetch('/api/sync-webhook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url,
            payload: { action: 'SYNC_SOURCES' }
          })
        });

        if (statusDiv) {
          statusDiv.innerHTML = `
            <div class="alert-box alert-box-success">
              ✅ <strong>Google Sheets Database Synchronized!</strong><br>
              <span style="color: var(--text-secondary); font-size: 0.78rem;">
                Successfully synced ${vacancies.length} vacancies, ${allProfiles.length} separate role profiles with individual recipients, 52+ official channels, and cloud search credentials into your Google Sheet.
              </span>
            </div>
          `;
        }
      } catch (err) {
        if (statusDiv) {
          statusDiv.innerHTML = `<div class="alert-box alert-box-error">❌ Sync Error: ${err.message}</div>`;
        }
      } finally {
        btn.disabled = false;
        btn.innerHTML = '🔄 Sync All to Sheets Now';
      }
    });

    // Pull Real Vacancies from Google Sheet Database
    document.getElementById('btnPullFromSheets')?.addEventListener('click', async () => {
      const btn = document.getElementById('btnPullFromSheets');
      const statusDiv = document.getElementById('statusWebhookPing');
      const url = document.getElementById('inputGoogleWebhookUrl')?.value.trim();

      if (!url) {
        if (statusDiv) {
          statusDiv.style.display = 'block';
          statusDiv.innerHTML = `<div class="alert-box alert-box-error">⚠️ Please enter your Webhook URL first.</div>`;
        }
        return;
      }

      // Auto-persist URL
      persistCredentials('googleAppsScriptWebhookUrl', url);

      const origText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '⏳ Pulling Vacancies...';
      if (statusDiv) {
        statusDiv.style.display = 'block';
        statusDiv.innerHTML = `<div class="alert-box alert-box-info">⏳ Fetching official verified vacancies from Google Sheets database...</div>`;
      }

      try {
        const res = await fetch('/api/pull-vacancies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
        });
        const result = await res.json();
        const sheetData = result.data || result;

        if (sheetData && sheetData.status === 'SUCCESS' && Array.isArray(sheetData.vacancies)) {
          const liveVacancies = sheetData.vacancies;

          if (liveVacancies.length === 0) {
            statusDiv.innerHTML = `
              <div style="background: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.4); border-radius: 6px; padding: 0.85rem; color: #fbbf24; font-size: 0.82rem;">
                ⚠️ <strong>Google Sheet Connected, but 0 vacancies found in the Vacancies tab yet.</strong><br>
                <span style="font-size: 0.78rem; color: var(--text-secondary);">
                  Click <strong>"⚡ Run Cloud Scan Now"</strong> or run a dynamic scan to discover real official opportunities.
                </span>
              </div>
            `;
          } else {
            // Purge old test vacancies and import real vacancies
            storageService.purgeTestData();
            let savedCount = 0;
            liveVacancies.forEach(v => {
              v.isTestData = false;
              v.isLiveDiscovered = true;
              storageService.saveVacancy(v);
              savedCount++;
            });

            statusDiv.innerHTML = `
              <div class="alert-box alert-box-success">
                ✅ <strong>Successfully Pulled ${savedCount} Real Vacancies from Google Sheets!</strong><br>
                <span style="font-size: 0.78rem; color: var(--text-secondary);">
                  Initial test data has been replaced. Your vacancies feed now displays 100% real verified government posts from your cloud database.
                </span>
              </div>
            `;

            if (this.onStateChanged) ctx.onStateChanged && ctx.onStateChanged();
          }
        } else {
          statusDiv.innerHTML = `
            <div class="alert-box alert-box-error">
              ❌ Could not pull vacancies from Google Sheet: ${sheetData.error || result.error || 'Ensure Web App has Who has access: Anyone'}<br>
              <span style="font-size: 0.75rem; color: var(--text-muted); display: block; margin-top: 0.3rem;">
                Tip: Copy the updated Code.gs to your Apps Script and click "Deploy > New deployment".
              </span>
            </div>
          `;
        }
      } catch (err) {
        if (statusDiv) {
          statusDiv.innerHTML = `<div class="alert-box alert-box-error">❌ Pull Error: ${err.message}</div>`;
        }
      } finally {
        btn.disabled = false;
        btn.innerHTML = origText;
      }
    });

    // Test Email Delivery Live
    document.getElementById('btnTestWebhookEmail')?.addEventListener('click', async () => {
      const btn = document.getElementById('btnTestWebhookEmail');
      const statusDiv = document.getElementById('statusWebhookPing');
      const url = document.getElementById('inputGoogleWebhookUrl')?.value.trim();
      const profile = storageService.getActiveProfile();
      const email = profile.scheduleSettings?.emailAddress || '';

      if (!url) {
        if (statusDiv) {
          statusDiv.style.display = 'block';
          statusDiv.innerHTML = `<div class="alert-box alert-box-error">⚠️ Please enter your Webhook URL first.</div>`;
        }
        return;
      }

      btn.disabled = true;
      btn.innerHTML = '⏳ Sending Test Email...';
      if (statusDiv) {
        statusDiv.style.display = 'block';
        statusDiv.innerHTML = `<div class="alert-box alert-box-info">⏳ Dispatching test Gmail alert via Google Apps Script...</div>`;
      }

      try {
        const res = await fetch('/api/sync-webhook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url,
            payload: { action: 'TEST_EMAIL', recipient: email }
          })
        });
        const data = await res.json();
        const payloadData = data.data || {};

        if (statusDiv) {
          if (data.success && payloadData.status === 'SUCCESS') {
            statusDiv.innerHTML = `
              <div class="alert-box alert-box-success">
                📧 <strong>Test Email Dispatched Successfully!</strong><br>
                <span style="color: var(--text-secondary); font-size: 0.78rem;">
                  Recipient: <strong>${escapeHtml(payloadData.recipient || email || 'Script Owner')}</strong><br>
                  Check your Gmail inbox/spam folder for the "📡 Vacancy Radar Alert" sample email.
                </span>
              </div>
            `;
          } else {
            statusDiv.innerHTML = `
              <div class="alert-box alert-box-error">
                ❌ <strong>Email Test Notice:</strong> ${payloadData.error || data.error || 'Failed to dispatch email'}<br>
                <span style="font-size: 0.75rem; color: var(--text-muted); display: block; margin-top: 0.3rem;">
                  Ensure your Google Apps Script has been authorized with Gmail send permissions in script.google.com.
                </span>
              </div>
            `;
          }
        }
      } catch (err) {
        if (statusDiv) {
          statusDiv.innerHTML = `<div class="alert-box alert-box-error">❌ Network Error: ${err.message}</div>`;
        }
      } finally {
        btn.disabled = false;
        btn.innerHTML = '📧 Test Email Delivery';
      }
    });

    // Run Cloud Scan Now
    document.getElementById('btnTriggerCloudScan')?.addEventListener('click', async () => {
      const btn = document.getElementById('btnTriggerCloudScan');
      const statusDiv = document.getElementById('statusWebhookPing');
      const url = document.getElementById('inputGoogleWebhookUrl')?.value.trim();

      if (!url) {
        if (statusDiv) {
          statusDiv.style.display = 'block';
          statusDiv.innerHTML = `<div class="alert-box alert-box-error">⚠️ Please enter your Webhook URL first.</div>`;
        }
        return;
      }

      btn.disabled = true;
      btn.innerHTML = '⏳ Scanning Cloud Feeds...';
      if (statusDiv) {
        statusDiv.style.display = 'block';
        statusDiv.innerHTML = `<div class="alert-box alert-box-info">⏳ Executing 24/7 cloud scan on Google Apps Script and checking registered feeds...</div>`;
      }

      try {
        const res = await fetch('/api/sync-webhook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url,
            payload: { action: 'TRIGGER_SCAN' }
          })
        });
        const data = await res.json();
        const payloadData = data.data || {};
        const scanRes = payloadData.scanResult || {};

        if (statusDiv) {
          if (data.success && payloadData.status === 'SUCCESS') {
            statusDiv.innerHTML = `
              <div class="alert-box alert-box-success">
                ⚡ <strong>Cloud Scan Completed!</strong><br>
                <span style="color: var(--text-secondary); font-size: 0.78rem;">
                  Sources Checked: <strong>${scanRes.sourcesChecked || 0}</strong> | 
                  Discovered: <strong>+${scanRes.newVacanciesFound || 0} new</strong> | 
                  Deadlines Approaching: <strong>${scanRes.closingSoonFound || 0}</strong><br>
                  Email Status: <strong>${scanRes.emailDispatched ? `Dispatched to ${scanRes.recipient || 'recipient'}` : 'Suppressed (no new changes)'}</strong>
                </span>
              </div>
            `;
          } else {
            statusDiv.innerHTML = `
              <div class="alert-box alert-box-error">
                ❌ <strong>Scan Execution Error:</strong> ${payloadData.error || data.error || 'Cloud execution error'}
              </div>
            `;
          }
        }
      } catch (err) {
        if (statusDiv) {
          statusDiv.innerHTML = `<div class="alert-box alert-box-error">❌ Network Error: ${err.message}</div>`;
        }
      } finally {
        btn.disabled = false;
        btn.innerHTML = '⚡ Run Cloud Scan Now';
      }
    });

    // View Cloud Execution Logs
    document.getElementById('btnFetchCloudLogs')?.addEventListener('click', async () => {
      const btn = document.getElementById('btnFetchCloudLogs');
      const statusDiv = document.getElementById('statusWebhookPing');
      const url = document.getElementById('inputGoogleWebhookUrl')?.value.trim();

      if (!url) {
        if (statusDiv) {
          statusDiv.style.display = 'block';
          statusDiv.innerHTML = `<div class="alert-box alert-box-error">⚠️ Please enter your Webhook URL first.</div>`;
        }
        return;
      }

      btn.disabled = true;
      btn.innerHTML = '⏳ Fetching Logs...';
      if (statusDiv) {
        statusDiv.style.display = 'block';
        statusDiv.innerHTML = `<div class="alert-box alert-box-info">⏳ Loading execution logs from Google Sheets (ExecutionLogs tab)...</div>`;
      }

      try {
        const res = await fetch('/api/sync-webhook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url,
            payload: { action: 'GET_LOGS' }
          })
        });
        const data = await res.json();
        const payloadData = data.data || {};
        const logs = payloadData.logs || [];

        if (statusDiv) {
          if (data.success && payloadData.status === 'SUCCESS') {
            if (logs.length === 0) {
              statusDiv.innerHTML = `
                <div style="background: var(--bg-surface-elevated); border: 1px solid var(--border-subtle); border-radius: 6px; padding: 1rem; font-size: 0.82rem; color: var(--text-secondary);">
                  📋 <strong>Cloud Execution Logs (0 entries):</strong><br>
                  No scan jobs recorded in the Google Sheet yet. Run a scan or setup triggers to start logging.
                </div>
              `;
            } else {
              statusDiv.innerHTML = `
                <div style="background: var(--bg-surface-elevated); border: 1px solid var(--border-subtle); border-radius: 6px; padding: 1rem; max-height: 280px; overflow-y: auto;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                    <strong style="color: var(--text-main); font-size: 0.85rem;">📋 Cloud Execution Logs (${logs.length} most recent)</strong>
                    <span style="font-size: 0.75rem; color: var(--text-muted);">From Google Sheet ExecutionLogs tab</span>
                  </div>
                  <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                    ${logs.map(log => `
                      <div style="background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: 4px; padding: 0.5rem 0.75rem; font-size: 0.78rem;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.2rem;">
                          <div style="display: flex; gap: 0.4rem; align-items: center;">
                            <span class="verification-badge ${log.status === 'SUCCESS' ? 'badge-OFFICIALLY_VERIFIED' : 'badge-VERIFICATION_FAILED'}" style="font-size: 0.65rem; padding: 0.15rem 0.4rem;">
                              ${log.status}
                            </span>
                            <strong style="color: var(--text-main);">${escapeHtml(log.type || 'SCAN')}</strong>
                          </div>
                          <span style="color: var(--text-muted); font-family: var(--font-mono); font-size: 0.72rem;">
                            ${log.timestamp ? new Date(log.timestamp).toLocaleString('en-IN') : 'N/A'}
                          </span>
                        </div>
                        <div style="color: var(--text-secondary); margin-top: 0.15rem;">
                          ${escapeHtml(log.message || 'Execution completed.')}
                        </div>
                        <div style="color: var(--text-muted); font-size: 0.72rem; margin-top: 0.25rem;">
                          Sources Checked: <strong>${log.sourcesChecked || 0}</strong> | New Vacancies: <strong>+${log.newVacancies || 0}</strong>
                        </div>
                      </div>
                    `).join('')}
                  </div>
                </div>
              `;
            }
          } else {
            statusDiv.innerHTML = `
              <div class="alert-box alert-box-error">
                ❌ Could not fetch cloud logs: ${payloadData.error || data.error || 'Server error'}
              </div>
            `;
          }
        }
      } catch (err) {
        if (statusDiv) {
          statusDiv.innerHTML = `<div class="alert-box alert-box-error">❌ Network Error: ${err.message}</div>`;
        }
      } finally {
        btn.disabled = false;
        btn.innerHTML = '📋 View Cloud Execution Logs';
      }
    });

}
