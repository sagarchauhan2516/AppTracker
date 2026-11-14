/**
 * Vacancy Radar India - Visual Search Profile Builder UI Component
 * Provides an interactive interface to configure and save multiple search profiles.
 * Features:
 * - 1-Click Role Presets (DFIR, Cyber Crime Investigator, Forensic Scientist, SOC Analyst, VAPT)
 * - Target Organisation & Website Focus (Strict Whitelist Filter vs Priority Boost)
 * - Zero code editing required to create, switch, and customize profiles.
 */

import { storageService } from '../services/storageService.js';
import { KeywordExpansionEngine } from '../engine/keywordExpansion.js';
import { ROLE_PRESETS, KNOWN_APEX_TARGETS } from '../data/rolePresets.js';
import { AiSuggestionsEngine } from '../engine/aiSuggestionsEngine.js';
import { showConfirmationBanner } from '../services/notificationService.js';
import { escapeHtml } from '../utils/htmlUtils.js';

export class ProfileBuilderUI {
  constructor(containerId, onProfileUpdated) {
    this.container = document.getElementById(containerId);
    this.onProfileUpdated = onProfileUpdated;
    this.currentProfile = null;
    this.expandedTerms = [];
  }

  render(forceReload = false) {
    if (!this.container) return;
    if (!this.currentProfile || forceReload) {
      this.currentProfile = JSON.parse(JSON.stringify(storageService.getActiveProfile()));
    }
    
    // Ensure targetFocus schema integrity
    if (!this.currentProfile.targetFocus) {
      this.currentProfile.targetFocus = {
        enabled: false,
        mode: 'PRIORITY_BOOST',
        targetDomains: ['cdac.in', 'upsc.gov.in', 'nfsu.ac.in', 'drdo.gov.in', 'cfslcbi.gov.in'],
        targetOrganisations: []
      };
    }

    // Clean and deduplicate target domains (strip duplicate org names like "Deloitte India")
    const rawDomains = [
      ...(this.currentProfile.targetFocus.targetDomains || []),
      ...(this.currentProfile.targetFocus.targetOrganisations || []).filter(o => o && o.includes('.'))
    ];
    const uniqueTargetDomains = Array.from(new Set(
      rawDomains
        .map(d => String(d).replace(/^https?:\/\//i, '').split('/')[0].toLowerCase().trim())
        .filter(d => d && d.includes('.'))
    ));
    this.currentProfile.targetFocus.targetDomains = uniqueTargetDomains;
    this.currentProfile.targetFocus.targetOrganisations = []; // prevent redundant org labels

    this.expandedTerms = KeywordExpansionEngine.expandKeywords(
      this.currentProfile.keywords || [],
      this.currentProfile.roles || []
    );

    const generatedQueries = KeywordExpansionEngine.generateSearchQueries(
      this.currentProfile,
      this.expandedTerms
    );

    const allProfiles = storageService.getProfiles();
    const targetFocus = this.currentProfile.targetFocus;
    const roleSuggestions = AiSuggestionsEngine.getRoleSuggestions(this.currentProfile).slice(0, 8);
    const websiteSuggestions = AiSuggestionsEngine.getWebsiteSuggestions(this.currentProfile).slice(0, 10);
    const keywordSuggestions = AiSuggestionsEngine.getKeywordSuggestions(this.currentProfile).slice(0, 14);

    this.container.innerHTML = `
      <div class="profile-builder-card" style="background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 2rem;">
        
        <!-- Header & Profile Actions -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; margin-bottom: 2rem; border-bottom: 1px solid var(--border-subtle); padding-bottom: 1.5rem;">
          <div>
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <h2 style="font-family: var(--font-heading); font-size: 1.5rem;">Visual Search Profile Builder</h2>
              <span class="badge-test-flag" style="background: rgba(59, 130, 246, 0.15); color: #60a5fa; border-color: rgba(59, 130, 246, 0.3);">NO CODE EDITING REQUIRED</span>
            </div>
            <p style="color: var(--text-secondary); font-size: 0.875rem; margin-top: 0.25rem;">
              Create distinct role profiles (DFIR, Cyber Investigator, Forensic Scientist, SOC Analyst) with custom keyword expansion and target website focusing.
            </p>
          </div>

          <!-- Profile Switcher & Action Buttons -->
          <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
            <div style="display: flex; align-items: center; gap: 0.4rem; background: var(--bg-surface-elevated); padding: 0.35rem 0.65rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
              <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">Switch:</span>
              <select id="builderProfileSwitcher" class="filter-select" style="padding: 0.25rem 0.5rem; font-size: 0.8rem; background: transparent; border: none; font-weight: 600;">
                ${allProfiles.map(p => `
                  <option value="${p.id}" ${p.id === this.currentProfile.id ? 'selected' : ''}>
                    ${this.escapeHtml(p.name)}
                  </option>
                `).join('')}
              </select>
            </div>
            <button id="btnNewProfile" class="btn btn-primary btn-sm" style="font-weight: 600; display: inline-flex; align-items: center; gap: 0.35rem;">
              <i data-lucide="plus" class="icon-xs"></i> New Role Profile
            </button>
            <button id="btnCloneProfile" class="btn btn-outline btn-sm" title="Clone active profile as a duplicate" style="display: inline-flex; align-items: center; gap: 0.35rem;">
              <i data-lucide="copy" class="icon-xs"></i> Duplicate
            </button>
            ${allProfiles.length > 1 ? `
              <button id="btnDeleteProfile" class="btn btn-outline btn-sm" style="color: #f87171; border-color: rgba(239, 68, 68, 0.3); display: inline-flex; align-items: center; gap: 0.35rem;" title="Delete this profile">
                <i data-lucide="trash-2" class="icon-xs"></i> Delete
              </button>
            ` : ''}
            <button id="btnSaveProfile" class="btn btn-outline btn-sm" style="border-color: rgba(16, 185, 129, 0.4); color: #34d399; display: inline-flex; align-items: center; gap: 0.35rem;">
              <i data-lucide="save" class="icon-xs"></i> Save Changes
            </button>
          </div>
        </div>

        <form id="profileForm" onsubmit="return false;">
          <!-- Section 1: Profile Identity & Target Roles -->
          <div style="margin-bottom: 2rem;">
            <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 1.5rem; margin-bottom: 1.5rem;">
              <div>
                <label style="font-size: 0.8rem; font-weight: 600; text-transform: uppercase; color: var(--text-muted); display: block; margin-bottom: 0.4rem;">Profile Name</label>
                <input type="text" id="profNameInput" class="search-input" value="${this.escapeHtml(this.currentProfile.name)}" style="width: 100%;">
              </div>
              <div>
                <label style="font-size: 0.8rem; font-weight: 600; text-transform: uppercase; color: var(--text-muted); display: block; margin-bottom: 0.4rem;">Add Role / Job Title</label>
                <div style="display: flex; gap: 0.5rem;">
                  <input type="text" id="roleTagInput" class="search-input" placeholder="e.g. Cyber Forensics Investigator, DFIR Lead..." style="flex: 1;">
                  <button type="button" id="btnAddRole" class="btn btn-outline btn-sm">Add Role</button>
                </div>
              </div>
            </div>

            <label style="font-size: 0.8rem; font-weight: 600; text-transform: uppercase; color: var(--text-muted); display: block; margin-bottom: 0.4rem;">Active Target Roles</label>
            <div id="rolesChipsContainer" style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1rem;">
              ${this.currentProfile.roles.map(r => `
                <span class="meta-pill" style="display: inline-flex; align-items: center; gap: 0.5rem; background: var(--bg-surface-elevated); border-color: var(--border-active);">
                  <strong>${this.escapeHtml(r)}</strong>
                  <button type="button" class="btn-remove-role" data-role="${this.escapeHtml(r)}" style="background: none; border: none; color: #f87171; cursor: pointer; font-size: 0.9rem;">&times;</button>
                </span>
              `).join('')}
            </div>

            <!-- AI Suggested Roles -->
            ${roleSuggestions.length > 0 ? `
              <div class="ai-suggestion-tray">
                <div class="ai-suggestion-tray-header">
                  <span class="ai-suggestion-title" style="display: inline-flex; align-items: center; gap: 0.35rem;"><i data-lucide="sparkles" class="icon-xs text-purple"></i> AI Suggested Designations for this Profile:</span>
                  <span style="font-size: 0.72rem; color: var(--text-muted);">Click to 1-click add</span>
                </div>
                <div class="ai-suggestion-chips-grid">
                  ${roleSuggestions.map(r => `
                    <button type="button" class="ai-suggestion-chip btn-add-ai-role" data-role="${this.escapeHtml(r)}" title="Add role ${this.escapeHtml(r)}">
                      ${this.escapeHtml(r)} <span class="chip-add-icon">+</span>
                    </button>
                  `).join('')}
                </div>
              </div>
            ` : ''}

            <!-- Profile-Specific Alert Email Recipients (Separate per profile, multiple supported) -->
            <div style="background: rgba(96, 165, 250, 0.06); border: 1px solid rgba(96, 165, 250, 0.25); border-radius: var(--radius-md); padding: 1.1rem 1.25rem; margin-top: 1rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.5rem;">
                <label style="font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: #60a5fa; display: flex; align-items: center; gap: 0.4rem; margin: 0;">
                  <i data-lucide="mail" class="icon-xs"></i> Alert Email Recipients for this Profile (Supports Multiple)
                </label>
                <span style="font-size: 0.72rem; color: var(--text-muted); background: var(--bg-surface-elevated); padding: 0.2rem 0.5rem; border-radius: var(--radius-sm);">
                  Configured separately per profile
                </span>
              </div>
              <input type="text" id="profEmailInput" class="search-input" 
                placeholder="e.g. candidate@dfir-india.org, alerts@team.in, lead@org.ac.in" 
                value="${this.escapeHtml(this.currentProfile.scheduleSettings?.emailAddress || '')}" 
                style="width: 100%; font-size: 0.85rem; font-weight: 500;">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.4rem;">
                <small style="font-size: 0.74rem; color: var(--text-secondary);">
                  Separate multiple email addresses with commas. Alerts for <strong>"${this.escapeHtml(this.currentProfile.name)}"</strong> will be dispatched to each recipient.
                </small>
                <label style="display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.76rem; color: #38bdf8; cursor: pointer;">
                  <input type="checkbox" id="profEmailAlertsEnabled" ${this.currentProfile.scheduleSettings?.emailAlertsEnabled !== false ? 'checked' : ''}>
                  <span>Enable instant email alerts</span>
                </label>
              </div>
            </div>

            <!-- Profile-Specific Telegram Alert Recipients (Separate per profile, multiple accounts supported) -->
            <div style="background: rgba(56, 189, 248, 0.06); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: var(--radius-md); padding: 1.1rem 1.25rem; margin-top: 1rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.5rem;">
                <label style="font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: #38bdf8; display: flex; align-items: center; gap: 0.4rem; margin: 0;">
                  <i data-lucide="send" class="icon-xs"></i> Telegram Alert Recipient(s) for this Profile (Supports Multiple)
                </label>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                  <span style="font-size: 0.72rem; color: var(--text-muted); background: var(--bg-surface-elevated); padding: 0.2rem 0.5rem; border-radius: var(--radius-sm);">
                    Configured separately per profile
                  </span>
                  <a href="https://t.me/vacancy_radar1_bot" target="_blank" rel="noopener noreferrer" style="font-size: 0.72rem; color: #38bdf8; text-decoration: underline; font-weight: 600;">
                    Open @vacancy_radar1_bot ↗
                  </a>
                </div>
              </div>
              <input type="text" id="profTelegramInput" class="search-input" 
                placeholder="e.g. 987654321, 123456789, @my_channel" 
                value="${this.escapeHtml(this.currentProfile.scheduleSettings?.telegramChatId || '')}" 
                style="width: 100%; font-size: 0.85rem; font-weight: 500; font-family: var(--font-mono);">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.4rem;">
                <small style="font-size: 0.74rem; color: var(--text-secondary);">
                  Separate multiple Telegram Chat IDs or @channels with commas. New candidates just tap <strong>START</strong> in <code>@vacancy_radar1_bot</code> once.
                </small>
                <label style="display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.76rem; color: #38bdf8; cursor: pointer;">
                  <input type="checkbox" id="profTelegramAlertsEnabled" ${this.currentProfile.scheduleSettings?.telegramAlertsEnabled !== false ? 'checked' : ''}>
                  <span>Enable instant Telegram alerts</span>
                </label>
              </div>
            </div>
          </div>

          <!-- Section 2: TARGET ORGANISATION & WEBSITE FOCUS (User-Requested) -->
          <div style="background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: var(--radius-md); padding: 1.5rem; margin-bottom: 2rem;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.25rem;">
              <div>
                <div style="display: flex; align-items: center; gap: 0.6rem;">
                  <i data-lucide="crosshair" class="icon-md text-emerald"></i>
                  <h3 style="font-family: var(--font-heading); font-size: 1.15rem; color: #34d399;">Target Organisation &amp; Website Focus</h3>
                  <span class="badge-test-flag" style="background: rgba(16, 185, 129, 0.15); color: #34d399; border-color: rgba(16, 185, 129, 0.3);">
                    ${targetFocus.enabled ? (targetFocus.mode === 'STRICT_TARGET' ? 'Strict Focus Active' : 'Priority Boost Active') : 'Disabled'}
                  </span>
                </div>
                <p style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.25rem;">
                  Limit or prioritize discovery on specific official employer websites and recruitment bodies (e.g. C-DAC, UPSC, NFSU, State Cyber Police, CFSL, DRDO).
                </p>
              </div>

              <!-- Main Enable Toggle -->
              <label style="display: flex; align-items: center; gap: 0.55rem; cursor: pointer; background: var(--bg-surface-elevated); padding: 0.55rem 1rem; border-radius: var(--radius-md); border: 1px solid rgba(16, 185, 129, 0.4); font-weight: 600; font-size: 0.85rem; color: #34d399;">
                <input type="checkbox" id="chkTargetFocusEnabled" ${targetFocus.enabled ? 'checked' : ''}>
                <span>Focus on Selected Websites / Orgs</span>
              </label>
            </div>

            <div id="targetFocusDetailsArea" style="${targetFocus.enabled ? '' : 'opacity: 0.55; pointer-events: none; filter: grayscale(40%);'}">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.25rem;">
                <div>
                  <label style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); display: block; margin-bottom: 0.4rem;">
                    Focus Enforcement Mode
                  </label>
                  <select id="targetFocusModeSelect" class="filter-select" style="width: 100%;">
                    <option value="STRICT_TARGET" ${targetFocus.mode === 'STRICT_TARGET' ? 'selected' : ''}>
                      Strict Target Filtering (Show ONLY selected websites/orgs)
                    </option>
                    <option value="PRIORITY_BOOST" ${targetFocus.mode === 'PRIORITY_BOOST' ? 'selected' : ''}>
                      Priority Boost (+15% score bonus &amp; Target Focus badge)
                    </option>
                  </select>
                  <small style="display: block; font-size: 0.72rem; color: var(--text-muted); margin-top: 0.25rem;">
                    Strict mode excludes non-matching vacancies. Priority boost highlights matching organizations while still showing all vacancies.
                  </small>
                </div>

                <div>
                  <label style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); display: block; margin-bottom: 0.4rem;">
                    Add Custom Target Website
                  </label>
                  <div style="display: flex; gap: 0.5rem;">
                    <input type="text" id="customTargetInput" class="search-input" placeholder="e.g. isro.gov.in, barc.gov.in, iitb.ac.in..." style="flex: 1; font-size: 0.82rem;">
                    <button type="button" id="btnAddCustomTarget" class="btn btn-outline btn-sm">+ Add Website</button>
                  </div>
                </div>
              </div>

              <!-- 1. ACTIVE WHITELISTED WEBSITES -->
              <div style="background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 1rem 1.25rem; margin-bottom: 1.25rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem;">
                  <span style="font-size: 0.78rem; text-transform: uppercase; color: #34d399; font-weight: 700; display: inline-flex; align-items: center; gap: 0.35rem;">
                    <i data-lucide="crosshair" class="icon-xs"></i> Active Whitelisted Websites (${uniqueTargetDomains.length} Active):
                  </span>
                  ${uniqueTargetDomains.length > 0 ? `
                    <button type="button" id="btnClearAllTargets" class="btn btn-outline btn-sm" style="font-size: 0.7rem; padding: 0.15rem 0.5rem; color: #f87171; border-color: rgba(239, 68, 68, 0.3);">
                      Clear All
                    </button>
                  ` : ''}
                </div>
                <div id="targetChipsContainer" style="display: flex; flex-wrap: wrap; gap: 0.45rem;">
                  ${uniqueTargetDomains.map(d => `
                    <span class="target-focus-chip">
                      <i data-lucide="globe" class="icon-xs"></i> <strong>${this.escapeHtml(d)}</strong>
                      <button type="button" class="target-focus-chip-remove btn-remove-domain" data-domain="${this.escapeHtml(d)}" title="Remove ${this.escapeHtml(d)}">&times;</button>
                    </span>
                  `).join('')}
                  ${uniqueTargetDomains.length === 0 ? `
                    <span style="font-size: 0.78rem; color: var(--text-muted); font-style: italic;">
                      No specific websites whitelisted yet. All official registered sources are scanned. Click any AI recommendation below or add custom websites to restrict discovery.
                    </span>
                  ` : ''}
                </div>
              </div>

              <!-- 2. AI RECOMMENDED OFFICIAL PORTALS & PSUS -->
              <div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.45rem; flex-wrap: wrap; gap: 0.5rem;">
                  <span style="font-size: 0.75rem; text-transform: uppercase; color: #60a5fa; font-weight: 700; display: inline-flex; align-items: center; gap: 0.35rem;">
                    <i data-lucide="sparkles" class="icon-xs text-blue"></i> AI Recommended Portals &amp; PSUs (1-Click Whitelist):
                  </span>
                  <button type="button" id="btnAiAutoSelectTargets" class="btn btn-outline btn-sm" style="font-size: 0.72rem; padding: 0.2rem 0.55rem; border-color: rgba(168, 85, 247, 0.4); color: #c084fc; background: rgba(168, 85, 247, 0.08); display: inline-flex; align-items: center; gap: 0.35rem;">
                    <i data-lucide="bot" class="icon-xs"></i> AI Auto-Select
                  </button>
                </div>
                <div id="statusAiAutoSelect" style="display: none; font-size: 0.75rem; color: #a855f7; margin-bottom: 0.4rem;"></div>
                <div class="ai-suggestion-tray" style="border-color: rgba(96, 165, 250, 0.35); background: rgba(96, 165, 250, 0.04); padding: 0.75rem;">
                  <div class="ai-suggestion-chips-grid">
                    ${websiteSuggestions.map(w => {
                      const isAdded = uniqueTargetDomains.includes(w.domain.toLowerCase());
                      return `
                        <button type="button" class="ai-suggestion-chip btn-add-ai-website ${isAdded ? 'added' : ''}" data-domain="${w.domain}" data-org="${this.escapeHtml(w.org)}" title="${this.escapeHtml(w.org)}">
                          <span style="display: inline-flex; align-items: center;">${isAdded ? '<i data-lucide="check" class="icon-xs"></i>' : '+'}</span>
                          <strong>${w.domain}</strong>
                          <small style="opacity: 0.75; font-size: 0.68rem;">(${this.escapeHtml(w.org.split('(')[0].trim())})</small>
                        </button>
                      `;
                    }).join('')}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Section 3: Technical Keywords & Automated Expansion -->
          <div style="background: var(--bg-surface-elevated); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 1.5rem; margin-bottom: 2rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
              <div>
                <h3 style="font-family: var(--font-heading); font-size: 1.15rem; color: var(--text-main);">Automatic Keyword Expansion &amp; Rationale</h3>
                <p style="font-size: 0.8rem; color: var(--text-secondary);">
                  Expands seed terms into synonyms, abbreviations, toolkits, and Indian Evidence Act provisions. Measure relevance and exclude as desired.
                </p>
              </div>
              <div style="display: flex; gap: 0.5rem;">
                <input type="text" id="keywordTagInput" class="search-input" placeholder="Add seed keyword..." style="width: 220px; font-size: 0.8rem;">
                <button type="button" id="btnAddKeyword" class="btn btn-outline btn-sm">+ Add</button>
              </div>
            </div>

            <!-- Seed Keywords Tags -->
            <div style="margin-bottom: 1.25rem;">
              <span style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 600; display: block; margin-bottom: 0.35rem;">Seed User Keywords:</span>
              <div id="keywordsChipsContainer" style="display: flex; flex-wrap: wrap; gap: 0.4rem;">
                ${this.currentProfile.keywords.map(k => `
                  <span class="meta-pill" style="display: inline-flex; align-items: center; gap: 0.4rem;">
                    ${this.escapeHtml(k)}
                    <button type="button" class="btn-remove-keyword" data-keyword="${this.escapeHtml(k)}" style="background: none; border: none; color: #f87171; cursor: pointer;">&times;</button>
                  </span>
                `).join('')}
              </div>

              <!-- AI Suggested Technical Keywords -->
              ${keywordSuggestions.length > 0 ? `
                <div class="ai-suggestion-tray">
                  <div class="ai-suggestion-tray-header">
                    <span class="ai-suggestion-title" style="display: inline-flex; align-items: center; gap: 0.35rem;"><i data-lucide="sparkles" class="icon-xs text-purple"></i> AI Recommended Technical Keywords &amp; Tools:</span>
                    <span style="font-size: 0.72rem; color: var(--text-muted);">Click any keyword to 1-click add to profile</span>
                  </div>
                  <div class="ai-suggestion-chips-grid">
                    ${keywordSuggestions.map(k => `
                      <button type="button" class="ai-suggestion-chip btn-add-ai-keyword" data-keyword="${this.escapeHtml(k)}" title="Add keyword ${this.escapeHtml(k)}">
                        <i data-lucide="sparkles" class="icon-xs text-purple"></i> <strong>${this.escapeHtml(k)}</strong> <span class="chip-add-icon">+</span>
                      </button>
                    `).join('')}
                  </div>
                </div>
              ` : ''}
            </div>

            <!-- Expanded Terms Table -->
            <div style="border-top: 1px solid var(--border-subtle); padding-top: 1rem;">
              <span style="font-size: 0.78rem; text-transform: uppercase; color: #60a5fa; font-weight: 700; display: inline-flex; align-items: center; gap: 0.35rem; margin-bottom: 0.75rem;">
                <i data-lucide="zap" class="icon-xs"></i> Generated Expansions (${this.expandedTerms.length} Identified with Traceable Rationale)
              </span>
              <div style="display: flex; flex-direction: column; gap: 0.6rem; max-height: 280px; overflow-y: auto; padding-right: 0.5rem;">
                ${this.expandedTerms.map((item, idx) => `
                  <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-surface); padding: 0.6rem 0.9rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); font-size: 0.8rem;">
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                      <input type="checkbox" id="chk-term-${idx}" class="term-toggle-chk" data-term="${this.escapeHtml(item.term)}" ${item.isEnabled ? 'checked' : ''}>
                      <div>
                        <strong style="color: var(--text-main); font-size: 0.85rem;">${this.escapeHtml(item.term)}</strong>
                        <span style="font-size: 0.7rem; color: var(--text-muted); margin-left: 0.5rem; background: rgba(255,255,255,0.05); padding: 0.1rem 0.4rem; border-radius: 4px;">${item.category}</span>
                        <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.15rem;">
                          ${this.escapeHtml(item.rationale)}
                        </div>
                      </div>
                    </div>
                    <div style="text-align: right; min-width: 80px;">
                      <span style="font-family: var(--font-mono); font-weight: 600; color: #34d399;">${Math.round(item.relevanceScore * 100)}% Match</span>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>

          <!-- Section 4: Generated Search Queries Preview -->
          <div style="background: rgba(30, 41, 59, 0.3); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 1.25rem; margin-bottom: 2rem;">
            <h4 style="font-size: 0.85rem; text-transform: uppercase; color: var(--accent-primary); letter-spacing: 0.05em; margin-bottom: 0.5rem; display: inline-flex; align-items: center; gap: 0.35rem;">
              <i data-lucide="search" class="icon-xs"></i> Auto-Constructed Production Queries
            </h4>
            <p style="font-size: 0.78rem; color: var(--text-secondary); margin-bottom: 1rem;">
              These queries are dynamically assembled and dispatched to RSS feeds, government career crawlers, and search APIs without manual intervention.
            </p>
            <div style="display: flex; flex-direction: column; gap: 0.75rem;">
              ${generatedQueries.map(q => `
                <div style="background: var(--bg-surface); padding: 0.75rem 1rem; border-radius: var(--radius-sm); border-left: 3px solid var(--accent-primary);">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                    <strong style="font-size: 0.8rem; color: var(--text-main);">${this.escapeHtml(q.targetCategory)}</strong>
                    <span style="font-size: 0.7rem; color: var(--text-muted);">${this.escapeHtml(q.purpose)}</span>
                  </div>
                  <code style="display: block; font-family: var(--font-mono); font-size: 0.75rem; color: #93c5fd; background: var(--bg-surface-elevated); padding: 0.4rem 0.6rem; border-radius: 4px; word-break: break-all;">
                    ${this.escapeHtml(q.queryText)}
                  </code>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Section 5: Education, Experience & Demographics -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
            <!-- Education -->
            <div style="background: var(--bg-surface-elevated); padding: 1.25rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
              <h4 style="font-size: 0.85rem; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.75rem;">Education &amp; Degree</h4>
              <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                <div>
                  <label style="font-size: 0.75rem; color: var(--text-muted);">Degree Level</label>
                  <input type="text" id="eduDegreeInput" class="search-input" value="${this.escapeHtml(this.currentProfile.education.degreeLevel)}" style="width: 100%;">
                </div>
                <div>
                  <label style="font-size: 0.75rem; color: var(--text-muted);">Eligible Degree Branches (Comma separated)</label>
                  <input type="text" id="eduBranchesInput" class="search-input" value="${this.escapeHtml(this.currentProfile.education.eligibleBranches.join(', '))}" style="width: 100%;">
                </div>
                <div>
                  <label style="font-size: 0.75rem; color: var(--text-muted);">Minimum Aggregate Marks (%)</label>
                  <input type="number" id="eduMarksInput" class="search-input" value="${this.currentProfile.education.aggregateMarksPct}" min="40" max="100" style="width: 100%;">
                </div>
              </div>
            </div>

            <!-- Experience -->
            <div style="background: var(--bg-surface-elevated); padding: 1.25rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
              <h4 style="font-size: 0.85rem; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.75rem;">Experience Range</h4>
              <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
                  <div>
                    <label style="font-size: 0.75rem; color: var(--text-muted);">Min Years</label>
                    <input type="number" id="expMinInput" class="search-input" value="${this.currentProfile.experience.minYears}" min="0" max="30" style="width: 100%;">
                  </div>
                  <div>
                    <label style="font-size: 0.75rem; color: var(--text-muted);">Max Years</label>
                    <input type="number" id="expMaxInput" class="search-input" value="${this.currentProfile.experience.maxYears}" min="0" max="30" style="width: 100%;">
                  </div>
                </div>
                <div>
                  <label style="font-size: 0.75rem; color: var(--text-muted);">Current / Prior Role Experience</label>
                  <input type="text" id="expRoleInput" class="search-input" value="${this.escapeHtml(this.currentProfile.experience.currentRole)}" style="width: 100%;">
                </div>
              </div>
            </div>

            <!-- Age & Demographics -->
            <div style="background: var(--bg-surface-elevated); padding: 1.25rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
              <h4 style="font-size: 0.85rem; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.75rem;">Demographics &amp; Reservation</h4>
              <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                <div>
                  <label style="font-size: 0.75rem; color: var(--text-muted);">Current Age (Years)</label>
                  <input type="number" id="demoAgeInput" class="search-input" value="${this.currentProfile.demographics.age}" min="18" max="65" style="width: 100%;">
                </div>
                <div>
                  <label style="font-size: 0.75rem; color: var(--text-muted);">Category / Quota</label>
                  <select id="demoCategorySelect" class="filter-select" style="width: 100%;">
                    <option value="General / Unreserved" ${this.currentProfile.demographics.category.includes('General') ? 'selected' : ''}>General / Unreserved (UR)</option>
                    <option value="OBC (Non-Creamy Layer)" ${this.currentProfile.demographics.category.includes('OBC') ? 'selected' : ''}>OBC (Non-Creamy Layer)</option>
                    <option value="SC / ST" ${this.currentProfile.demographics.category.includes('SC') ? 'selected' : ''}>SC / ST</option>
                    <option value="EWS" ${this.currentProfile.demographics.category.includes('EWS') ? 'selected' : ''}>Economically Weaker Section (EWS)</option>
                    <option value="PwD" ${this.currentProfile.demographics.category.includes('PwD') ? 'selected' : ''}>Persons with Disabilities (PwD)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <!-- Section 6: Sectors, Employment Nature & Location -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
            <!-- Sectors -->
            <div style="background: var(--bg-surface-elevated); padding: 1.25rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
              <h4 style="font-size: 0.85rem; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.75rem;">Target Sectors</h4>
              <div style="display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.825rem;">
                ${['Central Government', 'State Government', 'Public Sector Undertaking (PSU)', 'Autonomous Govt Institution', 'Private Sector', 'Academic / Research Institute'].map(sec => `
                  <label style="display: flex; align-items: center; gap: 0.5rem;">
                    <input type="checkbox" class="sector-chk" value="${sec}" ${this.currentProfile.sectors?.includes(sec) ? 'checked' : ''}>
                    ${sec}
                  </label>
                `).join('')}
              </div>
            </div>

            <!-- Employment Types -->
            <div style="background: var(--bg-surface-elevated); padding: 1.25rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
              <h4 style="font-size: 0.85rem; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.75rem;">Employment Types</h4>
              <div style="display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.825rem;">
                ${['Permanent', 'Contractual', 'Fixed Term', 'Project Based', 'Full Time', 'Part Time', 'Internship', 'Apprenticeship'].map(t => `
                  <label style="display: flex; align-items: center; gap: 0.5rem;">
                    <input type="checkbox" class="type-chk" value="${t}" ${this.currentProfile.employmentTypes?.includes(t) ? 'checked' : ''}>
                    ${t}
                  </label>
                `).join('')}
              </div>
            </div>

            <!-- Location & Remuneration -->
            <div style="background: var(--bg-surface-elevated); padding: 1.25rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
              <h4 style="font-size: 0.85rem; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.75rem;">Locations &amp; Compensation</h4>
              <div style="display: flex; flex-direction: column; gap: 0.75rem; font-size: 0.825rem;">
                <label style="display: flex; align-items: center; gap: 0.5rem;">
                  <input type="checkbox" id="chkAllIndia" ${this.currentProfile.locations?.allIndia ? 'checked' : ''}>
                  <strong>Include All-India Public Postings</strong>
                </label>
                <label style="display: flex; align-items: center; gap: 0.5rem;">
                  <input type="checkbox" id="chkRemote" ${this.currentProfile.locations?.allowRemote ? 'checked' : ''}>
                  Allow Remote Opportunities
                </label>
                <div>
                  <label style="font-size: 0.75rem; color: var(--text-muted);">Target States (Comma separated)</label>
                  <input type="text" id="prefStatesInput" class="search-input" value="${this.escapeHtml(this.currentProfile.locations?.preferredStates?.join(', ') || '')}" style="width: 100%;">
                </div>
                <div>
                  <label style="font-size: 0.75rem; color: var(--text-muted);">Minimum Annual Salary (₹ INR)</label>
                  <input type="number" id="minSalaryInput" class="search-input" value="${this.currentProfile.salary?.minAnnualInr || 600000}" step="50000" style="width: 100%;">
                </div>
              </div>
            </div>
          </div>

          <!-- Bottom Save Actions -->
          <div style="display: flex; justify-content: flex-end; gap: 1rem; border-top: 1px solid var(--border-subtle); padding-top: 1.5rem;">
            <button type="button" id="btnSaveAsNew" class="btn btn-outline" style="display: inline-flex; align-items: center; gap: 0.35rem;">
              <i data-lucide="copy" class="icon-xs"></i> Save As New Separate Profile
            </button>
            <button type="button" id="btnBottomSave" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 0.35rem;">
              <i data-lucide="save" class="icon-xs"></i> Save Profile &amp; Regenerate Radar Queries
            </button>
          </div>
        </form>
      </div>
    `;

    this.bindEvents();
    if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
  }

  bindEvents() {
    // Switcher inside Profile Builder
    document.getElementById('builderProfileSwitcher')?.addEventListener('change', (e) => {
      storageService.setActiveProfile(e.target.value);
      this.currentProfile = null;
      if (this.onProfileUpdated) this.onProfileUpdated();
      this.render(true);
    });

    // Add Role from Input
    const addRoleHandler = () => {
      const input = document.getElementById('roleTagInput');
      const val = (input?.value || '').trim();
      if (!val) return;
      if (!this.currentProfile.roles) this.currentProfile.roles = [];
      if (!this.currentProfile.roles.includes(val)) {
        this.currentProfile.roles.push(val);
        input.value = '';
        this.recomputeAndRerender();
        showConfirmationBanner('Target Role Added!', `Added "${val}" to target designations.`, 'success');
      } else {
        showConfirmationBanner('Already Added', `"${val}" is already included in roles.`, 'info');
      }
    };
    document.getElementById('btnAddRole')?.addEventListener('click', addRoleHandler);
    document.getElementById('roleTagInput')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addRoleHandler();
      }
    });

