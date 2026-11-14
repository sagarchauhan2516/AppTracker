/**
 * Vacancy Radar India - Feed Controller
 * Manages vacancy feed rendering, card layouts, pagination, filtering, and evidence modals
 */

import { storageService } from '../services/storageService.js';
import { VerificationStatus, SourceCategory } from '../models/types.js';
import { MatchingEngine } from '../engine/matchingEngine.js';
import { DuplicateDetector } from '../engine/duplicateDetector.js';
import { showConfirmationBanner } from '../services/notificationService.js';
import { escapeHtml } from '../utils/htmlUtils.js';

export function resetFilters(app) {
    app.filterState.searchQuery = '';
    app.filterState.sector = 'ALL';
    app.filterState.employmentType = 'ALL';
    app.filterState.verificationStatus = 'ALL';
    app.filterState.location = 'ALL';
    app.filterState.minSalary = 0;
    app.filterState.sortBy = 'relevance';

    const sIn = document.getElementById('searchInput');
    if (sIn) sIn.value = '';
    const btnClr = document.getElementById('btnSearchClear');
    if (btnClr) btnClr.style.display = 'none';

    ['filterSector', 'filterType', 'filterLocation', 'filterMinSalary', 'filterStatus'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = id === 'filterMinSalary' ? '0' : 'ALL';
    });
    const sortEl = document.getElementById('sortBy');
    if (sortEl) sortEl.value = 'relevance';

    app.updateFilterButtonsState();
    app.renderVacancies();
  }

export function updateFilterButtonsState(app) {
    const isAnyActive = 
      Boolean(app.filterState.searchQuery) ||
      app.filterState.sector !== 'ALL' ||
      app.filterState.employmentType !== 'ALL' ||
      app.filterState.verificationStatus !== 'ALL' ||
      app.filterState.location !== 'ALL' ||
      app.filterState.minSalary > 0 ||
      app.filterState.sortBy !== 'relevance';

    const btnReset = document.getElementById('btnResetFilters');
    if (btnReset) btnReset.style.display = isAnyActive ? 'inline-flex' : 'none';

    const activeSecondaryCount = [
      app.filterState.employmentType !== 'ALL',
      app.filterState.location !== 'ALL',
      app.filterState.minSalary > 0,
      app.filterState.verificationStatus !== 'ALL'
    ].filter(Boolean).length;

    const btnToggleText = document.getElementById('btnToggleFiltersText');
    const btnToggle = document.getElementById('btnToggleFilters');
    if (btnToggleText) {
      btnToggleText.textContent = activeSecondaryCount > 0 ? `Filters (${activeSecondaryCount})` : 'Filters';
    }
    if (btnToggle) {
      btnToggle.classList.toggle('has-active', activeSecondaryCount > 0);
    }
  }

