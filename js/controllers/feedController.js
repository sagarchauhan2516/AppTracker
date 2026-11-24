/**
 * Vacancy Radar India - Feed Controller
 * Manages vacancy feed rendering, card layouts, pagination, filtering, and evidence modals
 */

import { storageService } from '../services/storageService.js';
import { VerificationStatus, SourceCategory } from '../models/types.js';
import { MatchingEngine } from '../engine/matchingEngine.js';
import { DuplicateDetector } from '../engine/duplicateDetector.js';
import { VerificationEngine } from '../engine/verificationEngine.js';
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
      const includeExpired = app.filterState.verificationStatus === VerificationStatus.EXPIRED_CLOSED;
      let list;
      let alreadyDeduplicated = false;
      if (typeof app.getCanonicalVacancies === 'function') {
        list = app.getCanonicalVacancies({ includeExpired }).vacancies;
        alreadyDeduplicated = true;
      } else {
        list = storageService.getVacancies();
      }
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
      const titleLower = (v.title || '').toLowerCase();
      const descLower = (v.description || '').toLowerCase() + ' ' + (v.qualifications?.branchRequired || '').toLowerCase() + ' ' + (v.extractedSnippet || '').toLowerCase();
      const fullText = `${titleLower} ${descLower}`;

      // Guard: exclude clearly unrelated clinical/clerical/accounts roles unless targeted by active profile
      const profileText = [
        ...(activeProfile.roles || []),
        ...(activeProfile.keywords || []),
        ...(activeProfile.positiveKeywords || [])
      ].join(' ').toLowerCase();
      const isNonTechClinicalOrClerical = /\b(medical\s+officer|medical\s+consultant|pharmacist|staff\s+nurse|nursing|ayurvedic|homeopathy|dental|radiographer|physiotherapist|hindi\s+translator|rajbhasha|watch\s*&?\s*ward|driver|peon|mts|cook|sanitary|gardener|accounts?\s+officer|finance\s+officer|chartered\s+accountant)\b/i.test(titleLower);
      if (isNonTechClinicalOrClerical && !/\b(medical|pharma|nurse|account|finance|hindi|driver)\b/.test(profileText)) {
        return false;
      }

      // 1. Target focus whitelist match (e.g. C-DAC, NFSU, DRDO, CBI, CERT-In)
      if (v.isTargetFocusMatch) return true;

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

      // 4. Broad technical government posts suitable for Computer Engineering / IT graduates
      const isGovtTechnical = /(?:project\s*engineer|scientist\s*['"]?[bcdef]?|scientific\s*officer|technical\s*officer|systems?\s*engineer|software|programmer|it\s*officer|technical\s*assistant|cyber\s*security|digital\s*forensic|information\s*technology|computer\s*science|developer)/i.test(fullText);
      if (isGovtTechnical) return true;

      // 5. Strong overall score (>= 60)
      if ((v.matchAnalysis?.overallScore || 0) >= 60) {
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
      btnFeedProfileOnly.className = app.profileFeedOnly ? 'btn btn-sm seg-btn active' : 'btn btn-sm seg-btn';
      btnFeedAllGlobal.className = app.profileFeedOnly ? 'btn btn-sm seg-btn' : 'btn btn-sm seg-btn active';
      if (typeof btnFeedProfileOnly.removeAttribute === 'function') btnFeedProfileOnly.removeAttribute('style');
      if (typeof btnFeedAllGlobal.removeAttribute === 'function') btnFeedAllGlobal.removeAttribute('style');
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
            <div class="target-focus-meta">
              <i data-lucide="crosshair" class="icon-lg text-emerald"></i>
              <div>
                <strong class="target-focus-title">
                  Target focus active: ${app.escapeHtml(targetsList)}${targetsCount > 4 ? ` +${targetsCount - 4} more` : ''}
                </strong>
                <div class="target-focus-sub">
                  Mode: <strong>${isStrict ? 'Strict whitelist (only target portals)' : 'Priority boost (+15% relevance score)'}</strong>
                </div>
              </div>
            </div>
            <div class="target-focus-actions">
              <button id="btnBannerEditFocus" class="btn btn-outline btn-sm">
                <i data-lucide="sliders" class="icon-xs"></i> Adjust targets
              </button>
              <button id="btnBannerToggleMode" class="btn btn-outline btn-sm">
                ${isStrict ? 'Switch to boost' : 'Switch to strict'}
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
        const closeStr = String(v.dates?.closingDate || '').slice(0, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(closeStr)) return false;
        const d = new Date(`${closeStr}T23:59:59`);
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

    // Duplicate detection and suppression (skipped if already applied by getCanonicalVacancies)
    if (!alreadyDeduplicated && app.filterState.deduplicate) {
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

    // Calendar Deadline Reminder Export
    container.querySelectorAll('.btn-calendar-reminder').forEach(btn => {
      btn.addEventListener('click', () => {
        const vacId = btn.getAttribute('data-id');
        const vac = list.find(v => v.id === vacId);
        if (!vac || !vac.dates?.closingDate) return;

        const title = encodeURIComponent(`[Deadline] ${vac.title} - ${vac.organisation}`);
        const cleanDate = vac.dates.closingDate.replace(/-/g, '');
        const dates = `${cleanDate}T090000Z/${cleanDate}T180000Z`;
        const details = encodeURIComponent(
          `Application closing deadline for: ${vac.title}\n` +
          `Employer: ${vac.organisation}\n` +
          `Advt Ref: ${vac.advertisementNumber || 'N/A'}\n` +
          `Official Apply Link: ${vac.verification?.applicationUrl || vac.sourceUrl}\n` +
          `Verification Evidence: ${vac.verification?.evidenceUrl || vac.sourceUrl}`
        );
        const calUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}`;
        window.open(calUrl, '_blank');
        showConfirmationBanner('Calendar Reminder', `Opened Google Calendar event for ${vac.dates.closingDate}.`, 'success', 3000);
      });
    });

    // 1-Click Telegram Single Vacancy Alert
    container.querySelectorAll('.btn-telegram-single').forEach(btn => {
      btn.addEventListener('click', async () => {
        const vacId = btn.getAttribute('data-id');
        const vac = list.find(v => v.id === vacId);
        if (!vac) return;

        btn.disabled = true;
        const originalHtml = btn.innerHTML;
        btn.innerHTML = `<span style="font-size: 0.7rem;">Sending...</span>`;

        try {
          const res = await fetch('/api/send-telegram', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              vacancy: vac,
              chatId: activeProfile?.scheduleSettings?.telegramChatId || undefined
            })
          });
          const data = await res.json();
          btn.disabled = false;
          btn.innerHTML = originalHtml;

          if (data.success) {
            showConfirmationBanner('Telegram Alert Sent', `Delivered "${vac.title}" to your Telegram bot!`, 'success', 3000);
          } else {
            showConfirmationBanner('Telegram Notice', data.message || 'Check your bot token & chat ID in Profile Settings.', 'warning', 4000);
          }
        } catch (err) {
          btn.disabled = false;
          btn.innerHTML = originalHtml;
          showConfirmationBanner('Telegram Failed', err.message, 'warning', 3500);
        }
      });
    });

    // AI Deep Inspect Notice PDF
    container.querySelectorAll('.btn-inspect-pdf').forEach(btn => {
      btn.addEventListener('click', async () => {
        const vacId = btn.getAttribute('data-id');
        const vac = list.find(v => v.id === vacId);
        const pdfUrl = vac?.verification?.officialNoticePdfUrl || vac?.sourceUrl;
        if (!vac || !pdfUrl) return;

        btn.disabled = true;
        const originalHtml = btn.innerHTML;
        btn.innerHTML = `<span style="font-size: 0.7rem;">⏳ Reading PDF...</span>`;

        try {
          const res = await fetch('/api/extract-pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pdfUrl })
          });
          const data = await res.json();
          btn.disabled = false;
          btn.innerHTML = originalHtml;

          if (data.success && data.metadata) {
            const meta = data.metadata;
            // Enrich vacancy with extracted metadata
            if (meta.advertisementNumber && !vac.advertisementNumber) vac.advertisementNumber = meta.advertisementNumber;
            if (meta.dates?.closingDate) vac.dates.closingDate = meta.dates.closingDate;
            if (meta.dates?.ageCutOffDate) vac.dates.ageCutOffDate = meta.dates.ageCutOffDate;
            if (meta.qualifications?.ageLimit) vac.qualifications.ageLimit = meta.qualifications.ageLimit;
            if (meta.reservationBreakout) vac.reservationBreakout = meta.reservationBreakout;
            if (meta.selectionProcess) vac.selectionProcess = meta.selectionProcess;
            storageService.saveVacancy(vac);

            openPdfInspectionModal(app, vac, meta);
            showConfirmationBanner('PDF Extracted', `Parsed circular: ${meta.advertisementNumber || 'Dates & requirements updated'}`, 'success', 3500);
          } else {
            showConfirmationBanner('PDF Notice', data.error || 'Could not parse text from this PDF.', 'warning', 3500);
          }
        } catch (err) {
          btn.disabled = false;
          btn.innerHTML = originalHtml;
          showConfirmationBanner('PDF Extract Error', err.message, 'warning', 3500);
        }
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

function formatHumanDate(dateStr) {
  if (!dateStr) return '';
  const m = String(dateStr).slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return String(dateStr);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const idx = parseInt(m[2], 10) - 1;
  return `${parseInt(m[3], 10)} ${months[idx] || m[2]} ${m[1]}`;
}

export function renderVacancyCard(app, vac, now) {
    const status = vac.verification?.status || VerificationStatus.UNVERIFIED_LEAD;
    const badgeLabel = app.formatVerificationBadge(status);

    const referenceUrl = vac.verification?.evidenceUrl || vac.verification?.sourceUrl || vac.sourceUrl || vac.verification?.officialNoticePdfUrl || '';
    let referenceDomain = vac.verification?.sourceDomain || vac.domain || '';
    if (!referenceDomain && referenceUrl) {
      try { referenceDomain = new URL(referenceUrl).hostname.replace(/^www\./i, ''); } catch (_) {}
    }

    let isClosed = false;
    let deadlineHtml = '';
    const closeStr = String(vac.dates?.closingDate || '').slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(closeStr)) {
      const close = new Date(`${closeStr}T23:59:59`);
      const diffDays = Math.ceil((close - now) / (1000 * 60 * 60 * 24));
      const prettyClose = formatHumanDate(closeStr);
      if (diffDays < 0) {
        isClosed = true;
        deadlineHtml = `<span class="deadline-indicator closed"><i data-lucide="clock" class="icon-xs"></i> Closed ${prettyClose}</span>`;
      } else if (diffDays === 0) {
        deadlineHtml = `<span class="deadline-indicator urgent"><i data-lucide="alert-circle" class="icon-xs"></i> Closes today (${prettyClose})</span>`;
      } else if (diffDays <= 7) {
        deadlineHtml = `<span class="deadline-indicator urgent"><i data-lucide="clock" class="icon-xs"></i> ${diffDays}d left &middot; ${prettyClose}</span>`;
      } else {
        deadlineHtml = `<span class="deadline-indicator">Closes ${prettyClose} (${diffDays}d left)</span>`;
      }
    } else if (vac.isRolling || /rolling|open\s+year/i.test(`${vac.title || ''} ${vac.dates?.dateText || ''}`)) {
      deadlineHtml = `<span class="deadline-indicator">Rolling &middot; Open Year-Round</span>`;
    } else {
      deadlineHtml = `<span class="deadline-indicator">See official circular</span>`;
    }

    const testFlagHtml = vac.isTestData ? `<span class="badge-test-flag">[Test Data]</span>` : '';
    const locParts = [vac.location?.city, vac.location?.state].filter(Boolean);
    const locationText = locParts.length
      ? `${locParts.join(', ')}${vac.location?.isRemote ? ' &middot; Remote' : ''}`
      : (vac.location?.isRemote ? 'Remote' : 'India');

    const matchScore = Math.max(0, Math.min(100, vac.matchAnalysis?.overallScore || 0));
    const matchTone = matchScore >= 70 ? 'high' : (matchScore >= 45 ? 'mid' : 'low');
    const matchLabel = app.formatEligibilityLabel(vac.matchAnalysis?.eligibilityStatus);
    const topReason = vac.matchAnalysis?.reasons?.[0] || 'Evaluated against active qualification profile.';

    const targetFocusBadge = vac.isTargetFocusMatch ? `<span class="meta-pill pill-focus"><i data-lucide="crosshair" class="icon-xs"></i> Target Focus</span>` : '';
    const corrigendumBadge = vac.isCorrigendum ? `<span class="meta-pill pill-warn">Corrigendum</span>` : '';
    const extensionBadge = vac.isExtension ? `<span class="meta-pill pill-focus">Date Extended</span>` : '';

    const sublineParts = [];
    if (vac.advertisementNumber && !/not\s*stated|n\/a/i.test(vac.advertisementNumber)) {
      sublineParts.push(`Ref ${app.escapeHtml(vac.advertisementNumber)}`);
    }
    if (vac.numberOfPosts) {
      sublineParts.push(`${app.escapeHtml(String(vac.numberOfPosts))} posts`);
    }
    if (vac.dates?.publishedAt) {
      sublineParts.push(`Published ${formatHumanDate(vac.dates.publishedAt)}`);
    }
    const sublineHtml = sublineParts.length
      ? `<div class="advt-ref">${sublineParts.join(' &middot; ')}</div>`
      : '';

    const pdfUrl = vac.verification?.officialNoticePdfUrl || '';
    const applyUrl = vac.verification?.applicationUrl || '';
    const fallbackUrl = !applyUrl && !pdfUrl && referenceUrl ? referenceUrl : (!applyUrl && referenceUrl && referenceUrl !== pdfUrl ? referenceUrl : '');

    return `
      <article class="vacancy-card" id="card-${vac.id}">
        <div class="vacancy-card-body">
          <div class="card-top">
            <span class="org-name">${app.escapeHtml(vac.organisation)}</span>
            <div class="card-badges">
              ${targetFocusBadge}
              ${extensionBadge}
              ${corrigendumBadge}
              ${testFlagHtml}
              <span class="verification-badge badge-${status}">${badgeLabel}</span>
            </div>
          </div>

          <h2 class="job-title">${app.escapeHtml(vac.title)}</h2>
          ${sublineHtml}

          <div class="meta-pills">
            <span class="meta-pill"><i data-lucide="building-2" class="icon-xs"></i> ${app.escapeHtml(vac.sector || 'Public')}</span>
            <span class="meta-pill"><i data-lucide="briefcase" class="icon-xs"></i> ${app.escapeHtml(vac.employmentType || 'Full-time')}</span>
            <span class="meta-pill"><i data-lucide="map-pin" class="icon-xs"></i> ${locationText}</span>
            ${vac.remuneration?.amountText ? `<span class="meta-pill"><i data-lucide="indian-rupee" class="icon-xs"></i> ${app.escapeHtml(vac.remuneration.amountText)}</span>` : ''}
          </div>

          <div class="match-row">
            <div class="match-header">
              <span class="match-elig">${matchLabel}</span>
              <span class="match-score-badge tone-${matchTone}">${matchScore}% match</span>
            </div>
            <div class="match-bar" aria-hidden="true">
              <div class="match-bar-fill tone-${matchTone}" style="width: ${matchScore}%;"></div>
            </div>
            <p class="match-reason">${app.escapeHtml(topReason)}</p>
          </div>
        </div>

        <div class="card-actions">
          <div class="card-deadline-row">
            ${deadlineHtml}
            ${referenceDomain ? (referenceUrl
              ? `<a href="${referenceUrl}" target="_blank" rel="noopener noreferrer" class="source-domain-link" title="Open official portal">${app.escapeHtml(referenceDomain)}</a>`
              : `<span class="source-domain-link">${app.escapeHtml(referenceDomain)}</span>`) : ''}
          </div>

          <div class="action-buttons">
            <div class="action-primary-group">
              <button class="btn btn-primary btn-sm btn-track" data-id="${vac.id}">Track</button>
              ${applyUrl ? `
                <a href="${applyUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm" title="Official application portal">
                  Apply <i data-lucide="arrow-up-right" class="icon-xs"></i>
                </a>
              ` : ''}
              ${pdfUrl ? `
                <a href="${pdfUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm" title="View official notification PDF">
                  <i data-lucide="file-text" class="icon-xs"></i> Notice PDF
                </a>
              ` : ''}
              ${fallbackUrl ? `
                <a href="${fallbackUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm" title="Visit official portal (${app.escapeHtml(referenceDomain || 'portal')})">
                  Source <i data-lucide="arrow-up-right" class="icon-xs"></i>
                </a>
              ` : ''}
            </div>

            <div class="action-utility-group">
              <button class="btn-icon btn-evidence" data-id="${vac.id}" title="Verification evidence" aria-label="Verification evidence">
                <i data-lucide="shield-check" class="icon-xs"></i>
              </button>
              ${pdfUrl ? `
                <button class="btn-icon btn-inspect-pdf" data-id="${vac.id}" title="Extract PDF details" aria-label="Extract PDF details">
                  <i data-lucide="file-search" class="icon-xs"></i>
                </button>
              ` : ''}
              <button class="btn-icon btn-telegram-single" data-id="${vac.id}" title="Send to Telegram" aria-label="Send to Telegram">
                <i data-lucide="send" class="icon-xs"></i>
              </button>
              ${vac.dates?.closingDate && !isClosed ? `
                <button class="btn-icon btn-calendar-reminder" data-id="${vac.id}" title="Add deadline to Google Calendar" aria-label="Add deadline to Google Calendar">
                  <i data-lucide="calendar-plus" class="icon-xs"></i>
                </button>
              ` : ''}
              <button class="btn-icon btn-icon-danger btn-delete-vacancy" data-id="${vac.id}" title="Move to trash" aria-label="Move to trash">
                <i data-lucide="trash-2" class="icon-xs"></i>
              </button>
            </div>
          </div>
        </div>
      </article>
    `;
  }

export function formatVerificationBadge(status) {
    switch (status) {
      case VerificationStatus.OFFICIALLY_VERIFIED:
        return '<i data-lucide="shield-check" class="icon-xs"></i> Verified';
      case VerificationStatus.CROSS_CHECKED:
        return '<i data-lucide="link" class="icon-xs"></i> Cross-Checked';
      case VerificationStatus.UNVERIFIED_LEAD:
        return '<i data-lucide="alert-triangle" class="icon-xs"></i> Unverified Lead';
      case VerificationStatus.VERIFICATION_FAILED:
        return '<i data-lucide="x-circle" class="icon-xs"></i> Failed Check';
      case VerificationStatus.EXPIRED_CLOSED:
        return '<i data-lucide="clock" class="icon-xs"></i> Expired';
      default:
        return status;
    }
  }

export function formatEligibilityLabel(status) {
    switch (status) {
      case 'LIKELY_ELIGIBLE':
        return '<span class="elig-status elig-high">Likely Eligible</span>';
      case 'POTENTIAL_MATCH':
        return '<span class="elig-status elig-mid">Potential Match</span>';
      case 'APPEARS_INELIGIBLE':
        return '<span class="elig-status elig-low">Appears Ineligible</span>';
      default:
        return '<span class="elig-status elig-neutral">Review Criteria</span>';
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

export function openPdfInspectionModal(app, vac, parsedMeta) {
  const modal = document.getElementById('evidenceModal');
  const modalBody = document.getElementById('modalBody');
  if (!modal || !modalBody) return;

  const res = parsedMeta.reservationBreakout || {};
  const qual = parsedMeta.qualifications || {};
  const dates = parsedMeta.dates || {};

  modalBody.innerHTML = `
    <div style="margin-bottom: 1.25rem;">
      <div style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.4rem;">
        <span class="verification-badge badge-OFFICIALLY_VERIFIED"><i data-lucide="shield-check" class="icon-xs"></i> OFFICIAL CIRCULAR INSPECTION</span>
        <span class="meta-pill" style="font-size: 0.72rem; color: #34d399; border-color: rgba(16, 185, 129, 0.35);">
          AI &amp; Deterministic PDF Extraction
        </span>
      </div>
      <h2 style="font-family: var(--font-heading); font-size: 1.35rem; color: var(--text-main); margin-bottom: 0.3rem;">
        ${app.escapeHtml(vac.title)}
      </h2>
      <p style="color: var(--text-secondary); font-size: 0.85rem;">
        ${app.escapeHtml(vac.organisation)} • Advt Ref: <code style="color: #60a5fa;">${app.escapeHtml(parsedMeta.advertisementNumber || vac.advertisementNumber || 'Official Notice')}</code>
      </p>
    </div>

    <!-- Key Crucial Dates & Age Limit -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.75rem; margin-bottom: 1.25rem;">
      <div style="background: var(--bg-surface-elevated); padding: 0.85rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
        <span style="font-size: 0.7rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">Closing Deadline</span>
        <div style="font-size: 1.05rem; font-weight: 700; color: #f87171; font-family: var(--font-mono); margin-top: 0.2rem;">
          ${dates.closingDate || vac.dates?.closingDate || 'See Notification'}
        </div>
      </div>
      <div style="background: var(--bg-surface-elevated); padding: 0.85rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
        <span style="font-size: 0.7rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">Crucial Age Cut-Off Date</span>
        <div style="font-size: 1.05rem; font-weight: 700; color: #60a5fa; font-family: var(--font-mono); margin-top: 0.2rem;">
          ${dates.ageCutOffDate || dates.closingDate || 'As on Closing Date'}
        </div>
      </div>
      <div style="background: var(--bg-surface-elevated); padding: 0.85rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
        <span style="font-size: 0.7rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">Upper Age Limit</span>
        <div style="font-size: 1.05rem; font-weight: 700; color: #34d399; font-family: var(--font-mono); margin-top: 0.2rem;">
          ${qual.ageLimit ? `${qual.ageLimit} Years` : 'Per Govt Norms'}
        </div>
      </div>
    </div>

    <!-- Category-Wise Vacancy Breakout Table -->
    ${res.totalposts ? `
      <div style="background: var(--bg-surface-elevated); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1.25rem;">
        <h4 style="font-size: 0.8rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700; margin-bottom: 0.6rem;">
          Official Reservation Breakout (Total: ${res.totalposts} Posts)
        </h4>
        <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 0.5rem; text-align: center;">
          <div style="background: var(--bg-surface); padding: 0.5rem; border-radius: 4px;">
            <div style="font-size: 0.68rem; color: var(--text-muted);">UR</div>
            <strong style="color: var(--text-main);">${res.ur || 0}</strong>
          </div>
          <div style="background: var(--bg-surface); padding: 0.5rem; border-radius: 4px;">
            <div style="font-size: 0.68rem; color: var(--text-muted);">OBC</div>
            <strong style="color: #fbbf24;">${res.obc || 0}</strong>
          </div>
          <div style="background: var(--bg-surface); padding: 0.5rem; border-radius: 4px;">
            <div style="font-size: 0.68rem; color: var(--text-muted);">SC</div>
            <strong style="color: #38bdf8;">${res.sc || 0}</strong>
          </div>
          <div style="background: var(--bg-surface); padding: 0.5rem; border-radius: 4px;">
            <div style="font-size: 0.68rem; color: var(--text-muted);">ST</div>
            <strong style="color: #a78bfa;">${res.st || 0}</strong>
          </div>
          <div style="background: var(--bg-surface); padding: 0.5rem; border-radius: 4px;">
            <div style="font-size: 0.68rem; color: var(--text-muted);">EWS</div>
            <strong style="color: #34d399;">${res.ews || 0}</strong>
          </div>
          <div style="background: var(--bg-surface); padding: 0.5rem; border-radius: 4px;">
            <div style="font-size: 0.68rem; color: var(--text-muted);">PwD</div>
            <strong style="color: #f472b6;">${res.pwd || 0}</strong>
          </div>
        </div>
      </div>
    ` : ''}

    <!-- Essential Qualifications & Selection Process -->
    <div style="background: var(--bg-surface-elevated); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1.25rem;">
      <h4 style="font-size: 0.8rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700; margin-bottom: 0.5rem;">
        Essential Eligibility &amp; Selection Process
      </h4>
      <div style="font-size: 0.84rem; color: var(--text-main); line-height: 1.5; margin-bottom: 0.5rem;">
        ${parsedMeta.textSnippet ? app.escapeHtml(parsedMeta.textSnippet) : 'Detailed qualifications extracted from circular document.'}
      </div>
      ${parsedMeta.selectionProcess && parsedMeta.selectionProcess.length > 0 ? `
        <div style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 0.5rem;">
          <strong>Selection Stages:</strong> ${app.escapeHtml(parsedMeta.selectionProcess.join(' → '))}
        </div>
      ` : ''}
    </div>

    <!-- Actions -->
    <div style="display: flex; gap: 0.75rem; justify-content: flex-end;">
      ${vac.verification?.officialNoticePdfUrl ? `
        <a href="${vac.verification.officialNoticePdfUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm">
          <i data-lucide="file-text" class="icon-xs"></i> Open Original PDF
        </a>
      ` : ''}
      <button id="btnClosePdfInspectModal" class="btn btn-primary btn-sm">
        Close Inspector
      </button>
    </div>
  `;
  if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
  modal.classList.add('active');

  document.getElementById('btnClosePdfInspectModal')?.addEventListener('click', () => {
    modal.classList.remove('active');
  });
}
