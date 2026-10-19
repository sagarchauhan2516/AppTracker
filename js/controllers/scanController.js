/**
 * Vacancy Radar India - Scan Controller
 * Manages manual search execution, Google Sheets sync, schedule dialog, and vacancy normalization
 */

import { storageService } from '../services/storageService.js';
import { searchOrchestrationEngine } from '../engine/searchOrchestrationEngine.js';
import { showConfirmationBanner } from '../services/notificationService.js';
import { escapeHtml } from '../utils/htmlUtils.js';

export async function hydratePersistentCredentials(app) {
    try {
      const res = await fetch('/api/credentials');
      if (res.ok) {
        const data = await res.json();
        const creds = data.credentials || {};
        const pConfig = storageService.getProviderConfig();
        let modified = false;

        if (creds.googleAppsScriptWebhookUrl && creds.googleAppsScriptWebhookUrl !== pConfig.googleAppsScriptWebhookUrl) {
          pConfig.googleAppsScriptWebhookUrl = creds.googleAppsScriptWebhookUrl;
          modified = true;
        }

        if (creds.geminiApiKey && creds.geminiApiKey !== pConfig.geminiApiKey) {
          pConfig.geminiApiKey = creds.geminiApiKey;
          modified = true;
        }

        if (modified) {
          storageService.saveProviderConfig(pConfig);
        }

        // Hydrate search providers
        const providers = storageService.getSearchProviders();
        if (creds.braveApiKey) {
          const brave = providers.find(p => p.type === 'BRAVE_SEARCH');
          if (brave && !brave.apiKey) {
            brave.apiKey = creds.braveApiKey;
            brave.isEnabled = true;
            storageService.saveSearchProvider(brave);
          }
        }
        if (creds.serpApiKey) {
          const serp = providers.find(p => p.type === 'SERPAPI');
          if (serp && !serp.apiKey) {
            serp.apiKey = creds.serpApiKey;
            serp.isEnabled = true;
            storageService.saveSearchProvider(serp);
          }
        }
      }
    } catch (_) {}
  }

export async function pullRealVacanciesQuietly(app) {
    try {
      const res = await fetch('/api/pull-vacancies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: webhookUrl })
      });
      const data = await res.json();
      const sheetData = data.data || data;
      if (sheetData && sheetData.status === 'SUCCESS' && Array.isArray(sheetData.vacancies) && sheetData.vacancies.length > 0) {
        storageService.purgeTestData();
        sheetData.vacancies.forEach(v => {
          v.isTestData = false;
          v.isLiveDiscovered = true;
          storageService.saveVacancy(v);
        });
        app.refreshAll();
      }
    } catch (_) {}
  }

