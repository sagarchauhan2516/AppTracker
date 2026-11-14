/**
 * Vacancy Radar India - Dedicated Per-Profile Settings & Preferences Component
 * Allows candidate to manage their profile-specific details:
 * - Candidate Name, Profile Name, Roles, Qualifications
 * - Technical Keywords (Positive & Negative terms, 1-click recommendations)
 * - Target Whitelisted Websites & Portals (C-DAC, CBI, NFSU, DRDO, etc.)
 * - Profile-specific Alert Channels: Email (sagarmc2516@gmail.com) & Telegram (5451190370)
 * - Custom Metadata Attributes
 */

import { storageService } from '../services/storageService.js';
import { ROLE_PRESETS, KNOWN_APEX_TARGETS } from '../data/rolePresets.js';
import { showConfirmationBanner } from '../services/notificationService.js';
import { escapeHtml } from '../utils/htmlUtils.js';

export class ProfileSettingsUI {
  constructor(containerId = 'modalProfileSettingsBody', onStateChanged = null) {
    this.containerId = containerId;
    this.container = document.getElementById(containerId);
    this.onStateChanged = onStateChanged;
    this.currentProfile = null;
    this.activeTab = 'general'; // 'general', 'keywords', 'websites', 'alerts', 'custom'
  }

  escapeHtml(str) {
    return escapeHtml(str);
  }

  render() {
    if (!this.container) {
      this.container = document.getElementById(this.containerId);
    }
    if (!this.container) return;

    this.currentProfile = JSON.parse(JSON.stringify(storageService.getActiveProfile()));
    const profiles = storageService.getProfiles();

    // Default email and telegram if missing
    if (!this.currentProfile.scheduleSettings) this.currentProfile.scheduleSettings = {};
    const sched = this.currentProfile.scheduleSettings;
    if (!sched.emailAddress || sched.emailAddress === 'candidate@dfir-india.org') {
      sched.emailAddress = 'sagarmc2516@gmail.com';
      sched.notificationEmails = ['sagarmc2516@gmail.com'];
    }
    if (!sched.telegramChatId) {
      sched.telegramChatId = '5451190370';
      sched.telegramAlertsEnabled = true;
    }
    if (!this.currentProfile.customFields) {
      this.currentProfile.customFields = [
        { key: 'Notice Period', value: 'Immediate / 15 Days' },
        { key: 'Preferred Directorate', value: 'CFSL / State Cyber Police' },
        { key: 'Target Pay Band', value: 'Pay Level 7 to 10 (7th CPC)' }
      ];
    }
    if (!this.currentProfile.negativeKeywords) {
      this.currentProfile.negativeKeywords = ['Unpaid Internship', 'Walk-in Only', 'Non-Technical Data Entry'];
    }
    if (!this.currentProfile.targetFocus) {
      this.currentProfile.targetFocus = {
        enabled: true,
        mode: 'PRIORITY_BOOST',
        targetDomains: ['cdac.in', 'upsc.gov.in', 'nfsu.ac.in', 'drdo.gov.in', 'cert-in.org.in'],
        targetOrganisations: ['Centre for Development of Advanced Computing (C-DAC)', 'UPSC', 'NFSU', 'DRDO']
      };
    }

    const edu = this.currentProfile.education || {};
    const demo = this.currentProfile.demographics || {};
    const exp = this.currentProfile.experience || {};
    const tf = this.currentProfile.targetFocus;
    const targetDomains = tf.targetDomains || [];

    this.container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 1.25rem;">
        
        <!-- Modal Top Bar: Profile Selector + Actions -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-subtle); padding-bottom: 1rem; flex-wrap: wrap; gap: 0.75rem;">
          <div style="display: flex; align-items: center; gap: 0.6rem;">
            <div style="width: 36px; height: 36px; border-radius: 8px; background: rgba(96, 165, 250, 0.15); color: #60a5fa; display: flex; align-items: center; justify-content: center;">
              <i data-lucide="user" class="icon-md"></i>
            </div>
            <div>
              <h3 style="font-family: var(--font-heading); font-size: 1.25rem; margin: 0; color: var(--text-main);">
                Profile Settings &amp; Preferences
              </h3>
              <p style="font-size: 0.78rem; color: var(--text-secondary); margin: 0.15rem 0 0 0;">
                Configure candidate identity, technical keywords, target websites, and alert channels for this profile.
              </p>
            </div>
          </div>

          <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
            <label style="font-size: 0.78rem; font-weight: 600; color: var(--text-secondary);">Editing Profile:</label>
            <select id="modalProfSelector" class="filter-select" style="font-weight: 600; font-size: 0.82rem; padding: 0.35rem 0.65rem;">
              ${profiles.map(p => `
                <option value="${p.id}" ${p.id === this.currentProfile.id ? 'selected' : ''}>
                  ${this.escapeHtml(p.name)}
                </option>
              `).join('')}
            </select>
            <button type="button" id="btnModalNewProfile" class="btn btn-outline btn-sm" style="font-weight: 600;">
              <i data-lucide="plus" class="icon-xs"></i> New Profile
            </button>
            <button type="button" id="btnModalCloneProfile" class="btn btn-outline btn-sm" title="Clone current profile">
              <i data-lucide="copy" class="icon-xs"></i> Clone
            </button>
            ${profiles.length > 1 ? `
              <button type="button" id="btnModalDeleteProfile" class="btn btn-outline btn-sm" style="color: #f87171; border-color: rgba(239, 68, 68, 0.4);" title="Delete current profile">
                <i data-lucide="trash-2" class="icon-xs"></i>
              </button>
            ` : ''}
          </div>
        </div>

