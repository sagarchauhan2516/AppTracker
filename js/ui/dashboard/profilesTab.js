import { storageService } from '../../services/storageService.js';
import { ROLE_PRESETS } from '../../data/rolePresets.js';
import { AiSuggestionsEngine, AI_CUSTOM_META_SUGGESTIONS } from '../../engine/aiSuggestionsEngine.js';
import { showConfirmationBanner } from '../../services/notificationService.js';
import { escapeHtml } from '../../utils/htmlUtils.js';

export function renderProfilesTab(profiles, currentProfile) {
    const p = currentProfile;
    const customFields = p.customFields || [];
    const negativeKeywords = p.negativeKeywords || [];
    const targetFocus = p.targetFocus || { enabled: false, mode: 'PRIORITY_BOOST', targetDomains: [], targetOrganisations: [], customWebsites: [] };
    const dashUniqueDomains = [...new Set((targetFocus.targetDomains || []).map(d => d.trim().toLowerCase()).filter(Boolean))];

    return `
      <div class="dash-panel-card">
        
        <!-- Dedicated Profile Settings Redirection Banner -->
        <div style="background: rgba(96, 165, 250, 0.1); border: 1px solid rgba(96, 165, 250, 0.35); border-radius: var(--radius-md); padding: 1rem 1.25rem; margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div style="width: 38px; height: 38px; border-radius: 50%; background: rgba(96, 165, 250, 0.2); color: #60a5fa; display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">
              👤
            </div>
            <div>
              <strong style="color: #60a5fa; font-size: 0.95rem;">Dedicated Profile Settings Panel Available</strong>
              <div style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 0.15rem;">
                Candidate Name, Profile Name, Target Roles, Keywords, Target Portals, and Alert Channels (${escapeHtml(p.scheduleSettings?.emailAddress || 'sagarmc2516@gmail.com')}) are now in the dedicated Profile Settings panel.
              </div>
            </div>
          </div>
          <button type="button" id="btnJumpToDedicatedProfileSettings" class="btn btn-primary btn-sm" style="font-weight: 700; background: #2563eb; border-color: #2563eb; box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3);">
            👤 Open Profile Settings Panel &rarr;
          </button>
        </div>

        <!-- Profile Selection & Switcher Bar -->
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem; border-bottom: 1px solid var(--border-subtle); padding-bottom: 1.25rem;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <label style="font-size: 0.85rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">
              Managing Profile:
            </label>
            <select id="dashProfileSelect" class="filter-select" style="font-weight: 700; font-size: 0.95rem; padding: 0.4rem 0.8rem;">
              ${profiles.map(prof => `
                <option value="${prof.id}" ${prof.id === p.id ? 'selected' : ''}>
                  ${escapeHtml(prof.name)}
                </option>
              `).join('')}
            </select>
          </div>

          <div style="display: flex; gap: 0.5rem; align-items: center;">
            <button id="btnDashNewProfile" class="btn btn-outline btn-sm">✨ + Create New Role Profile</button>
            <button id="btnDashCloneProfile" class="btn btn-outline btn-sm">📋 Clone Profile</button>
            <button id="btnSaveProfileCustomFields" class="btn btn-primary btn-sm">💾 Save All Profile Changes</button>
          </div>
        </div>

        <!-- 1. Profile Core Identity -->
        <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 1.5rem; margin-bottom: 1.75rem;">
          <div>
            <label style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); display: block; margin-bottom: 0.35rem;">
              Profile Name
            </label>
            <input type="text" id="dashProfName" class="search-input" value="${escapeHtml(p.name)}" style="width: 100%;">
          </div>
          <div>
            <label style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); display: block; margin-bottom: 0.35rem;">
              Target Roles / Designations (Comma-separated)
            </label>
            <input type="text" id="dashProfRoles" class="search-input" value="${escapeHtml((p.roles || []).join(', '))}" style="width: 100%;">
            <div style="margin-top: 0.5rem;">
              <span style="font-size: 0.72rem; color: var(--text-muted); display: block; margin-bottom: 0.25rem;">🤖 AI Suggested Designations (1-Click Add):</span>
              <div id="dashAiRoleSuggestionsTray" class="ai-suggestion-tray">
                ${AiSuggestionsEngine.getRoleSuggestions(p).map(r => `
                  <button type="button" class="btn-dash-add-ai-role ai-suggestion-chip" data-role="${escapeHtml(r)}">
                    + ${escapeHtml(r)}
                  </button>
                `).join('')}
              </div>
            </div>
          </div>
        </div>

        <!-- 2. TARGET WEBSITES WHITELIST -->
        <div style="background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: var(--radius-md); padding: 1.25rem; margin-bottom: 1.75rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.75rem;">
            <div>
              <strong style="color: #34d399; font-size: 0.95rem;">🎯 Target Organisation &amp; Website Whitelist</strong>
              <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.15rem;">
                Restrict or prioritize vacancy scans to specific recruitment portals and government apex websites.
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 0.6rem;">
              <label style="display: flex; align-items: center; gap: 0.4rem; font-size: 0.8rem; cursor: pointer; color: #34d399; font-weight: 600;">
                <input type="checkbox" id="dashTargetFocusEnabled" ${targetFocus.enabled ? 'checked' : ''}>
                <span>Enable Target Whitelist</span>
              </label>
              <select id="dashTargetFocusMode" class="filter-select" style="font-size: 0.75rem; padding: 0.2rem 0.5rem;">
                <option value="PRIORITY_BOOST" ${targetFocus.mode === 'PRIORITY_BOOST' ? 'selected' : ''}>⭐ Priority Boost (+15% score)</option>
                <option value="STRICT_TARGET" ${targetFocus.mode === 'STRICT_TARGET' ? 'selected' : ''}>🔒 Strict Filter (Only whitelisted)</option>
              </select>
            </div>
          </div>

          <!-- Section 1: Active Whitelisted Websites -->
          <div style="margin-bottom: 1.25rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
              <span id="dashTargetDomainsCount" style="font-size: 0.8rem; font-weight: 600; color: #60a5fa;">
                Active Whitelisted Websites (${dashUniqueDomains.length} active):
              </span>
              ${dashUniqueDomains.length > 0 ? `
                <button type="button" id="btnDashClearAllTargets" style="background: none; border: none; color: #f87171; font-size: 0.75rem; cursor: pointer; text-decoration: underline;">
                  Clear All
                </button>
              ` : ''}
            </div>

            <!-- Add custom website input -->
            <div style="display: flex; gap: 0.5rem; margin-bottom: 0.75rem;">
              <input type="text" id="inputCustomWebsite" class="search-input" placeholder="Type domain (e.g. barc.gov.in, isro.gov.in) and press Enter..." style="flex: 1; font-size: 0.8rem;">
              <button type="button" id="btnAddCustomWebsite" class="btn btn-outline btn-sm">+ Add Domain</button>
            </div>

            <!-- Active Chips Container -->
            <div id="dashTargetChipsContainer" style="display: flex; flex-wrap: wrap; gap: 0.4rem; min-height: 32px; padding: 0.6rem; background: var(--bg-surface); border-radius: var(--radius-sm); border: 1px dashed var(--border-subtle);">
              ${dashUniqueDomains.map(d => `
                <span class="target-focus-chip">
                  🌐 <strong>${escapeHtml(d)}</strong>
                  <button type="button" class="target-focus-chip-remove btn-dash-remove-domain" data-domain="${escapeHtml(d)}" title="Remove ${escapeHtml(d)}">&times;</button>
                </span>
              `).join('')}
              ${(!dashUniqueDomains.length) ? `<span style="font-size: 0.75rem; color: var(--text-muted); font-style: italic; padding: 0.2rem 0.4rem;">No target websites added yet. Add one above or click recommendations below.</span>` : ''}
            </div>
          </div>

          <!-- Section 2: AI Recommended Official Portals & PSUs -->
          <div>
            <span style="font-size: 0.75rem; color: #34d399; font-weight: 600; display: block; margin-bottom: 0.45rem;">
              ✨ AI Recommended Portals &amp; PSUs (1-Click to Whitelist):
            </span>
            <div id="dashAiWebsiteSuggestionsTray" class="ai-suggestion-tray">
              ${AiSuggestionsEngine.getWebsiteSuggestions(p).map(s => {
                const isSelected = dashUniqueDomains.includes(s.domain.toLowerCase());
                return `
                  <button type="button" class="btn-dash-add-ai-website ai-suggestion-chip ${isSelected ? 'added' : ''}" data-domain="${s.domain.toLowerCase()}" title="${escapeHtml(s.org)}">
                    <span>${isSelected ? '✓' : '+'}</span> <strong>${s.domain}</strong> <small style="opacity: 0.75;">(${escapeHtml(s.org.split('(')[0].trim())})</small>
                  </button>
                `;
              }).join('')}
            </div>
          </div>
        </div>

        <!-- 3. CUSTOM FIELDS: Positive & Negative Search Keywords -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.75rem;">
          <!-- Positive Keywords -->
          <div class="dash-card-elevated">
            <strong style="color: #60a5fa; font-size: 0.9rem; display: block; margin-bottom: 0.25rem;">
              ✨ Custom Field: Positive Technical Keywords
            </strong>
            <p style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 0.75rem;">
              Terms that boost matching scores and trigger keyword expansions.
            </p>
            <div style="display: flex; gap: 0.4rem; margin-bottom: 0.75rem;">
              <input type="text" id="inputAddPositiveKeyword" class="search-input" placeholder="Add keyword (e.g. Volatility, Cellebrite)..." style="flex: 1; font-size: 0.8rem;">
              <button type="button" id="btnAddPositiveKeyword" class="btn btn-outline btn-sm">+ Add</button>
            </div>
            
            <!-- AI Positive Keyword Suggestions Tray -->
            <div style="margin-bottom: 0.75rem;">
              <span style="font-size: 0.72rem; color: #60a5fa; font-weight: 600; display: block; margin-bottom: 0.25rem;">🤖 AI Suggested Keywords & Skills (1-Click Add):</span>
              <div id="dashAiPosKwSuggestionsTray" class="ai-suggestion-tray">
                ${AiSuggestionsEngine.getKeywordSuggestions(p).map(k => {
                  const isAdded = (p.keywords || []).includes(k);
                  return `
                    <button type="button" class="btn-dash-add-ai-pos-kw ai-suggestion-chip ${isAdded ? 'added' : ''}" data-kw="${escapeHtml(k)}">
                      <span>${isAdded ? '✓' : '+'}</span> ${escapeHtml(k)}
                    </button>
                  `;
                }).join('')}
              </div>
            </div>

            <div id="dashPositiveKeywordsContainer" style="display: flex; flex-wrap: wrap; gap: 0.35rem;">
              ${(p.keywords || []).map(k => `
                <span class="meta-pill" style="display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.75rem;">
                  ${escapeHtml(k)}
                  <button type="button" class="btn-dash-remove-pos-kw" data-kw="${escapeHtml(k)}" style="background: none; border: none; color: #f87171; cursor: pointer;">&times;</button>
                </span>
              `).join('')}
            </div>
          </div>

          <!-- Negative / Exclusion Keywords -->
          <div class="dash-card-elevated">
            <strong style="color: #f87171; font-size: 0.9rem; display: block; margin-bottom: 0.25rem;">
              🚫 Custom Field: Exclusion / Negative Keywords
            </strong>
            <p style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 0.75rem;">
              Terms that automatically disqualify or suppress irrelevant listings.
            </p>
            <div style="display: flex; gap: 0.4rem; margin-bottom: 0.75rem;">
              <input type="text" id="inputAddNegativeKeyword" class="search-input" placeholder="Exclude term (e.g. Unpaid, Non-Technical)..." style="flex: 1; font-size: 0.8rem;">
              <button type="button" id="btnAddNegativeKeyword" class="btn btn-outline btn-sm" style="color: #f87171;">+ Exclude</button>
            </div>

            <!-- AI Negative Keyword Suggestions Tray -->
            <div style="margin-bottom: 0.75rem;">
              <span style="font-size: 0.72rem; color: #f87171; font-weight: 600; display: block; margin-bottom: 0.25rem;">🤖 AI Exclusion Suggestions (1-Click Add):</span>
              <div id="dashAiNegKwSuggestionsTray" class="ai-suggestion-tray">
                ${AiSuggestionsEngine.getNegativeSuggestions(p).map(nk => {
                  const isAdded = (negativeKeywords || []).includes(nk);
                  return `
                    <button type="button" class="btn-dash-add-ai-neg-kw ai-suggestion-chip ${isAdded ? 'added' : ''}" data-kw="${escapeHtml(nk)}">
                      <span>${isAdded ? '✓' : '+'}</span> ${escapeHtml(nk)}
                    </button>
                  `;
                }).join('')}
              </div>
            </div>

            <div id="dashNegativeKeywordsContainer" style="display: flex; flex-wrap: wrap; gap: 0.35rem;">
              ${negativeKeywords.map(nk => `
                <span class="meta-pill" style="display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.75rem; border-color: rgba(239, 68, 68, 0.4); color: #fca5a5;">
                  ${escapeHtml(nk)}
                  <button type="button" class="btn-dash-remove-neg-kw" data-kw="${escapeHtml(nk)}" style="background: none; border: none; color: #f87171; cursor: pointer;">&times;</button>
                </span>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- 4. CUSTOM FIELDS EVERYWHERE: Dynamic Key-Value Attributes -->
        <div style="background: var(--bg-surface-elevated); padding: 1.25rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle); margin-bottom: 1.5rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
            <div>
              <strong style="color: #a78bfa; font-size: 0.95rem;">
                🏷️ Custom User Attributes &amp; Meta Fields (Everywhere)
              </strong>
              <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.15rem;">
                Add arbitrary custom fields to your profile (e.g. Notice Period, Security Clearance, Telegram Channel, Target State Directorate).
              </div>
            </div>
            <button type="button" id="btnAddNewCustomMetaField" class="btn btn-outline btn-sm">+ Add Custom Field Row</button>
          </div>

          <!-- AI Meta Attributes Suggestions Tray -->
          <div style="margin-bottom: 0.75rem;">
            <span style="font-size: 0.72rem; color: #a78bfa; font-weight: 600; display: block; margin-bottom: 0.25rem;">🤖 AI Suggested Meta Fields (1-Click Insert):</span>
            <div id="dashAiMetaSuggestionsTray" class="ai-suggestion-tray">
              ${AI_CUSTOM_META_SUGGESTIONS.map(m => `
                <button type="button" class="btn-dash-add-ai-meta ai-suggestion-chip" data-key="${escapeHtml(m.key)}" data-val="${escapeHtml(m.val)}">
                  + <strong>${escapeHtml(m.key)}:</strong> ${escapeHtml(m.val)}
                </button>
              `).join('')}
            </div>
          </div>

          <div id="customMetaFieldsContainer" style="display: flex; flex-direction: column; gap: 0.6rem;">
            ${customFields.map((cf, idx) => `
              <div class="custom-meta-row" style="display: grid; grid-template-columns: 2fr 3fr auto; gap: 0.6rem; align-items: center;">
                <input type="text" class="search-input cf-key" value="${escapeHtml(cf.key)}" placeholder="Attribute Name (e.g. Notice Period)..." style="font-size: 0.8rem;">
                <input type="text" class="search-input cf-val" value="${escapeHtml(cf.value)}" placeholder="Attribute Value (e.g. Immediate / 15 Days)..." style="font-size: 0.8rem;">
                <button type="button" class="btn btn-outline btn-sm btn-remove-cf-row" style="color: #f87171; border-color: rgba(239, 68, 68, 0.3);">&times;</button>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Save Button Footer -->
        <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
          <button type="button" id="btnBottomSaveProfileChanges" class="btn btn-primary" style="font-weight: 600;">
            💾 Save Profile &amp; Custom Fields
          </button>
        </div>

      </div>
    `;
}

export function renderTargetChipsInDash(ctx) {
  const container = ctx.container || document;
  const currentProfile = ctx.currentProfile;
  const chipContainer = container.querySelector('#dashTargetChips');
  if (!chipContainer || !currentProfile) return;

  const sites = currentProfile.targetFocus?.websites || [];
  if (sites.length === 0) {
    chipContainer.innerHTML = `<span style="font-size: 0.8rem; color: var(--text-muted); font-style: italic;">No target websites configured. Add domains below or click 1-click whitelists to restrict searches.</span>`;
    return;
  }

  chipContainer.innerHTML = sites.map(site => `
    <span class="profile-chip" style="display: inline-flex; align-items: center; gap: 0.35rem; background: rgba(56, 189, 248, 0.12); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 9999px; padding: 0.25rem 0.65rem; font-size: 0.78rem; font-family: monospace;">
      🌐 ${escapeHtml(site)}
      <button type="button" class="btn-remove-site" data-site="${escapeHtml(site)}" style="background: none; border: none; color: #f87171; cursor: pointer; padding: 0; font-size: 0.9rem; line-height: 1; margin-left: 0.2rem;" title="Remove this target website">&times;</button>
    </span>
  `).join('');

  chipContainer.querySelectorAll('.btn-remove-site').forEach(btn => {
    btn.addEventListener('click', () => {
      const siteToRemove = btn.getAttribute('data-site');
      currentProfile.targetFocus.websites = (currentProfile.targetFocus.websites || []).filter(s => s !== siteToRemove);
      storageService.saveProfile(currentProfile);
      renderTargetChipsInDash(ctx);
      syncAiWebsiteTrayState(ctx);
      if (ctx.onStateChanged) ctx.onStateChanged();
    });
  });
}

export function syncAiWebsiteTrayState(ctx) {
  const container = ctx.container || document;
  const currentProfile = ctx.currentProfile;
  const tray = container.querySelector('#aiWebsiteTray');
  if (!tray || !currentProfile) return;

  const activeSites = new Set((currentProfile.targetFocus?.websites || []).map(s => s.toLowerCase()));
  tray.querySelectorAll('.btn-ai-site-chip').forEach(btn => {
    const domain = (btn.getAttribute('data-domain') || '').toLowerCase();
    const isAdded = activeSites.has(domain);
    if (isAdded) {
      btn.style.background = '#0284c7';
      btn.style.color = '#ffffff';
      btn.style.borderColor = '#38bdf8';
    } else {
      btn.style.background = 'rgba(56, 189, 248, 0.08)';
      btn.style.color = 'var(--text-secondary)';
      btn.style.borderColor = 'rgba(56, 189, 248, 0.2)';
    }
  });
}

export function renderKeywordsInDash(ctx) {
  const container = ctx.container || document;
  const currentProfile = ctx.currentProfile;
  const posContainer = container.querySelector('#dashPosKeywords');
  const negContainer = container.querySelector('#dashNegKeywords');
  if (!currentProfile) return;

  if (posContainer) {
    const pos = currentProfile.keywords?.positive || [];
    posContainer.innerHTML = pos.map(kw => `
      <span class="profile-chip" style="display: inline-flex; align-items: center; gap: 0.35rem; background: rgba(52, 211, 153, 0.12); color: #34d399; border: 1px solid rgba(52, 211, 153, 0.3); border-radius: 9999px; padding: 0.25rem 0.65rem; font-size: 0.78rem;">
        ${escapeHtml(kw)}
        <button type="button" class="btn-remove-kw" data-type="positive" data-kw="${escapeHtml(kw)}" style="background: none; border: none; color: #f87171; cursor: pointer; padding: 0; font-size: 0.9rem; line-height: 1; margin-left: 0.2rem;">&times;</button>
      </span>
    `).join('');

    posContainer.querySelectorAll('.btn-remove-kw').forEach(btn => {
      btn.addEventListener('click', () => {
        const kw = btn.getAttribute('data-kw');
        currentProfile.keywords.positive = (currentProfile.keywords.positive || []).filter(k => k !== kw);
        storageService.saveProfile(currentProfile);
        renderKeywordsInDash(ctx);
        if (ctx.onStateChanged) ctx.onStateChanged();
      });
    });
  }

  if (negContainer) {
    const neg = currentProfile.keywords?.negative || [];
    negContainer.innerHTML = neg.map(kw => `
      <span class="profile-chip" style="display: inline-flex; align-items: center; gap: 0.35rem; background: rgba(239, 68, 68, 0.12); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 9999px; padding: 0.25rem 0.65rem; font-size: 0.78rem;">
        🚫 ${escapeHtml(kw)}
        <button type="button" class="btn-remove-kw" data-type="negative" data-kw="${escapeHtml(kw)}" style="background: none; border: none; color: #f87171; cursor: pointer; padding: 0; font-size: 0.9rem; line-height: 1; margin-left: 0.2rem;">&times;</button>
      </span>
    `).join('');

    negContainer.querySelectorAll('.btn-remove-kw').forEach(btn => {
      btn.addEventListener('click', () => {
        const kw = btn.getAttribute('data-kw');
        currentProfile.keywords.negative = (currentProfile.keywords.negative || []).filter(k => k !== kw);
        storageService.saveProfile(currentProfile);
        renderKeywordsInDash(ctx);
        if (ctx.onStateChanged) ctx.onStateChanged();
      });
    });
  }
}

export function bindProfilesTabEvents(container, ctx) {
    // Toggle Target Focus Checkbox & Mode immediately
    document.getElementById('dashTargetFocusEnabled')?.addEventListener('change', (e) => {
      ctx.currentProfile.targetFocus.enabled = e.target.checked;
      storageService.saveProfile(ctx.currentProfile);
      if (this.onStateChanged) ctx.onStateChanged && ctx.onStateChanged();
    });
    document.getElementById('dashTargetFocusMode')?.addEventListener('change', (e) => {
      ctx.currentProfile.targetFocus.mode = e.target.value;
      storageService.saveProfile(ctx.currentProfile);
      if (this.onStateChanged) ctx.onStateChanged && ctx.onStateChanged();
    });

    // Add Custom Website in Dashboard
    const addCustomWebsiteHandler = () => {
      const input = document.getElementById('inputCustomWebsite');
      const raw = (input?.value || '').trim();
      if (!raw) return;
      const domain = raw.replace(/^https?:\/\//i, '').split('/')[0].toLowerCase().trim();
      if (!domain) return;
      const tf = ctx.currentProfile.targetFocus;
      if (!tf.targetDomains) tf.targetDomains = [];
      tf.enabled = true;
      if (!tf.targetDomains.map(d => d.toLowerCase()).includes(domain)) {
        tf.targetDomains.push(domain);
        storageService.saveProfile(ctx.currentProfile);
        input.value = '';
        renderTargetChipsInDash(ctx);
        syncAiWebsiteTrayState(ctx);
        showConfirmationBanner('Target Website Added', `Added "${domain}" to target focus whitelist.`, 'success', 2200);
        if (this.onStateChanged) ctx.onStateChanged && ctx.onStateChanged();
      } else {
        showConfirmationBanner('Already Added', `"${domain}" is already in your active whitelist.`, 'info', 1800);
      }
    };
    document.getElementById('btnAddCustomWebsite')?.addEventListener('click', addCustomWebsiteHandler);
    document.getElementById('inputCustomWebsite')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addCustomWebsiteHandler();
      }
    });

    // Clear All Target Websites
    document.getElementById('btnDashClearAllTargets')?.addEventListener('click', () => {
      ctx.currentProfile.targetFocus.targetDomains = [];
      storageService.saveProfile(ctx.currentProfile);
      renderTargetChipsInDash(ctx);
      syncAiWebsiteTrayState(ctx);
      showConfirmationBanner('Whitelist Cleared', 'All target websites removed from whitelist.', 'info', 2000);
      if (this.onStateChanged) ctx.onStateChanged && ctx.onStateChanged();
    });

    // 1-Click AI Website Whitelist Chips (Interactive Toggle)
    container.querySelectorAll('.btn-dash-add-ai-website').forEach(btn => {
      btn.addEventListener('click', () => {
        const rawDomain = btn.getAttribute('data-domain') || '';
        const domain = rawDomain.replace(/^https?:\/\//i, '').split('/')[0].toLowerCase().trim();
        if (!domain) return;
        const tf = ctx.currentProfile.targetFocus;
        if (!tf.targetDomains) tf.targetDomains = [];
        tf.enabled = true;
        const normalized = tf.targetDomains.map(d => d.toLowerCase());

        if (normalized.includes(domain)) {
          // Toggle off
          tf.targetDomains = tf.targetDomains.filter(d => d.toLowerCase() !== domain);
          storageService.saveProfile(ctx.currentProfile);
          renderTargetChipsInDash(ctx);
          syncAiWebsiteTrayState(ctx);
          showConfirmationBanner('Target Removed', `Removed "${domain}" from whitelist.`, 'info', 1800);
        } else {
          // Toggle on
          tf.targetDomains.push(domain);
          storageService.saveProfile(ctx.currentProfile);
          renderTargetChipsInDash(ctx);
          syncAiWebsiteTrayState(ctx);
          showConfirmationBanner('AI Portal Whitelisted', `Added "${domain}" to whitelist target portals.`, 'success', 2200);
        }
        if (this.onStateChanged) ctx.onStateChanged && ctx.onStateChanged();
      });
    });

    // 1-Click AI Role Suggestions
    container.querySelectorAll('.btn-dash-add-ai-role').forEach(btn => {
      btn.addEventListener('click', () => {
        const role = btn.getAttribute('data-role');
        if (!role) return;
        const input = document.getElementById('dashProfRoles');
        if (input) {
          const roles = input.value.split(',').map(r => r.trim()).filter(Boolean);
          if (!roles.includes(role)) {
            roles.push(role);
            input.value = roles.join(', ');
            ctx.currentProfile.roles = roles;
            storageService.saveProfile(ctx.currentProfile);
            btn.classList.add('added');
            btn.innerHTML = `✓ ${escapeHtml(role)}`;
            showConfirmationBanner('AI Role Added', `Added "${role}" to target designations.`, 'info', 2200);
            if (this.onStateChanged) ctx.onStateChanged && ctx.onStateChanged();
          } else {
            showConfirmationBanner('Already Included', `"${role}" is already in your designations.`, 'info', 1800);
          }
        }
      });
    });

    // Add Positive Keyword
    const addPositiveKeywordHandler = () => {
      const input = document.getElementById('inputAddPositiveKeyword');
      const val = (input?.value || '').trim();
      if (!val) return;
      if (!ctx.currentProfile.keywords) ctx.currentProfile.keywords = [];
      if (!ctx.currentProfile.keywords.includes(val)) {
        ctx.currentProfile.keywords.push(val);
        storageService.saveProfile(ctx.currentProfile);
        input.value = '';
        renderKeywordsInDash(ctx);
        showConfirmationBanner('Keyword Added', `Added "${val}" to search criteria.`, 'info', 2000);
        if (this.onStateChanged) ctx.onStateChanged && ctx.onStateChanged();
      } else {
        showConfirmationBanner('Already Added', `"${val}" is already active in keywords.`, 'info', 1800);
      }
    };
    document.getElementById('btnAddPositiveKeyword')?.addEventListener('click', addPositiveKeywordHandler);
    document.getElementById('inputAddPositiveKeyword')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addPositiveKeywordHandler();
      }
    });

    // 1-Click AI Positive Keyword Chips
    container.querySelectorAll('.btn-dash-add-ai-pos-kw').forEach(btn => {
      btn.addEventListener('click', () => {
        const kw = btn.getAttribute('data-kw');
        if (!kw) return;
        if (!ctx.currentProfile.keywords) ctx.currentProfile.keywords = [];
        if (!ctx.currentProfile.keywords.includes(kw)) {
          ctx.currentProfile.keywords.push(kw);
          storageService.saveProfile(ctx.currentProfile);
          btn.classList.add('added');
          btn.innerHTML = `<span>✓</span> ${escapeHtml(kw)}`;
          renderKeywordsInDash(ctx);
          showConfirmationBanner('AI Keyword Added', `Added "${kw}" to technical keywords.`, 'info', 2200);
          if (this.onStateChanged) ctx.onStateChanged && ctx.onStateChanged();
        } else {
          showConfirmationBanner('Already Added', `"${kw}" is already active in keywords.`, 'info', 1800);
        }
      });
    });

    // Add Negative Keyword
    const addNegativeKeywordHandler = () => {
      const input = document.getElementById('inputAddNegativeKeyword');
      const val = (input?.value || '').trim();
      if (!val) return;
      if (!ctx.currentProfile.negativeKeywords) ctx.currentProfile.negativeKeywords = [];
      if (!ctx.currentProfile.negativeKeywords.includes(val)) {
        ctx.currentProfile.negativeKeywords.push(val);
        storageService.saveProfile(ctx.currentProfile);
        input.value = '';
        renderKeywordsInDash(ctx);
        showConfirmationBanner('Negative Keyword Added', `Added exclusion filter "${val}".`, 'warning', 2000);
        if (this.onStateChanged) ctx.onStateChanged && ctx.onStateChanged();
      } else {
        showConfirmationBanner('Already Excluded', `"${val}" is already in negative filters.`, 'info', 1800);
      }
    };
    document.getElementById('btnAddNegativeKeyword')?.addEventListener('click', addNegativeKeywordHandler);
    document.getElementById('inputAddNegativeKeyword')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addNegativeKeywordHandler();
      }
    });

    // 1-Click AI Negative Keyword Chips
    container.querySelectorAll('.btn-dash-add-ai-neg-kw').forEach(btn => {
      btn.addEventListener('click', () => {
        const kw = btn.getAttribute('data-kw');
        if (!kw) return;
        if (!ctx.currentProfile.negativeKeywords) ctx.currentProfile.negativeKeywords = [];
        if (!ctx.currentProfile.negativeKeywords.includes(kw)) {
          ctx.currentProfile.negativeKeywords.push(kw);
          storageService.saveProfile(ctx.currentProfile);
          btn.classList.add('added');
          btn.innerHTML = `<span>✓</span> ${escapeHtml(kw)}`;
          renderKeywordsInDash(ctx);
          showConfirmationBanner('AI Negative Filter Added', `Added "${kw}" to exclusion filters.`, 'warning', 2200);
          if (this.onStateChanged) ctx.onStateChanged && ctx.onStateChanged();
        } else {
          showConfirmationBanner('Already Excluded', `"${kw}" is already in negative filters.`, 'info', 1800);
        }
      });
    });

    // Add Custom Meta Field Row
    document.getElementById('btnAddNewCustomMetaField')?.addEventListener('click', () => {
      const container = document.getElementById('customMetaFieldsContainer');
      if (!container) return;
      const row = document.createElement('div');
      row.className = 'custom-meta-row';
      row.style = 'display: grid; grid-template-columns: 2fr 3fr auto; gap: 0.6rem; align-items: center;';
      row.innerHTML = `
        <input type="text" class="search-input cf-key" placeholder="Attribute Name (e.g. Clearance Level)..." style="font-size: 0.8rem;">
        <input type="text" class="search-input cf-val" placeholder="Attribute Value (e.g. Secret / Govt)..." style="font-size: 0.8rem;">
        <button type="button" class="btn btn-outline btn-sm btn-remove-cf-row" style="color: #f87171; border-color: rgba(239, 68, 68, 0.3);">&times;</button>
      `;
      row.querySelector('.btn-remove-cf-row').addEventListener('click', () => row.remove());
      container.appendChild(row);
    });

    // 1-Click AI Meta Field Presets
    container.querySelectorAll('.btn-dash-add-ai-meta').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-key');
        const val = btn.getAttribute('data-val');
        if (!key) return;
        const container = document.getElementById('customMetaFieldsContainer');
        if (!container) return;
        const row = document.createElement('div');
        row.className = 'custom-meta-row';
        row.style = 'display: grid; grid-template-columns: 2fr 3fr auto; gap: 0.6rem; align-items: center;';
        row.innerHTML = `
          <input type="text" class="search-input cf-key" value="${escapeHtml(key)}" placeholder="Attribute Name..." style="font-size: 0.8rem;">
          <input type="text" class="search-input cf-val" value="${escapeHtml(val)}" placeholder="Attribute Value..." style="font-size: 0.8rem;">
          <button type="button" class="btn btn-outline btn-sm btn-remove-cf-row" style="color: #f87171; border-color: rgba(239, 68, 68, 0.3);">&times;</button>
        `;
        row.querySelector('.btn-remove-cf-row').addEventListener('click', () => row.remove());
        container.appendChild(row);
        showConfirmationBanner('AI Attribute Added', `Added custom attribute "${key}: ${val}".`, 'info', 2200);
      });
    });

    // Remove Custom Meta Row
    container.querySelectorAll('.btn-remove-cf-row').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.target.closest('.custom-meta-row')?.remove();
      });
    });

    // Save Profile & Custom Fields
    const saveProfileHandler = () => {
      const nameInput = document.getElementById('dashProfName');
      const rolesInput = document.getElementById('dashProfRoles');
      const focusEnabled = document.getElementById('dashTargetFocusEnabled')?.checked || false;
      const focusMode = document.getElementById('dashTargetFocusMode')?.value || 'PRIORITY_BOOST';

      if (nameInput) ctx.currentProfile.name = nameInput.value.trim() || 'Untitled Profile';
      if (rolesInput) {
        ctx.currentProfile.roles = rolesInput.value.split(',').map(r => r.trim()).filter(Boolean);
      }
      ctx.currentProfile.targetFocus.enabled = focusEnabled;
      ctx.currentProfile.targetFocus.mode = focusMode;

      // Extract custom meta fields
      const customFields = [];
      container.querySelectorAll('.custom-meta-row').forEach(row => {
        const k = row.querySelector('.cf-key')?.value.trim();
        const v = row.querySelector('.cf-val')?.value.trim();
        if (k && v) customFields.push({ key: k, value: v });
      });
      ctx.currentProfile.customFields = customFields;

      storageService.saveProfile(ctx.currentProfile);
      storageService.setActiveProfile(ctx.currentProfile.id);

      showConfirmationBanner(
        'Profile Saved',
        `Profile "${ctx.currentProfile.name}" with custom whitelist & keywords successfully saved!`,
        'success',
        3000
      );
      if (this.onStateChanged) ctx.onStateChanged && ctx.onStateChanged();
      ctx.render();
    };

    document.getElementById('btnSaveProfileCustomFields')?.addEventListener('click', saveProfileHandler);
    document.getElementById('btnBottomSaveProfileChanges')?.addEventListener('click', saveProfileHandler);

    // Profile Switcher in Dashboard
    document.getElementById('dashProfileSelect')?.addEventListener('change', (e) => {
      const pid = e.target.value;
      storageService.setActiveProfile(pid);
      ctx.currentProfile = storageService.getActiveProfile();
      if (this.onStateChanged) ctx.onStateChanged && ctx.onStateChanged();
      ctx.render();
    });

    // Create New Profile Button in Dashboard
    document.getElementById('btnDashNewProfile')?.addEventListener('click', () => {
      if (window.app?.profileBuilderUI) {
        window.app.profileBuilderUI.showCreateProfileModal();
      } else {
        document.getElementById('btnNewProfile')?.click();
      }
    });

    // Clone Profile Button in Dashboard
    document.getElementById('btnDashCloneProfile')?.addEventListener('click', () => {
      const copy = JSON.parse(JSON.stringify(ctx.currentProfile));
      copy.id = `profile-${Date.now()}`;
      copy.name = `${ctx.currentProfile.name} (Copy)`;
      copy.createdAt = new Date().toISOString();
      storageService.saveProfile(copy);
      storageService.setActiveProfile(copy.id);
      ctx.currentProfile = copy;
      showConfirmationBanner(
        'Profile Cloned',
        `Cloned successfully as "${copy.name}"! You can now adjust its technical fields and target websites.`,
        'success',
        3000
      );
      if (this.onStateChanged) ctx.onStateChanged && ctx.onStateChanged();
      ctx.render();
    });

}
