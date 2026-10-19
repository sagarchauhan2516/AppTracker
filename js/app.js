/**
 * Vacancy Radar India - Main Application Controller
 * Orchestrates UI tabs, modals, and delegates domain logic to modular controllers:
 * - Theme Controller: ./controllers/themeController.js
 * - Feed Controller: ./controllers/feedController.js
 * - Application Controller: ./controllers/applicationController.js
 * - Source Controller: ./controllers/sourceController.js
 * - Scan Controller: ./controllers/scanController.js
 */

import { storageService } from './services/storageService.js';
import { VerificationStatus, ApplicationTrackerStatus, SourceCategory } from './models/types.js';
import { ProfileBuilderUI } from './ui/profileBuilder.js';
import { PublicFeedsProvider } from './providers/publicFeedsProvider.js';
import { CustomSearchApiProvider } from './providers/customSearchApiProvider.js';
import { SourceRegistryService } from './services/sourceRegistryService.js';
import { VerificationEngine } from './engine/verificationEngine.js';
import { MatchingEngine } from './engine/matchingEngine.js';
import { DuplicateDetector } from './engine/duplicateDetector.js';
import { KeywordExpansionEngine } from './engine/keywordExpansion.js';
import { searchOrchestrationEngine } from './engine/searchOrchestrationEngine.js';
import { SearchProviderDashboardUI } from './ui/searchProviderDashboardUI.js';
import { UnifiedDashboardUI } from './ui/unifiedDashboardUI.js?v=4.0';
import { ProfileSettingsUI } from './ui/profileSettingsUI.js';
import { showConfirmationBanner } from './services/notificationService.js';
import { escapeHtml } from './utils/htmlUtils.js';
import { eventBus, EVENTS } from './services/eventBus.js';

// Modular Controllers
import { initTheme, setTheme, toggleTheme } from './controllers/themeController.js';
import { 
  resetFilters, 
  updateFilterButtonsState, 
  renderVacancies, 
  renderPagination, 
  renderVacancyCard, 
  formatVerificationBadge, 
  formatEligibilityLabel, 
  openEvidenceModal 
} from './controllers/feedController.js';
import { 
  syncTrackedApplications, 
  checkAndRenderPortalDeadlineReminders, 
  openApplicationModal, 
  renderTrackedApplications 
} from './controllers/applicationController.js';
import { 
  renderSources, 
  handleRevalidateSources, 
  handleRegisterSourcePrompt, 
  openProviderModal, 
  renderDiscoveryLogs, 
  renderTrashSection 
} from './controllers/sourceController.js';
import { 
  hydratePersistentCredentials, 
  pullRealVacanciesQuietly, 
  normalizeAndRepairVacancies, 
  openScheduleModal, 
  handleManualScan 
} from './controllers/scanController.js';


class App {
  constructor() {
    this.currentTab = 'vacancies';
    this.profileFeedOnly = true; // Segregated profile feed active by default
    this.filterState = {
      searchQuery: '',
      sector: 'ALL',
      employmentType: 'ALL',
      verificationStatus: 'ALL',
      sourceCategory: 'ALL',
      location: 'ALL',
      minSalary: 0,
      deduplicate: true,
      trackerStage: 'ALL',
      sortBy: 'relevance'
    };
    this.currentPage = 1;
    this.pageSize = 12; // 12 vacancies per page default
    this.initProvider();
  }

  initProvider() {
    const config = storageService.getProviderConfig();
    if (config.activeProvider === 'CUSTOM_SEARCH_API') {
      this.searchProvider = new CustomSearchApiProvider(config);
    } else {
      this.searchProvider = new PublicFeedsProvider(config);
    }
  }


