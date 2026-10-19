/**
 * Local Storage & Persistence Service
 * Manages Profiles, Vacancies, Source Registry, Applications, and Activity Logs.
 * Designed to seamlessly bridge with Google Sheets / Apps Script backend.
 */

import { defaultProfile } from '../data/defaultProfile.js';
import { testVacancies } from '../data/testVacancies.js';
import { initialSources } from '../data/initialSources.js';
import { initialSearchProviders } from '../models/providerTypes.js';
import { eventBus, EVENTS } from './eventBus.js';

const STORAGE_KEYS = {
  PROFILES: 'vacancy_radar_profiles_v1',
  ACTIVE_PROFILE_ID: 'vacancy_radar_active_profile_id_v1',
  VACANCIES: 'vacancy_radar_vacancies_v1',
  SOURCES: 'vacancy_radar_sources_v1',
  APPLICATIONS: 'vacancy_radar_applications_v1',
  SCAN_LOGS: 'vacancy_radar_scan_logs_v1',
  PROVIDER_CONFIG: 'vacancy_radar_provider_config_v1',
  SEARCH_PROVIDERS: 'vacancy_radar_search_providers_v1',
  FAILOVER_LOGS: 'vacancy_radar_failover_logs_v1',
  SEARCH_CACHE: 'vacancy_radar_search_cache_v1',
  TRASH_VACANCIES: 'vacancy_radar_trash_vacancies_v1',
  MONITORED_SOURCES: 'vacancy_radar_monitored_sources_v1'
};

class MemoryStore {
  constructor() {
    this.store = new Map();
  }
  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }
  setItem(key, value) {
    this.store.set(key, String(value));
  }
  removeItem(key) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
}

const safeStorage = typeof localStorage !== 'undefined' ? localStorage : new MemoryStore();

export class StorageService {
  constructor(storageAdapter = safeStorage) {
    this.storage = storageAdapter;
    this.initDefaults();
  }

