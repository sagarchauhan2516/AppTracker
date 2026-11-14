/**
 * Vacancy Radar India - Source Controller
 * Manages source portals, canary status, discovery logs, and trashed vacancies
 */

import { storageService } from '../services/storageService.js';
import { SourceRegistryService } from '../services/sourceRegistryService.js';
import { SourceCategory } from '../models/types.js';
import { showConfirmationBanner } from '../services/notificationService.js';
import { escapeHtml } from '../utils/htmlUtils.js';

export function renderSources(app) {
    const container = document.getElementById('sourcesContainer');
    if (!container) return;
    
    // Update Search Provider Status Banner
    const stats = app.searchProvider.getUsageStats();
    const badge = document.getElementById('activeProviderBadge');
    const disclosure = document.getElementById('providerDisclosureText');
    const costDisplay = document.getElementById('providerCostDisplay');
    
    if (badge) badge.textContent = stats.providerName;
    if (disclosure) disclosure.textContent = stats.coverageDisclosure || '';
    if (costDisplay) costDisplay.textContent = `₹${stats.estimatedCostInr.toFixed(2)}`;

    let sources = storageService.getSources();
    if (app.filterState.sourceCategory && app.filterState.sourceCategory !== 'ALL') {
      sources = sources.filter(s => s.category === app.filterState.sourceCategory);
    }

    if (sources.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 2.5rem; text-align: center; color: var(--text-secondary); background: var(--bg-surface); border-radius: var(--radius-lg); border: 1px dashed var(--border-subtle);">
          <p>No candidate sources match the selected category filter.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = sources.map(s => {
      const isOfficial = s.isOfficialDomain;
      const statusBadge = s.isEnabled ? 'badge-OFFICIALLY_VERIFIED' : 'badge-VERIFICATION_FAILED';
      const statusText = s.isEnabled ? 'ACTIVE' : 'DISABLED';

      return `
        <div class="vacancy-card" style="padding: 1.25rem;">
          <div class="card-top">
            <span class="org-name">${app.escapeHtml(s.domain)}</span>
            <div style="display: flex; gap: 0.4rem; align-items: center;">
              <span class="meta-pill" style="font-size: 0.65rem; background: ${isOfficial ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)'}; color: ${isOfficial ? '#34d399' : '#fbbf24'}; border-color: ${isOfficial ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'};">
                ${isOfficial ? 'OFFICIAL DOMAIN' : 'AGGREGATOR'}
              </span>
              <span class="verification-badge ${statusBadge}">${statusText}</span>
            </div>
          </div>
          <h3 style="font-size: 1.05rem; font-family: var(--font-heading); margin-bottom: 0.4rem;">${app.escapeHtml(s.organisationName)}</h3>
          <p style="font-size: 0.78rem; color: var(--text-secondary); margin-bottom: 0.75rem;">
            Category: <strong>${app.escapeHtml(s.category)}</strong> • Method: <code>${app.escapeHtml(s.retrievalMethod)}</code>
          </p>
          <div style="font-size: 0.75rem; color: var(--text-muted); display: grid; grid-template-columns: 1fr 1fr; gap: 0.4rem; margin-bottom: 1rem;">
            <div>Results Found: <strong style="color: var(--text-main);">${s.relevantResultsFound || 0}</strong></div>
            <div>Rate Limit: <strong>${s.rateLimitMinutes} min</strong></div>
            <div>Last Check: <strong>${s.lastSuccessfulCheck ? new Date(s.lastSuccessfulCheck).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never'}</strong></div>
            <div>Consecutive Fails: <strong>${s.consecutiveFailures || 0}</strong></div>
          </div>
          <div class="card-actions">
            <a href="${s.sourceUrl}" target="_blank" rel="noopener noreferrer" style="font-size: 0.78rem; color: var(--accent-primary);">Visit Source</a>
            <div style="display: flex; gap: 0.4rem;">
              <button class="btn btn-outline btn-sm btn-toggle-source" data-id="${s.id}">
                ${s.isEnabled ? 'Disable' : 'Enable'}
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.btn-toggle-source').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        storageService.toggleSourceEnabled(id);
        app.renderSources();
        app.updateKpis();
      });
    });
  }

export async function handleRevalidateSources(app) {
    const btn = document.getElementById('btnRevalidateSources');
    btn.disabled = true;
    btn.innerHTML = `<span>⏳</span> Testing Sources...`;

    const results = await SourceRegistryService.revalidateAllSources(app.searchProvider);
    btn.disabled = false;
    btn.innerHTML = `🩺 Revalidate Sources`;
    app.renderSources();
    showConfirmationBanner('Revalidation Complete', `Checked ${results.length} active sources. Statuses refreshed.`, 'success', 3000);
  }

export function handleRegisterSourcePrompt(app) {
    const url = prompt('Enter the Source or Career Page URL (e.g. https://www.drdo.gov.in/careers):');
    if (!url || !url.trim()) return;

    try {
      const parsed = new URL(url.trim());
      const orgName = prompt('Enter the Organisation Name (e.g. Defence Research and Development Organisation):', parsed.hostname);
      const registered = SourceRegistryService.registerDiscoveredDomain(parsed.hostname, orgName, url.trim(), 'Manual User Registration');
      app.renderSources();
      app.updateKpis();
      showConfirmationBanner(
        'Source Registered',
        `Source "${registered.domain}" registered successfully (${registered.isOfficialDomain ? 'Verified Official' : 'Aggregator'}).`,
        'success',
        3000
      );
    } catch (e) {
      showConfirmationBanner('Invalid URL', 'Please enter a valid HTTP/HTTPS URL.', 'error', 3000);
    }
  }

export function openProviderModal(app) {
    const modal = document.getElementById('providerModal');
    if (!modal) return;
    if (!app.providerDashboardUI) {
      app.providerDashboardUI = new SearchProviderDashboardUI('providerModalBody');
    }
    app.providerDashboardUI.render();
    modal.classList.add('active');
  }

export function renderDiscoveryLogs(app) {
    const container = document.getElementById('logsContainer');
    if (!container) return;
    const logs = storageService.getLogs();

    if (logs.length === 0) {
      container.innerHTML = `
        <div style="padding: 2.5rem; text-align: center; color: var(--text-secondary); background: var(--bg-surface); border-radius: var(--radius-lg); border: 1px dashed var(--border-subtle);">
          <p>No execution logs recorded yet.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = logs.map(log => {
      const isSuccess = log.status === 'SUCCESS';
      return `
        <div style="background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 1.1rem 1.4rem; display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem;">
          <div>
            <div style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.35rem; flex-wrap: wrap;">
              <span class="verification-badge ${isSuccess ? 'badge-OFFICIALLY_VERIFIED' : 'badge-VERIFICATION_FAILED'}" style="font-size: 0.7rem; padding: 0.2rem 0.6rem;">
                ${log.status}
              </span>
              <strong style="font-size: 0.85rem; color: var(--text-main); font-family: var(--font-heading);">${app.escapeHtml(log.type || 'EXECUTION_RUN')}</strong>
              <span style="font-size: 0.75rem; color: var(--text-muted); font-family: var(--font-mono);">${new Date(log.timestamp).toLocaleString('en-IN')}</span>
            </div>
            <p style="font-size: 0.825rem; color: var(--text-secondary); margin-top: 0.25rem;">${app.escapeHtml(log.message || 'Scan completed.')}</p>
          </div>
          <div style="text-align: right; font-size: 0.75rem; color: var(--text-muted); font-family: var(--font-mono); white-space: nowrap;">
            <div>Sources: <strong style="color: var(--text-main);">${log.sourcesChecked || 0}</strong></div>
            <div>Discovered: <strong style="color: #34d399;">+${log.newVacanciesFound || 0}</strong></div>
          </div>
        </div>
      `;
    }).join('');
  }

export function renderTrashSection(app) {
    const container = document.getElementById('trashCardsContainer');
    if (!container) return;
    const trash = storageService.getTrashVacancies();

    if (trash.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 3rem; text-align: center; color: var(--text-secondary); background: var(--bg-surface); border-radius: var(--radius-lg); border: 1px dashed var(--border-subtle);">
          <div style="margin-bottom: 0.75rem;"><i data-lucide="trash-2" class="icon-xl text-rose" style="width: 36px; height: 36px;"></i></div>
          <p style="font-size: 1.1rem; margin-bottom: 0.5rem; color: var(--text-main); font-weight: 600;">Trash folder is empty</p>
          <span style="font-size: 0.85rem; color: var(--text-muted);">
            Deleted vacancies will appear here. Trashed vacancies are permanently excluded from upcoming scans and alerts. You can recover them anytime.
          </span>
        </div>
      `;
      if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
      return;
    }

    container.innerHTML = trash.map(v => `
      <article class="vacancy-card" id="trash-card-${v.id}" style="border: 1px dashed rgba(239, 68, 68, 0.35); opacity: 0.9;">
        <div>
          <div class="card-top">
            <span class="org-name">${app.escapeHtml(v.organisation || 'Apex Authority')}</span>
            <span class="meta-pill" style="background: rgba(239, 68, 68, 0.15); color: #f87171; border-color: rgba(239, 68, 68, 0.3); font-weight: 700; display: inline-flex; align-items: center; gap: 0.35rem;">
              <i data-lucide="trash-2" class="icon-xs"></i> TRASHED (SUPPRESSED)
            </span>
          </div>
          <h2 class="job-title" style="text-decoration: line-through; opacity: 0.85;">${app.escapeHtml(v.title)}</h2>
          <div class="advt-ref">
            Advt: ${app.escapeHtml(v.advertisementNumber || 'Notice Ref Not Stated')}
            ${v.trashedAt ? ` • Deleted on ${new Date(v.trashedAt).toLocaleDateString()}` : ''}
          </div>
          <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.5rem; line-height: 1.4;">
            This vacancy is permanently suppressed from future scans and won't reappear in your alerts. Click "Recover to Feed" if you want to restore it.
          </p>
        </div>
        <div class="card-actions" style="margin-top: 1rem; display: flex; justify-content: flex-end; gap: 0.5rem;">
          <button class="btn btn-primary btn-sm btn-main-restore-vac" data-id="${v.id}" style="font-weight: 600;">
            <i data-lucide="rotate-ccw" class="icon-xs"></i> Recover to Feed
          </button>
          <button class="btn btn-outline btn-sm btn-main-perm-delete-vac" data-id="${v.id}" style="color: #f87171; border-color: rgba(239, 68, 68, 0.35);">
            <i data-lucide="trash-2" class="icon-xs"></i> Delete Forever
          </button>
        </div>
      </article>
    `).join('');
    if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();

    container.querySelectorAll('.btn-main-restore-vac').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const restored = storageService.restoreFromTrash(id);
        if (restored) {
          app.refreshAll();
          app.renderTrashSection();
        }
      });
    });

    container.querySelectorAll('.btn-main-perm-delete-vac').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        if (confirm('Permanently delete this vacancy from Trash? This cannot be undone.')) {
          storageService.deletePermanentlyFromTrash(id);
          app.renderTrashSection();
          app.updateKpis();
        }
      });
    });
  }
