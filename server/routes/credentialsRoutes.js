import { sendJson, readRequestBody, loadStoredCredentials, saveStoredCredentials } from '../context.js';

export async function handleCredentialsRoutes(req, res, reqPath) {
  if (reqPath === '/api/credentials' && req.method === 'GET') {
    const creds = loadStoredCredentials();
    sendJson(res, 200, { success: true, credentials: creds });
    return true;
  }

  if (reqPath === '/api/credentials' && req.method === 'POST') {
    try {
      const body = await readRequestBody(req);
      const saved = saveStoredCredentials(body);
      sendJson(res, 200, { success: true, credentials: saved });
    } catch (err) {
      sendJson(res, 500, { success: false, error: err.message });
    }
    return true;
  }

  return false;
}
