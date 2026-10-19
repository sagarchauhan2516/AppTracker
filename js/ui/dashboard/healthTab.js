import { storageService } from '../../services/storageService.js';
import { SourceHealthMonitor, HealthStatus, DEFAULT_MONITORED_SOURCES } from '../../engine/sourceHealthMonitor.js';
import { showConfirmationBanner } from '../../services/notificationService.js';
import { escapeHtml } from '../../utils/htmlUtils.js';

export function renderHealthTab(sources = []) {
    const summary = SourceHealthMonitor.summarizeHealth(sources);

    return `
      <div class="dash-panel-card">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem;">
          <div>
            <h3 style="font-family: var(--font-heading); font-size: 1.25rem; color: var(--text-main); margin: 0 0 0.35rem 0;">
              🩺 Silent-Failure &amp; Source Health Monitor
            </h3>
            <p style="font-size: 0.8rem; color: var(--text-secondary); margin: 0;">
              Detects portal redesigns, scraper failures, and 60+ day vacancy staleness across official government recruitment directories.
            </p>
          </div>
          <button type="button" id="btnRunHealthDiagnostics" class="btn btn-primary" style="font-weight: 600;">
            🩺 Run Health &amp; Canary Checks Now
          </button>
        </div>

        <div id="statusHealthDiagnostics" style="display: none; margin-bottom: 1.25rem;"></div>

        <!-- Health KPI Grid -->
        <div class="kpi-grid" style="grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); margin-bottom: 1.5rem;">
          <div class="kpi-card" style="border-top: 3px solid #60a5fa;">
            <span class="kpi-label">Monitored Portals</span>
            <span class="kpi-value" style="color: #60a5fa;">${summary.totalSources}</span>
            <span class="kpi-sub">Apex Recruitment Portals</span>
          </div>
          <div class="kpi-card" style="border-top: 3px solid #34d399;">
            <span class="kpi-label">Operational &amp; Responsive</span>
            <span class="kpi-value" style="color: #34d399;">${summary.healthy}</span>
            <span class="kpi-sub">HTTP 200/304 OK</span>
          </div>
          <div class="kpi-card" style="border-top: 3px solid #f59e0b;">
            <span class="kpi-label">Staleness Warnings (&gt;60d)</span>
            <span class="kpi-value" style="color: #f59e0b;">${summary.stale}</span>
            <span class="kpi-sub">Requires Scraper Audit</span>
          </div>
          <div class="kpi-card" style="border-top: 3px solid #ef4444;">
            <span class="kpi-label">Scraper Errors</span>
            <span class="kpi-value" style="color: #ef4444;">${summary.error}</span>
            <span class="kpi-sub">HTTP Errors / Redesigns</span>
          </div>
        </div>

        <!-- Table of Sources -->
        <div style="background: var(--bg-surface-elevated); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; font-size: 0.8rem; text-align: left;">
            <thead>
              <tr style="border-bottom: 1px solid var(--border-subtle); background: var(--bg-surface);">
                <th style="padding: 0.75rem 1rem;">Portal &amp; Organisation</th>
                <th style="padding: 0.75rem 1rem;">Status</th>
                <th style="padding: 0.75rem 1rem;">Latency</th>
                <th style="padding: 0.75rem 1rem;">Last Checked</th>
                <th style="padding: 0.75rem 1rem;">Last Vacancy Found</th>
                <th style="padding: 0.75rem 1rem;">Canary Extractor</th>
                <th style="padding: 0.75rem 1rem; text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${sources.map(s => {
                let badgeClass = 'badge-OFFICIALLY_VERIFIED';
                let badgeText = '🟢 HEALTHY';
                if (s.status === HealthStatus.STALE_WARNING) {
                  badgeClass = 'badge-UNVERIFIED_LEAD';
                  badgeText = '🟡 STALE (>60d)';
                } else if (s.status === HealthStatus.SCRAPER_ERROR) {
                  badgeClass = 'badge-VERIFICATION_FAILED';
                  badgeText = '🔴 SCRAPER ERROR';
                } else if (s.status === HealthStatus.UNCHECKED) {
                  badgeText = '⚪ UNCHECKED';
                }

                const staleness = SourceHealthMonitor.calculateStalenessDays(s.lastVacancyFoundDate);
                const canaryBadge = s.canaryStatus === 'PASSED' ? '<span style="color: #34d399; font-weight: 700;">✅ PASSED</span>'
                                  : s.canaryStatus === 'FAILED' ? '<span style="color: #f87171; font-weight: 700;">❌ FAILED</span>'
                                  : '<span style="color: var(--text-muted);">⚪ UNTESTED</span>';

                return `
                  <tr style="border-bottom: 1px solid var(--border-subtle);">
                    <td style="padding: 0.75rem 1rem;">
                      <strong style="color: var(--text-main); font-size: 0.84rem;">${escapeHtml(s.name)}</strong>
                      <div style="color: var(--text-muted); font-size: 0.74rem;">${escapeHtml(s.domain)} &bull; <code>${escapeHtml(s.category)}</code></div>
                    </td>
                    <td style="padding: 0.75rem 1rem;">
                      <span class="verification-badge ${badgeClass}" style="font-size: 0.7rem; padding: 0.2rem 0.5rem;">${badgeText}</span>
                      ${s.healthDetails ? `<div style="font-size: 0.72rem; color: var(--text-secondary); margin-top: 0.2rem;">${escapeHtml(s.healthDetails)}</div>` : ''}
                    </td>
                    <td style="padding: 0.75rem 1rem; font-family: var(--font-mono); font-size: 0.78rem;">
                      ${s.latencyMs ? `${s.latencyMs} ms` : '—'}
                    </td>
                    <td style="padding: 0.75rem 1rem; color: var(--text-muted); font-size: 0.76rem;">
                      ${s.lastChecked ? new Date(s.lastChecked).toLocaleString('en-IN') : 'Not yet checked'}
                    </td>
                    <td style="padding: 0.75rem 1rem;">
                      <div style="font-weight: 500; color: ${staleness >= 60 ? '#f59e0b' : 'var(--text-main)'};">
                        ${s.lastVacancyFoundDate || 'None recorded'}
                      </div>
                      <div style="font-size: 0.72rem; color: var(--text-muted);">${staleness} days ago</div>
                    </td>
                    <td style="padding: 0.75rem 1rem; font-size: 0.75rem;">
                      ${canaryBadge}
                    </td>
                    <td style="padding: 0.75rem 1rem; text-align: right;">
                      <a href="${s.url}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm" style="font-size: 0.72rem; padding: 0.25rem 0.5rem;" title="Open official career page">
                        Visit Site ↗
                      </a>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
}