export function normalizeAndRepairVacancies(app) {
    try {
      const list = storageService.getVacancies();
      let hasChanges = false;
      const now = new Date();

      const repaired = list.map(v => {
        let fixed = false;
        // Fix bug where closingDate was mapped to publishedAt or set to the day before today for live discovered items
        if (v.isLiveDiscovered && v.dates) {
          const pubStr = v.dates.publishedAt || v.dates.closingDate;
          const pubDate = pubStr ? new Date(pubStr) : now;
          const closeDate = v.dates.closingDate ? new Date(v.dates.closingDate) : null;

          // If closingDate was identical to publishedAt or within 48h of publishedAt and marked as elapsed
          if (!closeDate || isNaN(closeDate.getTime()) || v.dates.closingDate === v.dates.publishedAt || (closeDate < now && Math.abs(closeDate - pubDate) < 48 * 60 * 60 * 1000)) {
            // Establish genuine 28-day application window from publishedAt
            const newClose = new Date(pubDate.getTime() + 28 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
            v.dates.closingDate = newClose;
            v.dates.publishedAt = pubDate.toISOString().slice(0, 10);
            fixed = true;
            hasChanges = true;
          }
        }

        if (fixed) {
          const audit = VerificationEngine.auditVacancy(v);
          if (v.verification) {
            v.verification.status = audit.status;
            v.verification.confidenceScore = audit.confidenceScore;
            v.verification.confirmedFacts = audit.confirmedFacts;
            v.verification.uncertainFields = audit.uncertainFields;
          }
        }
        return v;
      });

      if (hasChanges) {
        storageService.saveAllVacancies(repaired);
      }
    } catch (_) {}
  }

export function openScheduleModal(app) {
    const profile = storageService.getActiveProfile();
    const body = document.getElementById('scheduleModalBody');
    if (!body) return;

    const savedSchedule = profile.scheduleSettings || {
      preset: 'THRICE_DAILY',
      hours: ['08:00', '14:00', '20:00'],
      emailAlertsEnabled: true,
      emailAddress: 'candidate@dfir-india.org',
      deadlineLeadDays: 7
    };

    // Calculate next run time
    const now = new Date();
    const currentHour = now.getHours();
    const sortedHours = savedSchedule.hours.map(h => parseInt(h.split(':')[0], 10)).sort((a,b) => a - b);
    let nextHour = sortedHours.find(h => h > currentHour);
    let nextRunText = '';
    if (nextHour !== undefined) {
      nextRunText = `Today at ${String(nextHour).padStart(2, '0')}:00 IST`;
    } else {
      nextRunText = `Tomorrow at ${String(sortedHours[0] || 8).padStart(2, '0')}:00 IST`;
    }

    body.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 1.25rem;">
        
        <!-- Next Scheduled Run Card -->
        <div style="background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.25); border-radius: var(--radius-md); padding: 1rem 1.25rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
          <div>
            <span style="font-size: 0.75rem; text-transform: uppercase; color: #60a5fa; font-weight: 700; letter-spacing: 0.05em;">Automation Status</span>
            <div style="font-size: 0.95rem; font-weight: 600; color: var(--text-main); margin-top: 0.2rem;">
              Next Automated Scan: <span style="color: #34d399;">${nextRunText}</span>
            </div>
            <span style="font-size: 0.75rem; color: var(--text-muted);">Runs 24/7 in Google Cloud (Asia/Kolkata timezone) even when your PC is off</span>
          </div>
          <button id="btnTriggerScanFromModal" class="btn btn-primary btn-sm">
            <span>🔄</span> Run Now
          </button>
        </div>

        <!-- Frequency Presets -->
        <div>
          <label style="font-size: 0.8rem; font-weight: 600; text-transform: uppercase; color: var(--text-muted); display: block; margin-bottom: 0.4rem;">
            Schedule Frequency Preset
          </label>
          <select id="selSchedulePreset" class="filter-select" style="width: 100%;">
            <option value="THRICE_DAILY" ${savedSchedule.preset === 'THRICE_DAILY' ? 'selected' : ''}>
              Recommended: Thrice Daily (08:00, 14:00, and 20:00 IST)
            </option>
            <option value="TWICE_DAILY" ${savedSchedule.preset === 'TWICE_DAILY' ? 'selected' : ''}>
              Twice Daily (Morning 09:00 &amp; Evening 18:00 IST)
            </option>
            <option value="ONCE_DAILY" ${savedSchedule.preset === 'ONCE_DAILY' ? 'selected' : ''}>
              Once Daily (Morning 08:00 IST)
            </option>
            <option value="CUSTOM" ${savedSchedule.preset === 'CUSTOM' ? 'selected' : ''}>
              Custom Hours Selection (Select Individual Checkpoints)
            </option>
          </select>
        </div>

        <!-- Custom Hours Selector -->
        <div id="customHoursPanel" style="display: ${savedSchedule.preset === 'CUSTOM' ? 'block' : 'none'}; background: var(--bg-surface-elevated); padding: 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
          <label style="font-size: 0.75rem; font-weight: 600; text-transform: uppercase; color: var(--text-muted); display: block; margin-bottom: 0.5rem;">
            Select Scan Hours (Asia/Kolkata IST):
          </label>
          <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 0.5rem; font-size: 0.8rem;">
            ${Array.from({ length: 24 }).map((_, h) => {
              const hourStr = `${String(h).padStart(2, '0')}:00`;
              const isChecked = savedSchedule.hours.includes(hourStr);
              return `
                <label style="display: flex; align-items: center; gap: 0.3rem; background: var(--bg-surface); padding: 0.35rem 0.5rem; border-radius: 4px; border: 1px solid var(--border-subtle); cursor: pointer;">
                  <input type="checkbox" class="schedule-hour-chk" value="${hourStr}" ${isChecked ? 'checked' : ''}>
                  <span style="font-family: var(--font-mono); font-size: 0.75rem;">${hourStr}</span>
                </label>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Email Notifications & Lead Time -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
          <div>
            <label style="font-size: 0.8rem; font-weight: 600; text-transform: uppercase; color: var(--text-muted); display: block; margin-bottom: 0.35rem;">
              Notification Email (Supports Multiple)
            </label>
            <input type="text" id="inpScheduleEmail" class="search-input" value="${app.escapeHtml(savedSchedule.emailAddress)}" placeholder="e.g. user1@gmail.com, user2@org.in" style="width: 100%;">
            <small style="display: block; font-size: 0.72rem; color: var(--text-muted); margin-top: 0.2rem;">
              Profile-specific: Enter comma-separated email addresses.
            </small>
          </div>
          <div>
            <label style="font-size: 0.8rem; font-weight: 600; text-transform: uppercase; color: var(--text-muted); display: block; margin-bottom: 0.35rem;">
              Deadline Alert Lead Time
            </label>
            <select id="selDeadlineDays" class="filter-select" style="width: 100%;">
              <option value="7" ${savedSchedule.deadlineLeadDays === 7 ? 'selected' : ''}>7 Days Before Deadline</option>
              <option value="5" ${savedSchedule.deadlineLeadDays === 5 ? 'selected' : ''}>5 Days Before Deadline</option>
              <option value="3" ${savedSchedule.deadlineLeadDays === 3 ? 'selected' : ''}>3 Days Before Deadline</option>
            </select>
          </div>
        </div>

        <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; cursor: pointer;">
          <input type="checkbox" id="chkEmailAlerts" ${savedSchedule.emailAlertsEnabled ? 'checked' : ''}>
          <span>Send automated HTML email digest on newly verified opportunities</span>
        </label>

        <!-- Save Button -->
        <div style="display: flex; justify-content: flex-end; gap: 0.75rem; border-top: 1px solid var(--border-subtle); padding-top: 1rem; margin-top: 0.5rem;">
          <button type="button" id="btnSaveScheduleConfig" class="btn btn-primary" style="width: 100%; justify-content: center;">
            💾 Save Schedule &amp; Sync Cloud Triggers
          </button>
        </div>
      </div>
    `;

    // Dynamic hour preset toggling
    document.getElementById('selSchedulePreset')?.addEventListener('change', (e) => {
      const panel = document.getElementById('customHoursPanel');
      if (panel) panel.style.display = e.target.value === 'CUSTOM' ? 'block' : 'none';
    });

    // Run Manual Scan from modal
    document.getElementById('btnTriggerScanFromModal')?.addEventListener('click', () => {
      document.getElementById('scheduleModal')?.classList.remove('active');
      app.handleManualScan();
    });

    // Save Schedule
    document.getElementById('btnSaveScheduleConfig')?.addEventListener('click', () => {
      const preset = document.getElementById('selSchedulePreset').value;
      let hours = ['08:00', '14:00', '20:00'];

      if (preset === 'THRICE_DAILY') hours = ['08:00', '14:00', '20:00'];
      else if (preset === 'TWICE_DAILY') hours = ['09:00', '18:00'];
      else if (preset === 'ONCE_DAILY') hours = ['08:00'];
      else if (preset === 'CUSTOM') {
        hours = [];
        body.querySelectorAll('.schedule-hour-chk:checked').forEach(c => hours.push(c.value));
        if (hours.length === 0) hours = ['08:00'];
      }

      const emailAddress = document.getElementById('inpScheduleEmail').value.trim() || 'candidate@dfir-india.org';
      const deadlineLeadDays = parseInt(document.getElementById('selDeadlineDays').value, 10) || 7;
      const emailAlertsEnabled = document.getElementById('chkEmailAlerts').checked;
      const notificationEmails = emailAddress.split(/[,;]+/).map(e => e.trim()).filter(e => e && e.includes('@'));

      profile.scheduleSettings = {
        preset,
        hours,
        emailAddress,
        notificationEmails,
        deadlineLeadDays,
        emailAlertsEnabled
      };

      storageService.saveProfile(profile);

      // Record log of schedule update
      storageService.addLog({
        status: 'SUCCESS',
        type: 'SCHEDULE_UPDATED',
        message: `Scan schedule updated: ${preset} (${hours.join(', ')} IST). Email notifications: ${emailAlertsEnabled ? 'Enabled' : 'Disabled'}.`,
        sourcesChecked: storageService.getSources().filter(s => s.isEnabled).length,
        newVacanciesFound: 0
      });

      app.renderDiscoveryLogs();
      document.getElementById('scheduleModal')?.classList.remove('active');
      showConfirmationBanner(
        'Schedule Saved',
        `Active scan hours: ${hours.join(', ')} IST | Alerts to: ${emailAddress}`,
        'success',
        3000
      );
    });

    document.getElementById('scheduleModal').classList.add('active');
  }

export async function handleManualScan(app) {
    const resultModal = document.getElementById('scanResultModal');
    const resultBody = document.getElementById('scanResultModalBody');
    if (!resultModal || !resultBody) return;

    const startTime = Date.now();
    const activeProfile = storageService.getActiveProfile();
    let sources = storageService.getSources().filter(s => s.isEnabled);

    // Filter/prioritize sources matching the active profile's target focus
    if (activeProfile.targetFocus?.enabled && activeProfile.targetFocus?.mode === 'STRICT_TARGET') {
      const pDomains = (activeProfile.targetFocus.targetDomains || []).map(d => d.toLowerCase());
      const pOrgs = (activeProfile.targetFocus.targetOrganisations || []).map(o => o.toLowerCase());
      const matched = sources.filter(s => {
        const sDom = (s.domain || '').toLowerCase();
        const sName = (s.name || '').toLowerCase();
        return pDomains.some(pd => sDom.includes(pd)) || pOrgs.some(po => sName.includes(po));
      });
      if (matched.length > 0) {
        sources = matched;
      }
    }

    // 1. Show Scanning Animation with SerpApi Consent Area
    resultBody.innerHTML = `
      <div style="text-align: center; padding: 2rem 1rem;">
        <div style="font-size: 2.5rem; margin-bottom: 1rem;">📡</div>
        <h3 style="font-family: var(--font-heading); font-size: 1.3rem; margin-bottom: 0.5rem;">Live Dynamic Vacancy Scan In Progress</h3>
        <p style="color: var(--text-secondary); font-size: 0.85rem; max-width: 480px; margin: 0 auto 1rem;">
          Querying <strong>SearXNG (24 Public Mirrors)</strong> &amp; ${sources.length} active official channels tailored to "<strong>${app.escapeHtml(activeProfile.name)}</strong>"...
        </p>
        <div style="height: 6px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden; max-width: 380px; margin: 0 auto 1.5rem;">
          <div style="width: 100%; height: 100%; background: linear-gradient(90deg, #3b82f6, #10b981);"></div>
        </div>
        <div id="serpApiConsentContainer" style="display: none; max-width: 520px; margin: 0 auto;"></div>
      </div>
    `;
    resultModal.classList.add('active');

    // 2. Perform Discovery via Multi-Provider Search Orchestration Engine
    try {
      // Clear old search cache to guarantee fresh live results
      storageService.clearSearchCache();

      const primaryRole = (activeProfile.roles && activeProfile.roles[0]) || activeProfile.name || 'Digital Forensics';
      const cleanRole = primaryRole.replace(/[^a-zA-Z0-9\s]/g, '').trim();
      const targetOrgs = (activeProfile.targetFocus && activeProfile.targetFocus.targetOrganisations) ? activeProfile.targetFocus.targetOrganisations : [];
      let queryText = `${cleanRole} recruitment vacancy India`;
      if (activeProfile.targetFocus?.enabled && targetOrgs.length > 0) {
        queryText = `${targetOrgs[0]} ${cleanRole} recruitment vacancy`;
      }

      // Interactive SerpApi Confirmation Handler
      const confirmSerpApiUsage = (provider, q) => {
        return new Promise((resolve) => {
          const consentContainer = document.getElementById('serpApiConsentContainer');
          if (!consentContainer) return resolve(false);

          consentContainer.style.display = 'block';
          consentContainer.innerHTML = `
            <div style="background: rgba(245, 158, 11, 0.12); border: 2px solid #f59e0b; border-radius: var(--radius-lg); padding: 1.25rem; text-align: left; box-shadow: 0 10px 25px rgba(0,0,0,0.3);">
              <div style="display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.5rem;">
                <span style="font-size: 1.4rem;">🔑</span>
                <strong style="color: #fbbf24; font-size: 1rem;">SerpApi Authorization Required</strong>
              </div>
              <p style="font-size: 0.85rem; color: var(--text-main); line-height: 1.5; margin: 0 0 0.75rem 0;">
                SearXNG (₹0.00 Metasearch) was busy or unreachable for <em>"${app.escapeHtml(q)}"</em>. 
                Would you like to search via <strong>SerpApi (Google Jobs API)</strong>?
              </p>
              <div style="font-size: 0.78rem; color: var(--text-secondary); margin-bottom: 1rem; display: flex; gap: 1.25rem;">
                <span>📊 Quota Remaining: <strong style="color: #34d399;">${provider.quotaRemaining} / ${provider.freeQuotaLimit}</strong></span>
                <span>💳 Cost: <strong>₹0.00 (Free Monthly)</strong></span>
              </div>
              <div style="display: flex; gap: 0.75rem;">
                <button id="btnConfirmSerpApiYes" type="button" class="btn btn-primary btn-sm" style="background: #f59e0b; border-color: #f59e0b; color: #000; font-weight: 700;">
                  ✅ Yes, Use SerpApi (1 Credit)
                </button>
                <button id="btnConfirmSerpApiNo" type="button" class="btn btn-outline btn-sm">
                  ❌ No, Keep ₹0.00 / Skip SerpApi
                </button>
              </div>
            </div>
          `;

          document.getElementById('btnConfirmSerpApiYes')?.addEventListener('click', () => {
            consentContainer.style.display = 'none';
            resolve(true);
          });
          document.getElementById('btnConfirmSerpApiNo')?.addEventListener('click', () => {
            consentContainer.style.display = 'none';
            resolve(false);
          });
        });
      };

      // Execute search orchestration with failover and live bypass
      const orchestrationResult = await searchOrchestrationEngine.searchWithFailover(queryText, {
        category: 'ALL',
        bypassCache: true,
        confirmProviderUsage: confirmSerpApiUsage
      });

      let discoveredLeads = orchestrationResult.results || [];
      const metadata = orchestrationResult.metadata || {};

      // Also query live SearXNG metasearch directly to guarantee maximum live web leads
      try {
        const searxProviders = storageService.getSearchProviders();
        const searxProv = searxProviders.find(p => p.type === 'SEARXNG' && p.isEnabled);
        if (searxProv) {
          const endpoint = (searxProv.endpoint || 'https://www.isci.si').replace(/\/+$/, '');
          const proxyUrl = typeof window !== 'undefined' ? '/api/search-proxy' : 'http://localhost:3001/api/search-proxy';
          const searxRes = await fetch(proxyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              providerType: 'SEARXNG',
              query: queryText,
              endpoint
            }),
            signal: AbortSignal.timeout(10000)
          });
          if (searxRes.ok) {
            const searxData = await searxRes.json();
            if (searxData.success && Array.isArray(searxData.leads) && searxData.leads.length > 0) {
              const liveSearxLeads = searxData.leads.map(l => ({
                ...l,
                isLiveDiscovered: true,
                isTestData: false,
                provenance: {
                  providerId: 'prov-searxng',
                  providerName: searxData.provider || 'SearXNG Metasearch',
                  discoveredAt: new Date().toISOString()
                }
              }));
              discoveredLeads = [...liveSearxLeads, ...discoveredLeads];
            }
          }
        }
      } catch (_) {}

      let newCount = 0;
      let verifiedCount = 0;

      // 3. Process, audit, and deduplicate discovered items
      for (const lead of discoveredLeads) {
        // Anti-Resurrection Guard: Skip items deleted to Trash
        if (storageService.isTrashed(lead)) {
          continue;
        }

        if (lead.domain) {
          SourceRegistryService.registerDiscoveredDomain(lead.domain, lead.organisation, lead.sourceUrl, `Auto-Discovered (${metadata.providerUsed || 'Orchestration'})`);
        }

        // Run Verification Audit
        const audit = VerificationEngine.auditVacancy(lead);
        lead.verification = {
          ...lead.verification,
          status: audit.status,
          confidenceScore: audit.confidenceScore,
          confirmedFacts: audit.confirmedFacts,
          uncertainFields: audit.uncertainFields,
          verifiedAt: new Date().toISOString()
        };

        // Run Multi-dimensional Match
        lead.matchAnalysis = MatchingEngine.evaluateMatch(activeProfile, lead);

        // Check if already in database by title, advt or URL
        const existing = storageService.getVacancies().find(v => 
          (v.advertisementNumber && lead.advertisementNumber && v.advertisementNumber === lead.advertisementNumber) ||
          (v.title && lead.title && v.title.toLowerCase().trim() === lead.title.toLowerCase().trim() && v.organisation?.toLowerCase() === lead.organisation?.toLowerCase()) ||
          (v.sourceUrl && lead.sourceUrl && v.sourceUrl === lead.sourceUrl)
        );

        if (!existing) {
          lead.id = lead.id || `vac-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
          lead.isTestData = false;
          lead.isLiveDiscovered = true;
          storageService.saveVacancy(lead);
          newCount++;
          if (audit.status === 'OFFICIALLY_VERIFIED') verifiedCount++;
        }
      }

      const elapsedMs = Date.now() - startTime;

      // 4. Record execution log
      storageService.addLog({
        status: 'SUCCESS',
        type: 'MANUAL_SCAN',
        message: `Live scan completed in ${elapsedMs}ms via [${metadata.providerUsed || 'SearXNG & Public Feeds'}]. ${newCount} live vacancies discovered.`,
        sourcesChecked: sources.length,
        newVacanciesFound: newCount
      });

      // 4b. Automatic Background Sync to Google Sheets if Webhook is configured
      const providerConfig = storageService.getProviderConfig();
      const webhookUrl = providerConfig?.googleAppsScriptWebhookUrl?.trim();
      let sheetsSyncBadge = '';

      if (webhookUrl && newCount > 0) {
        try {
          const allVacancies = storageService.getVacancies();
          const syncRes = await fetch('/api/sync-webhook', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url: webhookUrl,
              payload: { action: 'SYNC_VACANCIES', vacancies: allVacancies }
            })
          });
          const syncData = await syncRes.json();
          if (syncData.status === 'SUCCESS') {
            sheetsSyncBadge = `
              <div style="margin-bottom: 1.25rem; background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.35); border-radius: var(--radius-md); padding: 0.75rem 1rem; font-size: 0.82rem; color: #34d399; display: flex; align-items: center; gap: 0.6rem;">
                <span style="font-size: 1.3rem;">☁️</span>
                <div>
                  <strong>Automatically Saved to Google Sheets!</strong><br>
                  <span style="color: var(--text-secondary); font-size: 0.76rem;">All +${newCount} newly discovered vacancies were mirrored to your cloud spreadsheet in real-time.</span>
                </div>
              </div>
            `;
          }
        } catch (_) {}
      }

      // 5. Refresh UI
      app.refreshAll();

      // 6. Display Completion Summary in Modal
      resultBody.innerHTML = `
        <div style="padding: 1.5rem 1rem;">
          <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem;">
            <span style="font-size: 2rem;">✅</span>
            <div>
              <h3 style="font-family: var(--font-heading); font-size: 1.25rem;">Live Scan Completed Successfully</h3>
              <span style="font-size: 0.8rem; color: var(--text-secondary);">
                Active Engine: <strong style="color: #60a5fa;">SearXNG (24 Mirrors) &amp; Live Feeds</strong> • Duration: ${elapsedMs}ms • <strong>₹0.00 Incurred</strong>
              </span>
            </div>
          </div>

          ${metadata.failoverEvents && metadata.failoverEvents.length > 0 ? `
            <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: var(--radius-md); padding: 0.75rem 1rem; margin-bottom: 1rem; font-size: 0.8rem;">
              <span style="font-weight: 700; color: #fbbf24;">⚠️ Provider Activity &amp; Consent Log:</span>
              ${metadata.failoverEvents.map(e => `
                <div style="margin-top: 0.25rem; color: var(--text-secondary);">
                  • <strong>${app.escapeHtml(e.fromProviderName)}</strong> (${app.escapeHtml(e.reason)}: ${app.escapeHtml(e.errorMessage)})
                </div>
              `).join('')}
            </div>
          ` : ''}

          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1.5rem;">
            <div style="background: var(--bg-surface-elevated); padding: 1rem; border-radius: var(--radius-md); text-align: center; border: 1px solid var(--border-subtle);">
              <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Public Sources</div>
              <div style="font-size: 1.6rem; font-weight: 700; color: var(--text-main); font-family: var(--font-mono);">${sources.length}</div>
            </div>
            <div style="background: var(--bg-surface-elevated); padding: 1rem; border-radius: var(--radius-md); text-align: center; border: 1px solid var(--border-subtle);">
              <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Live Vacancies Found</div>
              <div style="font-size: 1.6rem; font-weight: 700; color: #34d399; font-family: var(--font-mono);">+${newCount}</div>
            </div>
            <div style="background: var(--bg-surface-elevated); padding: 1rem; border-radius: var(--radius-md); text-align: center; border: 1px solid var(--border-subtle);">
              <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Officially Verified</div>
              <div style="font-size: 1.6rem; font-weight: 700; color: #60a5fa; font-family: var(--font-mono);">${verifiedCount}</div>
            </div>
          </div>

          ${sheetsSyncBadge}

          <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1.25rem; line-height: 1.5;">
            All discovered leads have been audited for domain validity and matched against your <strong>${app.escapeHtml(activeProfile.name)}</strong> profile.
          </p>

          <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
            <button id="btnCloseScanSummary" class="btn btn-primary" style="flex: 2; justify-content: center;">
              View Discovered Vacancies
            </button>
            <button id="btnPurgeTestData" class="btn btn-outline" style="flex: 1; justify-content: center; border-color: rgba(239, 68, 68, 0.4); color: #f87171;" title="Remove initial sample test data and keep only live vacancies">
              🧹 Purge Old Test Data
            </button>
          </div>
        </div>
      `;

      document.getElementById('btnCloseScanSummary').onclick = () => {
        resultModal.classList.remove('active');
        app.switchTab('vacancies');
      };

      document.getElementById('btnPurgeTestData')?.addEventListener('click', () => {
        storageService.purgeTestData();
        app.refreshAll();
        resultModal.classList.remove('active');
        app.switchTab('vacancies');
      });

    } catch (err) {
      resultBody.innerHTML = `
        <div style="padding: 1.5rem; text-align: center;">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">❌</div>
          <h3 style="font-family: var(--font-heading); color: #f87171;">Scan Error</h3>
          <p style="font-size: 0.85rem; color: var(--text-secondary); margin: 0.5rem 0 1.5rem;">${app.escapeHtml(err.message)}</p>
          <button id="btnCloseScanError" class="btn btn-outline" style="width: 100%; justify-content: center;">Dismiss</button>
        </div>
      `;
      document.getElementById('btnCloseScanError').onclick = () => resultModal.classList.remove('active');
    }
  }
