import { handleCredentialsRoutes } from './credentialsRoutes.js';
import { handleSearchRoutes } from './searchRoutes.js';
import { handleAiRoutes } from './aiRoutes.js';
import { handlePdfRoutes } from './pdfRoutes.js';
import { handleAlertRoutes } from './alertRoutes.js';
import { handleApplicationRoutes } from './applicationRoutes.js';

/**
 * Main API Route Dispatcher
 * Dispatches request to the appropriate domain route module.
 * Returns true if the route was matched and handled, false otherwise.
 *
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @param {string} reqPath
 * @returns {Promise<boolean>}
 */
export async function handleApiRoute(req, res, reqPath) {
  if (await handleCredentialsRoutes(req, res, reqPath)) return true;
  if (await handleSearchRoutes(req, res, reqPath)) return true;
  if (await handleAiRoutes(req, res, reqPath)) return true;
  if (await handlePdfRoutes(req, res, reqPath)) return true;
  if (await handleAlertRoutes(req, res, reqPath)) return true;
  if (await handleApplicationRoutes(req, res, reqPath)) return true;
  return false;
}