        <!-- Sub-Navigation Tabs for Profile Settings -->
        <div style="display: flex; gap: 0.4rem; border-bottom: 1px solid var(--border-subtle); padding-bottom: 0.35rem; flex-wrap: wrap;">
          <button type="button" class="nav-tab-btn btn-prof-tab ${this.activeTab === 'general' ? 'active' : ''}" data-tab="general" style="font-size: 0.8rem; padding: 0.4rem 0.85rem;">
            <i data-lucide="user" class="icon-xs"></i> Identity &amp; Roles
          </button>
          <button type="button" class="nav-tab-btn btn-prof-tab ${this.activeTab === 'keywords' ? 'active' : ''}" data-tab="keywords" style="font-size: 0.8rem; padding: 0.4rem 0.85rem;">
            <i data-lucide="tag" class="icon-xs"></i> Technical Keywords (${(this.currentProfile.keywords || []).length})
          </button>
          <button type="button" class="nav-tab-btn btn-prof-tab ${this.activeTab === 'websites' ? 'active' : ''}" data-tab="websites" style="font-size: 0.8rem; padding: 0.4rem 0.85rem;">
            <i data-lucide="crosshair" class="icon-xs"></i> Target Websites &amp; Whitelist (${targetDomains.length})
          </button>
          <button type="button" class="nav-tab-btn btn-prof-tab ${this.activeTab === 'alerts' ? 'active' : ''}" data-tab="alerts" style="font-size: 0.8rem; padding: 0.4rem 0.85rem;">
            <i data-lucide="bell" class="icon-xs"></i> Alerts (Email &amp; Telegram)
          </button>
          <button type="button" class="nav-tab-btn btn-prof-tab ${this.activeTab === 'custom' ? 'active' : ''}" data-tab="custom" style="font-size: 0.8rem; padding: 0.4rem 0.85rem;">
            <i data-lucide="sliders" class="icon-xs"></i> Custom Attributes (${(this.currentProfile.customFields || []).length})
          </button>
        </div>

