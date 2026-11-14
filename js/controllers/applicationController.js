/**
 * Vacancy Radar India - Application Controller
 * Manages tracked applications, portal deadline reminders, and status transitions
 */

import { storageService } from '../services/storageService.js';
import { ApplicationTrackerStatus } from '../models/types.js';
import { showConfirmationBanner } from '../services/notificationService.js';
import { escapeHtml } from '../utils/htmlUtils.js';

export async function syncTrackedApplications(app) {
    try {
      const res = await fetch('/api/tracked-applications');
      if (res.ok) {
        const data = await res.json();
        const serverApps = data.applications || [];
        if (serverApps.length > 0) {
          const localApps = storageService.getApplications();
          let changed = false;
          serverApps.forEach(sApp => {
            const matchIdx = localApps.findIndex(l => (l.id && l.id === sApp.id) || (l.vacancyId && l.vacancyId === sApp.vacancyId));
            if (matchIdx < 0) {
              localApps.push(sApp);
              changed = true;
            } else {
              if (!localApps[matchIdx].sourceUrl && sApp.sourceUrl) {
                localApps[matchIdx].sourceUrl = sApp.sourceUrl;
                changed = true;
              }
              if (!localApps[matchIdx].payScale && sApp.payScale) {
                localApps[matchIdx].payScale = sApp.payScale;
                changed = true;
              }
              if (!localApps[matchIdx].location && sApp.location) {
                localApps[matchIdx].location = sApp.location;
                changed = true;
              }
            }
          });
          if (changed) {
            localStorage.setItem('vacancy_radar_applications_v1', JSON.stringify(localApps));
          }
        }
      }
    } catch (_) {}
  }

