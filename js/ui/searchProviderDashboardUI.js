/**
 * Vacancy Radar India - Search Provider Settings & Health Dashboard UI
 * Visual interface for configuring multiple search providers, monitoring quotas,
 * inspecting failover history, testing adapters, and running dry-run simulations.
 */

import { storageService } from '../services/storageService.js';
import { ProviderType, ProviderHealthStatus, QuotaResetPeriod } from '../models/providerTypes.js';
import { AdapterFactory } from '../providers/adapters/adapterFactory.js';
import { searchOrchestrationEngine } from '../engine/searchOrchestrationEngine.js';
import { showConfirmationBanner } from '../services/notificationService.js';

export class SearchProviderDashboardUI {
  constructor(containerId = 'providerModalBody') {
    this.containerId = containerId;
  }

  render() {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    const providers = storageService.getSearchProviders();
    const failoverLogs = storageService.getFailoverLogs();

    // Calculate aggregated metrics
    const enabledProviders = providers.filter(p => p.isEnabled);
    const healthyProviders = enabledProviders.filter(p => p.healthStatus === ProviderHealthStatus.HEALTHY);
    const activeProvider = enabledProviders.sort((a, b) => a.priority - b.priority)[0] || { name: 'Direct Official Feeds (Safeguard)' };
    const totalRemaining = providers.reduce((acc, p) => acc + (p.quotaRemaining || 0), 0);
    const totalUsed = providers.reduce((acc, p) => acc + (p.quotaUsed || 0), 0);
    const openCircuits = providers.filter(p => p.healthStatus === ProviderHealthStatus.CIRCUIT_OPEN).length;
    const authFailed = providers.filter(p => p.healthStatus === ProviderHealthStatus.AUTH_FAILED).length;

    container.innerHTML = `
      <div class="provider-dashboard-wrapper" style="display: flex; flex-direction: column; gap: 1.5rem;">
        
        <!-- Zero Spending Banner -->
        <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: var(--radius-md); padding: 0.9rem 1.25rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <span style="font-size: 1.5rem;">🛡️</span>
            <div>
              <strong style="font-size: 0.88rem; color: #34d399;">Active Gateway Safeguard Enforced</strong>
              <div style="font-size: 0.78rem; color: var(--text-secondary);">
                All search providers default to standard tier allowances with automated failover to direct official portals.
              </div>
            </div>
          </div>
          <div style="font-family: var(--font-mono); font-weight: 700; color: #34d399; font-size: 1.1rem; background: rgba(0,0,0,0.2); padding: 0.3rem 0.75rem; border-radius: var(--radius-sm); border: 1px solid rgba(16, 185, 129, 0.2);">
            STATUS: ACTIVE
          </div>
        </div>

        <!-- KPI Summary Cards -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 0.75rem;">
          <div style="background: var(--bg-surface-elevated); border: 1px solid var(--border-subtle); padding: 0.85rem; border-radius: var(--radius-md); text-align: center;">
            <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">Active Provider</div>
            <div style="font-size: 0.88rem; font-weight: 700; color: #60a5fa; margin-top: 0.25rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${activeProvider.name}">
              ${this.escape(activeProvider.name)}
            </div>
            <div style="font-size: 0.7rem; color: var(--text-secondary); margin-top: 0.2rem;">Priority #1 Eligible</div>
          </div>

          <div style="background: var(--bg-surface-elevated); border: 1px solid var(--border-subtle); padding: 0.85rem; border-radius: var(--radius-md); text-align: center;">
            <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">Configured / Healthy</div>
            <div style="font-size: 1.3rem; font-weight: 700; color: #34d399; font-family: var(--font-mono); margin-top: 0.15rem;">
              ${healthyProviders.length} / ${enabledProviders.length}
            </div>
            <div style="font-size: 0.7rem; color: var(--text-secondary); margin-top: 0.2rem;">${providers.length} Total Registered</div>
          </div>

          <div style="background: var(--bg-surface-elevated); border: 1px solid var(--border-subtle); padding: 0.85rem; border-radius: var(--radius-md); text-align: center;">
            <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">Total Free Quota</div>
            <div style="font-size: 1.3rem; font-weight: 700; color: #93c5fd; font-family: var(--font-mono); margin-top: 0.15rem;">
              ${totalRemaining > 900000 ? '999K+' : totalRemaining}
            </div>
            <div style="font-size: 0.7rem; color: var(--text-secondary); margin-top: 0.2rem;">${totalUsed} Consumed</div>
          </div>

          <div style="background: var(--bg-surface-elevated); border: 1px solid var(--border-subtle); padding: 0.85rem; border-radius: var(--radius-md); text-align: center;">
            <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">Circuit / Auth Issues</div>
            <div style="font-size: 1.3rem; font-weight: 700; color: ${openCircuits + authFailed > 0 ? '#f87171' : '#34d399'}; font-family: var(--font-mono); margin-top: 0.15rem;">
              ${openCircuits + authFailed}
            </div>
            <div style="font-size: 0.7rem; color: var(--text-secondary); margin-top: 0.2rem;">${openCircuits} Tripped • ${authFailed} Auth</div>
          </div>
        </div>

        <!-- Action Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
          <h4 style="font-family: var(--font-heading); font-size: 1.05rem; margin: 0; color: var(--text-main);">
            Configured Provider Registry &amp; Priority Order
          </h4>
          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
            <button id="btnDryRunRotation" class="btn btn-outline btn-sm" title="Simulate failover chain without consuming real search credits">
              <span>🧪</span> Dry-Run Rotation Test
            </button>
            <button id="btnAddProviderModal" class="btn btn-primary btn-sm">
              <span>+</span> Add Provider
            </button>
          </div>
        </div>

        <!-- Provider Cards / Table -->
        <div class="provider-list" style="display: flex; flex-direction: column; gap: 0.75rem;">
          ${providers.sort((a, b) => a.priority - b.priority).map(p => this.renderProviderItem(p)).join('')}
        </div>

        <!-- Failover Logs Timeline Section -->
        <div style="border-top: 1px solid var(--border-subtle); padding-top: 1.25rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
            <div>
              <h5 style="font-family: var(--font-heading); font-size: 0.95rem; margin: 0; color: var(--text-main);">
                Recent Failover Events &amp; Circuit Breakers
              </h5>
              <span style="font-size: 0.75rem; color: var(--text-secondary);">Real-time failover records during automated and manual vacancy discovery</span>
            </div>
            ${failoverLogs.length > 0 ? `<button id="btnClearFailoverLogs" class="btn btn-outline btn-sm" style="font-size: 0.72rem; padding: 0.2rem 0.5rem;">Clear Log</button>` : ''}
          </div>

          <div style="max-height: 180px; overflow-y: auto; display: flex; flex-direction: column; gap: 0.5rem; background: var(--bg-surface-elevated); padding: 0.75rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
            ${failoverLogs.length === 0 ? `
              <div style="text-align: center; color: var(--text-muted); font-size: 0.8rem; padding: 1rem 0;">
                No recent failover events recorded. All active providers executing nominally.
              </div>
            ` : failoverLogs.map(l => `
              <div style="font-size: 0.78rem; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.04); padding-bottom: 0.35rem;">
                <div>
                  <span style="color: #f87171; font-weight: 600;">[FAILOVER]</span>
                  <span style="color: var(--text-main); font-weight: 500;">${this.escape(l.fromProviderName)}</span>
                  <span style="color: var(--text-muted);"> &rarr; </span>
                  <span style="color: #60a5fa; font-weight: 500;">${this.escape(l.toProviderName)}</span>
                  <div style="font-size: 0.72rem; color: var(--text-secondary); margin-top: 0.15rem;">${this.escape(l.errorMessage || l.reason)}</div>
                </div>
                <div style="font-family: var(--font-mono); font-size: 0.7rem; color: var(--text-muted); white-space: nowrap; margin-left: 0.5rem;">
                  ${new Date(l.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
              </div>
            `).join('')}
          </div>
        </div>

      </div>
    `;

    this.bindEvents();
  }

  renderProviderItem(p) {
    const isHealthy = p.healthStatus === ProviderHealthStatus.HEALTHY;
    const isCircuitOpen = p.healthStatus === ProviderHealthStatus.CIRCUIT_OPEN;
    const isAuthFailed = p.healthStatus === ProviderHealthStatus.AUTH_FAILED;
    const isExhausted = p.healthStatus === ProviderHealthStatus.QUOTA_EXHAUSTED;
    const isDisabled = !p.isEnabled || p.healthStatus === ProviderHealthStatus.DISABLED;

    let badgeColor = '#34d399';
    let badgeBg = 'rgba(16, 185, 129, 0.15)';
    let badgeText = 'HEALTHY';

    if (isDisabled) {
      badgeColor = '#94a3b8';
      badgeBg = 'rgba(148, 163, 184, 0.15)';
      badgeText = 'DISABLED';
    } else if (isAuthFailed) {
      badgeColor = '#f87171';
      badgeBg = 'rgba(239, 68, 68, 0.2)';
      badgeText = 'AUTH FAILED';
    } else if (isCircuitOpen) {
      badgeColor = '#f87171';
      badgeBg = 'rgba(239, 68, 68, 0.2)';
      badgeText = 'CIRCUIT OPEN';
    } else if (isExhausted) {
      badgeColor = '#fbbf24';
      badgeBg = 'rgba(251, 191, 36, 0.15)';
      badgeText = 'QUOTA EXHAUSTED';
    }

    const quotaPct = p.freeQuotaLimit > 900000 ? 100 : Math.round((p.quotaRemaining / (p.freeQuotaLimit || 1)) * 100);

    return `
      <div style="background: var(--bg-surface-elevated); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 1rem; display: flex; flex-direction: column; gap: 0.6rem; transition: border-color 0.2s ease;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
          <div style="display: flex; align-items: center; gap: 0.6rem;">
            <span style="font-family: var(--font-mono); font-size: 0.72rem; font-weight: 700; background: rgba(59, 130, 246, 0.15); color: #60a5fa; padding: 0.15rem 0.45rem; border-radius: var(--radius-sm); border: 1px solid rgba(59, 130, 246, 0.3);">
              PRIORITY ${p.priority}
            </span>
            <strong style="font-size: 0.92rem; color: var(--text-main);">${this.escape(p.name)}</strong>
            <span style="font-size: 0.7rem; color: var(--text-muted); background: rgba(255,255,255,0.05); padding: 0.1rem 0.4rem; border-radius: var(--radius-sm);">
              ${p.type}
            </span>
          </div>

          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span style="font-size: 0.7rem; font-weight: 700; color: ${badgeColor}; background: ${badgeBg}; padding: 0.2rem 0.55rem; border-radius: var(--radius-pill); border: 1px solid ${badgeColor}40;">
              ● ${badgeText}
            </span>
            <button class="btn btn-outline btn-sm btn-test-provider" data-id="${p.id}" style="padding: 0.25rem 0.6rem; font-size: 0.72rem;" title="Test provider connection">
              🩺 Test
            </button>
            <button class="btn btn-outline btn-sm btn-edit-provider" data-id="${p.id}" style="padding: 0.25rem 0.6rem; font-size: 0.72rem;" title="Edit provider parameters">
              ⚙️ Edit
            </button>
            <button class="btn btn-outline btn-sm btn-toggle-provider" data-id="${p.id}" style="padding: 0.25rem 0.6rem; font-size: 0.72rem; color: ${p.isEnabled ? '#f87171' : '#34d399'};" title="${p.isEnabled ? 'Disable Provider' : 'Enable Provider'}">
              ${p.isEnabled ? 'Disable' : 'Enable'}
            </button>
          </div>
        </div>

        <!-- Quota Progress Bar & Stats -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.75rem; align-items: center; background: rgba(0,0,0,0.15); padding: 0.6rem 0.8rem; border-radius: var(--radius-sm); border: 1px solid rgba(255,255,255,0.03);">
          <div>
            <div style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 0.25rem;">
              <span style="color: var(--text-secondary);">Free Quota (${p.quotaResetPeriod}):</span>
              <span style="font-family: var(--font-mono); font-weight: 600; color: ${quotaPct < 20 ? '#f87171' : '#34d399'};">
                ${p.freeQuotaLimit > 900000 ? 'Unlimited' : `${p.quotaRemaining} / ${p.freeQuotaLimit} (${quotaPct}%)`}
              </span>
            </div>
            <div style="height: 5px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden;">
              <div style="width: ${quotaPct}%; height: 100%; background: ${quotaPct < 20 ? '#f87171' : quotaPct < 50 ? '#fbbf24' : '#34d399'}; transition: width 0.3s ease;"></div>
            </div>
          </div>

          <div style="display: flex; gap: 1rem; font-size: 0.75rem; color: var(--text-secondary); justify-content: flex-end;">
            <div>
              <span style="color: var(--text-muted);">Max RPD:</span> <strong style="color: var(--text-main); font-family: var(--font-mono);">${p.maxRequestsPerDay || 100}</strong>
            </div>
            <div>
              <span style="color: var(--text-muted);">Success/Err:</span> <strong style="color: var(--text-main); font-family: var(--font-mono);">${p.successCount || 0}/${p.errorCount || 0}</strong>
            </div>
            <div>
              <span style="color: var(--text-muted);">Paid Allowed:</span> <strong style="color: ${p.permitPaidRequests ? '#f87171' : '#34d399'}; font-family: var(--font-mono);">${p.permitPaidRequests ? 'YES' : 'NO (STANDARD)'}</strong>
            </div>
          </div>
        </div>

        ${p.lastErrorMessage ? `
          <div style="font-size: 0.72rem; color: #f87171; background: rgba(239, 68, 68, 0.08); padding: 0.3rem 0.6rem; border-radius: var(--radius-sm); border: 1px solid rgba(239, 68, 68, 0.2);">
            <strong>Last Error:</strong> ${this.escape(p.lastErrorMessage)}
          </div>
        ` : ''}
      </div>
    `;
  }

  bindEvents() {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    // Toggle Enable / Disable
    container.querySelectorAll('.btn-toggle-provider').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-id');
        const providers = storageService.getSearchProviders();
        const p = providers.find(item => item.id === id);
        if (p) {
          p.isEnabled = !p.isEnabled;
          p.healthStatus = p.isEnabled ? ProviderHealthStatus.HEALTHY : ProviderHealthStatus.DISABLED;
          storageService.saveSearchProvider(p);
          this.render();
        }
      };
    });

