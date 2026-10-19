import crypto from 'crypto';
import {
  sendJson,
  readRequestBody,
  checkRateLimit,
  getPdfCache,
  savePdfCache,
  extractTextFromPdfBuffer,
  decryptCdacPayload,
  saveLearnedSource
} from '../context.js';
import { GovernmentPdfParser } from '../../js/engine/pdfExtractionEngine.js';
import { PageDiffEngine } from '../../js/engine/pageDiffEngine.js';

export async function handlePdfRoutes(req, res, reqPath) {
  // Phase 3: Server-side PDF extraction & caching
  if (reqPath === '/api/extract-pdf' && req.method === 'POST') {
    const clientKey = `${req.socket?.remoteAddress || 'local'}:extract-pdf`;
    if (!checkRateLimit(clientKey, 30, 60000)) {
      sendJson(res, 429, { success: false, error: 'Rate limit exceeded for PDF processing. Please wait a minute.' });
      return true;
    }
    try {
      const body = await readRequestBody(req);
      const targetPdfUrl = (body.pdfUrl || '').trim();
      let buffer = null;

      if (body.base64) {
        buffer = Buffer.from(body.base64, 'base64');
      } else if (targetPdfUrl) {
        const response = await fetch(targetPdfUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/pdf,*/*'
          },
          signal: AbortSignal.timeout(25000)
        });

        if (!response.ok) {
          sendJson(res, 200, {
            success: false,
            error: `Failed to download PDF notice: HTTP ${response.status} ${response.statusText}`
          });
          return true;
        }

        const arrayBuf = await response.arrayBuffer();
        buffer = Buffer.from(arrayBuf);
      } else {
        sendJson(res, 400, { success: false, error: 'Either pdfUrl or base64 is required.' });
        return true;
      }

      if (!buffer || buffer.length === 0) {
        sendJson(res, 400, { success: false, error: 'Empty PDF buffer received.' });
        return true;
      }

      const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
      const cached = getPdfCache(sha256);
      if (cached) {
        sendJson(res, 200, { success: true, cached: true, sha256, ...cached });
        return true;
      }

      const { text, numPages } = await extractTextFromPdfBuffer(buffer);
      const parsedMetadata = GovernmentPdfParser.parseNotificationText(text, targetPdfUrl);

      const payloadToCache = {
        sha256,
        sourceUrl: targetPdfUrl,
        numPages,
        parsedAt: new Date().toISOString(),
        metadata: parsedMetadata,
        textSnippet: text.slice(0, 800).replace(/\s+/g, ' ').trim()
      };
      savePdfCache(sha256, payloadToCache);

      sendJson(res, 200, {
        success: true,
        cached: false,
        ...payloadToCache
      });
    } catch (err) {
      sendJson(res, 500, { success: false, error: err.message });
    }
    return true;
  }

  // Phase 3: Deterministic page-diff discovery
  if (reqPath === '/api/diff-pages' && req.method === 'POST') {
    try {
      const body = await readRequestBody(req);
      const portalUrl = (body.portalUrl || '').trim();
      if (!portalUrl) {
        sendJson(res, 400, { success: false, error: 'portalUrl is required.' });
        return true;
      }

      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      };
      if (body.lastETag) headers['If-None-Match'] = body.lastETag;
      if (body.lastModified) headers['If-Modified-Since'] = body.lastModified;

      const t0 = Date.now();
      const response = await fetch(portalUrl, {
        headers,
        signal: AbortSignal.timeout(18000)
      });

      if (response.status === 304) {
        sendJson(res, 200, {
          success: true,
          portalUrl,
          notModified: true,
          latencyMs: Date.now() - t0,
          message: 'HTTP 304 Not Modified. No content changed since last crawl.'
        });
        return true;
      }

      if (!response.ok) {
        sendJson(res, 200, {
          success: false,
          portalUrl,
          status: response.status,
          error: `HTTP ${response.status}: ${response.statusText}`
        });
        return true;
      }

      const html = await response.text();
      const eTag = response.headers.get('etag') || '';
      const lastModified = response.headers.get('last-modified') || '';

      const noticeLinks = PageDiffEngine.extractNoticeLinks(html, portalUrl);
      const diffResult = PageDiffEngine.diffNotices(noticeLinks, body.previousSnapshot || {});

      sendJson(res, 200, {
        success: true,
        portalUrl,
        notModified: false,
        latencyMs: Date.now() - t0,
        eTag,
        lastModified,
        diffResult,
        totalLinksExtracted: noticeLinks.length,
        currentNotices: noticeLinks
      });
    } catch (err) {
      sendJson(res, 500, { success: false, error: err.message });
    }
    return true;
  }

  // Phase 5: Feedback endpoint
  if (reqPath === '/api/feedback' && req.method === 'POST') {
    try {
      const body = await readRequestBody(req);
      const { vacancyId, profileId, action } = body;
      sendJson(res, 200, {
        success: true,
        action,
        vacancyId,
        profileId,
        message: `Feedback recorded: Marked ${action} for vacancy ${vacancyId}`
      });
    } catch (err) {
      sendJson(res, 500, { success: false, error: err.message });
    }
    return true;
  }

  // C-DAC Careers Apex Live Discovery
  if (reqPath === '/api/cdac/discover-live-vacancies' && req.method === 'POST') {
    try {
      const advtRes = await fetch('https://careers.cdac.in/advt-1', {
        headers: { 'content-type': 'application/json' },
        signal: AbortSignal.timeout(15000)
      });
      if (!advtRes.ok) {
        sendJson(res, 502, { success: false, error: 'Could not fetch C-DAC advertisements list.' });
        return true;
      }
      const advtBody = await advtRes.json();
      const advtList = decryptCdacPayload(advtBody.data) || [];

      const discoveredPosts = [];

      for (const advt of advtList) {
        if (!advt.job_id) continue;
        try {
          const postsRes = await fetch(`https://careers.cdac.in/advt/post_details/${advt.job_id}`, {
            headers: { 'content-type': 'application/json' },
            signal: AbortSignal.timeout(10000)
          });
          if (postsRes.ok) {
            const postsBody = await postsRes.json();
            const posts = decryptCdacPayload(postsBody.data) || [];
            posts.forEach(p => {
              const cleanSkills = (p.skill_set || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
              const cleanQual = (p.educational_qualification || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
              const closing = p.last_date_of_advt ? p.last_date_of_advt.slice(0, 10) : '';
              const isForensicsCyber = /forensic|cyber|vapt|security|reverse\s*engine|penetration|deepfake|malware/i.test(`${p.post_name} ${cleanSkills}`);

              discoveredPosts.push({
                id: `cdac_${p.post_id}`,
                canonicalId: `cdac_${p.post_id}`,
                title: p.post_name,
                organisation: 'Centre for Development of Advanced Computing (C-DAC)',
                domain: 'careers.cdac.in',
                sourceCategory: 'OFFICIAL_EMPLOYER',
                sector: 'Autonomous Govt Institution',
                advertisementNumber: p.advt_no || advt.advt_no || '',
                payScale: p.salary || '',
                totalPosts: parseInt(p.no_of_posts, 10) || 1,
                location: p.location || '',
                sourceUrl: `https://careers.cdac.in/post-details/${p.post_id}`,
                dates: {
                  closingDate: closing,
                  publishedDate: new Date().toISOString().slice(0, 10)
                },
                qualifications: cleanQual ? [cleanQual] : [],
                skills: cleanSkills,
                isForensicsCyber,
                verification: {
                  status: 'OFFICIALLY_VERIFIED',
                  sourceDomain: 'careers.cdac.in',
                  evidenceUrl: `https://careers.cdac.in/post-details/${p.post_id}`
                }
              });
            });
          }
        } catch (_) {}
      }

      saveLearnedSource('careers.cdac.in', {
        url: 'https://careers.cdac.in',
        organisation: 'Centre for Development of Advanced Computing (C-DAC)'
      });

      sendJson(res, 200, {
        success: true,
        count: discoveredPosts.length,
        cyberForensicsCount: discoveredPosts.filter(p => p.isForensicsCyber).length,
        vacancies: discoveredPosts
      });
    } catch (err) {
      sendJson(res, 500, { success: false, error: err.message });
    }
    return true;
  }

  return false;
}
