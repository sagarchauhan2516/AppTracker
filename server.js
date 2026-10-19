/**
 * Vacancy Radar India - Application Server Entry Point
 * Clean modular architecture dispatching API requests to domain-specific route controllers.
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import {
  PORT,
  ROOT_DIR,
  MIME_TYPES,
  getCorsOrigin,
  setRequestCorsOrigin,
  sendAutomatedDeadlineReminders
} from './server/context.js';
import { handleApiRoute } from './server/routes/index.js';

const server = http.createServer(async (req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': getCorsOrigin(req),
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  const [reqPath] = req.url.split('?');

  // Set per-request CORS origin
  setRequestCorsOrigin(getCorsOrigin(req));

  // Route API Requests
  if (reqPath.startsWith('/api/')) {
    try {
      const handled = await handleApiRoute(req, res, reqPath);
      if (handled) return;
    } catch (err) {
      console.error(`[API Routing Error] ${req.method} ${reqPath}:`, err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Internal server error occurred.' }));
      return;
    }
  }

  // Static File Serving
  let staticPath = reqPath;
  if (staticPath === '/') staticPath = '/index.html';

  const filePath = path.join(ROOT_DIR, staticPath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      });
      res.end(content);
    }
  });
});

function startServer(port) {
  server.listen(port, () => {
    console.log(`Vacancy Radar India portal running at: http://localhost:${port}`);
    // Start automated recurring deadline reminder daemon
    setTimeout(() => {
      sendAutomatedDeadlineReminders().catch(err => console.warn('Reminder daemon startup err:', err.message));
    }, 4000);
    setInterval(() => {
      sendAutomatedDeadlineReminders().catch(err => console.warn('Scheduled reminder daemon err:', err.message));
    }, 4 * 60 * 60 * 1000); // Check every 4 hours
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${port} is in use, attempting port ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('Server error:', err);
    }
  });
}

// Process-Level Defensive Error Boundaries
process.on('uncaughtException', (err) => {
  console.error('[FATAL SERVER UNCAUGHT EXCEPTION]:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED PROMISE REJECTION]:', reason);
});

startServer(PORT);
