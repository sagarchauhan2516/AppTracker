/**
 * Vacancy Radar India - Scraper API Routes
 * Exposes endpoints for triggering apex web scrapers, monitoring scraper health,
 * and test-scraping individual government portals.
 */

import {
  sendJson,
  readRequestBody,
  checkRateLimit,
  loadStoredProfiles
} from '../context.js';
import {
  ApexPortalScraper,
  MONITORED_APEX_SCRAPERS
} from '../scrapers/apexPortalScraper.js';

export async function handleScraperRoutes(req, res, reqPath) {
  // 1. List Monitored Apex Scrapers & Status
  if (reqPath === '/api/scrapers/list' && req.method === 'GET') {
    try {
      const list = MONITORED_APEX_SCRAPERS.map(s => ({
        id: s.id,
        name: s.name,
        shortName: s.shortName,
        domain: s.domain,
        portalUrl: s.portalUrl,
        category: s.category,
        description: s.description,
        enabled: s.enabled,
        status: 'READY'
      }));

      sendJson(res, 200, {
        success: true,
        count: list.length,
        scrapers: list,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      sendJson(res, 500, { success: false, error: err.message });
    }
    return true;
  }

  // 2. Run Apex Web Scrapers (Batch or Targeted)
  if (reqPath === '/api/scrapers/run' && req.method === 'POST') {
    const clientKey = `${req.socket?.remoteAddress || 'local'}:scrapers-run`;
    if (!checkRateLimit(clientKey, 25, 60000)) {
      sendJson(res, 429, { success: false, error: 'Rate limit exceeded for web scrapers. Please wait a minute.' });
      return true;
    }

    try {
      const body = await readRequestBody(req);
      let targetDomains = body.targetDomains || [];

      // If no target domains provided, extract from active user profile on disk if available
      if (targetDomains.length === 0) {
        try {
          const profiles = loadStoredProfiles();
          const activeProf = profiles.find(p => p.isActive) || profiles[0];
          if (activeProf?.targetFocus?.enabled && Array.isArray(activeProf.targetFocus.targetDomains)) {
            targetDomains = activeProf.targetFocus.targetDomains;
          }
        } catch (_) {}
      }

      const scrapeResult = await ApexPortalScraper.scrapeAllApexPortals({
        targetDomains,
        forceRefresh: !!body.forceRefresh,
        profileKeywords: body.profileKeywords || []
      });

      sendJson(res, 200, scrapeResult);
    } catch (err) {
      sendJson(res, 500, { success: false, error: err.message });
    }
    return true;
  }

  // 3. Test-Scrape Single Portal On-Demand
  if (reqPath === '/api/scrapers/test-single' && req.method === 'POST') {
    const clientKey = `${req.socket?.remoteAddress || 'local'}:scraper-test`;
    if (!checkRateLimit(clientKey, 30, 60000)) {
      sendJson(res, 429, { success: false, error: 'Rate limit exceeded for test scraping. Please wait a minute.' });
      return true;
    }

    try {
      const body = await readRequestBody(req);
      const portalTarget = (body.portalId || body.domain || body.url || '').trim();

      if (!portalTarget) {
        sendJson(res, 400, { success: false, error: 'Portal target (id, domain, or url) is required.' });
        return true;
      }

      const result = await ApexPortalScraper.scrapeSinglePortal(portalTarget);
      sendJson(res, 200, result);
    } catch (err) {
      sendJson(res, 500, { success: false, error: err.message });
    }
    return true;
  }

  return false;
}