  initDefaults() {
    // 1. Initialize Profiles
    if (!this.storage.getItem(STORAGE_KEYS.PROFILES)) {
      this.storage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify([defaultProfile]));
      this.storage.setItem(STORAGE_KEYS.ACTIVE_PROFILE_ID, defaultProfile.id);
    } else {
      try {
        const storedProfiles = JSON.parse(this.storage.getItem(STORAGE_KEYS.PROFILES) || '[]');
        let profModified = false;
        storedProfiles.forEach(p => {
          if (!p.scheduleSettings) p.scheduleSettings = {};
          if (!p.scheduleSettings.emailAddress || p.scheduleSettings.emailAddress === 'candidate@dfir-india.org') {
            p.scheduleSettings.emailAddress = 'sagarmc2516@gmail.com';
            p.scheduleSettings.notificationEmails = ['sagarmc2516@gmail.com'];
            profModified = true;
          }
          if (!p.scheduleSettings.telegramChatId) {
            p.scheduleSettings.telegramChatId = '5451190370';
            p.scheduleSettings.telegramAlertsEnabled = true;
            profModified = true;
          }
          if (!p.emailRecipient || p.emailRecipient === 'candidate@dfir-india.org') {
            p.emailRecipient = 'sagarmc2516@gmail.com';
            profModified = true;
          }
        });
        if (profModified) {
          this.storage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(storedProfiles));
        }
      } catch (_) {}
    }

    // 2. Initialize Vacancies
    if (!this.storage.getItem(STORAGE_KEYS.VACANCIES)) {
      this.storage.setItem(STORAGE_KEYS.VACANCIES, JSON.stringify(testVacancies));
    }

    // 2b. Initialize Trash Vacancies (Deleted vacancies never shown or re-added)
    if (!this.storage.getItem(STORAGE_KEYS.TRASH_VACANCIES)) {
      this.storage.setItem(STORAGE_KEYS.TRASH_VACANCIES, JSON.stringify([]));
    }

    // 3. Initialize & Upgrade Sources
    if (!this.storage.getItem(STORAGE_KEYS.SOURCES)) {
      this.storage.setItem(STORAGE_KEYS.SOURCES, JSON.stringify(initialSources));
    } else {
      try {
        const storedSources = JSON.parse(this.storage.getItem(STORAGE_KEYS.SOURCES) || '[]');
        let sourcesUpdated = false;
        initialSources.forEach(initSrc => {
          if (!storedSources.some(s => s.domain === initSrc.domain || s.id === initSrc.id)) {
            storedSources.push(initSrc);
            sourcesUpdated = true;
          }
        });
        if (sourcesUpdated) {
          this.storage.setItem(STORAGE_KEYS.SOURCES, JSON.stringify(storedSources));
        }
      } catch (_) {}
    }

    // 4. Initialize Applications
    if (!this.storage.getItem(STORAGE_KEYS.APPLICATIONS)) {
      this.storage.setItem(STORAGE_KEYS.APPLICATIONS, JSON.stringify([]));
    }

    // 5. Initialize Scan Logs
    if (!this.storage.getItem(STORAGE_KEYS.SCAN_LOGS)) {
      const initialLogs = [
        {
          id: 'log-001',
          timestamp: '2026-10-15T08:00:00Z',
          status: 'SUCCESS',
          type: 'SCHEDULED_SCAN',
          message: 'Automated 08:00 IST morning scan completed across 5 active sources.',
          sourcesChecked: 5,
          newVacanciesFound: 2,
          providerQueriesUsed: 0
        }
      ];
      this.storage.setItem(STORAGE_KEYS.SCAN_LOGS, JSON.stringify(initialLogs));
    }

    // 6. Provider Config
    if (!this.storage.getItem(STORAGE_KEYS.PROVIDER_CONFIG)) {
      const defaultProviderConfig = {
        activeProvider: 'FREE_PUBLIC_FEEDS',
        monthlyBudgetInr: 0,
        monthlyQuotaQueries: 100,
        queriesUsedThisMonth: 12,
        estimatedCostInr: 0.00,
        apiKeyConfigured: false,
        googleAppsScriptWebhookUrl: ''
      };
      this.storage.setItem(STORAGE_KEYS.PROVIDER_CONFIG, JSON.stringify(defaultProviderConfig));
    }

    // 7. Search Providers
    if (!this.storage.getItem(STORAGE_KEYS.SEARCH_PROVIDERS)) {
      this.storage.setItem(STORAGE_KEYS.SEARCH_PROVIDERS, JSON.stringify(initialSearchProviders));
    } else {
      try {
        const stored = JSON.parse(this.storage.getItem(STORAGE_KEYS.SEARCH_PROVIDERS) || '[]');
        let modified = false;
        const feeds = stored.find(p => p.id === 'prov-public-feeds');
        if (feeds) {
          feeds.priority = 1;
          feeds.isEnabled = true;
          feeds.name = 'Direct Official & Enterprise Feeds (Self-Reliable ₹0.00 Engine)';
          modified = true;
        }

        let searx = stored.find(p => p.id === 'prov-searxng');
        if (!searx) {
          const defaultSearx = initialSearchProviders.find(p => p.id === 'prov-searxng');
          if (defaultSearx) {
            stored.push(defaultSearx);
            modified = true;
          }
        } else {
          searx.priority = 2;
          searx.isEnabled = true;
          if (!searx.endpoint || searx.endpoint === 'https://etsi.me') {
            searx.endpoint = 'https://www.isci.si';
          }
          modified = true;
        }

        let brave = stored.find(p => p.id === 'prov-brave-search');
        if (!brave) {
          const defaultBrave = initialSearchProviders.find(p => p.id === 'prov-brave-search');
          if (defaultBrave) {
            stored.push(defaultBrave);
            modified = true;
          }
        } else {
          brave.priority = 3;
          brave.freeQuotaLimit = 2000;
          modified = true;
        }

        const serp = stored.find(p => p.id === 'prov-serpapi');
        if (serp) {
          serp.priority = 4; // Fourth Priority backup
          serp.freeQuotaLimit = 250;
          serp.quotaRemaining = serp.quotaRemaining || 249;
          serp.name = 'SerpApi Google Jobs Search (Free 250/Month Backup)';
          serp.isEnabled = true;
          serp.requiresUserConsent = true;
          serp.askUserFirst = true;
          modified = true;
        }

        const g = stored.find(p => p.id === 'prov-google-cse');
        if (g) {
          g.priority = 99;
          g.isEnabled = false;
          g.healthStatus = ProviderHealthStatus.DISABLED;
          modified = true;
        }

        const bing = stored.find(p => p.id === 'prov-bing-search');
        if (bing) {
          bing.priority = 99;
          bing.isEnabled = false;
          bing.healthStatus = ProviderHealthStatus.DISABLED;
          modified = true;
        }

        if (modified) {
          this.storage.setItem(STORAGE_KEYS.SEARCH_PROVIDERS, JSON.stringify(stored));
        }
      } catch (e) {}
    }

    // 8. Failover Logs
    if (!this.storage.getItem(STORAGE_KEYS.FAILOVER_LOGS)) {
      this.storage.setItem(STORAGE_KEYS.FAILOVER_LOGS, JSON.stringify([]));
    }

    // 9. Search Cache
    if (!this.storage.getItem(STORAGE_KEYS.SEARCH_CACHE)) {
      this.storage.setItem(STORAGE_KEYS.SEARCH_CACHE, JSON.stringify({}));
    }
  }

  // --- Profiles Management ---
  getProfiles() {
    return JSON.parse(this.storage.getItem(STORAGE_KEYS.PROFILES) || '[]');
  }

  getActiveProfile() {
    const profiles = this.getProfiles();
    const activeId = this.storage.getItem(STORAGE_KEYS.ACTIVE_PROFILE_ID);
    return profiles.find(p => p.id === activeId) || profiles[0] || defaultProfile;
  }

  saveProfile(profile) {
    const profiles = this.getProfiles();
    const index = profiles.findIndex(p => p.id === profile.id);
    if (index >= 0) {
      profiles[index] = { ...profile, updatedAt: new Date().toISOString() };
    } else {
      profiles.push({ ...profile, id: profile.id || `profile-${Date.now()}`, createdAt: new Date().toISOString() });
    }
    this.storage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profiles));
    eventBus.publish(EVENTS.PROFILES_UPDATED, profiles);
    return profile;
  }

  setActiveProfile(profileId) {
    this.storage.setItem(STORAGE_KEYS.ACTIVE_PROFILE_ID, profileId);
    eventBus.publish(EVENTS.PROFILE_CHANGED, profileId);
  }

  // --- Vacancies Management ---
  getVacancies() {
    return JSON.parse(this.storage.getItem(STORAGE_KEYS.VACANCIES) || '[]');
  }

  saveVacancy(vacancy) {
    if (!vacancy) return null;
    // CRITICAL: Block trashed vacancies from being resurrected by upcoming scans or searches
    if (this.isTrashed(vacancy)) {
      return null;
    }

    const list = this.getVacancies();
    const index = list.findIndex(v => v.id === vacancy.id);
    if (index >= 0) {
      list[index] = vacancy;
    } else {
      list.unshift(vacancy);
    }
    this.storage.setItem(STORAGE_KEYS.VACANCIES, JSON.stringify(list));
    eventBus.publish(EVENTS.VACANCIES_UPDATED, { action: 'save', vacancy });
    return vacancy;
  }

  purgeTestData() {
    const list = this.getVacancies().filter(v => !v.isTestData);
    this.storage.setItem(STORAGE_KEYS.VACANCIES, JSON.stringify(list));
    eventBus.publish(EVENTS.VACANCIES_UPDATED, { action: 'purge', vacancies: list });
    return list;
  }

  saveAllVacancies(list) {
    // Filter out any trashed vacancies to ensure they are never resurrected
    const activeOnly = (list || []).filter(v => !this.isTrashed(v));
    this.storage.setItem(STORAGE_KEYS.VACANCIES, JSON.stringify(activeOnly));
    eventBus.publish(EVENTS.VACANCIES_UPDATED, { action: 'saveAll', count: activeOnly.length });
    return activeOnly;
  }

  // --- Trash & Anti-Resurrection Management ---
  getTrash() {
    return this.getTrashVacancies();
  }

  getTrashVacancies() {
    return JSON.parse(this.storage.getItem(STORAGE_KEYS.TRASH_VACANCIES) || '[]');
  }

  /**
   * Checks if a vacancy (or ID/Advt) is currently in the Trash folder.
   * Matches by ID, Advertisement Number, Source URL, PDF URL, or Title+Org.
   */
  isTrashed(candidate) {
    if (!candidate) return false;
    const trash = this.getTrashVacancies();
    if (!trash || trash.length === 0) return false;

    if (typeof candidate === 'string') {
      const target = candidate.trim().toLowerCase();
      return trash.some(t => 
        (t.id && t.id.toLowerCase() === target) ||
        (t.advertisementNumber && t.advertisementNumber.toLowerCase() === target)
      );
    }

    return trash.some(t => {
      // 1. Direct ID match
      if (candidate.id && t.id && candidate.id === t.id) return true;
      
      // 2. Advertisement Reference match (e.g. Advt No.)
      if (candidate.advertisementNumber && t.advertisementNumber && 
          candidate.advertisementNumber.trim().toLowerCase() === t.advertisementNumber.trim().toLowerCase()) {
        return true;
      }

      // 3. Official Source URL match
      if (candidate.sourceUrl && t.sourceUrl && candidate.sourceUrl.trim().toLowerCase() === t.sourceUrl.trim().toLowerCase()) {
        return true;
      }

      // 4. Official Notice PDF URL match
      const cPdf = candidate.verification?.officialNoticePdfUrl;
      const tPdf = t.verification?.officialNoticePdfUrl;
      if (cPdf && tPdf && cPdf.trim().toLowerCase() === tPdf.trim().toLowerCase()) {
        return true;
      }

      // 5. Title & Organisation combination match
      if (candidate.title && t.title && 
          candidate.title.trim().toLowerCase() === t.title.trim().toLowerCase() &&
          candidate.organisation && t.organisation &&
          candidate.organisation.trim().toLowerCase() === t.organisation.trim().toLowerCase()) {
        return true;
      }

      return false;
    });
  }

  /**
   * Moves a vacancy from the active list into the Trash folder.
   * Prevents it from appearing in upcoming searches or active feeds.
   */
  moveToTrash(vacancyId) {
    const list = this.getVacancies();
    const idx = list.findIndex(v => v.id === vacancyId);
    if (idx === -1) return null;

    const [vac] = list.splice(idx, 1);
    vac.isTrashed = true;
    vac.trashedAt = new Date().toISOString();

    const trash = this.getTrashVacancies();
    // Avoid duplicate entries in trash
    const existingTrashIdx = trash.findIndex(t => t.id === vac.id);
    if (existingTrashIdx >= 0) {
      trash[existingTrashIdx] = vac;
    } else {
      trash.unshift(vac);
    }

    this.storage.setItem(STORAGE_KEYS.VACANCIES, JSON.stringify(list));
    this.storage.setItem(STORAGE_KEYS.TRASH_VACANCIES, JSON.stringify(trash));
    eventBus.publish(EVENTS.VACANCIES_UPDATED, { action: 'trash', vacancy: vac });
    return vac;
  }

  /**
   * Recovers/restores a vacancy from the Trash folder back into active vacancies.
   */
  restoreFromTrash(vacancyId) {
    const trash = this.getTrashVacancies();
    const idx = trash.findIndex(v => v.id === vacancyId);
    if (idx === -1) return null;

    const [vac] = trash.splice(idx, 1);
    delete vac.isTrashed;
    delete vac.trashedAt;

    const list = this.getVacancies();
    const existingIdx = list.findIndex(v => v.id === vac.id);
    if (existingIdx >= 0) {
      list[existingIdx] = vac;
    } else {
      list.unshift(vac);
    }

    this.storage.setItem(STORAGE_KEYS.VACANCIES, JSON.stringify(list));
    this.storage.setItem(STORAGE_KEYS.TRASH_VACANCIES, JSON.stringify(trash));
    eventBus.publish(EVENTS.VACANCIES_UPDATED, { action: 'restore', vacancy: vac });
    return vac;
  }

  /**
   * Permanently deletes a single vacancy from the Trash folder.
   */
  deletePermanentlyFromTrash(vacancyId) {
    const trash = this.getTrashVacancies().filter(v => v.id !== vacancyId);
    this.storage.setItem(STORAGE_KEYS.TRASH_VACANCIES, JSON.stringify(trash));
    eventBus.publish(EVENTS.VACANCIES_UPDATED, { action: 'deleteTrash', vacancyId });
    return trash;
  }

  /**
   * Empties the entire Trash folder permanently.
   */
  emptyTrash() {
    this.storage.setItem(STORAGE_KEYS.TRASH_VACANCIES, JSON.stringify([]));
    eventBus.publish(EVENTS.VACANCIES_UPDATED, { action: 'emptyTrash' });
    return [];
  }

  // --- Source Registry Management ---
  getSources() {
    return JSON.parse(this.storage.getItem(STORAGE_KEYS.SOURCES) || '[]');
  }

  saveSource(source) {
    const sources = this.getSources();
    const idx = sources.findIndex(s => s.id === source.id || s.domain === source.domain);
    if (idx >= 0) {
      sources[idx] = { ...sources[idx], ...source };
    } else {
      sources.push({ ...source, id: source.id || `src-${Date.now()}` });
    }
    this.storage.setItem(STORAGE_KEYS.SOURCES, JSON.stringify(sources));
    eventBus.publish(EVENTS.SOURCES_UPDATED, { action: 'save', source });
  }

  toggleSourceEnabled(sourceId) {
    const sources = this.getSources();
    const item = sources.find(s => s.id === sourceId);
    if (item) {
      item.isEnabled = !item.isEnabled;
      this.storage.setItem(STORAGE_KEYS.SOURCES, JSON.stringify(sources));
    }
    return item;
  }

  // --- Tracked Applications ---
  getApplications() {
    return JSON.parse(this.storage.getItem(STORAGE_KEYS.APPLICATIONS) || '[]');
  }

  saveApplication(appRecord) {
    const apps = this.getApplications();
    const idx = apps.findIndex(a => a.vacancyId === appRecord.vacancyId);
    if (idx >= 0) {
      apps[idx] = { ...apps[idx], ...appRecord, updatedAt: new Date().toISOString() };
    } else {
      apps.unshift({
        id: `app-${Date.now()}`,
        appliedAt: new Date().toISOString(),
        ...appRecord
      });
    }
    this.storage.setItem(STORAGE_KEYS.APPLICATIONS, JSON.stringify(apps));
    eventBus.publish(EVENTS.APPLICATIONS_UPDATED, { action: 'save', appRecord });
    return apps;
  }

  // --- Logs & Provider Settings ---
  getLogs() {
    return JSON.parse(this.storage.getItem(STORAGE_KEYS.SCAN_LOGS) || '[]');
  }

  addLog(entry) {
    const logs = this.getLogs();
    logs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      ...entry
    });
    if (logs.length > 100) logs.pop();
    this.storage.setItem(STORAGE_KEYS.SCAN_LOGS, JSON.stringify(logs));
  }

  getProviderConfig() {
    return JSON.parse(this.storage.getItem(STORAGE_KEYS.PROVIDER_CONFIG) || '{}');
  }

  saveProviderConfig(config) {
    this.storage.setItem(STORAGE_KEYS.PROVIDER_CONFIG, JSON.stringify(config));
  }

  // --- Search Providers Orchestration ---
  getSearchProviders() {
    return JSON.parse(this.storage.getItem(STORAGE_KEYS.SEARCH_PROVIDERS) || '[]');
  }

  saveSearchProvider(provider) {
    const list = this.getSearchProviders();
    const idx = list.findIndex(p => p.id === provider.id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...provider };
    } else {
      list.push({ ...provider, id: provider.id || `prov-${Date.now()}` });
    }
    this.storage.setItem(STORAGE_KEYS.SEARCH_PROVIDERS, JSON.stringify(list));
    eventBus.publish(EVENTS.PROVIDERS_UPDATED, { action: 'save', provider });
    return provider;
  }

  deleteSearchProvider(providerId) {
    const list = this.getSearchProviders().filter(p => p.id !== providerId);
    this.storage.setItem(STORAGE_KEYS.SEARCH_PROVIDERS, JSON.stringify(list));
    eventBus.publish(EVENTS.PROVIDERS_UPDATED, { action: 'delete', providerId });
    return list;
  }

  resetSearchProvidersToDefault() {
    this.storage.setItem(STORAGE_KEYS.SEARCH_PROVIDERS, JSON.stringify(initialSearchProviders));
    return initialSearchProviders;
  }

  getFailoverLogs() {
    return JSON.parse(this.storage.getItem(STORAGE_KEYS.FAILOVER_LOGS) || '[]');
  }

  addFailoverLog(entry) {
    const logs = this.getFailoverLogs();
    logs.unshift({
      id: `fo-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      ...entry
    });
    if (logs.length > 50) logs.pop();
    this.storage.setItem(STORAGE_KEYS.FAILOVER_LOGS, JSON.stringify(logs));
  }

  clearFailoverLogs() {
    this.storage.setItem(STORAGE_KEYS.FAILOVER_LOGS, JSON.stringify([]));
  }

  getSearchCache(key) {
    const cache = JSON.parse(this.storage.getItem(STORAGE_KEYS.SEARCH_CACHE) || '{}');
    return cache[key] || null;
  }

  setSearchCache(key, data) {
    const cache = JSON.parse(this.storage.getItem(STORAGE_KEYS.SEARCH_CACHE) || '{}');
    cache[key] = data;
    this.storage.setItem(STORAGE_KEYS.SEARCH_CACHE, JSON.stringify(cache));
  }

  clearSearchCache() {
    this.storage.setItem(STORAGE_KEYS.SEARCH_CACHE, JSON.stringify({}));
  }

  getMonitoredSources() {
    try {
      const data = this.storage.getItem(STORAGE_KEYS.MONITORED_SOURCES);
      return data ? JSON.parse(data) : null;
    } catch (_) {
      return null;
    }
  }

  saveMonitoredSources(sources) {
    try {
      this.storage.setItem(STORAGE_KEYS.MONITORED_SOURCES, JSON.stringify(sources));
    } catch (_) {}
  }

  resetAllToFactoryDefaults() {
    this.storage.clear();
    this.initDefaults();
  }
}

export const storageService = new StorageService();