  async init() {
    window.app = this;
    this.initTheme();
    await this.hydratePersistentCredentials();
    await this.syncTrackedApplications();
    this.normalizeAndRepairVacancies();
    this.profileBuilderUI = new ProfileBuilderUI('profileBuilderContainer', () => {
      this.renderProfileSelector();
      this.refreshAll();
    });
    this.profileSettingsUI = new ProfileSettingsUI('modalProfileSettingsBody', () => {
      this.renderProfileSelector();
      this.refreshAll();
    });
    this.unifiedDashboardUI = new UnifiedDashboardUI('unifiedDashboardContainer', () => {
      this.renderProfileSelector();
      this.refreshAll();
    });
    this.bindEvents();

    // Subscribe to reactive state events
    this.unsubscribeEvents = [
      eventBus.subscribe(EVENTS.VACANCIES_UPDATED, () => {
        this.updateKpis();
        this.renderVacancies();
      }),
      eventBus.subscribe(EVENTS.PROFILE_CHANGED, () => {
        this.renderProfileSelector();
        this.refreshAll();
      }),
      eventBus.subscribe(EVENTS.APPLICATIONS_UPDATED, () => {
        this.updateKpis();
        this.renderTrackedApplications();
        this.checkAndRenderPortalDeadlineReminders();
      }),
      eventBus.subscribe(EVENTS.SOURCES_UPDATED, () => {
        this.renderSources();
        this.updateKpis();
      })
    ];

    this.renderProfileSelector();
    this.refreshAll();
    this.checkAndRenderPortalDeadlineReminders();

    // Periodic Portal Deadline Checker (checks every 15 minutes while page is active)
    setInterval(() => {
      this.checkAndRenderPortalDeadlineReminders();
    }, 15 * 60 * 1000);

    // If database contains only test data and webhook is configured, quietly pull real vacancies from Google Sheets
    const vacancies = storageService.getVacancies();
    const hasOnlyTestData = vacancies.length > 0 && vacancies.every(v => v.isTestData);
    const webhookUrl = storageService.getProviderConfig()?.googleAppsScriptWebhookUrl?.trim();
    if (hasOnlyTestData && webhookUrl) {
      this.pullRealVacanciesQuietly(webhookUrl);
    }
  }

  refreshAll() {
    this.normalizeAndRepairVacancies();
    this.updateKpis();
    this.renderVacancies();
    this.renderSources();
    this.renderTrackedApplications();
    this.renderDiscoveryLogs();
    this.checkAndRenderPortalDeadlineReminders();
    if (this.currentTab === 'profiles') {
      this.renderProfileBuilderSection();
    }
    if (this.currentTab === 'dashboard') {
      this.renderUnifiedDashboard();
    }
  }