        <!-- TAB 1: General Identity & Roles -->
        <div id="profTabGeneral" style="display: ${this.activeTab === 'general' ? 'block' : 'none'};">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
            <div>
              <label style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); display: block; margin-bottom: 0.35rem;">
                Profile Display Name
              </label>
              <input type="text" id="inputProfName" class="search-input" value="${this.escapeHtml(this.currentProfile.name)}" placeholder="e.g. Cyber Crime Investigation &amp; DFIR" style="width: 100%; font-weight: 600;">
            </div>
            <div>
              <label style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); display: block; margin-bottom: 0.35rem;">
                Candidate Full Name
              </label>
              <input type="text" id="inputCandidateName" class="search-input" value="${this.escapeHtml(this.currentProfile.candidateName || 'Sagar Chauhan')}" placeholder="e.g. Sagar Chauhan" style="width: 100%;">
            </div>
          </div>

          <div style="margin-bottom: 1rem;">
            <label style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); display: block; margin-bottom: 0.35rem;">
              Target Roles / Job Titles (Comma-separated)
            </label>
            <input type="text" id="inputProfRoles" class="search-input" value="${this.escapeHtml((this.currentProfile.roles || []).join(', '))}" placeholder="e.g. Cyber Crime Investigator, Digital Forensics Examiner, Incident Responder, VAPT Officer" style="width: 100%; font-family: var(--font-mono); font-size: 0.82rem;">
            <small style="display: block; font-size: 0.72rem; color: var(--text-muted); margin-top: 0.25rem;">
              Vacancies matching these specific titles will be highlighted and ranked top in this profile's feed.
            </small>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; background: var(--bg-surface-elevated); padding: 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
            <div>
              <label style="font-size: 0.72rem; font-weight: 700; color: var(--text-muted); display: block; margin-bottom: 0.25rem;">Degree Level</label>
              <input type="text" id="inputProfDegree" class="search-input" value="${this.escapeHtml(edu.degreeLevel || 'B.E. / B.Tech / M.Sc')}" style="width: 100%; font-size: 0.8rem;">
            </div>
            <div>
              <label style="font-size: 0.72rem; font-weight: 700; color: var(--text-muted); display: block; margin-bottom: 0.25rem;">Eligible Branch(es)</label>
              <input type="text" id="inputProfBranches" class="search-input" value="${this.escapeHtml((edu.eligibleBranches || ['Computer Engineering', 'Information Technology', 'Cyber Security', 'Digital Forensics']).join(', '))}" style="width: 100%; font-size: 0.8rem;">
            </div>
            <div>
              <label style="font-size: 0.72rem; font-weight: 700; color: var(--text-muted); display: block; margin-bottom: 0.25rem;">Reservation Category</label>
              <select id="selectProfCategory" class="filter-select" style="width: 100%; font-size: 0.8rem;">
                <option value="UR" ${demo.category === 'UR' ? 'selected' : ''}>General / Unreserved (UR)</option>
                <option value="OBC_NCL" ${demo.category === 'OBC_NCL' ? 'selected' : ''}>OBC-NCL (+3 Years Age Relaxation)</option>
                <option value="SC" ${demo.category === 'SC' ? 'selected' : ''}>SC (+5 Years Age Relaxation)</option>
                <option value="ST" ${demo.category === 'ST' ? 'selected' : ''}>ST (+5 Years Age Relaxation)</option>
                <option value="EWS" ${demo.category === 'EWS' ? 'selected' : ''}>EWS (Standard Norms)</option>
              </select>
            </div>
            <div>
              <label style="font-size: 0.72rem; font-weight: 700; color: var(--text-muted); display: block; margin-bottom: 0.25rem;">Experience (Years)</label>
              <input type="number" id="inputProfExperience" class="search-input" value="${exp.minYears || 1}" min="0" max="40" style="width: 100%; font-size: 0.8rem;">
            </div>
          </div>
        </div>

        <!-- TAB 2: Technical Keywords -->
        <div id="profTabKeywords" style="display: ${this.activeTab === 'keywords' ? 'block' : 'none'};">
          <div style="margin-bottom: 1rem;">
            <label style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); display: block; margin-bottom: 0.35rem;">
              Active Positive Keywords for "${this.escapeHtml(this.currentProfile.name)}"
            </label>
            <div style="display: flex; gap: 0.5rem; margin-bottom: 0.6rem;">
              <input type="text" id="inputAddPositiveKw" class="search-input" placeholder="e.g. Mobile Forensics, Memory Analysis, Ghidra, FTK, SAST" style="flex: 1; font-size: 0.82rem;">
              <button type="button" id="btnAddPositiveKw" class="btn btn-primary btn-sm" style="font-weight: 600;"><i data-lucide="plus" class="icon-xs"></i> Add Keyword</button>
            </div>
            <div id="profPositiveKwChips" style="display: flex; flex-wrap: wrap; gap: 0.4rem; min-height: 40px; background: var(--bg-surface-elevated); padding: 0.6rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
              ${(this.currentProfile.keywords || []).map(kw => `
                <span class="meta-pill" style="font-size: 0.78rem; background: rgba(56, 189, 248, 0.12); color: #38bdf8; border-color: rgba(56, 189, 248, 0.3); display: inline-flex; align-items: center; gap: 0.35rem;">
                  <strong>${this.escapeHtml(kw)}</strong>
                  <button type="button" class="btn-remove-kw" data-kw="${this.escapeHtml(kw)}" style="background: none; border: none; color: #f87171; cursor: pointer; padding: 0; font-size: 0.9rem; line-height: 1;">&times;</button>
                </span>
              `).join('')}
            </div>
          </div>

          <!-- 1-Click Recommended AI Forensics & Security Keywords -->
          <div style="background: rgba(168, 85, 247, 0.08); border: 1px solid rgba(168, 85, 247, 0.25); border-radius: var(--radius-md); padding: 0.85rem; margin-bottom: 1rem;">
            <strong style="font-size: 0.78rem; color: #c084fc; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 0.35rem; margin-bottom: 0.4rem;">
              <i data-lucide="sparkles" class="icon-xs"></i> 1-Click Add Recommended Technical Keywords:
            </strong>
            <div style="display: flex; flex-wrap: wrap; gap: 0.4rem;">
              ${['Digital Forensics', 'DFIR', 'EnCase', 'FTK', 'Autopsy', 'Volatility', 'SIEM', 'VAPT', 'Section 65B', 'Deepfake', 'Network Forensics', 'Incident Response', 'Malware Analysis', 'Reverse Engineering', 'C-DAC', 'Cyber Crime'].map(kw => {
                const isAlready = (this.currentProfile.keywords || []).includes(kw);
                return `
                  <button type="button" class="btn-quick-add-kw ${isAlready ? 'added' : ''}" data-kw="${kw}" style="font-size: 0.72rem; padding: 0.2rem 0.55rem; border-radius: var(--radius-pill); border: 1px solid ${isAlready ? 'rgba(16, 185, 129, 0.4)' : 'rgba(168, 85, 247, 0.35)'}; background: ${isAlready ? 'rgba(16, 185, 129, 0.15)' : 'rgba(168, 85, 247, 0.15)'}; color: ${isAlready ? '#34d399' : '#c084fc'}; cursor: pointer;">
                    <i data-lucide="${isAlready ? 'check' : 'plus'}" class="icon-xs"></i> ${kw}
                  </button>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Negative / Excluded Keywords -->
          <div>
            <label style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); display: block; margin-bottom: 0.35rem;">
              Negative / Excluded Terms (Suppresses unwanted vacancies)
            </label>
            <div style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem;">
              <input type="text" id="inputAddNegativeKw" class="search-input" placeholder="e.g. Sales, Marketing, Unpaid, Call Center" style="flex: 1; font-size: 0.82rem;">
              <button type="button" id="btnAddNegativeKw" class="btn btn-outline btn-sm" style="color: #f87171; border-color: rgba(239, 68, 68, 0.4);"><i data-lucide="plus" class="icon-xs"></i> Add Exclusion</button>
            </div>
            <div id="profNegativeKwChips" style="display: flex; flex-wrap: wrap; gap: 0.4rem;">
              ${(this.currentProfile.negativeKeywords || []).map(nkw => `
                <span class="meta-pill" style="font-size: 0.75rem; background: rgba(239, 68, 68, 0.12); color: #f87171; border-color: rgba(239, 68, 68, 0.3); display: inline-flex; align-items: center; gap: 0.35rem;">
                  <i data-lucide="ban" class="icon-xs"></i> ${this.escapeHtml(nkw)}
                  <button type="button" class="btn-remove-nkw" data-kw="${this.escapeHtml(nkw)}" style="background: none; border: none; color: #f87171; cursor: pointer; padding: 0;">&times;</button>
                </span>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- TAB 3: Target Websites & Whitelist -->
        <div id="profTabWebsites" style="display: ${this.activeTab === 'websites' ? 'block' : 'none'};">
          <div style="background: var(--bg-surface-elevated); padding: 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle); margin-bottom: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.75rem;">
              <div>
                <strong style="font-size: 0.95rem; color: var(--text-main); display: block;">Target Portal Filtering Mode</strong>
                <span style="font-size: 0.78rem; color: var(--text-secondary);">Control how whitelisted websites affect this profile's vacancy discovery.</span>
              </div>
              <select id="selectProfFocusMode" class="filter-select" style="font-weight: 600; font-size: 0.82rem;">
                <option value="PRIORITY_BOOST" ${tf.mode === 'PRIORITY_BOOST' ? 'selected' : ''}>Priority Boost (+15% score &amp; highlight badge)</option>
                <option value="STRICT_TARGET" ${tf.mode === 'STRICT_TARGET' ? 'selected' : ''}>Strict Whitelist Only (Isolate whitelisted sites only)</option>
              </select>
            </div>

            <div style="display: flex; gap: 0.5rem; margin-bottom: 0.75rem;">
              <input type="text" id="inputAddWebsite" class="search-input" placeholder="e.g. careers.cdac.in, cbi.gov.in, cert-in.org.in" style="flex: 1; font-family: var(--font-mono); font-size: 0.82rem;">
              <button type="button" id="btnAddWebsite" class="btn btn-primary btn-sm" style="font-weight: 600;"><i data-lucide="plus" class="icon-xs"></i> Add Website</button>
            </div>

            <!-- Whitelisted Domain Chips -->
            <label style="font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; display: block; margin-bottom: 0.4rem;">
              Currently Whitelisted Official Websites:
            </label>
            <div id="profWebsiteChips" style="display: flex; flex-wrap: wrap; gap: 0.45rem; margin-bottom: 0.75rem;">
              ${targetDomains.map(d => `
                <span class="meta-pill" style="font-size: 0.8rem; background: rgba(16, 185, 129, 0.12); color: #34d399; border-color: rgba(16, 185, 129, 0.35); display: inline-flex; align-items: center; gap: 0.4rem;">
                  <i data-lucide="globe" class="icon-xs"></i> <strong>${this.escapeHtml(d)}</strong>
                  <button type="button" class="btn-remove-site" data-domain="${this.escapeHtml(d)}" style="background: none; border: none; color: #f87171; cursor: pointer; padding: 0; font-size: 0.9rem;">&times;</button>
                </span>
              `).join('')}
            </div>

            <!-- Quick Add Apex Portals -->
            <strong style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; display: block; margin-bottom: 0.35rem;">
              Quick Add Known Apex Bodies:
            </strong>
            <div style="display: flex; flex-wrap: wrap; gap: 0.35rem;">
              ${[
                { d: 'careers.cdac.in', label: 'C-DAC Careers' },
                { d: 'cert-in.org.in', label: 'CERT-In' },
                { d: 'cbi.gov.in', label: 'CBI Cyber Crime' },
                { d: 'nfsu.ac.in', label: 'NFSU Forensics' },
                { d: 'drdo.gov.in', label: 'DRDO' },
                { d: 'nielit.gov.in', label: 'NIELIT' },
                { d: 'upsc.gov.in', label: 'UPSC' },
                { d: 'dfs.nic.in', label: 'DFSS (MHA)' }
              ].map(s => `
                <button type="button" class="btn-quick-add-site ${targetDomains.includes(s.d) ? 'added' : ''}" data-domain="${s.d}" style="font-size: 0.72rem; padding: 0.2rem 0.5rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); background: var(--bg-surface); color: var(--text-main); cursor: pointer;">
                  <i data-lucide="${targetDomains.includes(s.d) ? 'check' : 'plus'}" class="icon-xs"></i> ${s.label}
                </button>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- TAB 4: Alerts (Email & Telegram for this Profile) -->
        <div id="profTabAlerts" style="display: ${this.activeTab === 'alerts' ? 'block' : 'none'};">
          <div style="display: flex; flex-direction: column; gap: 1rem;">
            
            <!-- Email Alert Box -->
            <div style="background: var(--bg-surface-elevated); padding: 1.15rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
              <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.4rem;">
                <i data-lucide="mail" class="icon-sm text-cyan"></i>
                <strong style="font-size: 0.95rem; color: var(--text-main);">Email Alert Recipient for this Profile</strong>
              </div>
              <p style="font-size: 0.78rem; color: var(--text-secondary); margin: 0 0 0.6rem 0;">
                All verified vacancies and approaching deadlines matching "${this.escapeHtml(this.currentProfile.name)}" will be delivered to this email.
              </p>
              <div style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem;">
                <input type="email" id="inputProfEmail" class="search-input" value="${this.escapeHtml(sched.emailAddress || 'sagarmc2516@gmail.com')}" placeholder="sagarmc2516@gmail.com" style="flex: 1; font-family: var(--font-mono); font-size: 0.85rem; font-weight: 600;">
                <button type="button" id="btnTestProfEmail" class="btn btn-outline btn-sm" style="font-weight: 600; border-color: #60a5fa; color: #60a5fa; white-space: nowrap;">
                  <i data-lucide="mail" class="icon-xs"></i> Send Test Email
                </button>
              </div>
              <label style="display: flex; align-items: center; gap: 0.45rem; font-size: 0.8rem; cursor: pointer; color: var(--text-secondary);">
                <input type="checkbox" id="chkProfEmailAlerts" ${sched.emailAlertsEnabled !== false ? 'checked' : ''}>
                <span>Send automated Gmail alerts on newly verified vacancies matching this profile</span>
              </label>
              <div id="statusProfEmailTest" style="display: none; margin-top: 0.5rem;"></div>
            </div>

            <!-- Telegram Alert Box -->
            <div style="background: var(--bg-surface-elevated); padding: 1.15rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
              <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.4rem;">
                <i data-lucide="send" class="icon-sm text-cyan"></i>
                <strong style="font-size: 0.95rem; color: var(--text-main);">Telegram Chat ID for this Profile</strong>
              </div>
              <p style="font-size: 0.78rem; color: var(--text-secondary); margin: 0 0 0.6rem 0;">
                Telegram chat ID / channel to receive instantaneous push alerts for this profile.
              </p>
              <div style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem;">
                <input type="text" id="inputProfTgChat" class="search-input" value="${this.escapeHtml(sched.telegramChatId || '5451190370')}" placeholder="5451190370" style="flex: 1; font-family: var(--font-mono); font-size: 0.85rem; font-weight: 600;">
                <button type="button" id="btnTestProfTelegram" class="btn btn-outline btn-sm" style="font-weight: 600; border-color: #38bdf8; color: #38bdf8; white-space: nowrap;">
                  <i data-lucide="send" class="icon-xs"></i> Send Test Alert
                </button>
              </div>
              <label style="display: flex; align-items: center; gap: 0.45rem; font-size: 0.8rem; cursor: pointer; color: var(--text-secondary);">
                <input type="checkbox" id="chkProfTgAlerts" ${sched.telegramAlertsEnabled !== false ? 'checked' : ''}>
                <span>Dispatch urgent deadline reminders (≤ 7 days) directly to Telegram</span>
              </label>
              <div id="statusProfTgTest" style="display: none; margin-top: 0.5rem;"></div>
            </div>

            <!-- Frequency & Deadline Settings -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; background: var(--bg-surface); padding: 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
              <div>
                <label style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); display: block; margin-bottom: 0.3rem;">Automated Scan Frequency</label>
                <select id="selectProfFrequency" class="filter-select" style="width: 100%; font-size: 0.82rem;">
                  <option value="DAILY_THRICE" selected>Thrice Daily (08:00, 14:00, 20:00 IST)</option>
                  <option value="DAILY_TWICE">Twice Daily (09:00, 18:00 IST)</option>
                  <option value="DAILY_ONCE">Once Daily (08:00 IST Morning Bulletin)</option>
                </select>
              </div>
              <div>
                <label style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); display: block; margin-bottom: 0.3rem;">Urgent Deadline Threshold</label>
                <select id="selectProfLeadDays" class="filter-select" style="width: 100%; font-size: 0.82rem;">
                  <option value="7" ${sched.deadlineLeadDays === 7 ? 'selected' : ''}>Flag ≤ 7 Days to Closing</option>
                  <option value="5" ${sched.deadlineLeadDays === 5 ? 'selected' : ''}>Flag ≤ 5 Days to Closing</option>
                  <option value="3" ${sched.deadlineLeadDays === 3 ? 'selected' : ''}>Flag ≤ 3 Days to Closing (Urgent Only)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <!-- TAB 5: Custom Attributes -->
        <div id="profTabCustom" style="display: ${this.activeTab === 'custom' ? 'block' : 'none'};">
          <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.75rem;">
            Custom attributes are tracked with this profile and matched against incoming circular notifications.
          </p>
          <div id="profCustomFieldsList" style="display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 0.75rem;">
            ${(this.currentProfile.customFields || []).map((cf, idx) => `
              <div class="custom-meta-row" style="display: flex; gap: 0.5rem; align-items: center;">
                <input type="text" class="search-input cf-key" value="${this.escapeHtml(cf.key)}" placeholder="Attribute (e.g. Notice Period)" style="flex: 1; font-size: 0.82rem;">
                <input type="text" class="search-input cf-val" value="${this.escapeHtml(cf.value)}" placeholder="Value (e.g. 15 Days)" style="flex: 2; font-size: 0.82rem;">
                <button type="button" class="btn btn-outline btn-sm btn-remove-cf" style="color: #f87171; padding: 0.3rem 0.6rem;">&times;</button>
              </div>
            `).join('')}
          </div>
          <button type="button" id="btnAddCustomFieldRow" class="btn btn-outline btn-sm" style="font-weight: 600;">
            <i data-lucide="plus" class="icon-xs"></i> Add Custom Attribute Row
          </button>
        </div>

        <!-- Bottom Actions Bar -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-subtle); padding-top: 1rem; margin-top: 0.5rem; flex-wrap: wrap; gap: 0.75rem;">
          <span style="font-size: 0.75rem; color: var(--text-muted); display: inline-flex; align-items: center; gap: 0.35rem;">
            <i data-lucide="shield-check" class="icon-xs text-emerald"></i> Changes persist directly to local database &amp; sync to Google Sheets.
          </span>
          <div style="display: flex; gap: 0.5rem;">
            <button type="button" id="btnCancelProfileSettings" class="btn btn-outline btn-sm">Cancel</button>
            <button type="button" id="btnSaveProfileSettings" class="btn btn-primary btn-sm" style="font-weight: 600; padding: 0.45rem 1.25rem;">
              <i data-lucide="save" class="icon-xs"></i> Save Profile Settings
            </button>
          </div>
        </div>

      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    // Tab switching
    this.container.querySelectorAll('.btn-prof-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeTab = btn.getAttribute('data-tab');
        this.render();
      });
    });

    // Profile selector inside modal
    document.getElementById('modalProfSelector')?.addEventListener('change', (e) => {
      storageService.setActiveProfile(e.target.value);
      this.currentProfile = storageService.getActiveProfile();
      if (this.onStateChanged) this.onStateChanged();
      this.render();
    });

    // New Profile
    document.getElementById('btnModalNewProfile')?.addEventListener('click', () => {
      const name = prompt('Enter name for the new Technical Role Profile:', 'Cyber Security Architect');
      if (name && name.trim()) {
        const newProf = {
          id: `profile-${Date.now()}`,
          name: name.trim(),
          candidateName: 'Sagar Chauhan',
          roles: ['Cyber Security Architect', 'Incident Response Lead'],
          keywords: ['SIEM', 'SOC', 'Incident Response', 'VAPT', 'Cloud Security'],
          negativeKeywords: ['Unpaid', 'Sales'],
          education: { degreeLevel: 'B.E. / B.Tech', eligibleBranches: ['Computer Engineering', 'IT', 'Cyber Security'] },
          experience: { minYears: 2 },
          demographics: { category: 'UR', age: 26 },
          targetFocus: {
            enabled: true,
            mode: 'PRIORITY_BOOST',
            targetDomains: ['careers.cdac.in', 'cert-in.org.in', 'cbi.gov.in', 'drdo.gov.in'],
            targetOrganisations: ['C-DAC', 'CERT-In', 'DRDO']
          },
          scheduleSettings: {
            emailAddress: 'sagarmc2516@gmail.com',
            notificationEmails: ['sagarmc2516@gmail.com'],
            emailAlertsEnabled: true,
            telegramChatId: '5451190370',
            telegramAlertsEnabled: true,
            deadlineLeadDays: 7,
            preset: 'DAILY_THRICE'
          },
          customFields: [{ key: 'Notice Period', value: 'Immediate' }],
          createdAt: new Date().toISOString()
        };
        storageService.saveProfile(newProf);
        storageService.setActiveProfile(newProf.id);
        showConfirmationBanner('Profile Created', `Created and activated profile "${newProf.name}".`, 'success', 2500);
        if (this.onStateChanged) this.onStateChanged();
        this.render();
      }
    });

    // Clone Profile
    document.getElementById('btnModalCloneProfile')?.addEventListener('click', () => {
      const copy = JSON.parse(JSON.stringify(this.currentProfile));
      copy.id = `profile-${Date.now()}`;
      copy.name = `${this.currentProfile.name} (Copy)`;
      copy.createdAt = new Date().toISOString();
      storageService.saveProfile(copy);
      storageService.setActiveProfile(copy.id);
      showConfirmationBanner('Profile Cloned', `Cloned as "${copy.name}".`, 'success', 2500);
      if (this.onStateChanged) this.onStateChanged();
      this.render();
    });

    // Delete Profile
    document.getElementById('btnModalDeleteProfile')?.addEventListener('click', () => {
      const profiles = storageService.getProfiles();
      if (profiles.length <= 1) {
        alert('Cannot delete the only remaining profile.');
        return;
      }
      if (confirm(`Are you sure you want to delete profile "${this.currentProfile.name}"?`)) {
        const remaining = profiles.filter(p => p.id !== this.currentProfile.id);
        localStorage.setItem('vacancy_radar_profiles_v1', JSON.stringify(remaining));
        storageService.setActiveProfile(remaining[0].id);
        showConfirmationBanner('Profile Deleted', 'Profile removed successfully.', 'info', 2200);
        if (this.onStateChanged) this.onStateChanged();
        this.render();
      }
    });

    // Add Positive Keyword
    const addPosKw = () => {
      const input = document.getElementById('inputAddPositiveKw');
      const kw = (input?.value || '').trim();
      if (!kw) return;
      if (!this.currentProfile.keywords) this.currentProfile.keywords = [];
      if (!this.currentProfile.keywords.includes(kw)) {
        this.currentProfile.keywords.push(kw);
        input.value = '';
        this.render();
      }
    };
    document.getElementById('btnAddPositiveKw')?.addEventListener('click', addPosKw);
    document.getElementById('inputAddPositiveKw')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); addPosKw(); }
    });

    // Remove Keyword
    this.container.querySelectorAll('.btn-remove-kw').forEach(btn => {
      btn.addEventListener('click', () => {
        const kw = btn.getAttribute('data-kw');
        this.currentProfile.keywords = (this.currentProfile.keywords || []).filter(k => k !== kw);
        this.render();
      });
    });

    // 1-Click Quick Add Keyword
    this.container.querySelectorAll('.btn-quick-add-kw').forEach(btn => {
      btn.addEventListener('click', () => {
        const kw = btn.getAttribute('data-kw');
        if (!kw) return;
        if (!this.currentProfile.keywords) this.currentProfile.keywords = [];
        if (!this.currentProfile.keywords.includes(kw)) {
          this.currentProfile.keywords.push(kw);
        } else {
          this.currentProfile.keywords = this.currentProfile.keywords.filter(k => k !== kw);
        }
        this.render();
      });
    });

    // Add Negative Keyword
    const addNegKw = () => {
      const input = document.getElementById('inputAddNegativeKw');
      const kw = (input?.value || '').trim();
      if (!kw) return;
      if (!this.currentProfile.negativeKeywords) this.currentProfile.negativeKeywords = [];
      if (!this.currentProfile.negativeKeywords.includes(kw)) {
        this.currentProfile.negativeKeywords.push(kw);
        input.value = '';
        this.render();
      }
    };
    document.getElementById('btnAddNegativeKw')?.addEventListener('click', addNegKw);

    // Remove Negative Keyword
    this.container.querySelectorAll('.btn-remove-nkw').forEach(btn => {
      btn.addEventListener('click', () => {
        const kw = btn.getAttribute('data-kw');
        this.currentProfile.negativeKeywords = (this.currentProfile.negativeKeywords || []).filter(k => k !== kw);
        this.render();
      });
    });

    // Add Website
    const addSite = () => {
      const input = document.getElementById('inputAddWebsite');
      const raw = (input?.value || '').trim();
      if (!raw) return;
      const domain = raw.replace(/^https?:\/\//i, '').split('/')[0].toLowerCase().trim();
      if (!domain) return;
      const tf = this.currentProfile.targetFocus;
      if (!tf.targetDomains) tf.targetDomains = [];
      tf.enabled = true;
      if (!tf.targetDomains.map(d => d.toLowerCase()).includes(domain)) {
        tf.targetDomains.push(domain);
        input.value = '';
        this.render();
      }
    };
    document.getElementById('btnAddWebsite')?.addEventListener('click', addSite);
    document.getElementById('inputAddWebsite')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); addSite(); }
    });

    // Remove Website
    this.container.querySelectorAll('.btn-remove-site').forEach(btn => {
      btn.addEventListener('click', () => {
        const dom = btn.getAttribute('data-domain');
        this.currentProfile.targetFocus.targetDomains = (this.currentProfile.targetFocus.targetDomains || []).filter(d => d.toLowerCase() !== dom.toLowerCase());
        this.render();
      });
    });

    // Quick Add Site
    this.container.querySelectorAll('.btn-quick-add-site').forEach(btn => {
      btn.addEventListener('click', () => {
        const dom = btn.getAttribute('data-domain');
        if (!dom) return;
        const tf = this.currentProfile.targetFocus;
        if (!tf.targetDomains) tf.targetDomains = [];
        tf.enabled = true;
        if (!tf.targetDomains.map(d => d.toLowerCase()).includes(dom.toLowerCase())) {
          tf.targetDomains.push(dom);
        } else {
          tf.targetDomains = tf.targetDomains.filter(d => d.toLowerCase() !== dom.toLowerCase());
        }
        this.render();
      });
    });

    // Add Custom Field Row
    document.getElementById('btnAddCustomFieldRow')?.addEventListener('click', () => {
      const list = document.getElementById('profCustomFieldsList');
      if (list) {
        const div = document.createElement('div');
        div.className = 'custom-meta-row';
        div.style.cssText = 'display: flex; gap: 0.5rem; align-items: center;';
        div.innerHTML = `
          <input type="text" class="search-input cf-key" placeholder="Attribute (e.g. Notice Period)" style="flex: 1; font-size: 0.82rem;">
          <input type="text" class="search-input cf-val" placeholder="Value (e.g. 15 Days)" style="flex: 2; font-size: 0.82rem;">
          <button type="button" class="btn btn-outline btn-sm btn-remove-cf" style="color: #f87171; padding: 0.3rem 0.6rem;">&times;</button>
        `;
        div.querySelector('.btn-remove-cf').addEventListener('click', () => div.remove());
        list.appendChild(div);
      }
    });

    // Remove Custom Field Row
    this.container.querySelectorAll('.btn-remove-cf').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.target.closest('.custom-meta-row')?.remove();
      });
    });

    // Test Email Button
    document.getElementById('btnTestProfEmail')?.addEventListener('click', async () => {
      const btn = document.getElementById('btnTestProfEmail');
      const statusDiv = document.getElementById('statusProfEmailTest');
      const email = document.getElementById('inputProfEmail')?.value.trim() || 'sagarmc2516@gmail.com';
      const webhookUrl = storageService.getProviderConfig()?.googleAppsScriptWebhookUrl?.trim();

      if (!webhookUrl) {
        if (statusDiv) {
          statusDiv.style.display = 'block';
          statusDiv.innerHTML = `<span style="color: #f87171; font-size: 0.78rem; display: flex; align-items: center; gap: 0.35rem;"><i data-lucide="alert-triangle" class="icon-xs text-amber"></i> Please configure Google Apps Script Webhook URL in Main Settings first.</span>`;
          if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
        }
        return;
      }

      btn.disabled = true;
      btn.innerHTML = '<i data-lucide="loader-2" class="icon-xs icon-spin"></i> Sending...';
      if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
      if (statusDiv) {
        statusDiv.style.display = 'block';
        statusDiv.innerHTML = `<span style="color: #60a5fa; font-size: 0.78rem; display: flex; align-items: center; gap: 0.35rem;"><i data-lucide="loader-2" class="icon-xs icon-spin text-cyan"></i> Dispatching test Gmail alert to ${email}...</span>`;
        if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
      }

      try {
        const res = await fetch('/api/sync-webhook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: webhookUrl,
            payload: { action: 'TEST_EMAIL', recipient: email, email }
          })
        });
        const data = await res.json();
        const payloadData = data.data || {};
        if (data.success && payloadData.status === 'SUCCESS') {
          statusDiv.innerHTML = `<span style="color: #34d399; font-size: 0.78rem; display: flex; align-items: center; gap: 0.35rem;"><i data-lucide="check-circle-2" class="icon-xs text-emerald"></i> Test email dispatched successfully to <strong>${email}</strong>!</span>`;
          showConfirmationBanner('Email Dispatched', `Sample alert sent to ${email}.`, 'success', 3000);
        } else {
          statusDiv.innerHTML = `<span style="color: #f87171; font-size: 0.78rem; display: flex; align-items: center; gap: 0.35rem;"><i data-lucide="alert-triangle" class="icon-xs text-amber"></i> Delivery notice: ${payloadData.message || data.error || 'Check Google Apps Script quota'}</span>`;
        }
        if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
      } catch (err) {
        statusDiv.innerHTML = `<span style="color: #f87171; font-size: 0.78rem; display: flex; align-items: center; gap: 0.35rem;"><i data-lucide="x-circle" class="icon-xs text-rose"></i> Error: ${err.message}</span>`;
        if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="mail" class="icon-xs"></i> Send Test Email';
        if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
      }
    });

    // Test Telegram Button
    document.getElementById('btnTestProfTelegram')?.addEventListener('click', async () => {
      const btn = document.getElementById('btnTestProfTelegram');
      const statusDiv = document.getElementById('statusProfTgTest');
      btn.disabled = true;
      btn.innerHTML = '<i data-lucide="loader-2" class="icon-xs icon-spin"></i> Sending...';
      if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
      if (statusDiv) {
        statusDiv.style.display = 'block';
        statusDiv.innerHTML = `<span style="color: #38bdf8; font-size: 0.78rem; display: flex; align-items: center; gap: 0.35rem;"><i data-lucide="loader-2" class="icon-xs icon-spin text-cyan"></i> Dispatched alert to Telegram...</span>`;
        if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
      }

      try {
        const res = await fetch('/api/trigger-deadline-reminders', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          statusDiv.innerHTML = `<span style="color: #34d399; font-size: 0.78rem; display: flex; align-items: center; gap: 0.35rem;"><i data-lucide="check-circle-2" class="icon-xs text-emerald"></i> Telegram alert dispatched to chat <strong>5451190370</strong>!</span>`;
          showConfirmationBanner('Telegram Sent', 'Verified alert sent to your Telegram.', 'success', 3000);
        } else {
          statusDiv.innerHTML = `<span style="color: #f87171; font-size: 0.78rem; display: flex; align-items: center; gap: 0.35rem;"><i data-lucide="alert-triangle" class="icon-xs text-amber"></i> Error: ${data.result?.error || 'Failed'}</span>`;
        }
        if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
      } catch (e) {
        statusDiv.innerHTML = `<span style="color: #f87171; font-size: 0.78rem; display: flex; align-items: center; gap: 0.35rem;"><i data-lucide="x-circle" class="icon-xs text-rose"></i> Error: ${e.message}</span>`;
        if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="send" class="icon-xs"></i> Send Test Alert';
        if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
      }
    });

    // Cancel Button
    document.getElementById('btnCancelProfileSettings')?.addEventListener('click', () => {
      document.getElementById('profileSettingsModal')?.classList.remove('active');
    });

    // Save Profile Settings Button
    document.getElementById('btnSaveProfileSettings')?.addEventListener('click', () => {
      const name = document.getElementById('inputProfName')?.value.trim() || this.currentProfile.name;
      const candidateName = document.getElementById('inputCandidateName')?.value.trim() || 'Sagar Chauhan';
      const rolesRaw = document.getElementById('inputProfRoles')?.value.trim() || '';
      const email = document.getElementById('inputProfEmail')?.value.trim() || 'sagarmc2516@gmail.com';
      const tgChat = document.getElementById('inputProfTgChat')?.value.trim() || '5451190370';
      const emailAlerts = document.getElementById('chkProfEmailAlerts')?.checked !== false;
      const tgAlerts = document.getElementById('chkProfTgAlerts')?.checked !== false;
      const focusMode = document.getElementById('selectProfFocusMode')?.value || 'PRIORITY_BOOST';
      const degree = document.getElementById('inputProfDegree')?.value.trim() || 'B.E. Computer Engineering';
      const branchesRaw = document.getElementById('inputProfBranches')?.value.trim() || '';
      const category = document.getElementById('selectProfCategory')?.value || 'UR';
      const expYears = parseInt(document.getElementById('inputProfExperience')?.value || '1', 10);
      const leadDays = parseInt(document.getElementById('selectProfLeadDays')?.value || '7', 10);

      this.currentProfile.name = name;
      this.currentProfile.candidateName = candidateName;
      if (rolesRaw) {
        this.currentProfile.roles = rolesRaw.split(',').map(r => r.trim()).filter(Boolean);
      }
      this.currentProfile.education = {
        degreeLevel: degree,
        eligibleBranches: branchesRaw ? branchesRaw.split(',').map(b => b.trim()).filter(Boolean) : ['Computer Engineering']
      };
      this.currentProfile.demographics = { category };
      this.currentProfile.experience = { minYears: expYears };
      this.currentProfile.targetFocus.mode = focusMode;
      this.currentProfile.targetFocus.enabled = true;

      // Extract Custom Fields
      const customFields = [];
      this.container.querySelectorAll('.custom-meta-row').forEach(row => {
        const k = row.querySelector('.cf-key')?.value.trim();
        const v = row.querySelector('.cf-val')?.value.trim();
        if (k && v) customFields.push({ key: k, value: v });
      });
      this.currentProfile.customFields = customFields;

      // Schedule & Alert Settings
      this.currentProfile.scheduleSettings = {
        emailAddress: email,
        notificationEmails: [email],
        emailAlertsEnabled: emailAlerts,
        telegramChatId: tgChat,
        telegramAlertsEnabled: tgAlerts,
        deadlineLeadDays: leadDays,
        preset: document.getElementById('selectProfFrequency')?.value || 'DAILY_THRICE',
        hours: [8, 14, 20],
        autoSyncGoogleSheets: true
      };
      this.currentProfile.emailRecipient = email;

      // Save to local storage
      storageService.saveProfile(this.currentProfile);
      storageService.setActiveProfile(this.currentProfile.id);

      // Auto-save credentials & sync to backend
      fetch('/api/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notificationEmail: email,
          telegramChatId: tgChat
        })
      }).catch(() => {});

      // Sync to Google Apps Script webhook
      const webhookUrl = storageService.getProviderConfig()?.googleAppsScriptWebhookUrl?.trim();
      if (webhookUrl) {
        fetch('/api/sync-webhook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: webhookUrl,
            payload: { action: 'SET_CONFIG', email }
          })
        }).catch(() => {});

        fetch('/api/sync-webhook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: webhookUrl,
            payload: { action: 'SYNC_PROFILES', profiles: storageService.getProfiles() }
          })
        }).catch(() => {});
      }

      document.getElementById('profileSettingsModal')?.classList.remove('active');
      showConfirmationBanner(
        'Profile Settings Saved!',
        `Saved "${name}" with email "${email}" and Telegram ID "${tgChat}".`,
        'success',
        3000
      );

      if (this.onStateChanged) this.onStateChanged();
    });
  }
}