export function renderVacancies(app) {
    const container = document.getElementById('vacancyCardsContainer');
    if (!container) return;

    try {
      let list = storageService.getVacancies();
    const activeProfile = storageService.getActiveProfile();
    const now = new Date();

    // Helper to test if a vacancy matches active target focus
    const isTargetMatch = (v) => {
      if (!activeProfile.targetFocus?.enabled) return false;
      const domains = activeProfile.targetFocus.targetDomains || [];
      const orgs = activeProfile.targetFocus.targetOrganisations || [];
      const vDomain = (v.verification?.sourceDomain || '').toLowerCase();
      const vOrg = (v.organisation || '').toLowerCase();
      const vUrls = [
        v.verification?.evidenceUrl || '',
        v.verification?.officialNoticePdfUrl || '',
        v.verification?.applicationUrl || ''
      ].join(' ').toLowerCase();

      const domainMatch = domains.some(d => d && (vDomain.includes(d.toLowerCase()) || vUrls.includes(d.toLowerCase())));
      const orgMatch = orgs.some(o => o && (vOrg.includes(o.toLowerCase()) || o.toLowerCase().includes(vOrg)));
      return Boolean(domainMatch || orgMatch);
    };

    // Helper to test if a vacancy matches candidate profile relevance
    const isProfileMatch = (v) => {
      // 1. Target focus whitelist match (e.g. C-DAC, NFSU, DRDO, CBI, CERT-In)
      if (v.isTargetFocusMatch) return true;

      const titleLower = (v.title || '').toLowerCase();
      const descLower = (v.description || '').toLowerCase() + ' ' + (v.qualifications?.branchRequired || '').toLowerCase();
      const fullText = `${titleLower} ${descLower}`;

      // 2. Direct alignment with candidate's target roles
      const hasRole = (activeProfile.roles || []).some(r => r && titleLower.includes(r.toLowerCase()));
      if (hasRole) return true;

      // 3. Technical domain keyword alignment
      const allKeywords = [
        ...(activeProfile.keywords || []),
        ...(activeProfile.positiveKeywords || [])
      ].filter(Boolean);

      const hasKeyword = allKeywords.some(k => k && fullText.includes(k.toLowerCase()));
      if (hasKeyword) return true;

      // 4. Strong overall score (>= 65) with at least 1 verified forensic, cyber or target role match
      if ((v.matchAnalysis?.overallScore || 0) >= 65 && (v.matchAnalysis?.reasons || []).some(r => {
        const lr = r.toLowerCase();
        return lr.includes('forensic') || lr.includes('cyber') || lr.includes('target role');
      })) {
        return true;
      }

      return false;
    };

    // Dynamically re-evaluate match and eligibility against active profile
    list.forEach(v => {
      v.matchAnalysis = MatchingEngine.evaluateMatch(activeProfile, v);
      v.isTargetFocusMatch = isTargetMatch(v);
      v.isProfileMatch = isProfileMatch(v);
    });

    // Update Segregated Profile Feed Banner Controls
    const profileMatchesCount = list.filter(v => v.isProfileMatch).length;
    const allDiscoveredCount = list.length;

    const segregatedProfileName = document.getElementById('segregatedProfileName');
    if (segregatedProfileName) {
      segregatedProfileName.textContent = activeProfile.name || 'Default Profile';
    }

    const badgeProfileVacCount = document.getElementById('badgeProfileVacCount');
    if (badgeProfileVacCount) {
      badgeProfileVacCount.textContent = `${profileMatchesCount} Match${profileMatchesCount === 1 ? '' : 'es'}`;
    }

    const countProfileOnly = document.getElementById('countProfileOnly');
    if (countProfileOnly) countProfileOnly.textContent = profileMatchesCount;

    const countAllGlobal = document.getElementById('countAllGlobal');
    if (countAllGlobal) countAllGlobal.textContent = allDiscoveredCount;

    const btnFeedProfileOnly = document.getElementById('btnFeedProfileOnly');
    const btnFeedAllGlobal = document.getElementById('btnFeedAllGlobal');
    if (btnFeedProfileOnly && btnFeedAllGlobal) {
      if (app.profileFeedOnly) {
        btnFeedProfileOnly.className = 'btn btn-sm btn-primary';
        btnFeedProfileOnly.style.fontWeight = '700';
        btnFeedProfileOnly.style.boxShadow = '0 2px 8px rgba(56, 189, 248, 0.3)';
        btnFeedAllGlobal.className = 'btn btn-sm btn-ghost';
        btnFeedAllGlobal.style.fontWeight = '600';
        btnFeedAllGlobal.style.color = 'var(--text-secondary)';
        btnFeedAllGlobal.style.boxShadow = 'none';
      } else {
        btnFeedProfileOnly.className = 'btn btn-sm btn-ghost';
        btnFeedProfileOnly.style.fontWeight = '600';
        btnFeedProfileOnly.style.color = 'var(--text-secondary)';
        btnFeedProfileOnly.style.boxShadow = 'none';
        btnFeedAllGlobal.className = 'btn btn-sm btn-primary';
        btnFeedAllGlobal.style.fontWeight = '700';
        btnFeedAllGlobal.style.boxShadow = '0 2px 8px rgba(56, 189, 248, 0.3)';
      }
    }

    // Segregate list: if profileFeedOnly is active, show only profile matches
    if (app.profileFeedOnly) {
      list = list.filter(v => v.isProfileMatch);
    }

    // Handle Target Focus Active Status Banner & Quick Filter
    const bannerContainer = document.getElementById('targetFocusBannerContainer');
    const quickFilterLabel = document.getElementById('lblTargetFocusQuickFilter');
    const chkStrictFocus = document.getElementById('chkStrictTargetFocus');

    if (bannerContainer) {
      if (activeProfile.targetFocus?.enabled) {
        if (quickFilterLabel) quickFilterLabel.style.display = 'inline-flex';
        const tf = activeProfile.targetFocus;
        const targetsCount = (tf.targetDomains?.length || 0) + (tf.targetOrganisations?.length || 0);
        const targetsList = [...(tf.targetDomains || []), ...(tf.targetOrganisations || [])].slice(0, 4).join(', ');
        const isStrict = tf.mode === 'STRICT_TARGET' || (chkStrictFocus && chkStrictFocus.checked);
        if (chkStrictFocus) chkStrictFocus.checked = isStrict;

        bannerContainer.innerHTML = `
          <div class="target-focus-banner">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <i data-lucide="crosshair" class="icon-lg text-emerald"></i>
              <div>
                <strong style="color: #34d399; font-size: 0.95rem;">
                  Target Focus Active: Focusing on ${targetsList}${targetsCount > 4 ? ` +${targetsCount - 4} more` : ''}
                </strong>
                <div style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 0.15rem;">
                  Mode: <strong style="color: var(--text-main);">${isStrict ? 'Strict Whitelist Filter (Only whitelisted portals)' : 'Priority Boost Mode (+15% score bonus & focus badge)'}</strong>
                </div>
              </div>
            </div>
            <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
              <button id="btnBannerEditFocus" class="btn btn-outline btn-sm" style="font-size: 0.75rem;">
                <i data-lucide="sliders" class="icon-xs"></i> Adjust Targets
              </button>
              <button id="btnBannerToggleMode" class="btn btn-outline btn-sm" style="font-size: 0.75rem;">
                ${isStrict ? 'Switch to Boost Mode' : 'Switch to Strict Filter'}
              </button>
            </div>
          </div>
        `;
        if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();

        document.getElementById('btnBannerEditFocus')?.addEventListener('click', () => {
          app.switchTab('profiles');
        });

        document.getElementById('btnBannerToggleMode')?.addEventListener('click', () => {
          tf.mode = isStrict ? 'PRIORITY_BOOST' : 'STRICT_TARGET';
          storageService.saveProfile(activeProfile);
          if (chkStrictFocus) chkStrictFocus.checked = tf.mode === 'STRICT_TARGET';
          app.renderVacancies();
        });
      } else {
        bannerContainer.innerHTML = '';
        if (quickFilterLabel) quickFilterLabel.style.display = 'none';
      }
    }

    // Target Focus strict filtering (if strict mode active or quick checkbox checked)
    const isStrictActive = activeProfile.targetFocus?.enabled && (activeProfile.targetFocus.mode === 'STRICT_TARGET' || (chkStrictFocus && chkStrictFocus.checked));
    if (isStrictActive) {
      list = list.filter(v => v.isTargetFocusMatch);
    }

    // Filter by tab if "closing"
    if (app.currentTab === 'closing') {
      list = list.filter(v => {
        if (!v.dates?.closingDate) return false;
        const d = new Date(v.dates.closingDate);
        const diff = Math.ceil((d - now) / (1000 * 60 * 60 * 24));
        return diff >= 0 && diff <= 7;
      });
    }

    // Apply Filter state
    if (app.filterState.sector !== 'ALL') {
      list = list.filter(v => v.sector === app.filterState.sector);
    }
    if (app.filterState.employmentType !== 'ALL') {
      list = list.filter(v => v.employmentType === app.filterState.employmentType);
    }
    if (app.filterState.verificationStatus !== 'ALL') {
      list = list.filter(v => v.verification?.status === app.filterState.verificationStatus);
    }

    // Location filter
    if (app.filterState.location && app.filterState.location !== 'ALL') {
      if (app.filterState.location === 'REMOTE') {
        list = list.filter(v => v.location?.isRemote);
      } else {
        list = list.filter(v => 
          (v.location?.state && v.location.state.toLowerCase().includes(app.filterState.location.toLowerCase())) ||
          (v.location?.city && v.location.city.toLowerCase().includes(app.filterState.location.toLowerCase()))
        );
      }
    }

    // Minimum Salary Filter
    if (app.filterState.minSalary > 0) {
      list = list.filter(v => (v.remuneration?.minAnnualInr || 0) >= app.filterState.minSalary);
    }

    if (app.filterState.searchQuery) {
      const q = app.filterState.searchQuery;
      list = list.filter(v => 
        (v.title && v.title.toLowerCase().includes(q)) ||
        (v.organisation && v.organisation.toLowerCase().includes(q)) ||
        (v.advertisementNumber && v.advertisementNumber.toLowerCase().includes(q)) ||
        (v.location?.city && v.location.city.toLowerCase().includes(q)) ||
        (v.location?.state && v.location.state.toLowerCase().includes(q))
      );
    }

    // Duplicate detection and suppression
    if (app.filterState.deduplicate) {
      const dedupResult = DuplicateDetector.processDuplicates(list);
      list = dedupResult.canonicalVacancies;
    }

    // Sort
    if (app.filterState.sortBy === 'relevance') {
      list.sort((a, b) => (b.matchAnalysis?.overallScore || 0) - (a.matchAnalysis?.overallScore || 0));
    } else if (app.filterState.sortBy === 'deadline') {
      list.sort((a, b) => new Date(a.dates?.closingDate || '2099-01-01') - new Date(b.dates?.closingDate || '2099-01-01'));
    } else if (app.filterState.sortBy === 'published') {
      list.sort((a, b) => new Date(b.dates?.publishedAt || 0) - new Date(a.dates?.publishedAt || 0));
    }

    if (list.length === 0) {
      const paginationEl = document.getElementById('vacancyPaginationContainer');
      if (paginationEl) paginationEl.style.display = 'none';

      container.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 3rem; text-align: center; color: var(--text-secondary); background: var(--bg-surface); border-radius: var(--radius-lg); border: 1px dashed var(--border-subtle);">
          <p style="font-size: 1.1rem; margin-bottom: 0.5rem;">No vacancies match your current filter criteria.</p>
          <span style="font-size: 0.85rem; color: var(--text-muted);">
            ${isStrictActive ? 'Note: Strict Target Focus is active. Try adjusting your target website whitelist or turning off strict focus.' : 'Try adjusting your sector, location, minimum salary, or verification filter.'}
          </span>
        </div>
      `;
      return;
    }

    const totalItems = list.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / app.pageSize));
    if (app.currentPage > totalPages) app.currentPage = totalPages;
    if (app.currentPage < 1) app.currentPage = 1;

    const startIndex = (app.currentPage - 1) * app.pageSize;
    const endIndex = Math.min(startIndex + app.pageSize, totalItems);
    const pagedList = list.slice(startIndex, endIndex);

    const testCount = list.filter(v => v.isTestData).length;
    const testNotice = testCount > 0 ? `
      <div style="grid-column: 1 / -1; margin-bottom: 0.5rem; background: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.35); border-radius: var(--radius-md); padding: 0.85rem 1.15rem; display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap;">
        <div style="font-size: 0.82rem; color: #fbbf24; line-height: 1.4; display: flex; align-items: flex-start; gap: 0.45rem;">
          <i data-lucide="alert-triangle" class="icon-sm text-amber" style="margin-top: 2px;"></i>
          <div>
            <strong>Showing Prototype / Demonstration Data (${testCount} items).</strong><br>
            <span style="color: var(--text-secondary); font-size: 0.76rem;">Pull verified vacancies from your cloud database or run a live scan to view real government posts.</span>
          </div>
        </div>
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
          <button id="btnQuickPullRealFromSheets" class="btn btn-primary btn-sm" style="font-size: 0.78rem; font-weight: 600;"><i data-lucide="download" class="icon-xs"></i> Pull from Google Sheets</button>
          <button id="btnQuickPurgeTestData" class="btn btn-outline btn-sm" style="font-size: 0.78rem; border-color: rgba(239, 68, 68, 0.35); color: #f87171;"><i data-lucide="trash-2" class="icon-xs"></i> Purge Test Data</button>
        </div>
      </div>
    ` : '';

    container.innerHTML = testNotice + pagedList.map(v => app.renderVacancyCard(v, now)).join('');
    if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
    app.renderPagination(totalItems, totalPages, startIndex, endIndex);

    // Attach listeners for test data banner
    document.getElementById('btnQuickPullRealFromSheets')?.addEventListener('click', async () => {
      const webhookUrl = storageService.getProviderConfig()?.googleAppsScriptWebhookUrl?.trim();
      if (!webhookUrl) {
        showConfirmationBanner('Webhook Needed', 'Please enter and test your Google Apps Script Webhook URL first in Dashboard.', 'warning', 3000);
        app.openUnifiedDashboardModal();
        return;
      }
      const btn = document.getElementById('btnQuickPullRealFromSheets');
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '⏳ Pulling...';
      }
      await app.pullRealVacanciesQuietly(webhookUrl);
      app.refreshAll();
    });

    document.getElementById('btnQuickPurgeTestData')?.addEventListener('click', () => {
      storageService.purgeTestData();
      app.refreshAll();
    });

    // Attach card event listeners
    container.querySelectorAll('.btn-evidence').forEach(btn => {
      btn.addEventListener('click', () => {
        const vacId = btn.getAttribute('data-id');
        app.openEvidenceModal(vacId);
      });
    });

    container.querySelectorAll('.btn-track').forEach(btn => {
      btn.addEventListener('click', () => {
        const vacId = btn.getAttribute('data-id');
        app.openApplicationModal(vacId);
      });
    });

    container.querySelectorAll('.btn-delete-vacancy').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const vacId = btn.getAttribute('data-id');
        const vac = list.find(v => v.id === vacId);
        const title = vac?.title || 'Vacancy';
        if (confirm(`Move "${title}" to Trash?\n\nThis will remove it from your feeds and automatically suppress it from reappearing in all upcoming scans. You can restore it anytime from Trash.`)) {
          storageService.moveToTrash(vacId);
          app.refreshAll();
        }
      });
    });
  } catch (err) {
    console.error('[VacancyRadar Feed Error Boundary]:', err);
    container.innerHTML = `
      <div class="dash-card-elevated" style="grid-column: 1 / -1; text-align: center; padding: 2.5rem 1.5rem; margin: 1.5rem 0;">
        <div style="margin-bottom: 0.5rem;"><i data-lucide="alert-triangle" class="icon-xl text-amber"></i></div>
        <h3 style="font-family: var(--font-heading); color: #f87171; margin-bottom: 0.4rem;">Feed Rendering Notice</h3>
        <p style="font-size: 0.85rem; color: var(--text-secondary); max-width: 480px; margin: 0 auto 1.25rem;">
          An unexpected error occurred while processing vacancy cards (${escapeHtml(err.message)}).
        </p>
        <div style="display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap;">
          <button id="btnRecoverFeed" class="btn btn-primary btn-sm"><i data-lucide="refresh-cw" class="icon-xs"></i> Reload Feed</button>
          <button id="btnRecoverResetFilters" class="btn btn-outline btn-sm"><i data-lucide="rotate-ccw" class="icon-xs"></i> Reset Filters</button>
        </div>
      </div>
    `;
    if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
    document.getElementById('btnRecoverFeed')?.addEventListener('click', () => app.renderVacancies());
    document.getElementById('btnRecoverResetFilters')?.addEventListener('click', () => app.resetFilters());
  }
}

export function renderPagination(app, totalItems, totalPages, startIndex, endIndex) {
    const paginationEl = document.getElementById('vacancyPaginationContainer');
    if (!paginationEl) return;

    if (totalItems <= 0) {
      paginationEl.style.display = 'none';
      return;
    }

    paginationEl.style.display = 'flex';

    const currentPage = app.currentPage;
    let pageNumbers = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
    } else {
      if (currentPage <= 4) {
        pageNumbers = [1, 2, 3, 4, 5, '...', totalPages];
      } else if (currentPage >= totalPages - 3) {
        pageNumbers = [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
      } else {
        pageNumbers = [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
      }
    }

    const pagesHtml = pageNumbers.map(p => {
      if (p === '...') {
        return `<span class="pagination-ellipsis">&hellip;</span>`;
      }
      const isActive = p === currentPage;
      return `<button type="button" class="pagination-btn ${isActive ? 'active' : ''}" data-page="${p}" ${isActive ? 'disabled' : ''}>${p}</button>`;
    }).join('');

    paginationEl.innerHTML = `
      <div class="pagination-info">
        <span>Showing <strong>${startIndex + 1}–${endIndex}</strong> of <strong>${totalItems}</strong> vacancies</span>
        <span style="opacity: 0.6;">•</span>
        <span>Page <strong>${currentPage}</strong> of <strong>${totalPages}</strong></span>
      </div>
      <div class="pagination-controls-wrap">
        <label style="display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.8rem; color: var(--text-secondary);">
          <span>Per page:</span>
          <select id="selectPageSize" class="pagination-size-select">
            <option value="12" ${app.pageSize === 12 ? 'selected' : ''}>12</option>
            <option value="24" ${app.pageSize === 24 ? 'selected' : ''}>24</option>
            <option value="48" ${app.pageSize === 48 ? 'selected' : ''}>48</option>
            <option value="100" ${app.pageSize === 100 ? 'selected' : ''}>100</option>
          </select>
        </label>
        <div class="pagination-nav">
          <button type="button" class="pagination-btn" id="btnPageFirst" title="First Page" ${currentPage === 1 ? 'disabled' : ''}>&laquo;</button>
          <button type="button" class="pagination-btn" id="btnPagePrev" title="Previous Page" ${currentPage === 1 ? 'disabled' : ''}>&lsaquo;</button>
          ${pagesHtml}
          <button type="button" class="pagination-btn" id="btnPageNext" title="Next Page" ${currentPage === totalPages ? 'disabled' : ''}>&rsaquo;</button>
          <button type="button" class="pagination-btn" id="btnPageLast" title="Last Page" ${currentPage === totalPages ? 'disabled' : ''}>&raquo;</button>
        </div>
      </div>
    `;

    // Bind page change events
    paginationEl.querySelectorAll('.pagination-btn[data-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        const p = parseInt(btn.getAttribute('data-page'), 10);
        if (p && p !== app.currentPage) {
          app.currentPage = p;
          app.renderVacancies();
          document.getElementById('vacancyCardsContainer')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });

    document.getElementById('btnPageFirst')?.addEventListener('click', () => {
      if (app.currentPage > 1) {
        app.currentPage = 1;
        app.renderVacancies();
        document.getElementById('vacancyCardsContainer')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });

    document.getElementById('btnPagePrev')?.addEventListener('click', () => {
      if (app.currentPage > 1) {
        app.currentPage--;
        app.renderVacancies();
        document.getElementById('vacancyCardsContainer')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });

    document.getElementById('btnPageNext')?.addEventListener('click', () => {
      if (app.currentPage < totalPages) {
        app.currentPage++;
        app.renderVacancies();
        document.getElementById('vacancyCardsContainer')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });

    document.getElementById('btnPageLast')?.addEventListener('click', () => {
      if (app.currentPage < totalPages) {
        app.currentPage = totalPages;
        app.renderVacancies();
        document.getElementById('vacancyCardsContainer')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });

    document.getElementById('selectPageSize')?.addEventListener('change', (e) => {
      app.pageSize = parseInt(e.target.value, 10) || 12;
      app.currentPage = 1;
      app.renderVacancies();
      document.getElementById('vacancyCardsContainer')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

export function renderVacancyCard(app, vac, now) {
    const status = vac.verification?.status || VerificationStatus.UNVERIFIED_LEAD;
    const badgeLabel = app.formatVerificationBadge(status);
    
    // Deadline calculation & Reference Source URL
    let deadlineHtml = '';
    const referenceUrl = vac.verification?.evidenceUrl || vac.verification?.sourceUrl || vac.sourceUrl || vac.verification?.officialNoticePdfUrl || '';
    let referenceDomain = vac.verification?.sourceDomain || vac.domain || '';
    if (!referenceDomain && referenceUrl) {
      try { referenceDomain = new URL(referenceUrl).hostname.replace(/^www\./i, ''); } catch (_) {}
    }
    let isClosed = false;

    if (vac.dates?.closingDate) {
      const close = new Date(vac.dates.closingDate);
      const diffDays = Math.ceil((close - now) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) {
        isClosed = true;
        deadlineHtml = `<span class="deadline-indicator" style="background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.35); font-weight: 600;"><i data-lucide="clock" class="icon-xs"></i> Closed on ${vac.dates.closingDate}</span>`;
      } else if (diffDays <= 7) {
        deadlineHtml = `<span class="deadline-indicator urgent"><i data-lucide="alert-triangle" class="icon-xs"></i> Closes in ${diffDays} day${diffDays === 1 ? '' : 's'} (${vac.dates.closingDate})</span>`;
      } else {
        deadlineHtml = `<span class="deadline-indicator">Closes: ${vac.dates.closingDate} (${diffDays} days left)</span>`;
      }
    }

    const testFlagHtml = vac.isTestData ? `<span class="badge-test-flag">[TEST DATA]</span>` : '';
    const liveFlagHtml = vac.isLiveDiscovered ? `<span class="meta-pill" style="background: rgba(16, 185, 129, 0.22); color: #34d399; border-color: rgba(16, 185, 129, 0.45); font-weight: 700;"><i data-lucide="radio" class="icon-xs"></i> LIVE DISCOVERED</span>` : '';
    const locationText = vac.location ? `${vac.location.city || ''}, ${vac.location.state || ''} ${vac.location.isRemote ? '• Remote' : ''}` : 'Location Unspecified';
    const matchScore = vac.matchAnalysis?.overallScore || 0;
    const matchLabel = app.formatEligibilityLabel(vac.matchAnalysis?.eligibilityStatus);
    const topReason = vac.matchAnalysis?.reasons?.[0] || 'Keyword and qualification requirements evaluated.';
    const duplicateBadge = vac.hasDuplicatesMerged ? `<span class="meta-pill" style="color: #60a5fa; border-color: rgba(59, 130, 246, 0.4);"><i data-lucide="copy" class="icon-xs"></i> Duplicate Merged</span>` : '';
    const targetFocusBadge = vac.isTargetFocusMatch ? `<span class="meta-pill" style="background: rgba(16, 185, 129, 0.22); color: #34d399; border-color: rgba(16, 185, 129, 0.45); font-weight: 700;"><i data-lucide="crosshair" class="icon-xs"></i> TARGET FOCUS</span>` : '';
    const corrigendumBadge = vac.isCorrigendum ? `<span class="meta-pill" style="color: #f59e0b; border-color: rgba(245, 158, 11, 0.45); font-weight: 700;"><i data-lucide="file-text" class="icon-xs"></i> CORRIGENDUM</span>` : '';
    const extensionBadge = vac.isExtension ? `<span class="meta-pill" style="color: #34d399; border-color: rgba(16, 185, 129, 0.45); font-weight: 700;"><i data-lucide="clock" class="icon-xs"></i> DATE EXTENDED</span>` : '';

    return `
      <article class="vacancy-card" id="card-${vac.id}">
        <div>
          <div class="card-top">
            <span class="org-name">${app.escapeHtml(vac.organisation)}</span>
            <div style="display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap;">
              ${liveFlagHtml}
              ${targetFocusBadge}
              ${corrigendumBadge}
              ${extensionBadge}
              ${testFlagHtml}
              ${duplicateBadge}
              <span class="verification-badge badge-${status}">${badgeLabel}</span>
            </div>
          </div>

          <h2 class="job-title">${app.escapeHtml(vac.title)}</h2>
          <div class="advt-ref">
            Advt: ${app.escapeHtml(vac.advertisementNumber || 'Notice Ref Not Stated')} • ${vac.numberOfPosts ? vac.numberOfPosts + ' Posts' : 'Posts TBA'}
            ${vac.dates?.publishedAt ? ` • Published: ${vac.dates.publishedAt}` : ''}
          </div>

          <div class="meta-pills">
            <span class="meta-pill"><i data-lucide="building-2" class="icon-xs"></i> <strong>${app.escapeHtml(vac.sector || 'Public')}</strong></span>
            <span class="meta-pill"><i data-lucide="briefcase" class="icon-xs"></i> <strong>${app.escapeHtml(vac.employmentType || 'Full-time')}</strong></span>
            <span class="meta-pill"><i data-lucide="map-pin" class="icon-xs"></i> ${app.escapeHtml(locationText)}</span>
            ${vac.remuneration?.amountText ? `<span class="meta-pill"><i data-lucide="indian-rupee" class="icon-xs"></i> ${app.escapeHtml(vac.remuneration.amountText)}</span>` : ''}
          </div>

          <div class="match-box">
            <div class="match-header">
              <span style="font-weight: 600;">Match Assessment: ${matchLabel}</span>
              <span class="match-score-badge">${matchScore}% Match</span>
            </div>
            <p class="match-reason">${app.escapeHtml(topReason)}</p>
            ${vac.matchAnalysis?.whyMatchedSnippet ? `
              <div class="match-audit-snippet" style="margin-top: 0.35rem; font-size: 0.76rem; font-family: monospace; background: rgba(59, 130, 246, 0.08); padding: 0.3rem 0.6rem; border-radius: 4px; border-left: 3px solid ${matchScore >= 70 ? '#10b981' : (matchScore >= 45 ? '#f59e0b' : '#ef4444')}; color: var(--text-primary); word-break: break-word;">
                ${app.escapeHtml(vac.matchAnalysis.whyMatchedSnippet)}
              </div>
            ` : ''}
          </div>
        </div>

        <div class="card-actions" style="flex-wrap: wrap; gap: 0.6rem; justify-content: space-between; align-items: center;">
          <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
            ${deadlineHtml}
            ${referenceDomain ? `
              <span class="meta-pill" style="font-size: 0.74rem; background: rgba(59, 130, 246, 0.08); border-color: rgba(59, 130, 246, 0.25);">
                Source: <strong style="color: #60a5fa;">${app.escapeHtml(referenceDomain)}</strong>
              </span>
            ` : ''}
          </div>

          <div class="action-buttons" style="flex-wrap: wrap; align-items: center; gap: 0.4rem;">
            ${vac.verification?.officialNoticePdfUrl ? `
              <a href="${vac.verification.officialNoticePdfUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm" title="View Official Notification PDF">
                <i data-lucide="file-text" class="icon-xs"></i> PDF
              </a>
            ` : ''}
            ${vac.verification?.applicationUrl ? `
              <a href="${vac.verification.applicationUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm" style="color: #60a5fa;" title="Official Application Portal">
                <i data-lucide="external-link" class="icon-xs"></i> Apply
              </a>
            ` : ''}
            ${referenceUrl ? `
              <a href="${referenceUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm" style="color: ${isClosed ? '#f87171' : '#38bdf8'}; border-color: ${isClosed ? 'rgba(239, 68, 68, 0.45)' : 'rgba(56, 189, 248, 0.45)'}; font-weight: 600;" title="Visit reference source website (${referenceDomain || 'portal'}) to verify details">
                ${isClosed ? '<i data-lucide="search" class="icon-xs"></i> Check Source Site' : '<i data-lucide="external-link" class="icon-xs"></i> Visit Source Site'}
              </a>
            ` : ''}
            <button class="btn btn-outline btn-sm btn-evidence" data-id="${vac.id}">Evidence</button>
            <button class="btn btn-primary btn-sm btn-track" data-id="${vac.id}">Track</button>
            <button class="btn btn-outline btn-sm btn-delete-vacancy" data-id="${vac.id}" title="Move to Trash (Suppresses from future searches)" style="color: #f87171; border-color: rgba(239, 68, 68, 0.35);"><i data-lucide="trash-2" class="icon-xs"></i> Delete</button>
          </div>
        </div>
      </article>
    `;
  }

export function formatVerificationBadge(status) {
    switch (status) {
      case VerificationStatus.OFFICIALLY_VERIFIED:
        return '<i data-lucide="shield-check" class="icon-xs"></i> OFFICIALLY VERIFIED';
      case VerificationStatus.CROSS_CHECKED:
        return '<i data-lucide="link" class="icon-xs"></i> CROSS-CHECKED';
      case VerificationStatus.UNVERIFIED_LEAD:
        return '<i data-lucide="alert-triangle" class="icon-xs"></i> UNVERIFIED LEAD';
      case VerificationStatus.VERIFICATION_FAILED:
        return '<i data-lucide="x-circle" class="icon-xs"></i> VERIFICATION FAILED';
      case VerificationStatus.EXPIRED_CLOSED:
        return '<i data-lucide="clock" class="icon-xs"></i> EXPIRED / CLOSED';
      default:
        return status;
    }
  }

export function formatEligibilityLabel(status) {
    switch (status) {
      case 'LIKELY_ELIGIBLE':
        return '<span style="color: #34d399;">Likely Eligible</span>';
      case 'POTENTIAL_MATCH':
        return '<span style="color: #fbbf24;">Potential Match (Verify Terms)</span>';
      case 'APPEARS_INELIGIBLE':
        return '<span style="color: #f87171;">Appears Ineligible</span>';
      default:
        return '<span style="color: #94a3b8;">Insufficient Info</span>';
    }
  }

export function openEvidenceModal(app, vacId) {
    const list = storageService.getVacancies();
    const vac = list.find(v => v.id === vacId);
    if (!vac) return;

    // Run live verification audit
    const audit = VerificationEngine.auditVacancy(vac);
    const modalBody = document.getElementById('modalBody');
    const ver = vac.verification || {};

    const fc = audit.fieldConfidence || {};

    modalBody.innerHTML = `
      <div style="margin-bottom: 1.5rem;">
        <div style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.5rem;">
          ${vac.isTestData ? '<span class="badge-test-flag">[TEST DATA]</span>' : ''}
          <span class="verification-badge badge-${audit.status}">${app.formatVerificationBadge(audit.status)}</span>
        </div>
        <h2 style="font-family: var(--font-heading); font-size: 1.4rem; color: var(--text-main);">${app.escapeHtml(vac.title)}</h2>
        <p style="color: var(--text-secondary); font-size: 0.9rem;">${app.escapeHtml(vac.organisation)} • Advt: <code>${app.escapeHtml(vac.advertisementNumber || 'N/A')}</code></p>
      </div>

      <!-- Field Level Confidence Meters -->
      <div style="background: var(--bg-surface-elevated); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 1.25rem; margin-bottom: 1.5rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
          <h4 style="font-size: 0.85rem; text-transform: uppercase; color: var(--accent-primary); letter-spacing: 0.05em;">Field-Level Evidence Confidence</h4>
          <span style="font-family: var(--font-mono); font-weight: 700; color: #34d399;">Composite: ${Math.round(audit.confidenceScore * 100)}%</span>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.75rem; font-size: 0.8rem;">
          <div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.2rem; color: var(--text-secondary);">
              <span>Employer Domain:</span>
              <strong style="color: var(--text-main);">${Math.round((fc.organisation || 0) * 100)}%</strong>
            </div>
            <div style="height: 4px; background: rgba(255,255,255,0.08); border-radius: 2px; overflow: hidden;">
              <div style="width: ${(fc.organisation || 0) * 100}%; height: 100%; background: #34d399;"></div>
            </div>
          </div>

          <div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.2rem; color: var(--text-secondary);">
              <span>Advt Ref &amp; Title:</span>
              <strong style="color: var(--text-main);">${Math.round((fc.title || 0) * 100)}%</strong>
            </div>
            <div style="height: 4px; background: rgba(255,255,255,0.08); border-radius: 2px; overflow: hidden;">
              <div style="width: ${(fc.title || 0) * 100}%; height: 100%; background: #34d399;"></div>
            </div>
          </div>

          <div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.2rem; color: var(--text-secondary);">
              <span>Closing Deadline:</span>
              <strong style="color: var(--text-main);">${Math.round((fc.dates || 0) * 100)}%</strong>
            </div>
            <div style="height: 4px; background: rgba(255,255,255,0.08); border-radius: 2px; overflow: hidden;">
              <div style="width: ${(fc.dates || 0) * 100}%; height: 100%; background: #60a5fa;"></div>
            </div>
          </div>

          <div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.2rem; color: var(--text-secondary);">
              <span>Direct Links:</span>
              <strong style="color: var(--text-main);">${Math.round((fc.officialLinks || 0) * 100)}%</strong>
            </div>
            <div style="height: 4px; background: rgba(255,255,255,0.08); border-radius: 2px; overflow: hidden;">
              <div style="width: ${(fc.officialLinks || 0) * 100}%; height: 100%; background: #34d399;"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Confirmed Facts vs Uncertainties -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
        <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: var(--radius-md); padding: 1rem;">
          <h4 style="font-size: 0.8rem; text-transform: uppercase; color: #34d399; margin-bottom: 0.5rem; font-weight: 700; display: flex; align-items: center; gap: 0.35rem;">
            <i data-lucide="check-circle-2" class="icon-xs text-emerald"></i> Confirmed Evidence Facts (${audit.confirmedFacts.length})
          </h4>
          <ul style="font-size: 0.8rem; padding-left: 1.2rem; color: var(--text-main); line-height: 1.5;">
            ${audit.confirmedFacts.map(f => `<li>${app.escapeHtml(f)}</li>`).join('')}
          </ul>
        </div>

        <div style="background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.2); border-radius: var(--radius-md); padding: 1rem;">
          <h4 style="font-size: 0.8rem; text-transform: uppercase; color: #fbbf24; margin-bottom: 0.5rem; font-weight: 700; display: flex; align-items: center; gap: 0.35rem;">
            <i data-lucide="alert-triangle" class="icon-xs text-amber"></i> Unverified / Uncertain Fields (${audit.uncertainFields.length})
          </h4>
          ${audit.uncertainFields.length > 0 ? `
            <ul style="font-size: 0.8rem; padding-left: 1.2rem; color: var(--text-secondary); line-height: 1.5;">
              ${audit.uncertainFields.map(u => `<li>${app.escapeHtml(u)}</li>`).join('')}
            </ul>
          ` : '<p style="font-size: 0.8rem; color: var(--text-muted);">None. All primary parameters confirmed against official notice.</p>'}
        </div>
      </div>

      <!-- Official Links -->
      <div style="margin-bottom: 1.5rem;">
        <h4 style="font-size: 0.85rem; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.75rem; letter-spacing: 0.05em;">Official Notices &amp; Portals</h4>
        <div style="display: flex; flex-direction: column; gap: 0.5rem;">
          ${ver.officialNoticePdfUrl ? `
            <a href="${ver.officialNoticePdfUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-outline" style="justify-content: flex-start; gap: 0.5rem;">
              <i data-lucide="file-text" class="icon-sm"></i> Download / View Official Notification PDF
            </a>
          ` : '<span style="color: var(--text-muted); font-size: 0.85rem; display: flex; align-items: center; gap: 0.35rem;"><i data-lucide="alert-circle" class="icon-xs text-amber"></i> No official notification PDF linked yet.</span>'}

          ${ver.applicationUrl ? `
            <a href="${ver.applicationUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-primary" style="justify-content: flex-start; gap: 0.5rem;">
              <i data-lucide="external-link" class="icon-sm"></i> Official Application Portal Gateway
            </a>
          ` : '<span style="color: var(--text-muted); font-size: 0.85rem; display: flex; align-items: center; gap: 0.35rem;"><i data-lucide="alert-circle" class="icon-xs text-amber"></i> Direct official application portal link not confirmed.</span>'}

          ${ver.evidenceUrl ? `
            <a href="${ver.evidenceUrl}" target="_blank" rel="noopener noreferrer" style="font-size: 0.8rem; color: var(--accent-primary); text-decoration: underline; margin-top: 0.25rem;">
              View Discovered Origin URL (${app.escapeHtml(ver.sourceDomain || 'Web')})
            </a>
          ` : ''}
        </div>
      </div>

      <!-- Eligibility Breakdown -->
      <div style="background: rgba(30, 41, 59, 0.3); border-radius: var(--radius-md); padding: 1.25rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
          <h4 style="font-size: 0.85rem; text-transform: uppercase; color: var(--text-muted);">Match Assessment &amp; Rationale</h4>
          <span style="font-size: 0.85rem; font-weight: 700; color: var(--accent-primary);">${vac.matchAnalysis?.overallScore || 0}% Score</span>
        </div>
        <ul style="font-size: 0.85rem; padding-left: 1.2rem; color: var(--text-secondary); line-height: 1.6;">
          ${(vac.matchAnalysis?.reasons || []).map(r => `<li>${app.escapeHtml(r)}</li>`).join('')}
          ${(vac.matchAnalysis?.warnings || []).map(w => `<li style="color: #fbbf24;"><i data-lucide="alert-triangle" class="icon-xs text-amber"></i> ${app.escapeHtml(w)}</li>`).join('')}
          ${(vac.matchAnalysis?.missingFields || []).map(m => `<li style="color: #94a3b8;"><i data-lucide="info" class="icon-xs"></i> Missing: ${app.escapeHtml(m)}</li>`).join('')}
        </ul>
      </div>
    `;

    document.getElementById('evidenceModal').classList.add('active');
    if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
  }
  }