  bindEvents() {
    // Navigation Tabs (legacy fallback)
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = e.currentTarget.getAttribute('data-tab');
        this.switchTab(tab);
      });
    });

    // View Switcher Dropdown (From the whole line)
    document.querySelectorAll('.view-switcher-select').forEach(sel => {
      sel.addEventListener('change', (e) => {
        this.switchTab(e.target.value);
      });
    });

    // Interactive KPI Cards
    document.querySelectorAll('.kpi-card[data-view]').forEach(card => {
      card.addEventListener('click', (e) => {
        const view = e.currentTarget.getAttribute('data-view');
        if (view) this.switchTab(view);
      });
    });

    // Filters
    // Search and Filters
    const searchInput = document.getElementById('searchInput');
    const btnSearchClear = document.getElementById('btnSearchClear');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.filterState.searchQuery = e.target.value.toLowerCase().trim();
        if (btnSearchClear) btnSearchClear.style.display = searchInput.value ? 'block' : 'none';
        this.currentPage = 1;
        this.updateFilterButtonsState();
        this.renderVacancies();
      });
      // Keyboard shortcut '/' to search
      window.addEventListener('keydown', (e) => {
        if (e.key === '/' && document.activeElement !== searchInput && !['input', 'textarea'].includes(document.activeElement?.tagName?.toLowerCase() || '')) {
          e.preventDefault();
          searchInput.focus();
        }
      });
    }

    if (btnSearchClear && searchInput) {
      btnSearchClear.addEventListener('click', () => {
        searchInput.value = '';
        btnSearchClear.style.display = 'none';
        this.filterState.searchQuery = '';
        this.currentPage = 1;
        this.updateFilterButtonsState();
        this.renderVacancies();
        searchInput.focus();
      });
    }

    const filterSector = document.getElementById('filterSector');
    if (filterSector) {
      filterSector.addEventListener('change', (e) => {
        this.filterState.sector = e.target.value;
        this.currentPage = 1;
        this.updateFilterButtonsState();
        this.renderVacancies();
      });
    }

    const filterType = document.getElementById('filterType');
    if (filterType) {
      filterType.addEventListener('change', (e) => {
        this.filterState.employmentType = e.target.value;
        this.currentPage = 1;
        this.updateFilterButtonsState();
        this.renderVacancies();
      });
    }

    const filterLocation = document.getElementById('filterLocation');
    if (filterLocation) {
      filterLocation.addEventListener('change', (e) => {
        this.filterState.location = e.target.value;
        this.currentPage = 1;
        this.updateFilterButtonsState();
        this.renderVacancies();
      });
    }

    const filterMinSalary = document.getElementById('filterMinSalary');
    if (filterMinSalary) {
      filterMinSalary.addEventListener('change', (e) => {
        this.filterState.minSalary = parseFloat(e.target.value) || 0;
        this.currentPage = 1;
        this.updateFilterButtonsState();
        this.renderVacancies();
      });
    }

    const chkDeduplicate = document.getElementById('chkDeduplicate');
    if (chkDeduplicate) {
      chkDeduplicate.addEventListener('change', (e) => {
        this.filterState.deduplicate = e.target.checked;
        this.currentPage = 1;
        this.renderVacancies();
      });
    }

    const trackerStageFilter = document.getElementById('trackerStageFilter');
    if (trackerStageFilter) {
      trackerStageFilter.addEventListener('change', (e) => {
        this.filterState.trackerStage = e.target.value;
        this.renderTrackedApplications();
      });
    }

    const btnClearLogs = document.getElementById('btnClearLogs');
    if (btnClearLogs) {
      btnClearLogs.addEventListener('click', () => {
        localStorage.setItem('vacancy_radar_scan_logs_v1', JSON.stringify([]));
        this.renderDiscoveryLogs();
      });
    }

    const filterStatus = document.getElementById('filterStatus');
    if (filterStatus) {
      filterStatus.addEventListener('change', (e) => {
        this.filterState.verificationStatus = e.target.value;
        if (e.target.value === VerificationStatus.OFFICIALLY_VERIFIED) {
          document.querySelectorAll('.view-switcher-select').forEach(s => s.value = 'verified');
        } else if (this.currentTab === 'verified') {
          this.currentTab = 'vacancies';
          document.querySelectorAll('.view-switcher-select').forEach(s => s.value = 'vacancies');
        }
        this.currentPage = 1;
        this.updateFilterButtonsState();
        this.renderVacancies();
      });
    }

    const sortBy = document.getElementById('sortBy');
    if (sortBy) {
      sortBy.addEventListener('change', (e) => {
        this.filterState.sortBy = e.target.value;
        this.currentPage = 1;
        this.updateFilterButtonsState();
        this.renderVacancies();
      });
    }

    // Toggle advanced filters tray
    const btnToggleFilters = document.getElementById('btnToggleFilters');
    const advancedFiltersBar = document.getElementById('advancedFiltersBar');
    if (btnToggleFilters && advancedFiltersBar) {
      btnToggleFilters.addEventListener('click', () => {
        advancedFiltersBar.classList.toggle('active');
        btnToggleFilters.classList.toggle('has-active', advancedFiltersBar.classList.contains('active'));
      });
    }

    // Reset filters button
    document.getElementById('btnResetFilters')?.addEventListener('click', () => {
      this.resetFilters();
    });

    // Theme Toggle Button
    document.getElementById('btnThemeToggle')?.addEventListener('click', () => {
      this.toggleTheme();
    });

    // 1-Click Header Google Sheets Sync
    const btnHeaderPullSheets = document.getElementById('btnHeaderPullSheets');
    if (btnHeaderPullSheets) {
      btnHeaderPullSheets.addEventListener('click', async () => {
        const webhookUrl = storageService.getProviderConfig()?.googleAppsScriptWebhookUrl?.trim();
        if (!webhookUrl) {
          showConfirmationBanner('Webhook Needed', 'Please configure your Google Apps Script Webhook URL first in Settings & Dashboard.', 'warning', 3000);
          this.openUnifiedDashboardModal();
          return;
        }
        const origHtml = btnHeaderPullSheets.innerHTML;
        btnHeaderPullSheets.disabled = true;
        btnHeaderPullSheets.innerHTML = `<span>⏳</span> Syncing...`;
        try {
          const res = await fetch('/api/pull-vacancies', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: webhookUrl })
          });
          const data = await res.json();
          const sheetData = data.data || data;
          if (sheetData && sheetData.status === 'SUCCESS' && Array.isArray(sheetData.vacancies)) {
            storageService.purgeTestData();
            sheetData.vacancies.forEach(v => {
              v.isTestData = false;
              v.isLiveDiscovered = true;
              storageService.saveVacancy(v);
            });
            this.refreshAll();
            btnHeaderPullSheets.innerHTML = `<span>✅</span> Synced (${sheetData.vacancies.length})`;
            showConfirmationBanner('Sheets Synced', `Successfully imported ${sheetData.vacancies.length} real vacancies from Google Sheets!`, 'success', 3000);
          } else {
            showConfirmationBanner('Sync Failed', sheetData?.message || 'Could not pull vacancies from Google Sheets.', 'error', 3500);
            btnHeaderPullSheets.innerHTML = origHtml;
          }
        } catch (err) {
          showConfirmationBanner('Connection Error', 'Error connecting to webhook: ' + err.message, 'error', 3500);
          btnHeaderPullSheets.innerHTML = origHtml;
        } finally {
          setTimeout(() => {
            btnHeaderPullSheets.disabled = false;
            btnHeaderPullSheets.innerHTML = origHtml;
          }, 3500);
        }
      });
    }

    // Source Category Filter
    document.getElementById('sourceCategoryFilter')?.addEventListener('change', (e) => {
      this.filterState.sourceCategory = e.target.value;
      this.renderSources();
    });

    // Revalidate Sources Button
    document.getElementById('btnRevalidateSources')?.addEventListener('click', () => {
      this.handleRevalidateSources();
    });

    // Register Source Prompt
    document.getElementById('btnAddSourcePrompt')?.addEventListener('click', () => {
      this.handleRegisterSourcePrompt();
    });

    // Provider Configuration Button
    document.getElementById('btnConfigureProvider')?.addEventListener('click', () => {
      this.openProviderModal();
    });

    // Modal Close buttons
    document.getElementById('modalCloseBtn')?.addEventListener('click', () => {
      document.getElementById('evidenceModal')?.classList.remove('active');
    });

    document.getElementById('appModalCloseBtn')?.addEventListener('click', () => {
      document.getElementById('appStatusModal')?.classList.remove('active');
    });

    // Schedule Configuration Button
    document.getElementById('btnScheduleSettings')?.addEventListener('click', () => {
      this.openScheduleModal();
    });

    document.getElementById('scheduleModalCloseBtn')?.addEventListener('click', () => {
      document.getElementById('scheduleModal')?.classList.remove('active');
    });

    document.getElementById('scanResultModalCloseBtn')?.addEventListener('click', () => {
      document.getElementById('scanResultModal')?.classList.remove('active');
    });

    document.getElementById('providerModalCloseBtn')?.addEventListener('click', () => {
      document.getElementById('providerModal')?.classList.remove('active');
    });

    // Unified Dashboard Settings Modal Close buttons
    document.getElementById('dashboardModalCloseBtn')?.addEventListener('click', () => {
      document.getElementById('dashboardModal')?.classList.remove('active');
    });

    document.getElementById('dashboardModal')?.addEventListener('click', (e) => {
      if (e.target.id === 'dashboardModal') {
        document.getElementById('dashboardModal')?.classList.remove('active');
      }
    });

    // Close any modal with Escape key
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
      }
    });

    // Profile Selector
    document.getElementById('profileSelect')?.addEventListener('change', (e) => {
      storageService.setActiveProfile(e.target.value);
      this.refreshAll();
    });

    // Header New Profile Button (1-Click Role Profiles)
    document.getElementById('btnHeaderNewProfile')?.addEventListener('click', () => {
      if (!this.profileBuilderUI) {
        this.profileBuilderUI = new ProfileBuilderUI('profileBuilderContainer', () => {
          this.renderProfileSelector();
          this.refreshAll();
        });
      }
      this.profileBuilderUI.showCreateProfileModal();
    });

    // Quick Target Focus filter toggle
    document.getElementById('chkStrictTargetFocus')?.addEventListener('change', () => {
      this.renderVacancies();
    });

    // Profile Settings Modal Triggers (Header & Quick Edit)
    document.getElementById('btnHeaderProfileSettings')?.addEventListener('click', () => {
      this.openProfileSettingsModal();
    });

    document.getElementById('btnEditProfileQuick')?.addEventListener('click', () => {
      this.openProfileSettingsModal();
    });

    document.getElementById('profileSettingsModalCloseBtn')?.addEventListener('click', () => {
      document.getElementById('profileSettingsModal')?.classList.remove('active');
    });

    document.getElementById('profileSettingsModal')?.addEventListener('click', (e) => {
      if (e.target.id === 'profileSettingsModal') {
        document.getElementById('profileSettingsModal')?.classList.remove('active');
      }
    });

    // Main Settings Modal Trigger (Header)
    document.getElementById('btnHeaderMainSettings')?.addEventListener('click', () => {
      this.openUnifiedDashboardModal();
    });

    // Header Unified Dashboard Button (Backward-compat alias)
    document.getElementById('btnHeaderUnifiedDashboard')?.addEventListener('click', () => {
      this.openUnifiedDashboardModal();
    });

    // Profile Feed Segregated Toggle Buttons
    document.getElementById('btnFeedProfileOnly')?.addEventListener('click', () => {
      this.profileFeedOnly = true;
      this.currentPage = 1;
      this.renderVacancies();
    });

    document.getElementById('btnFeedAllGlobal')?.addEventListener('click', () => {
      this.profileFeedOnly = false;
      this.currentPage = 1;
      this.renderVacancies();
    });

    // Manual Scan Button
    document.getElementById('btnManualScan')?.addEventListener('click', () => {
      this.handleManualScan();
    });

    // Empty Trash from Main Trash View
    document.getElementById('btnEmptyTrashMain')?.addEventListener('click', () => {
      if (confirm('Empty all trashed vacancies? These vacancies will remain excluded from future scans.')) {
        storageService.emptyTrash();
        this.renderTrashSection();
        this.updateKpis();
      }
    });

    // Add External Finding Modal open/close
    const addVacModal = document.getElementById('addVacancyModal');
    const openAddVacModal = () => {
      if (addVacModal) {
        addVacModal.classList.add('active');
        document.getElementById('inputCustomVacUrl')?.focus();
      }
    };
    const closeAddVacModal = () => {
      if (addVacModal) addVacModal.classList.remove('active');
    };

    document.getElementById('btnOpenAddVacancyModal')?.addEventListener('click', openAddVacModal);
    document.getElementById('btnTrackerAddFinding')?.addEventListener('click', openAddVacModal);
    document.getElementById('addVacancyModalCloseBtn')?.addEventListener('click', closeAddVacModal);
    document.getElementById('btnCancelAddCustomVac')?.addEventListener('click', closeAddVacModal);

    // Toggle track fields
    document.getElementById('chkCustomVacTrack')?.addEventListener('change', (e) => {
      const f = document.getElementById('customVacTrackFields');
      if (f) f.style.display = e.target.checked ? 'grid' : 'none';
    });

    // Auto-Extract from URL & Learn Source
    document.getElementById('btnAutoExtractFromUrl')?.addEventListener('click', async () => {
      const btn = document.getElementById('btnAutoExtractFromUrl');
      const statusDiv = document.getElementById('statusCustomVacExtract');
      const urlInput = document.getElementById('inputCustomVacUrl');
      const url = (urlInput?.value || '').trim();

      if (!url) {
        if (statusDiv) {
          statusDiv.style.display = 'block';
          statusDiv.style.background = 'rgba(239, 68, 68, 0.15)';
          statusDiv.style.color = '#f87171';
          statusDiv.innerHTML = '⚠️ Please enter a web link or PDF URL first.';
        }
        return;
      }

      btn.disabled = true;
      const origText = btn.innerHTML;
      btn.innerHTML = '⏳ Extracting...';
      if (statusDiv) {
        statusDiv.style.display = 'block';
        statusDiv.style.background = 'rgba(56, 189, 248, 0.12)';
        statusDiv.style.color = '#38bdf8';
        statusDiv.innerHTML = '⏳ Fetching link and extracting structured vacancy metadata...';
      }

      try {
        const res = await fetch('/api/extract-vacancy-from-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
        });
        const data = await res.json();

        if (data.success && data.extracted) {
          const ext = data.extracted;
          if (ext.title) document.getElementById('inputCustomVacTitle').value = ext.title;
          if (ext.organisation) document.getElementById('inputCustomVacOrg').value = ext.organisation;
          if (ext.advertisementNumber) document.getElementById('inputCustomVacAdvt').value = ext.advertisementNumber;
          if (ext.dates?.closingDate) document.getElementById('inputCustomVacDeadline').value = ext.dates.closingDate;
          if (ext.pdfUrl) document.getElementById('inputCustomVacPdfUrl').value = ext.pdfUrl;
          if (ext.payScale && document.getElementById('inputCustomVacPay')) {
            document.getElementById('inputCustomVacPay').value = ext.payScale;
          }
          if (ext.totalPosts && document.getElementById('inputCustomVacPosts')) {
            document.getElementById('inputCustomVacPosts').value = ext.totalPosts;
          }
          if (ext.sector && document.getElementById('selectCustomVacSector')) {
            document.getElementById('selectCustomVacSector').value = ext.sector;
          }

          if (statusDiv) {
            statusDiv.style.background = 'rgba(16, 185, 129, 0.15)';
            statusDiv.style.color = '#34d399';
            const aiBadge = data.aiEngine ? `<strong>${data.aiEngine}</strong>: ` : '';
            statusDiv.innerHTML = `✅ ${aiBadge}${data.learned?.message || 'Extracted vacancy metadata.'}`;
          }

          // Register in search sources
          if (ext.domain) {
            storageService.saveSource({
              id: `src-${ext.domain.replace(/[^a-z0-9]/gi, '_')}`,
              domain: ext.domain,
              organisationName: ext.organisation || ext.domain,
              sourceUrl: ext.sourceUrl || url,
              category: 'OFFICIAL_EMPLOYER',
              isOfficialDomain: true,
              isEnabled: true,
              rateLimitMinutes: 180
            });
          }
        } else {
          if (statusDiv) {
            statusDiv.style.background = 'rgba(245, 158, 11, 0.15)';
            statusDiv.style.color = '#fbbf24';
            statusDiv.innerHTML = `⚠️ Notice: ${data.error || 'Could not auto-extract from this page. You can fill the fields manually below.'}`;
          }
        }
      } catch (err) {
        if (statusDiv) {
          statusDiv.style.background = 'rgba(239, 68, 68, 0.15)';
          statusDiv.style.color = '#f87171';
          statusDiv.innerHTML = `❌ Error: ${err.message}. You can enter details manually below.`;
        }
      } finally {
        btn.disabled = false;
        btn.innerHTML = origText;
      }
    });

    // Save Custom Vacancy & Tracker Handler
    document.getElementById('btnSaveCustomVacancy')?.addEventListener('click', () => {
      const title = document.getElementById('inputCustomVacTitle')?.value.trim();
      const org = document.getElementById('inputCustomVacOrg')?.value.trim();
      const sector = document.getElementById('selectCustomVacSector')?.value || 'Central Government';
      const advt = document.getElementById('inputCustomVacAdvt')?.value.trim();
      const deadline = document.getElementById('inputCustomVacDeadline')?.value;
      const payScale = document.getElementById('inputCustomVacPay')?.value.trim() || '';
      const totalPosts = parseInt(document.getElementById('inputCustomVacPosts')?.value, 10) || 0;
      const pdfUrl = document.getElementById('inputCustomVacPdfUrl')?.value.trim();
      const rawUrl = document.getElementById('inputCustomVacUrl')?.value.trim() || pdfUrl || window.location.href;

      if (!title || !org) {
        alert('Please provide at least a Job Title and Employer Name.');
        return;
      }

      let domain = 'custom-finding';
      try {
        domain = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`).hostname.replace(/^www\./, '');
      } catch (_) {}

      const vacId = `custom_${Date.now()}`;
      const newVac = {
        id: vacId,
        canonicalId: vacId,
        title,
        organisation: org,
        domain,
        sourceCategory: 'OFFICIAL_EMPLOYER',
        sector,
        advertisementNumber: advt || '',
        payScale,
        totalPosts,
        sourceUrl: rawUrl,
        dates: {
          closingDate: deadline || '',
          publishedDate: new Date().toISOString().split('T')[0]
        },
        verification: {
          status: 'OFFICIALLY_VERIFIED',
          sourceDomain: domain,
          officialNoticePdfUrl: pdfUrl || '',
          evidenceUrl: rawUrl
        },
        isUserContributed: true,
        discoveredAt: new Date().toISOString()
      };

      storageService.saveVacancy(newVac);

      // Teach Continuous Learning Cloud Brain
      fetch('/api/ai/save-training-sample', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: `corpus-${domain}-${Date.now()}`,
          domain,
          organisation: org,
          title,
          advertisementNumber: advt || '',
          sector,
          totalPosts,
          payScale,
          dates: newVac.dates,
          verifiedAt: new Date().toISOString()
        })
      }).catch(() => {});

      // Register source domain
      storageService.saveSource({
        id: `src-${domain.replace(/[^a-z0-9]/gi, '_')}`,
        domain,
        organisationName: org,
        sourceUrl: rawUrl,
        category: 'OFFICIAL_EMPLOYER',
        isOfficialDomain: true,
        isEnabled: true,
        rateLimitMinutes: 180
      });

      // Save to application tracker if checked
      const trackChecked = document.getElementById('chkCustomVacTrack')?.checked;
      if (trackChecked) {
        const stage = document.getElementById('selectCustomVacStage')?.value || 'SAVED';
        const regNo = document.getElementById('inputCustomVacRegNo')?.value.trim() || '';
        const notes = document.getElementById('inputCustomVacNotes')?.value.trim() || '';

        const appRecord = {
          vacancyId: vacId,
          vacancyTitle: title,
          title,
          organisation: org,
          deadline: deadline || '',
          status: stage,
          submissionDate: new Date().toISOString().split('T')[0],
          registrationNo: regNo,
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
      }

      closeAddVacModal();
      showConfirmationBanner(
        'Opportunity Added!',
        `Added "${title}" from "${org}". ${trackChecked ? 'Tracked in Applications.' : ''}`,
        'success',
        3000
      );

      // Reset form
      if (document.getElementById('inputCustomVacUrl')) document.getElementById('inputCustomVacUrl').value = '';
      if (document.getElementById('inputCustomVacTitle')) document.getElementById('inputCustomVacTitle').value = '';
      if (document.getElementById('inputCustomVacOrg')) document.getElementById('inputCustomVacOrg').value = '';
      if (document.getElementById('inputCustomVacAdvt')) document.getElementById('inputCustomVacAdvt').value = '';
      if (document.getElementById('inputCustomVacDeadline')) document.getElementById('inputCustomVacDeadline').value = '';
      if (document.getElementById('inputCustomVacPdfUrl')) document.getElementById('inputCustomVacPdfUrl').value = '';
      if (document.getElementById('inputCustomVacRegNo')) document.getElementById('inputCustomVacRegNo').value = '';
      if (document.getElementById('inputCustomVacNotes')) document.getElementById('inputCustomVacNotes').value = '';

      this.refreshAll();
    });
  }

  switchTab(tabName) {
    this.currentTab = tabName;

    // Synchronize all view switcher dropdowns across sections
    document.querySelectorAll('.view-switcher-select').forEach(sel => {
      sel.value = tabName;
    });

    document.querySelectorAll('.nav-tab-btn').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-tab') === tabName);
    });

    // Map tab to section
    const secVacancies = document.getElementById('sectionVacancies');
    const secTracker = document.getElementById('sectionTracker');
    const secSources = document.getElementById('sectionSources');
    const secProfiles = document.getElementById('sectionProfiles');
    const secLogs = document.getElementById('sectionLogs');
    const secDashboard = document.getElementById('sectionDashboard');
    const secTrash = document.getElementById('sectionTrash');

    secVacancies?.classList.remove('active');
    secTracker?.classList.remove('active');
    secSources?.classList.remove('active');
    secProfiles?.classList.remove('active');
    secLogs?.classList.remove('active');
    secDashboard?.classList.remove('active');
    secTrash?.classList.remove('active');

    if (tabName === 'dashboard') {
      this.openUnifiedDashboardModal();
      document.querySelectorAll('.view-switcher-select').forEach(sel => {
        sel.value = this.currentTab === 'dashboard' ? 'vacancies' : this.currentTab;
      });
      return;
    } else if (tabName === 'vacancies' || tabName === 'verified' || tabName === 'closing') {
      secVacancies?.classList.add('active');
      if (tabName === 'verified') {
        this.filterState.verificationStatus = VerificationStatus.OFFICIALLY_VERIFIED;
        const sel = document.getElementById('filterStatus');
        if (sel) sel.value = VerificationStatus.OFFICIALLY_VERIFIED;
      } else if (tabName === 'closing') {
        this.filterState.verificationStatus = 'ALL';
      } else {
        this.filterState.verificationStatus = 'ALL';
        const sel = document.getElementById('filterStatus');
        if (sel) sel.value = 'ALL';
      }
      this.updateFilterButtonsState();
      this.renderVacancies();
    } else if (tabName === 'tracker') {
      secTracker?.classList.add('active');
      this.renderTrackedApplications();
    } else if (tabName === 'sources') {
      secSources?.classList.add('active');
      this.renderSources();
    } else if (tabName === 'profiles') {
      secProfiles?.classList.add('active');
      this.renderProfileBuilderSection();
    } else if (tabName === 'logs') {
      secLogs?.classList.add('active');
      this.renderDiscoveryLogs();
    } else if (tabName === 'trash') {
      secTrash?.classList.add('active');
      this.renderTrashSection();
    } else if (tabName === 'providers') {
      this.openProviderModal();
      // Keep dropdown aligned to previous active section
      document.querySelectorAll('.view-switcher-select').forEach(sel => {
        sel.value = this.currentTab;
      });
      return;
    }
  }

  openProfileSettingsModal() {
    const modal = document.getElementById('profileSettingsModal');
    if (!modal) return;
    if (!this.profileSettingsUI) {
      this.profileSettingsUI = new ProfileSettingsUI('modalProfileSettingsBody', () => {
        this.renderProfileSelector();
        this.refreshAll();
      });
    }
    this.profileSettingsUI.render();
    modal.classList.add('active');
  }

  openUnifiedDashboardModal() {
    const modal = document.getElementById('dashboardModal');
    if (!modal) return;
    if (!this.modalDashboardUI) {
      this.modalDashboardUI = new UnifiedDashboardUI('modalDashboardBody', () => {
        this.renderProfileSelector();
        this.refreshAll();
      });
    }
    this.modalDashboardUI.render();
    modal.classList.add('active');
  }

  renderUnifiedDashboard() {
    if (!this.unifiedDashboardUI) {
      this.unifiedDashboardUI = new UnifiedDashboardUI('unifiedDashboardContainer', () => {
        this.renderProfileSelector();
        this.refreshAll();
      });
    }
    this.unifiedDashboardUI.render();
  }

  renderProfileSelector() {
    const select = document.getElementById('profileSelect');
    if (!select) return;
    const profiles = storageService.getProfiles();
    const active = storageService.getActiveProfile();
    select.innerHTML = profiles.map(p => `
      <option value="${p.id}" ${p.id === active.id ? 'selected' : ''}>
        ${this.escapeHtml(p.name)}
      </option>
    `).join('');
  }

  updateKpis() {
    const vacancies = storageService.getVacancies();
    const sources = storageService.getSources();
    const apps = storageService.getApplications();
    const trash = storageService.getTrashVacancies ? storageService.getTrashVacancies() : [];

    const verified = vacancies.filter(v => v.verification?.status === VerificationStatus.OFFICIALLY_VERIFIED);
    
    // Check closing <= 7 days
    const now = new Date();
    const closingSoon = vacancies.filter(v => {
      if (!v.dates?.closingDate) return false;
      const closeDate = new Date(v.dates.closingDate);
      const diffDays = Math.ceil((closeDate - now) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 7;
    });

    const activeSources = sources.filter(s => s.isEnabled).length;

    // KPI Summary
    const elTotal = document.getElementById('kpiTotalVacancies');
    if (elTotal) elTotal.textContent = vacancies.length;
    const elSources = document.getElementById('kpiActiveSources');
    if (elSources) elSources.textContent = `${activeSources} Active Sources`;
    const elVerified = document.getElementById('kpiVerifiedCount');
    if (elVerified) elVerified.textContent = verified.length;
    const elClosing = document.getElementById('kpiClosingSoonCount');
    if (elClosing) elClosing.textContent = closingSoon.length;
    const elApplied = document.getElementById('kpiAppliedCount');
    if (elApplied) elApplied.textContent = apps.length;

    // Nav Bar Badges
    const navTotal = document.getElementById('navCountTotal');
    if (navTotal) navTotal.textContent = vacancies.length;
    const navVerified = document.getElementById('navCountVerified');
    if (navVerified) navVerified.textContent = verified.length;
    const navClosing = document.getElementById('navCountClosing');
    if (navClosing) navClosing.textContent = closingSoon.length;
    const navApplied = document.getElementById('navCountApplied');
    if (navApplied) navApplied.textContent = apps.length;
    const navTrash = document.getElementById('navCountTrash');
    if (navTrash) navTrash.textContent = trash.length;
  }

  renderProfileBuilderSection() {
    if (!this.profileBuilderUI) {
      this.profileBuilderUI = new ProfileBuilderUI('profileBuilderContainer', () => {
        this.renderProfileSelector();
        this.refreshAll();
      });
    }
    this.profileBuilderUI.render();
  }


  // --- Theme Controller Delegates ---
  initTheme() { return initTheme(); }
  setTheme(theme) { return setTheme(theme); }
  toggleTheme() { return toggleTheme(); }

  // --- Feed Controller Delegates ---
  resetFilters() { return resetFilters(this); }
  updateFilterButtonsState() { return updateFilterButtonsState(this); }
  renderVacancies() { return renderVacancies(this); }
  renderPagination(totalItems, totalPages, startIndex, endIndex) { 
    return renderPagination(this, totalItems, totalPages, startIndex, endIndex); 
  }
  renderVacancyCard(vac, now) { return renderVacancyCard(this, vac, now); }
  formatVerificationBadge(status) { return formatVerificationBadge(status); }
  formatEligibilityLabel(status) { return formatEligibilityLabel(status); }
  openEvidenceModal(vacId) { return openEvidenceModal(this, vacId); }

  // --- Application Controller Delegates ---
  syncTrackedApplications() { return syncTrackedApplications(this); }
  checkAndRenderPortalDeadlineReminders() { return checkAndRenderPortalDeadlineReminders(this); }
  openApplicationModal(vacId) { return openApplicationModal(this, vacId); }
  renderTrackedApplications() { return renderTrackedApplications(this); }

  // --- Source Controller Delegates ---
  renderSources() { return renderSources(this); }
  handleRevalidateSources() { return handleRevalidateSources(this); }
  handleRegisterSourcePrompt() { return handleRegisterSourcePrompt(this); }
  openProviderModal() { return openProviderModal(this); }
  renderDiscoveryLogs() { return renderDiscoveryLogs(this); }
  renderTrashSection() { return renderTrashSection(this); }

  // --- Scan Controller Delegates ---
  hydratePersistentCredentials() { return hydratePersistentCredentials(this); }
  pullRealVacanciesQuietly() { return pullRealVacanciesQuietly(this); }
  normalizeAndRepairVacancies() { return normalizeAndRepairVacancies(this); }
  openScheduleModal() { return openScheduleModal(this); }
  handleManualScan() { return handleManualScan(this); }

  escapeHtml(str) {
    return escapeHtml(str);
  }
}



const app = new App();
window.addEventListener('DOMContentLoaded', () => app.init());

// Global Error Boundaries for graceful recovery and user-friendly error banners
window.addEventListener('unhandledrejection', (event) => {
  console.error('[VacancyRadar Global Unhandled Rejection]', event.reason);
  const msg = event.reason?.message || 'An unexpected background error occurred.';
  if (typeof showConfirmationBanner === 'function') {
    showConfirmationBanner('Operational Notice', msg, 'warning', 4500);
  }
});

window.addEventListener('error', (event) => {
  console.error('[VacancyRadar Global Error]', event.error || event.message);
});
