/**
 * Vacancy Radar India - Unified Control Dashboard UI Component
 * Provides a centralized, modular dashboard for managing:
 * 1. Credits & Quotas (Monthly spend ₹ cap, query meters, rate limits, zero-spending guard)
 * 2. Credentials & API Keys (Google Custom Search, Google Apps Script Webhook, Bing, SerpApi, Custom REST)
 * 3. Profiles & Custom Fields Everywhere (Custom websites, custom keywords, negative terms, custom key-values)
 * 4. Source Health & Silent Failures (Canary diagnostics, SSL/TLS, DNS & domain reachability)
 * 5. System Settings & Automation (Schedule hours IST, email alerts, deduplication, JSON backup/restore)
 * 6. Trashed Vacancies & Recovery
 * 
 * Modular Architecture:
 * - Credits Tab: ./dashboard/creditsTab.js
 * - Credentials Tab: ./dashboard/credentialsTab.js
 * - Profiles Tab: ./dashboard/profilesTab.js
 * - Health Tab: ./dashboard/healthTab.js
 * - Settings Tab: ./dashboard/settingsTab.js
 * - Trash Tab: ./dashboard/trashTab.js
 */

import { storageService } from '../services/storageService.js';
import { ProviderHealthStatus } from '../models/providerTypes.js';
import { showConfirmationBanner } from '../services/notificationService.js';
import { DEFAULT_MONITORED_SOURCES } from '../engine/sourceHealthMonitor.js';
import { escapeHtml } from '../utils/htmlUtils.js';

import { renderCreditsTab, bindCreditsTabEvents } from './dashboard/creditsTab.js';
import { renderCredentialsTab, bindCredentialsTabEvents } from './dashboard/credentialsTab.js';
import { 
  renderProfilesTab, 
  bindProfilesTabEvents, 
  renderTargetChipsInDash, 
  syncAiWebsiteTrayState, 
  renderKeywordsInDash 
} from './dashboard/profilesTab.js';
import { renderHealthTab, bindHealthTabEvents } from './dashboard/healthTab.js';
import { renderSettingsTab, bindSettingsTabEvents } from './dashboard/settingsTab.js';
import { renderTrashTab, bindTrashTabEvents } from './dashboard/trashTab.js';

export class UnifiedDashboardUI {
  constructor(containerId = 'unifiedDashboardContainer', onStateChanged = null) {
    this.containerId = containerId;
    this.container = document.getElementById(containerId);
    this.onStateChanged = onStateChanged;
    this.activeTab = 'credits'; // 'credits', 'credentials', 'profiles', 'health', 'settings', 'trash'
    this.currentProfile = null;
    this.monitoredSources = storageService.getMonitoredSources() || JSON.parse(JSON.stringify(DEFAULT_MONITORED_SOURCES));
  }

