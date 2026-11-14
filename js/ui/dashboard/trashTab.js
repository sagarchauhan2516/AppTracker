import { storageService } from '../../services/storageService.js';
import { showConfirmationBanner } from '../../services/notificationService.js';
import { escapeHtml } from '../../utils/htmlUtils.js';

export function renderTrashTab(trashVacancies = []) {
    return `
      <div class="dash-panel-card">
        <div class="dash-header-bar">
          <div>
            <div style="display: flex; align-items: center; gap: 0.6rem;">
              <span style="display: flex; align-items: center; color: var(--accent-primary);"><i data-lucide="trash-2" class="icon icon-md"></i></span>
              <h3 style="font-family: var(--font-heading); font-size: 1.2rem; color: var(--text-main); margin: 0;">
                Deleted Vacancies &amp; Trash Recovery (${trashVacancies.length})
              </h3>
            </div>
            <p style="font-size: 0.82rem; color: var(--text-secondary); margin: 0.35rem 0 0 0;">
              Vacancies here are hidden from all active dashboard feeds, KPI counts, and email digests. <strong>They are permanently suppressed from upcoming scans and will never be re-added.</strong> You can recover them back to your active feed at any time.
            </p>
          </div>
          ${trashVacancies.length > 0 ? `
            <button type="button" id="btnEmptyTrashDash" class="btn btn-outline btn-sm" style="color: #f87171; border-color: rgba(239, 68, 68, 0.4);">
              <i data-lucide="trash-2" class="icon icon-sm"></i> Empty Trash Permanently
            </button>
          ` : ''}
        </div>

        ${trashVacancies.length === 0 ? `
          <div style="text-align: center; padding: 3rem 1rem; color: var(--text-muted); background: var(--bg-surface-elevated); border-radius: var(--radius-md); border: 1px dashed var(--border-subtle);">
            <div style="margin-bottom: 0.5rem; display: flex; justify-content: center;"><i data-lucide="trash-2" class="icon icon-xl text-secondary" style="width: 36px; height: 36px;"></i></div>
            <strong style="color: var(--text-main); font-size: 1rem;">Trash folder is empty</strong>
            <p style="font-size: 0.82rem; margin-top: 0.35rem;">
              When you delete a vacancy from the feed using the "Delete" button on its card, it will be safely placed here so upcoming scans never re-add it.
            </p>
          </div>
        ` : `
          <div style="display: flex; flex-direction: column; gap: 0.85rem;">
            ${trashVacancies.map(v => `
              <div style="background: var(--bg-surface-elevated); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 1.1rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                <div style="flex: 1; min-width: 280px;">
                  <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
                    <strong style="font-size: 0.95rem; color: var(--text-main);">${escapeHtml(v.title)}</strong>
                    <span class="meta-pill" style="font-size: 0.7rem; background: rgba(239, 68, 68, 0.15); color: #f87171;">TRASHED</span>
                  </div>
                  <div style="font-size: 0.78rem; color: var(--text-secondary); display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap;">
                    <span style="display: inline-flex; align-items: center; gap: 0.3rem;"><i data-lucide="building-2" class="icon icon-xs"></i> ${escapeHtml(v.organisation || 'Apex Authority')}</span>
                    ${v.advertisementNumber ? ` &bull; <code>${escapeHtml(v.advertisementNumber)}</code>` : ''}
                    ${v.trashedAt ? ` &bull; Deleted on ${new Date(v.trashedAt).toLocaleDateString()}` : ''}
                  </div>
                </div>
                <div style="display: flex; gap: 0.5rem; align-items: center;">
                  <button type="button" class="btn btn-primary btn-sm btn-dash-restore-vac" data-id="${v.id}" style="font-weight: 600;">
                    <i data-lucide="rotate-ccw" class="icon icon-sm"></i> Recover to Feed
                  </button>
                  <button type="button" class="btn btn-outline btn-sm btn-dash-perm-delete-vac" data-id="${v.id}" style="color: #f87171; border-color: rgba(239, 68, 68, 0.35);">
                    <i data-lucide="trash-2" class="icon icon-sm"></i> Delete Forever
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;
}

export function bindTrashTabEvents(container, ctx) {
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
    }
    // Trash Panel: Recover to Feed
    container.querySelectorAll('.btn-dash-restore-vac').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const restored = storageService.restoreFromTrash(id);
        if (restored) {
          showConfirmationBanner(
            'Vacancy Restored',
            `Recovered "${restored.title}" back to active feed!`,
            'success',
            2500
          );
          if (this.onStateChanged) ctx.onStateChanged && ctx.onStateChanged();
          ctx.render();
        }
      });
    });

    // Trash Panel: Delete Forever
    container.querySelectorAll('.btn-dash-perm-delete-vac').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        if (confirm('Permanently delete this vacancy from Trash? This cannot be undone.')) {
          storageService.deletePermanentlyFromTrash(id);
          showConfirmationBanner(
            'Permanently Deleted',
            'Item permanently removed from trash.',
            'info',
            2000
          );
          if (this.onStateChanged) ctx.onStateChanged && ctx.onStateChanged();
          ctx.render();
        }
      });
    });

    // Trash Panel: Empty All
    document.getElementById('btnEmptyTrashDash')?.addEventListener('click', () => {
      if (confirm('Empty all trashed vacancies? Note: These vacancies will remain excluded from future scans.')) {
        storageService.emptyTrash();
        showConfirmationBanner('Trash Emptied', 'All items removed from Trash.', 'info', 2000);
        if (this.onStateChanged) ctx.onStateChanged && ctx.onStateChanged();
        ctx.render();
      }
    });

}
