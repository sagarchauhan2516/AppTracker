import { storageService } from '../../services/storageService.js';
import { searchOrchestrationEngine } from '../../engine/searchOrchestrationEngine.js';
import { showConfirmationBanner } from '../../services/notificationService.js';
import { escapeHtml } from '../../utils/htmlUtils.js';

export function renderCreditsTab(providers, providerConfig) {
    return `
      <div class="dash-panel-card">
        <div class="dash-header-bar">
          <div>
            <h3 style="font-family: var(--font-heading); font-size: 1.2rem; color: var(--text-main); margin: 0;">
              💳 Search Quota &amp; Spending Cap Governance
            </h3>
            <p style="font-size: 0.8rem; color: var(--text-secondary); margin: 0.25rem 0 0 0;">
              Real-time query allocation, free allowance counters, and automatic rotation failover policies.
            </p>
          </div>
          <div style="display: flex; gap: 0.5rem; align-items: center;">
            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; background: var(--bg-surface-elevated); padding: 0.45rem 0.85rem; border-radius: var(--radius-md); border: 1px solid rgba(16, 185, 129, 0.4); font-size: 0.85rem; font-weight: 600; color: #34d399;">
              <input type="checkbox" id="chkGlobalZeroSpendGuard" checked>
              <span>🔒 Automated Spending Cap</span>
            </label>
            <button id="btnResetQuotaCounters" class="btn btn-outline btn-sm">🔄 Reset Daily Counters</button>
          </div>
        </div>

        <!-- Quota Table -->
        <div style="overflow-x: auto; margin-bottom: 1.5rem;">
          <table style="width: 100%; border-collapse: collapse; font-size: 0.82rem; text-align: left;">
            <thead>
              <tr style="background: var(--bg-surface-elevated); color: var(--text-muted); border-bottom: 1px solid var(--border-subtle);">
                <th style="padding: 0.75rem 1rem;">Provider</th>
                <th style="padding: 0.75rem 1rem;">Free Quota Limit</th>
                <th style="padding: 0.75rem 1rem;">Quota Remaining</th>
                <th style="padding: 0.75rem 1rem;">Consumption Meter</th>
                <th style="padding: 0.75rem 1rem;">Reset Cycle</th>
                <th style="padding: 0.75rem 1rem;">Max RPM / RPD</th>
                <th style="padding: 0.75rem 1rem;">Paid Requests</th>
                <th style="padding: 0.75rem 1rem; text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${providers.map(p => {
                const isUnlimited = p.freeQuotaLimit > 100000;
                const pctUsed = isUnlimited ? 0 : Math.min(100, Math.round(((p.quotaUsed || 0) / (p.freeQuotaLimit || 1)) * 100));
                const barColor = pctUsed > 85 ? '#f87171' : pctUsed > 60 ? '#fbbf24' : '#34d399';
                return `
                  <tr style="border-bottom: 1px solid var(--border-subtle);">
                    <td style="padding: 0.75rem 1rem;">
                      <div style="font-weight: 600; color: var(--text-main);">${escapeHtml(p.name)}</div>
                      <span style="font-size: 0.7rem; color: var(--text-muted); font-family: var(--font-mono);">${p.type}</span>
                    </td>
                    <td style="padding: 0.75rem 1rem; font-family: var(--font-mono);">
                      ${isUnlimited ? '∞ Unlimited Free' : `${p.freeQuotaLimit} queries`}
                    </td>
                    <td style="padding: 0.75rem 1rem; font-family: var(--font-mono); font-weight: 700; color: ${p.quotaRemaining <= 5 && !isUnlimited ? '#f87171' : '#34d399'};">
                      ${isUnlimited ? 'Unlimited' : `${p.quotaRemaining} left`}
                    </td>
                    <td style="padding: 0.75rem 1rem; min-width: 140px;">
                      <div style="background: rgba(255,255,255,0.06); border-radius: 999px; height: 7px; overflow: hidden; margin-bottom: 0.25rem;">
                        <div style="background: ${barColor}; height: 100%; width: ${pctUsed}%;"></div>
                      </div>
                      <span style="font-size: 0.7rem; color: var(--text-muted);">${p.quotaUsed || 0} used (${pctUsed}%)</span>
                    </td>
                    <td style="padding: 0.75rem 1rem;">
                      <span class="meta-pill" style="font-size: 0.72rem;">${p.quotaResetPeriod}</span>
                    </td>
                    <td style="padding: 0.75rem 1rem; font-family: var(--font-mono); font-size: 0.75rem;">
                      ${p.maxRequestsPerMinute} RPM / ${p.maxRequestsPerDay} RPD
                    </td>
                    <td style="padding: 0.75rem 1rem;">
                      <label style="display: flex; align-items: center; gap: 0.35rem; cursor: pointer; font-size: 0.75rem;">
                        <input type="checkbox" class="chk-allow-paid-prov" data-id="${p.id}" ${p.permitPaidRequests ? 'checked' : ''}>
                        <span style="color: ${p.permitPaidRequests ? '#f87171' : 'var(--text-muted)'}; font-weight: 600;">
                          ${p.permitPaidRequests ? 'Authorized' : 'Disallowed'}
                        </span>
                      </label>
                    </td>
                    <td style="padding: 0.75rem 1rem; text-align: right;">
                      <button class="btn btn-outline btn-sm btn-edit-provider-quota" data-id="${p.id}" style="font-size: 0.75rem; padding: 0.25rem 0.5rem;">
                        ✏️ Adjust
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

        <!-- Budget Cap Policy Notice -->
        <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: var(--radius-md); padding: 1rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <span style="font-size: 1.5rem;">🛡️</span>
            <div>
              <strong style="color: #34d399; font-size: 0.88rem;">Automated High-Availability Fallback Guarantee:</strong>
              <div style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 0.15rem;">
                If external search API tiers are exhausted, the engine automatically rolls back to direct public RSS feeds and official gazettes seamlessly without interruption.
              </div>
            </div>
          </div>
          <button id="btnRunDryRotationTest" class="btn btn-primary btn-sm" style="font-weight: 600;">
            🧪 Run Failover Simulation Test
          </button>
        </div>
      </div>
    `;
}

export function bindCreditsTabEvents(container, ctx) {
    // Allow Paid Requests toggles
    container.querySelectorAll('.chk-allow-paid-prov').forEach(chk => {
      chk.addEventListener('change', () => {
        const provId = chk.getAttribute('data-id');
        const providers = storageService.getSearchProviders();
        const p = providers.find(x => x.id === provId);
        if (p) {
          p.permitPaidRequests = chk.checked;
          storageService.saveSearchProvider(p);
        }
      });
    });

    // Reset Quota Counters
    document.getElementById('btnResetQuotaCounters')?.addEventListener('click', () => {
      const providers = storageService.getSearchProviders();
      providers.forEach(p => {
        p.quotaRemaining = p.freeQuotaLimit;
        p.quotaUsed = 0;
      });
      storageService.storage.setItem('vacancy_radar_search_providers_v1', JSON.stringify(providers));
      showConfirmationBanner('Quota Counters Reset', 'Free quota counters reset to full capacity for all providers.', 'info', 2500);
      ctx.render();
    });

    // Run Dry-run Rotation simulation
    document.getElementById('btnRunDryRotationTest')?.addEventListener('click', async () => {
      const report = await searchOrchestrationEngine.simulateDryRunFailoverChain({ roles: ['DFIR Analyst'] });
      showConfirmationBanner('Dry Run Complete', `Chain: ${report.providerChain.join(' -> ')} | ₹${report.estimatedTotalCostInr.toFixed(2)}`, 'info', 4000);
      ctx.render();
    });

}
