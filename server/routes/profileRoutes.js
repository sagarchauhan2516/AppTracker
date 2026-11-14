/**
 * User Profiles API Routes
 * Handles multi-user profile persistence, creation, updating, and syncing with local Git storage.
 */

import {
  sendJson,
  readRequestBody,
  loadStoredProfiles,
  saveStoredProfile,
  saveAllStoredProfiles,
  deleteStoredProfile
} from '../context.js';

export async function handleProfileRoutes(req, res, reqPath) {
  // GET /api/profiles
  if (reqPath === '/api/profiles' && req.method === 'GET') {
    const profiles = loadStoredProfiles();
    sendJson(res, 200, { success: true, count: profiles.length, profiles });
    return true;
  }

  // POST /api/profiles (Save or update single profile)
  if (reqPath === '/api/profiles' && req.method === 'POST') {
    try {
      const body = await readRequestBody(req);
      if (!body || typeof body !== 'object') {
        sendJson(res, 400, { success: false, error: 'Invalid profile payload' });
        return true;
      }
      const saved = saveStoredProfile(body);
      sendJson(res, 200, { success: true, profile: saved });
    } catch (err) {
      sendJson(res, 500, { success: false, error: err.message });
    }
    return true;
  }

  // POST /api/profiles/sync (Bulk synchronize array of profiles)
  if (reqPath === '/api/profiles/sync' && req.method === 'POST') {
    try {
      const body = await readRequestBody(req);
      const profilesList = Array.isArray(body?.profiles) ? body.profiles : (Array.isArray(body) ? body : null);
      if (!profilesList) {
        sendJson(res, 400, { success: false, error: 'Expected an array of profiles' });
        return true;
      }
      const savedList = saveAllStoredProfiles(profilesList);
      sendJson(res, 200, { success: true, count: savedList.length, profiles: savedList });
    } catch (err) {
      sendJson(res, 500, { success: false, error: err.message });
    }
    return true;
  }

  // DELETE /api/profiles/:id
  if (reqPath.startsWith('/api/profiles/') && req.method === 'DELETE') {
    const profileId = decodeURIComponent(reqPath.replace('/api/profiles/', '').trim());
    if (!profileId) {
      sendJson(res, 400, { success: false, error: 'Missing profile ID' });
      return true;
    }
    const ok = deleteStoredProfile(profileId);
    sendJson(res, 200, { success: ok, profileId });
    return true;
  }

  return false;
}