export function checkAndRenderPortalDeadlineReminders(app) {
    const banner = document.getElementById('portalDeadlineAlertBanner');
    if (!banner) return;
    if (sessionStorage.getItem('portal_deadline_banner_dismissed') === 'true') {
      banner.style.display = 'none';
      return;
    }

    const apps = storageService.getApplications();
    const nowMs = Date.now();
    const urgentApps = [];

    apps.forEach(app => {
      if (!app.deadline) return;
      const dMs = new Date(app.deadline).getTime();
      if (isNaN(dMs)) return;
      const diffDays = Math.ceil((dMs - nowMs) / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays <= 7) {
        urgentApps.push({ ...app, diffDays });
      }
    });

    if (urgentApps.length === 0) {
      banner.style.display = 'none';
      return;
    }

    // Sort by earliest deadline first
    urgentApps.sort((a, b) => a.diffDays - b.diffDays);
    const minDays = urgentApps[0].diffDays;

    banner.style.display = 'block';
    banner.innerHTML = `
      <div style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.16) 0%, rgba(245, 158, 11, 0.12) 100%); border: 1px solid rgba(239, 68, 68, 0.4); border-radius: var(--radius-lg); padding: 1.1rem 1.4rem; box-shadow: 0 4px 20px rgba(239, 68, 68, 0.12); animation: fadeIn 0.3s ease;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap;">
          <div style="display: flex; gap: 0.9rem; align-items: flex-start; flex: 1; min-width: 280px;">
            <div style="font-size: 1.8rem; line-height: 1; padding: 0.2rem 0;">⏰</div>
            <div>
              <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.3rem;">
                <span style="font-size: 0.72rem; font-weight: 800; background: #ef4444; color: #ffffff; padding: 0.18rem 0.55rem; border-radius: 4px; letter-spacing: 0.05em; text-transform: uppercase;">
                  URGENT PORTAL REMINDER
                </span>
                <span style="font-size: 0.88rem; font-weight: 700; color: #f87171;">
                  ${urgentApps.length} Tracked Application${urgentApps.length > 1 ? 's' : ''} Closing in ${minDays === 0 ? 'LESS THAN 24 HOURS!' : `${minDays} Days (${urgentApps[0].deadline})`}
                </span>
              </div>
              <p style="font-size: 0.84rem; color: var(--text-main); margin: 0 0 0.5rem 0; line-height: 1.4;">
                You have active vacancies in your track to prepare and apply. Please complete documentation and submit before the portals close:
              </p>
              <div style="display: flex; gap: 0.4rem; flex-wrap: wrap; max-height: 90px; overflow-y: auto; padding-right: 4px;">
                ${urgentApps.map(u => `
                  <span style="font-size: 0.74rem; background: rgba(0, 0, 0, 0.25); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 4px; padding: 0.2rem 0.5rem; color: #fca5a5; display: inline-flex; align-items: center; gap: 0.35rem;">
                    <strong>${app.escapeHtml((u.vacancyTitle || u.title).slice(0, 40))}</strong>
                    <span style="color: #fbbf24; font-weight: 600;">(${u.diffDays === 0 ? 'Today!' : `${u.diffDays}d left`})</span>
                  </span>
                `).join('')}
              </div>
            </div>
          </div>

          <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
            <button id="btnBannerGoToTracker" class="btn btn-primary btn-sm" style="font-weight: 600; background: #ef4444; border-color: #dc2626; box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);">
              <i data-lucide="file-text" class="icon-xs"></i> Open My Track (${urgentApps.length})
            </button>
            <a href="https://careers.cdac.in" target="_blank" rel="noopener" class="btn btn-outline btn-sm" style="font-weight: 600; text-decoration: none; border-color: rgba(245, 158, 11, 0.5); color: #fbbf24;">
              <i data-lucide="external-link" class="icon-xs"></i> C-DAC Apply Portal
            </a>
            <button id="btnBannerSendTelegramAlert" class="btn btn-outline btn-sm" title="Dispatch immediate reminder alert to your Telegram">
              <i data-lucide="send" class="icon-xs"></i> Dispatch Telegram Alert
            </button>
            <button id="btnBannerDismiss" class="btn btn-ghost btn-sm" title="Dismiss banner for this session" style="color: var(--text-muted); font-size: 1.1rem; padding: 0.2rem 0.4rem;">
              <i data-lucide="x" class="icon-xs"></i>
            </button>
          </div>
        </div>
      </div>
    `;
    if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();

    document.getElementById('btnBannerGoToTracker')?.addEventListener('click', () => {
      app.switchTab('tracker');
      const el = document.getElementById('sectionTracker');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    });

    document.getElementById('btnBannerSendTelegramAlert')?.addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      const origText = btn.innerHTML;
      btn.innerHTML = '<i data-lucide="loader-2" class="icon-xs icon-spin"></i> Sending...';
      if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
      try {
        const res = await fetch('/api/trigger-deadline-reminders', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          btn.innerHTML = '<i data-lucide="check-circle-2" class="icon-xs text-emerald"></i> Alert Sent!';
          if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
          showConfirmationBanner('Telegram Reminder Sent', `Dispatched urgent alert for ${urgentApps.length} vacancies to Telegram!`, 'success', 3500);
        } else {
          btn.innerHTML = '<i data-lucide="alert-triangle" class="icon-xs text-amber"></i> Failed';
          if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
          showConfirmationBanner('Reminder Warning', data.result?.error || 'Could not send reminder', 'warning', 3500);
        }
      } catch (err) {
        btn.innerHTML = '<i data-lucide="x-circle" class="icon-xs text-rose"></i> Error';
        if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
        showConfirmationBanner('Error', err.message, 'error', 3000);
      } finally {
        setTimeout(() => {
          btn.disabled = false;
          btn.innerHTML = origText;
          if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
        }, 3000);
      }
    });

    document.getElementById('btnBannerDismiss')?.addEventListener('click', () => {
      sessionStorage.setItem('portal_deadline_banner_dismissed', 'true');
      banner.style.display = 'none';
    });
  }