    // Test Provider button
    container.querySelectorAll('.btn-test-provider').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.getAttribute('data-id');
        const providers = storageService.getSearchProviders();
        const p = providers.find(item => item.id === id);
        if (!p) return;

        btn.innerText = 'Testing...';
        btn.disabled = true;

        const adapter = AdapterFactory.create(p);
        const result = await adapter.testConnection();

        btn.disabled = false;
        btn.innerText = '🩺 Test';

        if (result.isHealthy) {
          showConfirmationBanner('Provider Verified', `✅ ${p.name} connected (${result.latencyMs}ms latency)`, 'success', 3000);
        } else {
          showConfirmationBanner('Connection Failed', `❌ ${p.name}: ${result.message}`, 'error', 3500);
        }
      };
    });

    // Edit Provider button
    container.querySelectorAll('.btn-edit-provider').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-id');
        const providers = storageService.getSearchProviders();
        const p = providers.find(item => item.id === id);
        if (p) this.showEditModal(p);
      };
    });

    // Add Provider button
    const btnAdd = container.querySelector('#btnAddProviderModal');
    if (btnAdd) {
      btnAdd.onclick = () => {
        this.showEditModal({
          id: `prov-custom-${Date.now()}`,
          name: '',
          type: ProviderType.CUSTOM_REST_ADAPTER,
          endpoint: 'https://',
          apiKey: '',
          freeQuotaLimit: 100,
          quotaResetPeriod: QuotaResetPeriod.DAILY,
          quotaRemaining: 100,
          quotaUsed: 0,
          maxRequestsPerMinute: 10,
          maxRequestsPerDay: 100,
          priority: 6,
          isEnabled: true,
          allowedCategories: ['ALL'],
          permitPaidRequests: false
        }, true);
      };
    }

    // Dry Run Rotation Test button
    const btnDryRun = container.querySelector('#btnDryRunRotation');
    if (btnDryRun) {
      btnDryRun.onclick = async () => {
        btnDryRun.innerText = 'Running Simulation...';
        btnDryRun.disabled = true;

        const simResult = await searchOrchestrationEngine.simulateRotationTest();

        btnDryRun.innerText = '🧪 Dry-Run Rotation Test';
        btnDryRun.disabled = false;

        showConfirmationBanner(
          'Rotation Test Complete',
          `Tested ${simResult.simulationLogs.length} failover steps. Safety: ${simResult.guarantee}`,
          'info',
          4000
        );
      };
    }

    // Clear failover logs
    const btnClearLogs = container.querySelector('#btnClearFailoverLogs');
    if (btnClearLogs) {
      btnClearLogs.onclick = () => {
        storageService.clearFailoverLogs();
        this.render();
      };
    }
  }

  showEditModal(provider, isNew = false) {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    container.innerHTML = `
      <div style="padding: 0.5rem 0;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
          <h4 style="font-family: var(--font-heading); font-size: 1.15rem; margin: 0;">
            ${isNew ? '+ Register New Search Provider' : `⚙️ Configure ${this.escape(provider.name)}`}
          </h4>
          <button id="btnCancelEditProvider" class="btn btn-outline btn-sm">Cancel</button>
        </div>

        <form id="formProviderEdit" style="display: flex; flex-direction: column; gap: 1rem;">
          <div class="profile-form-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem;">
            <div>
              <label class="form-label" style="font-size: 0.78rem; color: var(--text-secondary); display: block; margin-bottom: 0.3rem;">Provider Display Name</label>
              <input type="text" id="inpProvName" class="form-input" style="width: 100%;" required value="${this.escape(provider.name || '')}" placeholder="e.g. Google Custom Search (Gov Careers)">
            </div>

            <div>
              <label class="form-label" style="font-size: 0.78rem; color: var(--text-secondary); display: block; margin-bottom: 0.3rem;">Provider Architecture / Adapter Type</label>
              <select id="selProvType" class="filter-select" style="width: 100%;">
                <option value="${ProviderType.PUBLIC_FEEDS_RSS}" ${provider.type === ProviderType.PUBLIC_FEEDS_RSS ? 'selected' : ''}>Public Feeds &amp; Open Gazettes (Standard)</option>
                <option value="${ProviderType.GOOGLE_CUSTOM_SEARCH}" ${provider.type === ProviderType.GOOGLE_CUSTOM_SEARCH ? 'selected' : ''}>Google Custom Search JSON API</option>
                <option value="${ProviderType.BING_WEB_SEARCH}" ${provider.type === ProviderType.BING_WEB_SEARCH ? 'selected' : ''}>Bing Web Search API</option>
                <option value="${ProviderType.SERPAPI}" ${provider.type === ProviderType.SERPAPI ? 'selected' : ''}>SerpApi Search Platform</option>
                <option value="${ProviderType.CUSTOM_REST_ADAPTER}" ${provider.type === ProviderType.CUSTOM_REST_ADAPTER ? 'selected' : ''}>Generic Custom REST Endpoint</option>
              </select>
            </div>
          </div>

          <div>
            <label class="form-label" style="font-size: 0.78rem; color: var(--text-secondary); display: block; margin-bottom: 0.3rem;">Endpoint URL</label>
            <input type="url" id="inpProvEndpoint" class="form-input" style="width: 100%;" required value="${this.escape(provider.endpoint || '')}" placeholder="https://api.searchprovider.com/v1">
          </div>

          <div>
            <label class="form-label" style="font-size: 0.78rem; color: var(--text-secondary); display: block; margin-bottom: 0.3rem;">API Key / Credential Token (Encrypted Locally)</label>
            <input type="password" id="inpProvApiKey" class="form-input" style="width: 100%; font-family: var(--font-mono);" value="${this.escape(provider.apiKey || '')}" placeholder="Leave blank if using open public feeds">
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 0.75rem;">
            <div>
              <label class="form-label" style="font-size: 0.75rem; color: var(--text-secondary); display: block; margin-bottom: 0.3rem;">Free Quota Limit</label>
              <input type="number" id="inpProvFreeLimit" class="form-input" style="width: 100%;" min="0" value="${provider.freeQuotaLimit || 100}">
            </div>

            <div>
              <label class="form-label" style="font-size: 0.75rem; color: var(--text-secondary); display: block; margin-bottom: 0.3rem;">Quota Reset Period</label>
              <select id="selProvReset" class="filter-select" style="width: 100%;">
                <option value="${QuotaResetPeriod.DAILY}" ${provider.quotaResetPeriod === QuotaResetPeriod.DAILY ? 'selected' : ''}>Daily (00:00 IST)</option>
                <option value="${QuotaResetPeriod.MONTHLY}" ${provider.quotaResetPeriod === QuotaResetPeriod.MONTHLY ? 'selected' : ''}>Monthly (1st of Month)</option>
              </select>
            </div>

            <div>
              <label class="form-label" style="font-size: 0.75rem; color: var(--text-secondary); display: block; margin-bottom: 0.3rem;">Execution Priority (1-10)</label>
              <input type="number" id="inpProvPriority" class="form-input" style="width: 100%;" min="1" max="10" value="${provider.priority || 1}">
            </div>

            <div>
              <label class="form-label" style="font-size: 0.75rem; color: var(--text-secondary); display: block; margin-bottom: 0.3rem;">Max Daily Requests</label>
              <input type="number" id="inpProvMaxRpd" class="form-input" style="width: 100%;" min="1" value="${provider.maxRequestsPerDay || 100}">
            </div>
          </div>

          <!-- Zero Spending Safeguard Checkbox -->
          <div style="background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.25); border-radius: var(--radius-md); padding: 0.85rem; display: flex; align-items: flex-start; gap: 0.6rem;">
            <input type="checkbox" id="chkPermitPaid" style="margin-top: 0.2rem;" ${provider.permitPaidRequests ? 'checked' : ''}>
            <div>
              <label for="chkPermitPaid" style="font-size: 0.82rem; font-weight: 700; color: #f87171; cursor: pointer;">
                Permit Paid Queries after Free Quota Depleted
              </label>
              <div style="font-size: 0.74rem; color: var(--text-secondary); margin-top: 0.2rem; line-height: 1.4;">
                CRITICAL SAFEGUARD: By default, this is disabled to prevent unintended API charges. When left unchecked, Vacancy Radar will automatically failover to public feeds.
              </div>
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 0.5rem;">
            ${!isNew ? `<button type="button" id="btnDeleteProvider" class="btn btn-outline" style="color: #f87171; border-color: rgba(239,68,68,0.3);">Delete Provider</button>` : ''}
            <button type="submit" class="btn btn-primary">Save Provider Settings</button>
          </div>
        </form>
      </div>
    `;

    document.getElementById('btnCancelEditProvider').onclick = () => this.render();

    const btnDel = document.getElementById('btnDeleteProvider');
    if (btnDel) {
      btnDel.onclick = () => {
        if (confirm(`Are you sure you want to remove ${provider.name}?`)) {
          storageService.deleteSearchProvider(provider.id);
          this.render();
        }
      };
    }

    document.getElementById('formProviderEdit').onsubmit = (e) => {
      e.preventDefault();
      provider.name = document.getElementById('inpProvName').value.trim();
      provider.type = document.getElementById('selProvType').value;
      provider.endpoint = document.getElementById('inpProvEndpoint').value.trim();
      provider.apiKey = document.getElementById('inpProvApiKey').value.trim();
      provider.freeQuotaLimit = parseInt(document.getElementById('inpProvFreeLimit').value, 10) || 100;
      provider.quotaResetPeriod = document.getElementById('selProvReset').value;
      provider.priority = parseInt(document.getElementById('inpProvPriority').value, 10) || 1;
      provider.maxRequestsPerDay = parseInt(document.getElementById('inpProvMaxRpd').value, 10) || 100;
      provider.permitPaidRequests = document.getElementById('chkPermitPaid').checked;
      provider.quotaRemaining = Math.min(provider.quotaRemaining || provider.freeQuotaLimit, provider.freeQuotaLimit);
      provider.healthStatus = provider.isEnabled ? ProviderHealthStatus.HEALTHY : ProviderHealthStatus.DISABLED;

      storageService.saveSearchProvider(provider);
      showConfirmationBanner(
        'Provider Saved',
        `Provider "${provider.name}" saved. Priority: #${provider.priority}, Free Quota: ${provider.freeQuotaLimit}`,
        'success',
        2800
      );
      this.render();
    };
  }

  escape(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}
