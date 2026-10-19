import {
  sendJson,
  readRequestBody,
  checkRateLimit,
  loadStoredCredentials,
  saveStoredCredentials,
  PUBLIC_SEARXNG_MIRRORS
} from '../context.js';

export function parseJobDates(title, snippet, pubDateStr) {
  const text = `${title || ''} ${snippet || ''}`;
  let publishedAt = '';
  try {
    if (pubDateStr) {
      const d = new Date(pubDateStr);
      if (!isNaN(d.getTime())) {
        publishedAt = d.toISOString().slice(0, 10);
      }
    }
  } catch (_) {}
  if (!publishedAt) {
    publishedAt = new Date().toISOString().slice(0, 10);
  }

  let closingDate = '';
  const datePatterns = [
    /(?:last\s*date|closing\s*date|apply\s*before|deadline|end\s*date|till|upto)[\s:–—]+(\d{1,2}[-/\.](?:[0-9]{1,2}|[A-Za-z]{3,9})[-/\.]\d{2,4})/i,
    /(?:last\s*date|closing\s*date|apply\s*before|deadline|end\s*date)[\s:–—]+(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})/i
  ];

  for (const pat of datePatterns) {
    const match = text.match(pat);
    if (match && match[1]) {
      try {
        const parsed = new Date(match[1]);
        if (!isNaN(parsed.getTime())) {
          closingDate = parsed.toISOString().slice(0, 10);
          break;
        }
      } catch (_) {}
    }
  }

  if (!closingDate) {
    try {
      const pub = new Date(publishedAt);
      const estClose = new Date(pub.getTime() + 28 * 24 * 60 * 60 * 1000);
      closingDate = estClose.toISOString().slice(0, 10);
    } catch (_) {
      closingDate = '2026-11-20';
    }
  }

  return { publishedAt, closingDate };
}