export function openApplicationModal(app, vacId) {
    const list = storageService.getVacancies();
    const vac = list.find(v => v.id === vacId);
    if (!vac) return;

    const apps = storageService.getApplications();
    const existing = apps.find(a => a.vacancyId === vacId) || {};

    const body = document.getElementById('appModalBody');
    body.innerHTML = `
      <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 1rem;">
        Tracking for: <strong>${app.escapeHtml(vac.title)}</strong> (${app.escapeHtml(vac.organisation)})
      </p>

      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <div>
          <label style="font-size: 0.8rem; color: var(--text-muted); display: block; margin-bottom: 0.35rem;">Application Status &amp; Stage Progress</label>
          <select id="appStatusSelect" class="filter-select" style="width: 100%;">
            <option value="SAVED" ${existing.status === 'SAVED' ? 'selected' : ''}>Saved / Reviewing (20%)</option>
            <option value="PREPARING" ${existing.status === 'PREPARING' ? 'selected' : ''}>Preparing Documents &amp; Certificates (40%)</option>
            <option value="APPLIED" ${existing.status === 'APPLIED' ? 'selected' : ''}>Applied (Form Submitted) (60%)</option>
            <option value="UNDER_REVIEW" ${existing.status === 'UNDER_REVIEW' ? 'selected' : ''}>Screening / Exam Scheduled (80%)</option>
            <option value="INTERVIEW_SCHEDULED" ${existing.status === 'INTERVIEW_SCHEDULED' ? 'selected' : ''}>Interview Scheduled (85%)</option>
            <option value="SELECTED" ${existing.status === 'SELECTED' ? 'selected' : ''}>Selected / Offer Received (100%)</option>
            <option value="ARCHIVED" ${existing.status === 'ARCHIVED' ? 'selected' : ''}>Archived / Closed</option>
          </select>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
          <div>
            <label style="font-size: 0.8rem; color: var(--text-muted); display: block; margin-bottom: 0.35rem;">Submission Date / Deadline</label>
            <input type="date" id="appDateInput" class="search-input" value="${existing.submissionDate || vac.dates?.closingDate || ''}" style="width: 100%; padding-left: 0.6rem;">
          </div>
          <div>
            <label style="font-size: 0.8rem; color: var(--text-muted); display: block; margin-bottom: 0.35rem;">Registration / Roll No.</label>
            <input type="text" id="appRegInput" class="search-input" value="${app.escapeHtml(existing.registrationNo || '')}" placeholder="e.g. CDAC-2026-9812" style="width: 100%; padding-left: 0.6rem;">
          </div>
        </div>

        <div>
          <label style="font-size: 0.8rem; color: var(--text-muted); display: block; margin-bottom: 0.35rem;">Notes &amp; Document Checklist</label>
          <textarea id="appNotesInput" class="search-input" style="width: 100%; height: 80px; padding: 0.6rem;" placeholder="e.g. Fee paid ₹500 via UPI, NOC required, Exam date: 15-Nov">${app.escapeHtml(existing.notes || '')}</textarea>
        </div>

        <button id="btnSaveApp" class="btn btn-primary" style="margin-top: 0.5rem; justify-content: center;">
          Save to Application Tracker
        </button>
      </div>
    `;

    document.getElementById('btnSaveApp').onclick = () => {
      const status = document.getElementById('appStatusSelect').value;
      const submissionDate = document.getElementById('appDateInput').value;
      const registrationNo = document.getElementById('appRegInput').value.trim();
      const notes = document.getElementById('appNotesInput').value;

      const appRecord = {
        vacancyId: vac.id,
        vacancyTitle: vac.title,
        title: vac.title,
        organisation: vac.organisation,
        deadline: vac.dates?.closingDate,
        status,
        submissionDate,
        registrationNo,
        notes
      };

      storageService.saveApplication(appRecord);

      // Auto-sync application to backend json file
      fetch('/api/tracked-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appRecord)
      }).catch(() => {});

      // Auto-sync application to Google Sheets if Webhook is configured
      const webhookUrl = storageService.getProviderConfig()?.googleAppsScriptWebhookUrl?.trim();
      if (webhookUrl) {
        fetch('/api/sync-webhook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: webhookUrl, payload: { action: 'SYNC_APPLICATION', application: appRecord } })
        }).catch(() => {});
      }

      app.checkAndRenderPortalDeadlineReminders();

      document.getElementById('appStatusModal').classList.remove('active');
      showConfirmationBanner(
        'Application Saved',
        `"${vac.title}" recorded in tracker as "${status}".`,
        'success',
        2500
      );
      app.refreshAll();
    };

    document.getElementById('appStatusModal').classList.add('active');
  }

