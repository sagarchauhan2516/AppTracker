import {
  sendJson,
  readRequestBody,
  loadTrackedApplications,
  saveTrackedApplications,
  sendAutomatedDeadlineReminders
} from '../context.js';

export async function handleApplicationRoutes(req, res, reqPath) {
  // GET Tracked Applications
  if (reqPath === '/api/tracked-applications' && req.method === 'GET') {
    const list = loadTrackedApplications();
    sendJson(res, 200, { success: true, count: list.length, applications: list });
    return true;
  }

  // POST Save / Sync Tracked Applications
  if (reqPath === '/api/tracked-applications' && req.method === 'POST') {
    try {
      const body = await readRequestBody(req);
      if (Array.isArray(body)) {
        saveTrackedApplications(body);
        sendJson(res, 200, { success: true, count: body.length });
        return true;
      } else if (body && (body.id || body.vacancyId)) {
        const apps = loadTrackedApplications();
        const idx = apps.findIndex(a => (body.id && a.id === body.id) || (body.vacancyId && a.vacancyId === body.vacancyId));
        if (idx >= 0) {
          apps[idx] = { ...apps[idx], ...body, updatedAt: new Date().toISOString() };
        } else {
          apps.unshift({ ...body, appliedAt: body.appliedAt || new Date().toISOString() });
        }
        saveTrackedApplications(apps);
        sendJson(res, 200, { success: true, application: body });
        return true;
      }
      sendJson(res, 400, { success: false, error: 'Invalid application payload' });
    } catch (err) {
      sendJson(res, 500, { success: false, error: err.message });
    }
    return true;
  }

  // POST Trigger Immediate Deadline Reminders
  if (reqPath === '/api/trigger-deadline-reminders' && req.method === 'POST') {
    try {
      const result = await sendAutomatedDeadlineReminders();
      sendJson(res, 200, { success: true, result });
    } catch (err) {
      sendJson(res, 500, { success: false, error: err.message });
    }
    return true;
  }

  return false;
}