export function bindHealthTabEvents(container, ctx) {
    // Run Full Source Health & Canary Diagnostics
    document.getElementById('btnRunHealthDiagnostics')?.addEventListener('click', async () => {
      const btn = document.getElementById('btnRunHealthDiagnostics');
      const statusDiv = document.getElementById('statusHealthDiagnostics');

      btn.disabled = true;
      const origText = btn.innerHTML;
      btn.innerHTML = '⏳ Testing Portals &amp; Canaries...';
      if (statusDiv) {
        statusDiv.style.display = 'block';
        statusDiv.innerHTML = `<div class="alert-box alert-box-cyan">⏳ Running live health check &amp; scraper canary diagnostics across all monitored portals...</div>`;
      }

      try {
        for (const s of ctx.monitoredSources) {
          try {
            const t0 = Date.now();
            const res = await fetch('/api/diff-pages', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ portalUrl: s.url })
            });
            const data = await res.json();
            const evaluated = SourceHealthMonitor.evaluateSourceHealth(s, {
              success: data.success,
              status: data.notModified ? 304 : 200,
              latencyMs: data.latencyMs || (Date.now() - t0)
            });
            Object.assign(s, evaluated);
            s.canaryStatus = (data.currentNotices?.length || 0) > 0 ? 'PASSED' : 'FAILED';
          } catch (e) {
            s.status = HealthStatus.SCRAPER_ERROR;
            s.healthDetails = `Check failed: ${e.message}`;
            s.canaryStatus = 'FAILED';
          }
        }

        storageService.saveMonitoredSources(ctx.monitoredSources);
        showConfirmationBanner('Health Diagnostics Completed', 'All apex portal health states & staleness metrics updated.', 'success', 3000);
        ctx.render();
      } catch (err) {
        if (statusDiv) {
          statusDiv.innerHTML = `<div class="alert-box alert-box-error">❌ Error: ${err.message}</div>`;
        }
      } finally {
        btn.disabled = false;
        btn.innerHTML = origText;
      }
    });

}