export function renderTrackedApplications(app) {
    const container = document.getElementById('trackerCardsContainer');
    if (!container) return;
    let apps = storageService.getApplications();

    if (app.filterState.trackerStage && app.filterState.trackerStage !== 'ALL') {
      apps = apps.filter(a => a.status === app.filterState.trackerStage);
    }

    if (apps.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 3rem; text-align: center; color: var(--text-secondary); background: var(--bg-surface); border-radius: var(--radius-lg); border: 1px dashed var(--border-subtle);">
          <p style="font-size: 1.1rem; margin-bottom: 0.5rem;">No tracked applications found for this stage.</p>
          <span style="font-size: 0.85rem; color: var(--text-muted);">Click the "Track" button on any vacancy card to save or log your application progress.</span>
        </div>
      `;
      return;
    }

    const STAGE_PROGRESS = {
      'SAVED': { pct: 20, label: 'Saved / Reviewing', color: '#60a5fa' },
      'PREPARING': { pct: 40, label: 'Preparing Documents', color: '#a78bfa' },
      'APPLIED': { pct: 60, label: 'Applied (Submitted)', color: '#38bdf8' },
      'UNDER_REVIEW': { pct: 80, label: 'Screening / Exam', color: '#f59e0b' },
      'INTERVIEW_SCHEDULED': { pct: 85, label: 'Interview Scheduled', color: '#f59e0b' },
      'SELECTED': { pct: 100, label: 'Selected / Offer', color: '#34d399' },
      'ARCHIVED': { pct: 0, label: 'Archived / Closed', color: '#94a3b8' }
    };

    container.innerHTML = apps.map(a => {
      const stageInfo = STAGE_PROGRESS[a.status] || { pct: 50, label: a.status || 'In Progress', color: '#60a5fa' };
      let badgeClass = 'badge-OFFICIALLY_VERIFIED';
      if (a.status === 'SAVED') badgeClass = 'badge-CROSS_CHECKED';
      if (a.status === 'ARCHIVED') badgeClass = 'badge-EXPIRED_CLOSED';

      let deadlinePill = '';
      if (a.deadline) {
        const dMs = new Date(a.deadline).getTime();
        if (!isNaN(dMs)) {
          const diffDays = Math.ceil((dMs - Date.now()) / (1000 * 60 * 60 * 24));
          if (diffDays < 0) {
            deadlinePill = `<span class="meta-pill" style="color: #94a3b8; border-color: rgba(148, 163, 184, 0.3);">Closed ${Math.abs(diffDays)}d ago</span>`;
          } else if (diffDays <= 7) {
            deadlinePill = `<span class="meta-pill" style="color: #ef4444; border-color: rgba(239, 68, 68, 0.4); background: rgba(239, 68, 68, 0.12); font-weight: 700;">⏰ ${diffDays === 0 ? 'Closes Today!' : `${diffDays} days left`}</span>`;
          } else {
            deadlinePill = `<span class="meta-pill" style="color: #38bdf8; border-color: rgba(56, 189, 248, 0.3);">${diffDays} days left</span>`;
          }
        }
      }

      return `
        <div class="vacancy-card" style="padding: 1.25rem;">
          <div class="card-top">
            <span class="org-name">${app.escapeHtml(a.organisation)}</span>
            <span class="verification-badge ${badgeClass}" style="color: ${stageInfo.color}; border-color: ${stageInfo.color}; font-weight: 700;">
              ${stageInfo.label} (${stageInfo.pct}%)
            </span>
          </div>
          <h3 style="font-size: 1.08rem; font-family: var(--font-heading); margin-bottom: 0.4rem;">${app.escapeHtml(a.vacancyTitle || a.title)}</h3>
          
          <!-- Stage Completion Progress Bar -->
          <div style="margin-bottom: 0.75rem; background: rgba(255, 255, 255, 0.04); border-radius: 4px; padding: 0.35rem 0.5rem; border: 1px solid var(--border-subtle);">
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.72rem; margin-bottom: 0.25rem;">
              <span style="font-weight: 600; color: var(--text-secondary);">Application Progress</span>
              <strong style="color: ${stageInfo.color};">${stageInfo.pct}% Completed</strong>
            </div>
            <div style="width: 100%; height: 6px; background: rgba(0, 0, 0, 0.25); border-radius: 3px; overflow: hidden;">
              <div style="width: ${stageInfo.pct}%; height: 100%; background: ${stageInfo.color}; border-radius: 3px; transition: width 0.3s ease;"></div>
            </div>
          </div>

          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; margin-bottom: 0.5rem; font-size: 0.8rem;">
            <span style="color: var(--text-secondary);">
              Target / Deadline: <strong style="color: var(--text-main);">${a.deadline || a.submissionDate || 'Not specified'}</strong>
            </span>
            ${deadlinePill}
            ${a.location ? `<span class="meta-pill" style="font-size: 0.72rem;"><i data-lucide="map-pin" class="icon-xs"></i> ${app.escapeHtml(a.location)}</span>` : ''}
            ${a.payScale ? `<span class="meta-pill" style="font-size: 0.72rem; color: #34d399; border-color: rgba(52, 211, 153, 0.3);"><i data-lucide="indian-rupee" class="icon-xs"></i> ${app.escapeHtml(a.payScale)}</span>` : ''}
            ${a.registrationNo ? `
              <span class="meta-pill" style="font-size: 0.72rem; font-family: var(--font-mono); background: rgba(56, 189, 248, 0.12); color: #38bdf8; border-color: rgba(56, 189, 248, 0.3);">
                Reg ID: <strong>${app.escapeHtml(a.registrationNo)}</strong>
              </span>
            ` : ''}
          </div>

          ${a.notes ? `
            <div style="background: var(--bg-surface-elevated); padding: 0.6rem 0.8rem; border-radius: var(--radius-sm); font-size: 0.8rem; color: var(--text-main); margin-bottom: 0.75rem; border-left: 3px solid ${stageInfo.color};">
              ${app.escapeHtml(a.notes)}
            </div>
          ` : ''}
          <div class="card-actions" style="display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
            <span style="font-size: 0.75rem; color: var(--text-muted);">Updated: ${new Date(a.appliedAt || Date.now()).toLocaleDateString()}</span>
            <div style="display: flex; gap: 0.4rem; align-items: center;">
              ${a.sourceUrl ? `
                <a href="${a.sourceUrl}" target="_blank" rel="noopener" class="btn btn-primary btn-sm" style="font-size: 0.75rem; padding: 0.25rem 0.65rem; text-decoration: none; display: inline-flex; align-items: center; gap: 0.25rem;">
                  <i data-lucide="external-link" class="icon-xs"></i> Apply Link
                </a>
              ` : ''}
              <button class="btn btn-outline btn-sm btn-track" data-id="${a.vacancyId || a.id}" style="font-size: 0.75rem; padding: 0.25rem 0.6rem;">Edit Stage</button>
              <button class="btn btn-outline btn-sm btn-delete-app" data-id="${a.vacancyId || a.id}" style="color: #f87171; font-size: 0.75rem; padding: 0.25rem 0.6rem;">Remove</button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();

    container.querySelectorAll('.btn-track').forEach(btn => {
      btn.addEventListener('click', () => {
        app.openApplicationModal(btn.getAttribute('data-id'));
      });
    });

    container.querySelectorAll('.btn-delete-app').forEach(btn => {
      btn.addEventListener('click', () => {
        const vacId = btn.getAttribute('data-id');
        const appsList = storageService.getApplications().filter(a => a.vacancyId !== vacId && a.id !== vacId);
        localStorage.setItem('vacancy_radar_applications_v1', JSON.stringify(appsList));
        fetch('/api/tracked-applications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(appsList)
        }).catch(() => {});
        app.renderTrackedApplications();
        app.updateKpis();
        app.checkAndRenderPortalDeadlineReminders();
      });
    });
  }