  render() {
    this.container = document.getElementById(this.containerId);
    if (!this.container) return;

    const providers = storageService.getSearchProviders();
    const providerConfig = storageService.getProviderConfig();
    const profiles = storageService.getProfiles();
    this.currentProfile = storageService.getActiveProfile();
    const trashVacancies = storageService.getTrashVacancies() || [];

    // Summary calculations
    const totalRemaining = providers.reduce((acc, p) => acc + (p.quotaRemaining > 100000 ? 0 : (p.quotaRemaining || 0)), 0);
    const totalUsed = providers.reduce((acc, p) => acc + (p.quotaUsed || 0), 0);
    const activeHealthyCount = providers.filter(p => p.isEnabled && p.healthStatus === ProviderHealthStatus.HEALTHY).length;
    const estSpendInr = providers.reduce((acc, p) => acc + (p.estimatedPaidCostInr || 0), 0);

    this.container.innerHTML = `
      <div class="unified-dashboard-wrapper" style="display: flex; flex-direction: column; gap: 1.5rem;">
        
        <!-- Dashboard Master Header -->
        <div class="filter-panel" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; border-left: 4px solid #38bdf8;">
          <div>
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <span style="font-size: 1.6rem;">🎛️</span>
              <div>
                <h2 style="font-family: var(--font-heading); font-size: 1.35rem; color: var(--text-main); margin: 0;">
                  🛠️ Main Settings &amp; System Control
                </h2>
                <p style="font-size: 0.8rem; color: var(--text-secondary); margin: 0.2rem 0 0 0;">
                  Global system configuration for Search Providers (Brave, SerpApi, SearXNG), Free Gemini AI, Google Sheets Webhook, Master Bot &amp; Database Backups.
                </p>
              </div>
            </div>
          </div>

          <!-- Quick Actions & Reset -->
          <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
            <button id="btnDashboardBackupDb" class="btn btn-outline btn-sm" title="Download entire database as JSON backup">
              📥 Export JSON Backup
            </button>
            <button id="btnDashboardRestoreDb" class="btn btn-outline btn-sm" title="Restore database from JSON file">
              📤 Import Backup
            </button>
            <input type="file" id="fileRestoreDb" accept=".json" style="display: none;">
            <button id="btnDashboardResetFactory" class="btn btn-outline btn-sm" style="color: #f87171; border-color: rgba(239, 68, 68, 0.3);" title="Reset all data to initial defaults">
              ⚠️ Reset Factory Data
            </button>
          </div>
        </div>

        <!-- High-Level KPI Summary Meters -->
        <div class="kpi-grid" style="grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));">
          <div class="kpi-card" style="border-top: 3px solid #34d399;">
            <span class="kpi-label">Monthly Spending Cap</span>
            <span class="kpi-value" style="color: #34d399;">₹${estSpendInr.toFixed(2)}</span>
            <span class="kpi-sub">Guaranteed Zero-Cost Guard Active</span>
          </div>
          <div class="kpi-card" style="border-top: 3px solid #60a5fa;">
            <span class="kpi-label">Free Queries Remaining</span>
            <span class="kpi-value" style="color: #60a5fa;">${totalRemaining}</span>
            <span class="kpi-sub">${totalUsed} Queries Dispatched This Cycle</span>
          </div>
          <div class="kpi-card" style="border-top: 3px solid #a78bfa;">
            <span class="kpi-label">Search Providers Online</span>
            <span class="kpi-value" style="color: #a78bfa;">${activeHealthyCount} / ${providers.length}</span>
            <span class="kpi-sub">Failover Circuit Breaker Armed</span>
          </div>
          <div class="kpi-card" style="border-top: 3px solid #f59e0b;">
            <span class="kpi-label">Active Role Profile</span>
            <span class="kpi-value" style="color: #f59e0b; font-size: 1.15rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${escapeHtml(this.currentProfile.name)}
            </span>
            <span class="kpi-sub">${this.currentProfile.targetFocus?.enabled ? '🎯 Whitelist Target Focus ON' : '🌐 All Web Sources'}</span>
          </div>
        </div>

        <!-- Dashboard Navigation Tabs -->
        <div style="display: flex; gap: 0.5rem; border-bottom: 1px solid var(--border-subtle); padding-bottom: 0.25rem; flex-wrap: wrap;">
          <button class="nav-tab-btn btn-dash-tab ${this.activeTab === 'credits' ? 'active' : ''}" data-tab="credits" style="padding: 0.6rem 1.1rem; font-size: 0.85rem; font-weight: 600;">
            💳 Credits &amp; Quota Governance
          </button>
          <button class="nav-tab-btn btn-dash-tab ${this.activeTab === 'credentials' ? 'active' : ''}" data-tab="credentials" style="padding: 0.6rem 1.1rem; font-size: 0.85rem; font-weight: 600;">
            🔑 Credentials &amp; API Setup Guides
          </button>
          <button class="nav-tab-btn btn-dash-tab ${this.activeTab === 'profiles' ? 'active' : ''}" data-tab="profiles" style="padding: 0.6rem 1.1rem; font-size: 0.85rem; font-weight: 600;">
            👤 Dynamic Profiles &amp; Custom Fields
          </button>
          <button class="nav-tab-btn btn-dash-tab ${this.activeTab === 'health' ? 'active' : ''}" data-tab="health" style="padding: 0.6rem 1.1rem; font-size: 0.85rem; font-weight: 600;">
            🩺 Source Health &amp; Silent Failures
          </button>
          <button class="nav-tab-btn btn-dash-tab ${this.activeTab === 'settings' ? 'active' : ''}" data-tab="settings" style="padding: 0.6rem 1.1rem; font-size: 0.85rem; font-weight: 600;">
            ⏰ Automated Schedule &amp; Alerts
          </button>
          <button class="nav-tab-btn btn-dash-tab ${this.activeTab === 'trash' ? 'active' : ''}" data-tab="trash" style="padding: 0.6rem 1.1rem; font-size: 0.85rem; font-weight: 600; color: #f87171;">
            🗑️ Trash (${trashVacancies.length})
          </button>
        </div>

        <!-- Tab 1: Credits & Quotas -->
        <div id="tabContentCredits" class="dash-tab-pane" style="display: ${this.activeTab === 'credits' ? 'block' : 'none'};">
          ${renderCreditsTab(providers, providerConfig)}
        </div>

        <!-- Tab 2: Credentials & Setup Guides -->
        <div id="tabContentCredentials" class="dash-tab-pane" style="display: ${this.activeTab === 'credentials' ? 'block' : 'none'};">
          ${renderCredentialsTab(providers, providerConfig)}
        </div>

        <!-- Tab 3: Profiles & Custom Fields Everywhere -->
        <div id="tabContentProfiles" class="dash-tab-pane" style="display: ${this.activeTab === 'profiles' ? 'block' : 'none'};">
          ${renderProfilesTab(profiles, this.currentProfile)}
        </div>

        <!-- Tab 4: Source Health & Silent-Failure Diagnostics -->
        <div id="tabContentHealth" class="dash-tab-pane" style="display: ${this.activeTab === 'health' ? 'block' : 'none'};">
          ${renderHealthTab(this.monitoredSources)}
        </div>

        <!-- Tab 5: System Settings & Schedule -->
        <div id="tabContentSettings" class="dash-tab-pane" style="display: ${this.activeTab === 'settings' ? 'block' : 'none'};">
          ${renderSettingsTab(this.currentProfile)}
        </div>

        <!-- Tab 6: Trash Folder & Recovery -->
        <div id="tabContentTrash" class="dash-tab-pane" style="display: ${this.activeTab === 'trash' ? 'block' : 'none'};">
          ${renderTrashTab(trashVacancies)}
        </div>

      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    // Tab switching
    this.container.querySelectorAll('.btn-dash-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeTab = btn.getAttribute('data-tab');
        this.render();
      });
    });

    // Jump from credentials tab to telegram settings
    document.getElementById('btnJumpToTelegramSettings')?.addEventListener('click', () => {
      this.activeTab = 'settings';
      this.render();
    });

    // Jump from profiles tab to dedicated Profile Settings modal
    document.getElementById('btnJumpToDedicatedProfileSettings')?.addEventListener('click', () => {
      document.getElementById('dashboardModal')?.classList.remove('active');
      window.app?.openProfileSettingsModal?.();
    });

    // Mask / Unmask password inputs
    this.container.querySelectorAll('.btn-toggle-mask').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-target');
        const input = document.getElementById(targetId);
        if (input) {
          input.type = input.type === 'password' ? 'text' : 'password';
        }
      });
    });

    // Profile switcher in Dashboard
    document.getElementById('dashProfileSelect')?.addEventListener('change', (e) => {
      storageService.setActiveProfile(e.target.value);
      if (this.onStateChanged) this.onStateChanged();
      this.render();
    });

    // Database Backup (JSON Export)
    document.getElementById('btnDashboardBackupDb')?.addEventListener('click', () => {
      const dump = {
        exportedAt: new Date().toISOString(),
        profiles: storageService.getProfiles(),
        vacancies: storageService.getVacancies(),
        trashVacancies: storageService.getTrashVacancies(),
        sources: storageService.getSources(),
        applications: storageService.getApplications(),
        searchProviders: storageService.getSearchProviders(),
        providerConfig: storageService.getProviderConfig()
      };
      const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vacancy_radar_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showConfirmationBanner('Backup Downloaded', 'JSON database snapshot downloaded successfully.', 'success', 2500);
    });

    // Database Restore (JSON Import)
    const fileInput = document.getElementById('fileRestoreDb');
    document.getElementById('btnDashboardRestoreDb')?.addEventListener('click', () => {
      fileInput?.click();
    });

    fileInput?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          if (parsed.profiles) storageService.storage.setItem('vacancy_radar_profiles_v1', JSON.stringify(parsed.profiles));
          if (parsed.vacancies) storageService.storage.setItem('vacancy_radar_vacancies_v1', JSON.stringify(parsed.vacancies));
          if (Array.isArray(parsed.trashVacancies)) storageService.storage.setItem('vacancy_radar_trash_vacancies_v1', JSON.stringify(parsed.trashVacancies));
          if (parsed.sources) storageService.storage.setItem('vacancy_radar_sources_v1', JSON.stringify(parsed.sources));
          if (parsed.applications) storageService.storage.setItem('vacancy_radar_applications_v1', JSON.stringify(parsed.applications));
          if (parsed.searchProviders) storageService.storage.setItem('vacancy_radar_search_providers_v1', JSON.stringify(parsed.searchProviders));
          if (parsed.providerConfig) storageService.saveProviderConfig(parsed.providerConfig);
          showConfirmationBanner('Database Restored', 'Database restored successfully from JSON backup!', 'success', 3000);
          if (this.onStateChanged) this.onStateChanged();
          this.render();
        } catch (err) {
          showConfirmationBanner('Restore Failed', `Invalid backup JSON: ${err.message}`, 'error', 4000);
        }
      };
      reader.readAsText(file);
    });

    // Reset Factory Data
    document.getElementById('btnDashboardResetFactory')?.addEventListener('click', () => {
      if (confirm('Are you sure you want to restore factory default data? Any custom profiles and settings will be reset.')) {
        storageService.resetAllToFactoryDefaults();
        showConfirmationBanner('Factory Reset', 'Factory default data restored.', 'info', 2500);
        if (this.onStateChanged) this.onStateChanged();
        this.render();
      }
    });

    // Bind sub-tabs
    bindCreditsTabEvents(this.container, this);
    bindCredentialsTabEvents(this.container, this);
    bindProfilesTabEvents(this.container, this);
    bindHealthTabEvents(this.container, this);
    bindSettingsTabEvents(this.container, this);
    bindTrashTabEvents(this.container, this);
  }

  // Backward-compatible delegates
  renderCreditsPanel(providers, providerConfig) {
    return renderCreditsTab(providers, providerConfig);
  }

  renderCredentialsPanel(providers, providerConfig) {
    return renderCredentialsTab(providers, providerConfig);
  }

  renderProfilesPanel(profiles) {
    return renderProfilesTab(profiles, this.currentProfile);
  }

  renderHealthPanel(sources) {
    return renderHealthTab(sources || this.monitoredSources);
  }

  renderSettingsPanel(profile) {
    return renderSettingsTab(profile || this.currentProfile);
  }

  renderTrashPanel(trashVacancies) {
    return renderTrashTab(trashVacancies);
  }

  renderTargetChipsInDash() {
    return renderTargetChipsInDash(this);
  }

  syncAiWebsiteTrayState() {
    return syncAiWebsiteTrayState(this);
  }

  renderKeywordsInDash() {
    return renderKeywordsInDash(this);
  }

  escapeHtml(str) {
    return escapeHtml(str);
  }
}