    // Remove Role
    this.container.querySelectorAll('.btn-remove-role').forEach(btn => {
      btn.addEventListener('click', () => {
        const role = btn.getAttribute('data-role');
        this.currentProfile.roles = (this.currentProfile.roles || []).filter(r => r !== role);
        this.recomputeAndRerender();
        showConfirmationBanner('Role Removed', `Removed "${role}" from profile.`, 'info');
      });
    });

    // 1-Click Add / Toggle AI Suggested Role
    this.container.querySelectorAll('.btn-add-ai-role').forEach(btn => {
      btn.addEventListener('click', () => {
        const role = btn.getAttribute('data-role');
        if (!role) return;
        if (!this.currentProfile.roles) this.currentProfile.roles = [];
        if (!this.currentProfile.roles.includes(role)) {
          this.currentProfile.roles.push(role);
          this.recomputeAndRerender();
          showConfirmationBanner('Target Role Added!', `Added "${role}" to active profile roles.`, 'success');
        } else {
          this.currentProfile.roles = this.currentProfile.roles.filter(r => r !== role);
          this.recomputeAndRerender();
          showConfirmationBanner('Role Removed', `Removed "${role}" from target designations.`, 'info');
        }
      });
    });

    // Add Keyword from Input
    const addKeywordHandler = () => {
      const input = document.getElementById('keywordTagInput');
      const val = (input?.value || '').trim();
      if (!val) return;
      if (!this.currentProfile.keywords) this.currentProfile.keywords = [];
      if (!this.currentProfile.keywords.includes(val)) {
        this.currentProfile.keywords.push(val);
        input.value = '';
        this.recomputeAndRerender();
        showConfirmationBanner('Keyword Added!', `Added "${val}" to technical keywords.`, 'success');
      } else {
        showConfirmationBanner('Already Added', `"${val}" is already active in keywords.`, 'info');
      }
    };
    document.getElementById('btnAddKeyword')?.addEventListener('click', addKeywordHandler);
    document.getElementById('keywordTagInput')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addKeywordHandler();
      }
    });

    // Remove Keyword
    this.container.querySelectorAll('.btn-remove-keyword').forEach(btn => {
      btn.addEventListener('click', () => {
        const kw = btn.getAttribute('data-keyword');
        this.currentProfile.keywords = (this.currentProfile.keywords || []).filter(k => k !== kw);
        this.recomputeAndRerender();
        showConfirmationBanner('Keyword Removed', `Removed "${kw}" from keywords.`, 'info');
      });
    });

    // 1-Click Add / Toggle AI Suggested Keyword
    this.container.querySelectorAll('.btn-add-ai-keyword').forEach(btn => {
      btn.addEventListener('click', () => {
        const kw = btn.getAttribute('data-keyword');
        if (!kw) return;
        if (!this.currentProfile.keywords) this.currentProfile.keywords = [];
        if (!this.currentProfile.keywords.includes(kw)) {
          this.currentProfile.keywords.push(kw);
          this.recomputeAndRerender();
          showConfirmationBanner('Keyword Added!', `Added "${kw}" with automated dork expansions.`, 'success');
        } else {
          this.currentProfile.keywords = this.currentProfile.keywords.filter(k => k !== kw);
          this.recomputeAndRerender();
          showConfirmationBanner('Keyword Removed', `Removed "${kw}" from technical keywords.`, 'info');
        }
      });
    });

    // Add Custom Website Target
    const addCustomWebsiteHandler = () => {
      const input = document.getElementById('customTargetInput');
      const val = (input?.value || '').trim();
      if (!val) return;
      const domain = val.replace(/^https?:\/\//i, '').split('/')[0].toLowerCase().trim();
      if (!domain) return;

      const tf = this.currentProfile.targetFocus;
      if (!tf.targetDomains) tf.targetDomains = [];
      tf.enabled = true;

      if (!tf.targetDomains.includes(domain)) {
        tf.targetDomains.push(domain);
        input.value = '';
        this.recomputeAndRerender();
        showConfirmationBanner('Website Whitelisted!', `Added "${domain}" to target focus whitelist.`, 'success');
      } else {
        showConfirmationBanner('Already Whitelisted', `"${domain}" is already in your active targets.`, 'info');
      }
    };
    document.getElementById('btnAddCustomTarget')?.addEventListener('click', addCustomWebsiteHandler);
    document.getElementById('customTargetInput')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addCustomWebsiteHandler();
      }
    });

    // 1-Click Add / Toggle AI Suggested Website
    this.container.querySelectorAll('.btn-add-ai-website').forEach(btn => {
      btn.addEventListener('click', () => {
        const rawDomain = btn.getAttribute('data-domain') || '';
        const domain = rawDomain.replace(/^https?:\/\//i, '').split('/')[0].toLowerCase().trim();
        if (!domain) return;
        const tf = this.currentProfile.targetFocus;
        if (!tf.targetDomains) tf.targetDomains = [];
        tf.enabled = true;

        if (tf.targetDomains.includes(domain)) {
          // Toggle off
          tf.targetDomains = tf.targetDomains.filter(d => d !== domain);
          this.recomputeAndRerender();
          showConfirmationBanner('Target Removed', `Removed "${domain}" from whitelist.`, 'info');
        } else {
          // Toggle on
          tf.targetDomains.push(domain);
          this.recomputeAndRerender();
          showConfirmationBanner('Website Whitelisted!', `Added "${domain}" to target focus whitelist.`, 'success');
        }
      });
    });

    // Remove Domain from Chips
    this.container.querySelectorAll('.btn-remove-domain').forEach(btn => {
      btn.addEventListener('click', () => {
        const domain = btn.getAttribute('data-domain');
        if (domain && this.currentProfile.targetFocus?.targetDomains) {
          this.currentProfile.targetFocus.targetDomains = this.currentProfile.targetFocus.targetDomains.filter(d => d !== domain);
          this.recomputeAndRerender();
          showConfirmationBanner('Target Removed', `Removed "${domain}" from whitelist.`, 'info');
        }
      });
    });

    // Clear All Whitelisted Targets
    document.getElementById('btnClearAllTargets')?.addEventListener('click', () => {
      if (this.currentProfile.targetFocus) {
        this.currentProfile.targetFocus.targetDomains = [];
        this.currentProfile.targetFocus.targetOrganisations = [];
        this.recomputeAndRerender();
        showConfirmationBanner('Targets Cleared', 'Whitelisted websites cleared. All sources active.', 'info');
      }
    });

    // Target Focus Enable Toggle
    document.getElementById('chkTargetFocusEnabled')?.addEventListener('change', (e) => {
      this.currentProfile.targetFocus.enabled = e.target.checked;
      const details = document.getElementById('targetFocusDetailsArea');
      if (details) {
        details.style.opacity = e.target.checked ? '1' : '0.55';
        details.style.pointerEvents = e.target.checked ? 'auto' : 'none';
        details.style.filter = e.target.checked ? 'none' : 'grayscale(40%)';
      }
      this.syncFormValuesToProfile();
      storageService.saveProfile(this.currentProfile);
      if (this.onProfileUpdated) this.onProfileUpdated();
    });

    // Target Focus Mode Select
    document.getElementById('targetFocusModeSelect')?.addEventListener('change', (e) => {
      this.currentProfile.targetFocus.mode = e.target.value;
      this.syncFormValuesToProfile();
      storageService.saveProfile(this.currentProfile);
      if (this.onProfileUpdated) this.onProfileUpdated();
    });

    // AI Auto-Select Targets for Active Profile
    document.getElementById('btnAiAutoSelectTargets')?.addEventListener('click', async () => {
      const btn = document.getElementById('btnAiAutoSelectTargets');
      const statusDiv = document.getElementById('statusAiAutoSelect');
      const query = (this.currentProfile.roles && this.currentProfile.roles[0]) || this.currentProfile.name || 'Software Developer';

      const origText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<i data-lucide="loader" class="icon-xs icon-spin"></i> Selecting...';
      if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();

      if (statusDiv) {
        statusDiv.style.display = 'block';
        statusDiv.innerHTML = `<span style="display: inline-flex; align-items: center; gap: 0.35rem;"><i data-lucide="clock" class="icon-xs"></i> AI is selecting official career portals and PSU websites for "${this.escapeHtml(query)}"...</span>`;
        if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
      }

      try {
        const res = await fetch('/api/ai-assist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'RECOMMEND_PROFILE', roleQuery: query })
        });
        const result = await res.json();
        if (result.ok && result.data?.targetFocus) {
          const tf = result.data.targetFocus;
          this.currentProfile.targetFocus.enabled = true;
          const existingDomains = this.currentProfile.targetFocus.targetDomains || [];

          (tf.targetDomains || []).forEach(d => {
            const clean = d.replace(/^https?:\/\//i, '').split('/')[0].toLowerCase().trim();
            if (clean && !existingDomains.includes(clean)) existingDomains.push(clean);
          });
          this.currentProfile.targetFocus.targetDomains = existingDomains;

          this.recomputeAndRerender();
          if (statusDiv) {
            statusDiv.innerHTML = `<span style="display: inline-flex; align-items: center; gap: 0.35rem; color: #34d399;"><i data-lucide="check-circle-2" class="icon-xs text-emerald"></i> Added ${tf.targetDomains.length} official targets for ${this.escapeHtml(query)}!</span>`;
            if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
          }
        }
      } catch (err) {
        if (statusDiv) {
          statusDiv.innerHTML = `<span style="display: inline-flex; align-items: center; gap: 0.35rem; color: #f87171;"><i data-lucide="alert-triangle" class="icon-xs text-rose"></i> AI auto-select error: ${this.escapeHtml(err.message)}</span>`;
          if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
        }
      } finally {
        btn.disabled = false;
        btn.innerHTML = origText;
        if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
      }
    });

    // Expanded Term Toggles
    this.container.querySelectorAll('.term-toggle-chk').forEach(chk => {
      chk.addEventListener('change', () => {
        const termName = chk.getAttribute('data-term');
        const item = this.expandedTerms.find(t => t.term === termName);
        if (item) item.isEnabled = chk.checked;
      });
    });

    // Save Profile Changes
    const saveHandler = () => this.saveCurrentState(false);
    document.getElementById('btnSaveProfile')?.addEventListener('click', saveHandler);
    document.getElementById('btnBottomSave')?.addEventListener('click', saveHandler);

    // Save as New Profile
    document.getElementById('btnSaveAsNew')?.addEventListener('click', () => this.saveCurrentState(true));
    document.getElementById('btnCloneProfile')?.addEventListener('click', () => this.saveCurrentState(true));

    // Delete Profile
    document.getElementById('btnDeleteProfile')?.addEventListener('click', () => {
      const all = storageService.getProfiles();
      if (all.length <= 1) {
        showConfirmationBanner('Action Denied', 'You must keep at least one active profile.', 'warning', 2500);
        return;
      }
      if (confirm(`Are you sure you want to delete profile "${this.currentProfile.name}"?`)) {
        const remaining = all.filter(p => p.id !== this.currentProfile.id);
        storageService.storage.setItem('vacancy_radar_profiles_v1', JSON.stringify(remaining));
        storageService.setActiveProfile(remaining[0].id);
        if (this.onProfileUpdated) this.onProfileUpdated();
        this.render();
      }
    });

    // Create New Profile Modal trigger
    document.getElementById('btnNewProfile')?.addEventListener('click', () => {
      this.showCreateProfileModal();
    });
  }

  renderTargetChips() {
    const container = document.getElementById('targetChipsContainer');
    if (!container) return;
    const tf = this.currentProfile.targetFocus;
    const domainsHtml = (tf.targetDomains || []).map(d => `
      <span class="target-focus-chip">
        <i data-lucide="globe" class="icon-xs"></i> <strong>${this.escapeHtml(d)}</strong>
        <button type="button" class="target-focus-chip-remove btn-remove-domain" data-domain="${this.escapeHtml(d)}">&times;</button>
      </span>
    `).join('');
    const orgsHtml = (tf.targetOrganisations || []).map(o => `
      <span class="target-focus-chip" style="background: rgba(59, 130, 246, 0.15); border-color: rgba(59, 130, 246, 0.35); color: #93c5fd;">
        <i data-lucide="building-2" class="icon-xs text-blue"></i> <strong>${this.escapeHtml(o)}</strong>
        <button type="button" class="target-focus-chip-remove btn-remove-org" data-org="${this.escapeHtml(o)}">&times;</button>
      </span>
    `).join('');

    container.innerHTML = (domainsHtml + orgsHtml) || `
      <span style="font-size: 0.78rem; color: var(--text-muted); font-style: italic;">
        No specific websites selected yet. Click the buttons above or enter custom domains to specify focus targets.
      </span>
    `;

    if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();

    // Rebind remove chips
    container.querySelectorAll('.btn-remove-domain').forEach(btn => {
      btn.addEventListener('click', () => {
        const domain = btn.getAttribute('data-domain');
        tf.targetDomains = (tf.targetDomains || []).filter(d => d !== domain);
        this.renderTargetChips();
      });
    });
    container.querySelectorAll('.btn-remove-org').forEach(btn => {
      btn.addEventListener('click', () => {
        const org = btn.getAttribute('data-org');
        tf.targetOrganisations = (tf.targetOrganisations || []).filter(o => o !== org);
        this.renderTargetChips();
      });
    });
  }

  showCreateProfileModal(selectedPresetId = 'preset-dfir') {
    const modal = document.getElementById('createProfileModal');
    const modalBody = document.getElementById('createProfileModalBody');
    if (!modal || !modalBody) return;

    let activePreset = ROLE_PRESETS.find(p => p.id === selectedPresetId) || ROLE_PRESETS[0];
    let activeFilter = 'ALL';

    const renderModalContent = () => {
      const filteredPresets = ROLE_PRESETS.filter(p => {
        if (activeFilter === 'ALL') return true;
        if (activeFilter === 'PRIVATE') return p.sector === 'PRIVATE' || p.sector === 'PRIVATE_AND_PUBLIC';
        if (activeFilter === 'PUBLIC') return p.sector === 'PUBLIC' || p.sector === 'PRIVATE_AND_PUBLIC';
        if (activeFilter === 'CUSTOM') return p.sector === 'CUSTOM';
        return true;
      });

      modalBody.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.5rem;">
          <i data-lucide="sparkles" class="icon-md text-purple"></i>
          <h3 style="font-family: var(--font-heading); font-size: 1.4rem;">Create New Role Profile</h3>
        </div>
        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1.25rem;">
          Choose a tailored role preset across <strong>Private Sector (Big 4, Tech MNCs)</strong> or <strong>Government / Apex Bodies</strong>, or build a custom profile for any field.
        </p>

        <!-- AI Instant Profile & Source Generator (Gemini Free Tier) -->
        <div style="background: linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(168, 85, 247, 0.12) 100%); border: 1px solid rgba(168, 85, 247, 0.4); border-radius: var(--radius-md); padding: 1.15rem; margin-bottom: 1.25rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem; flex-wrap: wrap; gap: 0.4rem;">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <i data-lucide="bot" class="icon-sm text-purple"></i>
              <strong style="color: #c084fc; font-size: 0.95rem;">Instant AI Profile &amp; Official Source Generator</strong>
              <span class="badge-test-flag" style="background: rgba(168, 85, 247, 0.2); color: #e879f9; border-color: rgba(168, 85, 247, 0.4); font-size: 0.68rem;">INTELLIGENT AI ENGINE</span>
            </div>
            <span style="font-size: 0.72rem; color: var(--text-secondary);">Enter any title (e.g. "Software Developer", "Data Scientist", "Full Stack Engineer")</span>
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <input type="text" id="inputAiRoleQuery" class="search-input" placeholder="e.g. Software Developer, Python Backend, AI/ML Specialist..." style="flex: 1; font-size: 0.85rem; background: var(--bg-surface);">
            <button type="button" id="btnGenerateProfileWithAi" class="btn btn-primary btn-sm" style="background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); border: none; font-weight: 600; padding: 0.5rem 1.1rem; white-space: nowrap; display: inline-flex; align-items: center; gap: 0.35rem;">
              <i data-lucide="zap" class="icon-xs"></i> Generate Profile &amp; Sources
            </button>
          </div>
          <div id="aiGenStatus" style="display: none; font-size: 0.78rem; margin-top: 0.55rem; padding: 0.4rem 0.6rem; border-radius: 4px;"></div>
        </div>

        <!-- Sector Filter Tabs -->
        <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap;">
          <button type="button" class="btn btn-sm btn-modal-sector-filter ${activeFilter === 'ALL' ? 'btn-primary' : 'btn-outline'}" data-filter="ALL" style="display: inline-flex; align-items: center; gap: 0.35rem;">
            <i data-lucide="layers" class="icon-xs"></i> All Roles (${ROLE_PRESETS.length})
          </button>
          <button type="button" class="btn btn-sm btn-modal-sector-filter ${activeFilter === 'PRIVATE' ? 'btn-primary' : 'btn-outline'}" data-filter="PRIVATE" style="display: inline-flex; align-items: center; gap: 0.35rem;">
            <i data-lucide="building" class="icon-xs"></i> Private Sector &amp; Big 4
          </button>
          <button type="button" class="btn btn-sm btn-modal-sector-filter ${activeFilter === 'PUBLIC' ? 'btn-primary' : 'btn-outline'}" data-filter="PUBLIC" style="display: inline-flex; align-items: center; gap: 0.35rem;">
            <i data-lucide="landmark" class="icon-xs"></i> Government &amp; Apex PSUs
          </button>
          <button type="button" class="btn btn-sm btn-modal-sector-filter ${activeFilter === 'CUSTOM' ? 'btn-primary' : 'btn-outline'}" data-filter="CUSTOM" style="display: inline-flex; align-items: center; gap: 0.35rem;">
            <i data-lucide="sliders" class="icon-xs"></i> Custom / Any Field
          </button>
        </div>

        <!-- Role Presets Grid -->
        <div style="margin-bottom: 1.25rem;">
          <label style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); display: block; margin-bottom: 0.5rem;">
            1. Select Role Template / Preset:
          </label>
          <div class="preset-card-grid" style="max-height: 240px; overflow-y: auto;">
            ${filteredPresets.map(p => `
              <div class="preset-card ${p.id === activePreset.id ? 'active' : ''}" data-preset="${p.id}">
                <div class="preset-card-title">
                  <i data-lucide="${p.icon || 'briefcase'}" class="icon-sm"></i>
                  <span>${this.escapeHtml(p.name)}</span>
                </div>
                <div class="preset-card-desc">${this.escapeHtml(p.description)}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Profile Configuration Form -->
        <div style="background: var(--bg-surface-elevated); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 1.25rem; margin-bottom: 1.5rem;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
            <div>
              <label style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); display: block; margin-bottom: 0.35rem;">
                Profile Name
              </label>
              <input type="text" id="newProfNameInput" class="search-input" value="${this.escapeHtml(activePreset.name)}" style="width: 100%;">
            </div>
            <div>
              <label style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); display: block; margin-bottom: 0.35rem;">
                Target Roles (${activePreset.roles.length} Included)
              </label>
              <input type="text" id="newProfRolesInput" class="search-input" value="${this.escapeHtml(activePreset.roles.join(', '))}" style="width: 100%;">
            </div>
          </div>

          <div style="margin-bottom: 1rem;">
            <label style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); display: block; margin-bottom: 0.35rem;">
              Core Technical Keywords (${activePreset.keywords.length} Included)
            </label>
            <input type="text" id="newProfKeywordsInput" class="search-input" value="${this.escapeHtml(activePreset.keywords.join(', '))}" style="width: 100%;">
          </div>

          <!-- Target Focus Options in Creation Modal -->
          <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: var(--radius-sm); padding: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
              <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: 0.85rem; font-weight: 700; color: #34d399;">
                <input type="checkbox" id="modalTargetFocusEnabled" ${activePreset.targetFocus?.enabled ? 'checked' : ''}>
                <span>Focus discovery on selected websites / organizations</span>
              </label>

              <select id="modalTargetFocusMode" class="filter-select" style="font-size: 0.78rem; padding: 0.25rem 0.5rem;">
                <option value="STRICT_TARGET" ${activePreset.targetFocus?.mode === 'STRICT_TARGET' ? 'selected' : ''}>Strict Filter (Only selected sites)</option>
                <option value="PRIORITY_BOOST" ${activePreset.targetFocus?.mode === 'PRIORITY_BOOST' ? 'selected' : ''}>Priority Boost (+15% score)</option>
              </select>
            </div>

            <!-- Custom Domain input in Modal -->
            <div style="display: flex; gap: 0.5rem; margin-bottom: 0.75rem;">
              <input type="text" id="modalInputCustomDomain" class="search-input" placeholder="Add custom domain (e.g. deloitte.com, google.com, isro.gov.in)..." style="flex: 1; font-size: 0.8rem;">
              <button type="button" id="btnModalAddCustomDomain" class="btn btn-outline btn-sm">+ Add Domain</button>
            </div>

            <span style="font-size: 0.72rem; color: var(--text-secondary); display: block; margin-bottom: 0.4rem;">
              Whitelisted Domains (Click to toggle):
            </span>
            <div style="display: flex; flex-wrap: wrap; gap: 0.4rem; max-height: 120px; overflow-y: auto;" id="modalApexDomainsContainer">
              ${KNOWN_APEX_TARGETS.map(t => {
                const isSelected = (activePreset.targetFocus?.targetDomains || []).includes(t.domain);
                return `
                  <button type="button" class="btn-modal-domain meta-pill ${isSelected ? 'active-target' : ''}" data-domain="${t.domain}" data-org="${t.org}" style="cursor: pointer; font-size: 0.75rem; display: inline-flex; align-items: center; gap: 0.35rem; ${isSelected ? 'background: rgba(16, 185, 129, 0.25); border-color: #34d399; color: #34d399; font-weight: 600;' : 'background: var(--bg-surface); opacity: 0.8;'}">
                    <span>${isSelected ? '<i data-lucide="check" class="icon-xs"></i>' : '+'}</span>
                    <strong>${t.domain}</strong>
                  </button>
                `;
              }).join('')}
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
          <button type="button" id="btnCancelCreateModal" class="btn btn-outline">Cancel</button>
          <button type="button" id="btnConfirmCreateProfile" class="btn btn-primary" style="font-weight: 600; display: inline-flex; align-items: center; gap: 0.35rem;">
            <i data-lucide="plus-circle" class="icon-xs"></i> Create &amp; Activate Profile
          </button>
        </div>
      `;

      // Sector filter tabs
      modalBody.querySelectorAll('.btn-modal-sector-filter').forEach(btn => {
        btn.addEventListener('click', () => {
          activeFilter = btn.getAttribute('data-filter');
          const firstInFilter = ROLE_PRESETS.find(p => {
            if (activeFilter === 'ALL') return true;
            if (activeFilter === 'PRIVATE') return p.sector === 'PRIVATE' || p.sector === 'PRIVATE_AND_PUBLIC';
            if (activeFilter === 'PUBLIC') return p.sector === 'PUBLIC' || p.sector === 'PRIVATE_AND_PUBLIC';
            if (activeFilter === 'CUSTOM') return p.sector === 'CUSTOM';
            return true;
          });
          if (firstInFilter) activePreset = firstInFilter;
          renderModalContent();
        });
      });

      // AI Profile & Source Generator click handler (Gemini Free Tier)
      document.getElementById('btnGenerateProfileWithAi')?.addEventListener('click', async () => {
        const btn = document.getElementById('btnGenerateProfileWithAi');
        const queryInput = document.getElementById('inputAiRoleQuery');
        const statusDiv = document.getElementById('aiGenStatus');
        const query = (queryInput?.value || '').trim() || 'Software Developer';

        const origText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i data-lucide="loader" class="icon-xs icon-spin"></i> Analyzing with AI...';
        if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();

        if (statusDiv) {
          statusDiv.style.display = 'block';
          statusDiv.style.background = 'rgba(99, 102, 241, 0.15)';
          statusDiv.style.color = '#c084fc';
          statusDiv.innerHTML = `<span style="display: inline-flex; align-items: center; gap: 0.35rem;"><i data-lucide="clock" class="icon-xs"></i> Asking AI to formulate profile, official employer websites, and recruitment bodies for <strong>"${this.escapeHtml(query)}"</strong>...</span>`;
          if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
        }

        try {
          const res = await fetch('/api/ai-assist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'RECOMMEND_PROFILE', roleQuery: query })
          });
          const result = await res.json();

          if (result.ok && result.data) {
            const d = result.data;
            // Update active preset with AI recommendations
            activePreset = {
              id: `ai-preset-${Date.now()}`,
              name: d.name || `${query} (AI Tailored)`,
              description: `AI-recommended profile with ${d.roles?.length || 0} designations and ${d.targetFocus?.targetDomains?.length || 0} official targets.`,
              icon: 'bot',
              sector: 'PUBLIC_AND_PRIVATE',
              roles: d.roles || [query],
              keywords: d.keywords || [query],
              eligibleDegrees: d.eligibleDegrees || ['B.E. / B.Tech (CS / IT / EC)', 'MCA', 'M.Tech / M.Sc'],
              targetFocus: d.targetFocus || {
                enabled: true,
                mode: 'PRIORITY_BOOST',
                targetDomains: ['cdac.in', 'nic.in', 'stpi.in', 'cris.org.in'],
                targetOrganisations: ['Centre for Development of Advanced Computing (C-DAC)', 'National Informatics Centre (NIC)']
              },
              searchDorks: d.suggestedDorks || []
            };

            // Register any new AI recommended domains in KNOWN_APEX_TARGETS so they show as pills
            if (d.targetFocus?.targetDomains) {
              d.targetFocus.targetDomains.forEach((dom, idx) => {
                const org = (d.targetFocus.targetOrganisations && d.targetFocus.targetOrganisations[idx]) || dom;
                if (!KNOWN_APEX_TARGETS.some(t => t.domain.toLowerCase() === dom.toLowerCase())) {
                  KNOWN_APEX_TARGETS.push({ domain: dom, org: org, category: 'AI Target' });
                }
              });
            }

            renderModalContent();

            // Re-fetch statusDiv after re-render to display success feedback
            const newStatus = document.getElementById('aiGenStatus');
            if (newStatus) {
              newStatus.style.display = 'block';
              newStatus.style.background = 'rgba(16, 185, 129, 0.15)';
              newStatus.style.color = '#34d399';
              newStatus.innerHTML = `<span style="display: inline-flex; align-items: center; gap: 0.35rem; color: #34d399;"><i data-lucide="check-circle-2" class="icon-xs text-emerald"></i> <strong>AI Profile Generated!</strong> Configured "${this.escapeHtml(activePreset.name)}" with ${activePreset.roles.length} roles, ${activePreset.keywords.length} keywords, and ${activePreset.targetFocus.targetDomains.length} official targets.</span>`;
              if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
            }
          } else {
            if (statusDiv) {
              statusDiv.style.background = 'rgba(239, 68, 68, 0.15)';
              statusDiv.style.color = '#f87171';
              statusDiv.innerHTML = `<span style="display: inline-flex; align-items: center; gap: 0.35rem; color: #f87171;"><i data-lucide="alert-triangle" class="icon-xs text-rose"></i> AI Recommendation failed: ${this.escapeHtml(result.error || 'Unknown error')}</span>`;
              if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
            }
          }
        } catch (err) {
          if (statusDiv) {
            statusDiv.style.background = 'rgba(239, 68, 68, 0.15)';
            statusDiv.style.color = '#f87171';
            statusDiv.innerHTML = `<span style="display: inline-flex; align-items: center; gap: 0.35rem; color: #f87171;"><i data-lucide="alert-triangle" class="icon-xs text-rose"></i> Network error connecting to AI endpoint: ${this.escapeHtml(err.message)}</span>`;
            if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
          }
        } finally {
          btn.disabled = false;
          btn.innerHTML = origText;
          if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
        }
      });

      document.getElementById('inputAiRoleQuery')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          document.getElementById('btnGenerateProfileWithAi')?.click();
        }
      });

      // Preset click handler
      modalBody.querySelectorAll('.preset-card').forEach(card => {
        card.addEventListener('click', () => {
          const id = card.getAttribute('data-preset');
          activePreset = ROLE_PRESETS.find(p => p.id === id) || ROLE_PRESETS[0];
          renderModalContent();
        });
      });

      // Add custom domain in modal
      document.getElementById('btnModalAddCustomDomain')?.addEventListener('click', () => {
        const input = document.getElementById('modalInputCustomDomain');
        const domain = (input?.value || '').trim().toLowerCase();
        if (!domain) return;
        if (!activePreset.targetFocus) {
          activePreset.targetFocus = { enabled: true, mode: 'PRIORITY_BOOST', targetDomains: [], targetOrganisations: [] };
        }
        if (!activePreset.targetFocus.targetDomains.includes(domain)) {
          activePreset.targetFocus.targetDomains.push(domain);
          activePreset.targetFocus.enabled = true;
        }
        renderModalContent();
      });

      // Domain click handler in modal
      modalBody.querySelectorAll('.btn-modal-domain').forEach(btn => {
        btn.addEventListener('click', () => {
          const domain = btn.getAttribute('data-domain');
          const org = btn.getAttribute('data-org');
          if (!activePreset.targetFocus) {
            activePreset.targetFocus = { enabled: true, mode: 'PRIORITY_BOOST', targetDomains: [], targetOrganisations: [] };
          }
          const domains = activePreset.targetFocus.targetDomains || [];
          const orgs = activePreset.targetFocus.targetOrganisations || [];

          if (domains.includes(domain)) {
            activePreset.targetFocus.targetDomains = domains.filter(d => d !== domain);
            activePreset.targetFocus.targetOrganisations = orgs.filter(o => o !== org);
          } else {
            activePreset.targetFocus.targetDomains.push(domain);
            if (org && !orgs.includes(org)) activePreset.targetFocus.targetOrganisations.push(org);
          }
          renderModalContent();
        });
      });

      // Cancel button
      document.getElementById('btnCancelCreateModal')?.addEventListener('click', () => {
        modal.classList.remove('active');
      });

      // Confirm Create button
      document.getElementById('btnConfirmCreateProfile')?.addEventListener('click', () => {
        const nameInput = document.getElementById('newProfNameInput');
        const rolesInput = document.getElementById('newProfRolesInput');
        const keywordsInput = document.getElementById('newProfKeywordsInput');
        const focusEnabled = document.getElementById('modalTargetFocusEnabled')?.checked || false;
        const focusMode = document.getElementById('modalTargetFocusMode')?.value || 'PRIORITY_BOOST';

        const name = (nameInput?.value || '').trim() || activePreset.name;
        const roles = (rolesInput?.value || '').split(',').map(r => r.trim()).filter(Boolean);
        const keywords = (keywordsInput?.value || '').split(',').map(k => k.trim()).filter(Boolean);

        let sectors = ['Private Sector / MNC', 'Central Government', 'State Government', 'Public Sector Undertaking (PSU)'];
        if (activePreset.sector === 'PRIVATE') {
          sectors = ['Private Sector / MNC', 'Private Advisory / Consulting', 'Private IT & Tech Enterprise'];
        } else if (activePreset.sector === 'PUBLIC') {
          sectors = ['Central Government', 'State Government', 'Public Sector Undertaking (PSU)', 'Autonomous Govt Institution'];
        }

        const newProfile = {
          id: `profile-${Date.now()}`,
          name,
          isActive: true,
          createdAt: new Date().toISOString(),
          roles: roles.length ? roles : activePreset.roles,
          keywords: keywords.length ? keywords : activePreset.keywords,
          education: activePreset.education || {
            degreeLevel: 'Bachelor Degree',
            eligibleBranches: ['Computer Science', 'Information Technology', 'Engineering'],
            aggregateMarksPct: 60
          },
          experience: activePreset.experience || {
            minYears: 1,
            maxYears: 4,
            currentRole: 'Specialist'
          },
          demographics: {
            age: 26,
            category: 'General / Unreserved',
            applicableAgeRelaxations: false
          },
          sectors,
          employmentTypes: ['Permanent', 'Contractual', 'Fixed Term', 'Full Time'],
          locations: {
            allIndia: true,
            preferredStates: ['Maharashtra', 'Delhi NCR', 'Karnataka', 'Gujarat', 'Telangana'],
            allowRemote: true
          },
          salary: { minAnnualInr: 600000, acceptNotDisclosed: true },
          verificationFilter: 'ALL',
          alertFrequency: 'DAILY_THRICE',
          deadlineReminderDays: [7, 3, 1],
          targetFocus: {
            enabled: focusEnabled,
            mode: focusMode,
            targetDomains: activePreset.targetFocus?.targetDomains || [],
            targetOrganisations: activePreset.targetFocus?.targetOrganisations || []
          },
          scheduleSettings: {
            emailAddress: 'candidate@dfir-india.org',
            notificationEmails: ['candidate@dfir-india.org'],
            emailAlertsEnabled: true,
            telegramChatId: '',
            telegramAlertsEnabled: true,
            preset: 'DAILY_THRICE',
            hours: [8, 14, 20],
            autoSyncGoogleSheets: true
          }
        };

        storageService.saveProfile(newProfile);
        storageService.setActiveProfile(newProfile.id);
        modal.classList.remove('active');

        showConfirmationBanner(
          'Role Profile Created & Activated!',
          `Profile "${newProfile.name}" created with ${newProfile.roles.length} roles, ${newProfile.keywords.length} keywords, and ${newProfile.targetFocus?.targetDomains?.length || 0} target portals.`
        );

        if (this.onProfileUpdated) this.onProfileUpdated();
        this.render();
      });

      if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
    };

    renderModalContent();
    modal.classList.add('active');

    // Close button
    document.getElementById('createProfileModalCloseBtn')?.addEventListener('click', () => {
      modal.classList.remove('active');
    });
  }

  syncFormValuesToProfile() {
    if (!this.currentProfile) return;

    // Read form values
    const nameInput = document.getElementById('profNameInput');
    if (nameInput) this.currentProfile.name = nameInput.value.trim() || this.currentProfile.name || 'Untitled Profile';

    // Profile-Specific Alert Email Recipients
    const profEmail = (document.getElementById('profEmailInput')?.value || '').trim();
    const profEmailAlerts = document.getElementById('profEmailAlertsEnabled')?.checked !== false;

    // Profile-Specific Telegram Chat ID(s)
    const profTelegramInput = document.getElementById('profTelegramInput');
    const profTelegram = (profTelegramInput ? profTelegramInput.value : '').trim();
    const profTelegramAlerts = document.getElementById('profTelegramAlertsEnabled')?.checked !== false;

    if (!this.currentProfile.scheduleSettings) {
      this.currentProfile.scheduleSettings = {
        preset: 'DAILY_THRICE',
        hours: [8, 14, 20],
        autoSyncGoogleSheets: true
      };
    }
    if (profEmail) {
      this.currentProfile.scheduleSettings.emailAddress = profEmail;
      this.currentProfile.scheduleSettings.notificationEmails = profEmail
        .split(/[,;]+/)
        .map(e => e.trim())
        .filter(e => e && e.includes('@'));
    }
    this.currentProfile.scheduleSettings.emailAlertsEnabled = profEmailAlerts;

    if (profTelegramInput) {
      this.currentProfile.scheduleSettings.telegramChatId = profTelegram;
      this.currentProfile.scheduleSettings.telegramAlertsEnabled = profTelegramAlerts && Boolean(profTelegram);
    }

    // Target Focus
    const chkFocus = document.getElementById('chkTargetFocusEnabled');
    const selectMode = document.getElementById('targetFocusModeSelect');
    if (chkFocus && selectMode && this.currentProfile.targetFocus) {
      this.currentProfile.targetFocus.enabled = chkFocus.checked;
      this.currentProfile.targetFocus.mode = selectMode.value;
    }

    const eduDegree = document.getElementById('eduDegreeInput');
    const eduBranches = document.getElementById('eduBranchesInput');
    const eduMarks = document.getElementById('eduMarksInput');

    if (eduDegree && eduBranches && eduMarks) {
      this.currentProfile.education = {
        degreeLevel: eduDegree.value.trim(),
        eligibleBranches: eduBranches.value.split(',').map(b => b.trim()).filter(Boolean),
        aggregateMarksPct: parseFloat(eduMarks.value) || 60
      };
    }

    const expMin = document.getElementById('expMinInput');
    const expMax = document.getElementById('expMaxInput');
    const expRole = document.getElementById('expRoleInput');
    if (expMin && expMax && expRole) {
      this.currentProfile.experience = {
        minYears: parseFloat(expMin.value) || 0,
        maxYears: parseFloat(expMax.value) || 5,
        currentRole: expRole.value.trim()
      };
    }

    const demoAge = document.getElementById('demoAgeInput');
    const demoCat = document.getElementById('demoCategorySelect');
    if (demoAge && demoCat) {
      this.currentProfile.demographics = {
        age: parseInt(demoAge.value, 10) || 25,
        category: demoCat.value,
        applicableAgeRelaxations: demoCat.value !== 'General / Unreserved'
      };
    }

    // Sectors
    const selectedSectors = [];
    this.container.querySelectorAll('.sector-chk:checked').forEach(c => selectedSectors.push(c.value));
    if (selectedSectors.length) this.currentProfile.sectors = selectedSectors;

    // Employment Types
    const selectedTypes = [];
    this.container.querySelectorAll('.type-chk:checked').forEach(c => selectedTypes.push(c.value));
    if (selectedTypes.length) this.currentProfile.employmentTypes = selectedTypes;

    // Locations & Salary
    const allIndia = document.getElementById('chkAllIndia')?.checked || false;
    const remote = document.getElementById('chkRemote')?.checked || false;
    const states = document.getElementById('prefStatesInput')?.value?.split(',').map(s => s.trim()).filter(Boolean) || [];
    const minSalary = parseFloat(document.getElementById('minSalaryInput')?.value) || 0;

    this.currentProfile.locations = {
      allIndia,
      allowRemote: remote,
      preferredStates: states
    };

    this.currentProfile.salary = {
      minAnnualInr: minSalary,
      acceptNotDisclosed: true
    };
  }

  recomputeAndRerender() {
    if (this.currentProfile) {
      this.syncFormValuesToProfile();
      storageService.saveProfile(this.currentProfile);
      if (this.onProfileUpdated) this.onProfileUpdated();
    }
    this.expandedTerms = KeywordExpansionEngine.expandKeywords(
      this.currentProfile?.keywords || [],
      this.currentProfile?.roles || []
    );
    this.render();
  }

  saveCurrentState(asNew = false) {
    this.syncFormValuesToProfile();

    if (asNew) {
      this.currentProfile.id = `profile-${Date.now()}`;
      this.currentProfile.name += ' (Copy)';
    }

    storageService.saveProfile(this.currentProfile);
    storageService.setActiveProfile(this.currentProfile.id);

    showConfirmationBanner(
      'Profile Successfully Saved!',
      `Profile "${this.currentProfile.name}" with ${this.currentProfile.roles.length} roles, ${this.currentProfile.keywords.length} keywords, and ${(this.currentProfile.targetFocus?.targetDomains?.length || 0)} target portals saved permanently.`
    );

    if (this.onProfileUpdated) this.onProfileUpdated();
    this.render();
  }

  escapeHtml(str) {
    return escapeHtml(str);
  }
}