export async function handleSearchRoutes(req, res, reqPath) {
  // 1. Google Apps Script Webhook Ping / Test
  if (reqPath === '/api/test-webhook' && req.method === 'POST') {
    try {
      const body = await readRequestBody(req);
      const targetUrl = (body.url || '').trim();
      if (!targetUrl) {
        sendJson(res, 400, { success: false, error: 'Webhook URL is required.' });
        return true;
      }

      const secretToken = (body.secretToken || loadStoredCredentials().webhookSecretToken || '').trim();
      const pingPayload = { action: 'PING', timestamp: new Date().toISOString() };
      if (secretToken) pingPayload.secretToken = secretToken;

      const t0 = Date.now();
      let response = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(pingPayload),
        signal: AbortSignal.timeout(12000)
      });

      if (!response.ok && response.status !== 302) {
        response = await fetch(targetUrl + (targetUrl.includes('?') ? '&' : '?') + 'action=ping', {
          method: 'GET',
          signal: AbortSignal.timeout(12000)
        });
      }

      const latencyMs = Date.now() - t0;
      const text = await response.text();
      let parsed = null;
      try { parsed = JSON.parse(text); } catch (_) { parsed = text; }

      if (response.ok) {
        saveStoredCredentials({ googleAppsScriptWebhookUrl: targetUrl });
      }

      sendJson(res, 200, {
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        latencyMs,
        data: parsed,
        message: response.ok ? 'Google Apps Script Webhook is active and responding!' : `Server returned HTTP ${response.status}`
      });
    } catch (err) {
      sendJson(res, 500, {
        success: false,
        error: err.message || 'Failed to connect to Google Apps Script Webhook.'
      });
    }
    return true;
  }

  // 2. Google Custom Search API Live Validation
  if (reqPath === '/api/test-google' && req.method === 'POST') {
    try {
      const body = await readRequestBody(req);
      const apiKey = (body.apiKey || '').trim();
      const cx = (body.cx || '').trim();

      if (!apiKey) {
        sendJson(res, 400, { success: false, message: 'Google API Key is required.' });
        return true;
      }
      if (!cx) {
        sendJson(res, 400, { success: false, message: 'Search Engine ID (CX) is required.' });
        return true;
      }

      const googleUrl = `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(apiKey)}&cx=${encodeURIComponent(cx)}&q=${encodeURIComponent('Forensics recruitment 2026')}`;
      const response = await fetch(googleUrl, { signal: AbortSignal.timeout(12000) });
      const data = await response.json();

      if (response.ok) {
        sendJson(res, 200, {
          success: true,
          status: 200,
          totalResults: data.searchInformation?.totalResults || '0',
          itemsFound: data.items ? data.items.length : 0,
          sampleTitle: data.items?.[0]?.title || 'Recruitment notice',
          message: `Google Custom Search verified! (${data.items?.length || 0} sample results retrieved)`
        });
        return true;
      }

      const errObj = data.error || {};
      const errMsg = errObj.message || 'Google API returned error';
      const isClosedToNewProjects = errMsg.includes('does not have the access to Custom Search JSON API');
      const isNotEnabled = errMsg.includes('Custom Search JSON API') || errObj.code === 403;

      sendJson(res, 200, {
        success: false,
        status: errObj.code || response.status,
        errorType: isClosedToNewProjects ? 'API_CLOSED_TO_NEW_PROJECTS' : (isNotEnabled ? 'API_NOT_ENABLED' : 'CONFIG_ERROR'),
        message: isClosedToNewProjects
          ? 'Google has officially closed the Custom Search JSON API to new projects and customers. Even though the API toggle is enabled in Google Cloud Console, Google no longer allows new project sign-ups.'
          : errMsg,
        solution: 'Use your connected SerpApi (250 searches/month free, no card needed) and Direct RSS Feeds. The engine automatically routes searches to SerpApi without any cost.',
        enableUrl: 'https://console.cloud.google.com/apis/library/customsearch.googleapis.com',
        details: errObj
      });
    } catch (err) {
      sendJson(res, 500, { success: false, message: err.message });
    }
    return true;
  }

  // 3. SerpApi Live Validation & Status
  if (reqPath === '/api/test-serpapi' && req.method === 'POST') {
    try {
      const body = await readRequestBody(req);
      const apiKey = (body.apiKey || '').trim();

      if (!apiKey) {
        sendJson(res, 400, { success: false, message: 'SerpApi Private Key is required.' });
        return true;
      }

      const serpUrl = `https://serpapi.com/account.json?api_key=${encodeURIComponent(apiKey)}`;
      const response = await fetch(serpUrl, { signal: AbortSignal.timeout(12000) });
      const data = await response.json();

      if (response.ok && data.account_id) {
        const remaining = data.total_searches_left ?? data.plan_searches_left ?? 250;
        sendJson(res, 200, {
          success: true,
          accountEmail: data.account_email,
          accountStatus: data.account_status,
          planName: data.plan_name || 'Free Plan',
          searchesPerMonth: data.searches_per_month || 250,
          searchesLeft: remaining,
          message: `SerpApi Verified! Account: ${data.account_email} | Remaining: ${remaining} / ${data.searches_per_month || 250}`
        });
        return true;
      }

      sendJson(res, 200, {
        success: false,
        message: data.error || 'Invalid SerpApi Key (HTTP 401 Unauthorized)'
      });
    } catch (err) {
      sendJson(res, 500, { success: false, message: err.message });
    }
    return true;
  }

  // 3c. Brave Search API Live Validation
  if (reqPath === '/api/test-brave' && req.method === 'POST') {
    try {
      const body = await readRequestBody(req);
      const apiKey = (body.apiKey || '').trim();

      if (!apiKey) {
        sendJson(res, 400, { success: false, message: 'Brave Search API Key is required.' });
        return true;
      }

      const braveUrl = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent('Forensics recruitment India')}&count=3`;
      const response = await fetch(braveUrl, {
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip',
          'X-Subscription-Token': apiKey
        },
        signal: AbortSignal.timeout(12000)
      });

      if (response.ok) {
        const data = await response.json();
        const results = data.web?.results || [];
        sendJson(res, 200, {
          success: true,
          status: 200,
          resultsFound: results.length,
          sampleTitle: results[0]?.title || 'Brave search query OK',
          message: `Brave Search API Verified! (Free Tier active: 2,000 queries/month, 1 QPS rate limit). ${results.length} test results returned.`
        });
        return true;
      }

      if (response.status === 401 || response.status === 403) {
        sendJson(res, 200, {
          success: false,
          status: response.status,
          message: 'Invalid Brave Search API Key (HTTP 401 Unauthorized). Please check your token from api.search.brave.com/app/keys.'
        });
        return true;
      }

      if (response.status === 429) {
        sendJson(res, 200, {
          success: false,
          status: 429,
          message: 'Brave Search API rate limit reached (1 Query Per Second on Free Tier). Retry in a few seconds.'
        });
        return true;
      }

      const errText = await response.text();
      sendJson(res, 200, {
        success: false,
        status: response.status,
        message: `Brave API HTTP ${response.status}: ${errText.slice(0, 150)}`
      });
    } catch (err) {
      sendJson(res, 500, { success: false, message: err.message });
    }
    return true;
  }

  // 3b. SearXNG Metasearch Live Validation with Auto-Shift Fallback Pool
  if (reqPath === '/api/test-searxng' && req.method === 'POST') {
    try {
      const body = await readRequestBody(req);
      const userEndpoint = (body.endpoint || 'https://www.isci.si').replace(/\/+$/, '');
      const testQuery = 'deloitte india careers';
      
      const candidateMirrors = [...new Set([userEndpoint, ...PUBLIC_SEARXNG_MIRRORS].filter(Boolean))];
      let firstError = null;

      for (let i = 0; i < candidateMirrors.length; i++) {
        const mirror = candidateMirrors[i];
        const searxUrl = `${mirror}/search?q=${encodeURIComponent(testQuery)}&format=json`;
        const startTime = Date.now();
        try {
          const response = await fetch(searxUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
            },
            signal: AbortSignal.timeout(4500)
          });
          const latencyMs = Date.now() - startTime;
          const contentType = response.headers.get('content-type') || '';

          if (response.ok && contentType.includes('json')) {
            const data = await response.json();
            const results = data.results || [];
            if (results.length > 0) {
              const engines = [...new Set(results.map(r => r.engine).filter(Boolean))];
              const wasShifted = mirror !== userEndpoint;

              sendJson(res, 200, {
                success: true,
                status: 200,
                latencyMs,
                endpoint: mirror,
                originalEndpoint: userEndpoint,
                wasShifted,
                resultCount: results.length,
                engines: engines.length > 0 ? engines : ['google', 'bing', 'duckduckgo'],
                sampleTitle: results[0]?.title || 'Careers listing',
                message: wasShifted
                  ? `SearXNG Auto-Shifted! Primary instance (${userEndpoint}) was busy or rate-limited. Successfully connected to working public mirror: ${mirror} (${latencyMs}ms, ${results.length} results).`
                  : `SearXNG Verified! (${latencyMs}ms latency, ${results.length} results aggregated across ${engines.join(', ') || 'web engines'}).`
              });
              return true;
            }
          } else {
            if (!firstError) firstError = `HTTP ${response.status} (${contentType.slice(0, 25)})`;
          }
        } catch (fetchErr) {
          if (!firstError) firstError = fetchErr.message;
        }
      }

      sendJson(res, 200, {
        success: false,
        message: `All ${candidateMirrors.length} SearXNG public mirrors were rate-limited or busy. (${firstError}). The system will automatically fall over to SerpApi (Priority 3).`
      });
    } catch (err) {
      sendJson(res, 200, {
        success: false,
        message: `SearXNG test error: ${err.message}`
      });
    }
    return true;
  }

  // 4. Webhook Data Sync Proxy
  if (reqPath === '/api/sync-webhook' && req.method === 'POST') {
    try {
      const body = await readRequestBody(req);
      const targetUrl = (body.url || loadStoredCredentials().googleAppsScriptWebhookUrl || '').trim();
      const payload = body.payload || {};

      if (!targetUrl) {
        sendJson(res, 400, { success: false, error: 'Webhook URL missing' });
        return true;
      }

      const secretToken = (body.secretToken || loadStoredCredentials().webhookSecretToken || '').trim();
      if (secretToken && !payload.secretToken) {
        payload.secretToken = secretToken;
      }

      saveStoredCredentials({ googleAppsScriptWebhookUrl: targetUrl });

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000)
      });

      const text = await response.text();
      let parsed = null;
      try { parsed = JSON.parse(text); } catch (_) { parsed = text; }

      sendJson(res, 200, {
        success: response.ok,
        status: response.status,
        data: parsed
      });
    } catch (err) {
      sendJson(res, 500, { success: false, error: err.message });
    }
    return true;
  }

  // 4b. Pull Real Vacancies from Google Sheet Database
  if (reqPath === '/api/pull-vacancies' && req.method === 'POST') {
    try {
      const body = await readRequestBody(req);
      const targetUrl = (body.url || loadStoredCredentials().googleAppsScriptWebhookUrl || '').trim();

      if (!targetUrl) {
        sendJson(res, 400, { success: false, error: 'Webhook URL missing' });
        return true;
      }

      const secretToken = (body.secretToken || loadStoredCredentials().webhookSecretToken || '').trim();
      const pullPayload = { action: 'GET_VACANCIES' };
      if (secretToken) pullPayload.secretToken = secretToken;

      saveStoredCredentials({ googleAppsScriptWebhookUrl: targetUrl });

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(pullPayload),
        signal: AbortSignal.timeout(15000)
      });

      const text = await response.text();
      let parsed = null;
      try { parsed = JSON.parse(text); } catch (_) { parsed = text; }

      sendJson(res, 200, {
        success: response.ok,
        status: response.status,
        data: parsed
      });
    } catch (err) {
      sendJson(res, 500, { success: false, error: err.message });
    }
    return true;
  }

  // 4b. Live Public Feeds Proxy
  if (reqPath === '/api/live-feeds' && req.method === 'POST') {
    try {
      const body = await readRequestBody(req);
      const query = (body.query || '').toLowerCase().trim();
      const feedUrls = [
        'https://www.freejobalert.com/feed',
        'https://www.freejobalert.com/it-jobs/feed/',
        'https://www.freejobalert.com/police-defence-jobs/feed/',
        'https://www.freejobalert.com/engineering-jobs/feed/',
        'https://www.sarkariresult.com/feed/',
        'https://www.indgovtjobs.in/feeds/posts/default?alt=rss',
        'https://www.ncs.gov.in/rss/all-jobs.xml',
        'https://www.freshersworld.com/feed/government-jobs'
      ];

      const allLeads = [];
      for (const feedUrl of feedUrls) {
        try {
          const resFeed = await fetch(feedUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            signal: AbortSignal.timeout(6000)
          });
          if (resFeed.ok) {
            const xml = await resFeed.text();
            const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
            let match;
            while ((match = itemRegex.exec(xml)) !== null && allLeads.length < 40) {
              const itemXml = match[1];
              const titleRaw = (itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/i) || itemXml.match(/<title>(.*?)<\/title>/i) || [])[1] || '';
              const link = (itemXml.match(/<link>(.*?)<\/link>/i) || [])[1] || '';
              const pubDate = (itemXml.match(/<pubDate>(.*?)<\/pubDate>/i) || [])[1] || '';
              const descRaw = (itemXml.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/i) || itemXml.match(/<description>(.*?)<\/description>/i) || [])[1] || '';

              const title = titleRaw.replace(/&#8211;/g, '-').replace(/&amp;/g, '&').replace(/<[^>]+>/g, '').trim();
              const snippet = descRaw.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim().slice(0, 300);

              if (title && link) {
                const queryWords = query.split(/\s+/).filter(w => w.length > 2 && !['and', 'the', 'for', 'with', 'site:'].includes(w));
                const textToMatch = `${title} ${snippet}`.toLowerCase();
                const matches = queryWords.length === 0 || queryWords.some(w => textToMatch.includes(w));

                if (matches) {
                  let hostname = 'official.gov.in';
                  try { hostname = new URL(link).hostname.replace(/^www\./i, ''); } catch (_) {}

                  const orgMatch = title.match(/^([A-Za-z0-9\s]{3,25}?)(?:\s+Recruitment|\s+Notification|\s+Exam|\s+Result|\s+–|\s+-)/i);
                  const organisation = orgMatch ? orgMatch[1].trim() : 'Public Recruitment Authority';
                  const jobDates = parseJobDates(title, snippet, pubDate);

                  allLeads.push({
                    title,
                    organisation,
                    domain: hostname,
                    sourceCategory: 'OFFICIAL_EMPLOYER',
                    sourceUrl: link,
                    evidenceUrl: link,
                    officialNoticePdfUrl: (link.toLowerCase().endsWith('.pdf')) ? link : '',
                    extractedSnippet: snippet || `Official vacancy notice published on ${hostname}.`,
                    dates: jobDates,
                    isLiveDiscovered: true
                  });
                }
              }
            }
          }
        } catch (_) {}
      }

      sendJson(res, 200, {
        success: true,
        leads: allLeads,
        provider: 'Live Public Career Feeds (RSS)'
      });
    } catch (err) {
      sendJson(res, 500, { success: false, error: err.message });
    }
    return true;
  }

  // 5. Live Search Engine Proxy
  if (reqPath === '/api/search-proxy' && req.method === 'POST') {
    const clientKey = `${req.socket?.remoteAddress || 'local'}:search-proxy`;
    if (!checkRateLimit(clientKey, 45, 60000)) {
      sendJson(res, 429, { success: false, error: 'Rate limit exceeded for search queries. Please wait a minute.' });
      return true;
    }
    try {
      const body = await readRequestBody(req);
      const { providerType, query, apiKey, cx, endpoint } = body;

      if (providerType === 'SEARXNG') {
        const userEndpoint = (endpoint || 'https://www.isci.si').replace(/\/+$/, '');
        const candidateMirrors = [...new Set([userEndpoint, ...PUBLIC_SEARXNG_MIRRORS].filter(Boolean))];
        let successfulData = null;
        let successfulMirror = null;

        for (const mirror of candidateMirrors) {
          try {
            const targetUrl = `${mirror}/search?q=${encodeURIComponent(query)}&format=json`;
            const response = await fetch(targetUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
              },
              signal: AbortSignal.timeout(4500)
            });
            const contentType = response.headers.get('content-type') || '';
            if (response.ok && contentType.includes('json')) {
              const data = await response.json();
              if (data.results && data.results.length > 0) {
                successfulData = data;
                successfulMirror = mirror;
                break;
              }
            }
          } catch (_) {}
        }

        if (successfulData && successfulData.results) {
          const rawResults = successfulData.results;
          const leads = rawResults.map(r => {
            let hostname = '';
            try { hostname = new URL(r.url).hostname.replace(/^www\./i, ''); } catch (_) { hostname = 'enterprise.com'; }
            const isGov = hostname.endsWith('.gov.in') || hostname.endsWith('.nic.in') || hostname.endsWith('.ac.in');
            const isBig4 = /deloitte|pwc|ey\.com|kpmg|kroll|bdo|grantthornton/i.test(hostname);
            const jobDates = parseJobDates(r.title, r.content, r.publishedDate);

            return {
              title: r.title || 'Recruitment Opening',
              organisation: isBig4 ? hostname.toUpperCase() : (isGov ? 'Apex Govt Institution' : hostname),
              domain: hostname,
              sourceCategory: isGov ? 'OFFICIAL_EMPLOYER' : (isBig4 ? 'OFFICIAL_EMPLOYER' : 'THIRD_PARTY_PORTAL'),
              sourceUrl: r.url,
              evidenceUrl: r.url,
              officialNoticePdfUrl: (r.url && r.url.toLowerCase().endsWith('.pdf')) ? r.url : '',
              extractedSnippet: (r.content || r.title || '').substring(0, 300),
              dates: jobDates,
              isLiveDiscovered: true
            };
          });

          sendJson(res, 200, {
            success: true,
            leads,
            provider: `SearXNG (${successfulMirror})`,
            mirror: successfulMirror,
            wasShifted: successfulMirror !== userEndpoint
          });
          return true;
        }

        sendJson(res, 200, {
          success: false,
          error: `All ${candidateMirrors.length} SearXNG public mirrors were rate-limited or unreachable. Failover engine will route to SerpApi.`
        });
        return true;
      }

      if (providerType === 'BRAVE_SEARCH') {
        const braveUrl = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=20&country=IN&search_lang=en`;
        const response = await fetch(braveUrl, {
          headers: {
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip',
            'X-Subscription-Token': apiKey
          },
          signal: AbortSignal.timeout(15000)
        });

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            sendJson(res, 200, { success: false, error: 'Invalid Brave Search API Key (HTTP 401 Unauthorized)' });
            return true;
          }
          if (response.status === 429) {
            sendJson(res, 200, { success: false, error: 'Brave Search API Rate Limited (1 QPS limit on free tier). Failover will invoke next provider.' });
            return true;
          }
          sendJson(res, 200, { success: false, error: `Brave Search error: HTTP ${response.status}` });
          return true;
        }

        const data = await response.json();
        const rawResults = data.web?.results || [];
        const leads = rawResults.map(r => {
          let hostname = '';
          try { hostname = new URL(r.url).hostname.replace(/^www\./i, ''); } catch (_) { hostname = 'official.gov.in'; }
          const isGov = hostname.endsWith('.gov.in') || hostname.endsWith('.nic.in') || hostname.endsWith('.ac.in');
          const isBig4 = /deloitte|pwc|ey\.com|kpmg|kroll|bdo|grantthornton/i.test(hostname);
          const jobDates = parseJobDates(r.title, r.description, r.page_age || r.published_date);

          return {
            title: r.title || 'Recruitment Opening',
            organisation: isBig4 ? hostname.toUpperCase() : (isGov ? 'Apex Govt Institution' : hostname),
            domain: hostname,
            sourceCategory: isGov ? 'OFFICIAL_EMPLOYER' : (isBig4 ? 'OFFICIAL_EMPLOYER' : 'THIRD_PARTY_PORTAL'),
            sourceUrl: r.url,
            evidenceUrl: r.url,
            officialNoticePdfUrl: (r.url && r.url.toLowerCase().endsWith('.pdf')) ? r.url : '',
            extractedSnippet: (r.description || r.title || '').substring(0, 300),
            dates: jobDates,
            isLiveDiscovered: true
          };
        });

        sendJson(res, 200, { success: true, leads, provider: 'Brave Search API' });
        return true;
      }

      if (providerType === 'SERPAPI') {
        const serpUrl = `https://serpapi.com/search.json?engine=google_jobs&q=${encodeURIComponent(query)}&api_key=${encodeURIComponent(apiKey)}&hl=en&gl=in`;
        const response = await fetch(serpUrl, { signal: AbortSignal.timeout(15000) });
        const data = await response.json();

        if (!response.ok) {
          sendJson(res, 200, { success: false, error: data.error || `SerpApi error: HTTP ${response.status}` });
          return true;
        }

        const jobs = (data.jobs_results || []).map(j => {
          const jobDates = parseJobDates(j.title, j.description, j.detected_extensions?.posted_at);
          return {
            title: j.title || 'Specialist Officer',
            organisation: j.company_name || 'Public Organisation',
            domain: j.via ? j.via.replace(/^via\s+/i, '').trim().toLowerCase() : 'official.gov.in',
            sourceCategory: 'OFFICIAL_EMPLOYER',
            sourceUrl: j.share_link || j.apply_options?.[0]?.link || j.job_id || '#',
            evidenceUrl: j.share_link || j.apply_options?.[0]?.link || '#',
            officialNoticePdfUrl: '',
            extractedSnippet: (j.description || '').substring(0, 300) + '...',
            dates: jobDates,
            isLiveDiscovered: true
          };
        });

        sendJson(res, 200, { success: true, leads: jobs, provider: 'SerpApi' });
        return true;
      }

      if (providerType === 'GOOGLE_CUSTOM_SEARCH') {
        const googleUrl = `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(apiKey)}&cx=${encodeURIComponent(cx)}&q=${encodeURIComponent(query)}`;
        const response = await fetch(googleUrl, { signal: AbortSignal.timeout(15000) });
        const data = await response.json();

        if (!response.ok) {
          const errObj = data.error || {};
          const isNotEnabled = (errObj.message || '').includes('Custom Search JSON API') || errObj.code === 403;
          sendJson(res, 200, {
            success: false,
            code: errObj.code || response.status,
            error: errObj.message,
            isNotEnabled,
            enableUrl: 'https://console.cloud.google.com/apis/library/customsearch.googleapis.com'
          });
          return true;
        }

        const items = (data.items || []).map(item => ({
          title: item.title,
          organisation: item.displayLink || 'Apex Organisation',
          domain: item.displayLink || '',
          sourceCategory: (item.displayLink || '').includes('.gov.in') || (item.displayLink || '').includes('.nic.in') ? 'OFFICIAL_EMPLOYER' : 'THIRD_PARTY_PORTAL',
          sourceUrl: item.link,
          evidenceUrl: item.link,
          officialNoticePdfUrl: item.link.endsWith('.pdf') ? item.link : '',
          extractedSnippet: item.snippet || '',
          dates: {}
        }));

        sendJson(res, 200, { success: true, leads: items, provider: 'Google Custom Search' });
        return true;
      }

      sendJson(res, 400, { success: false, error: `Unknown providerType: ${providerType}` });
    } catch (err) {
      sendJson(res, 500, { success: false, error: err.message });
    }
    return true;
  }

  return false;
}
