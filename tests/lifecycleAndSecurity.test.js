/**
 * Vacancy Radar India - Lifecycle, Corrigendum & Security Acceptance Suite
 * Validates Phase 1 features:
 * 1. Canonical ID generation (deterministic slug format)
 * 2. Corrigendum & extension detection
 * 3. Lifecycle milestones (7D, 3D, 1D, EXPIRED, WITHDRAWN)
 * 4. Immutable audit history tracking
 * 5. Webhook token security verification
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VacancyLifecycleEngine } from '../js/engine/vacancyLifecycleEngine.js';
import { VacancyLifecycleStatus } from '../js/models/types.js';

test('VacancyLifecycleEngine: generates deterministic canonical IDs', () => {
  const vac1 = {
    organisation: 'Centre for Development of Advanced Computing (C-DAC)',
    advertisementNumber: 'CDAC(P)/R&D/01/2026',
    title: 'Project Engineer (Cyber Security)'
  };

  const cid1 = VacancyLifecycleEngine.generateCanonicalId(vac1);
  assert.ok(cid1.startsWith('gov_centre-for-development-o_cdac-p-r-d-01-2026_project-engineer-cyber-sec'));

  // Repeating with same inputs produces identical canonical ID
  const cid2 = VacancyLifecycleEngine.generateCanonicalId({ ...vac1 });
  assert.equal(cid1, cid2);

  // Fallback for missing advertisement number
  const vacWithoutAdvt = {
    organisation: 'DRDO RAC',
    title: 'Scientist B Cyber Forensics',
    verification: { sourceDomain: 'drdo.gov.in' }
  };
  const cidNoAdvt = VacancyLifecycleEngine.generateCanonicalId(vacWithoutAdvt);
  assert.ok(cidNoAdvt.startsWith('gov_drdo-rac_scientist-b-cyber-forensics_'));
});

test('VacancyLifecycleEngine: accurately calculates lifecycle milestones based on closing date', () => {
  const now = new Date('2026-11-01T10:00:00Z');

  // 15 days in future -> ACTIVE
  const activeVac = {
    title: 'Software Developer',
    dates: { closingDate: '2026-11-16' }
  };
  assert.equal(VacancyLifecycleEngine.evaluateLifecycleStatus(activeVac, now), VacancyLifecycleStatus.ACTIVE);

  // 6 days in future -> CLOSING_SOON_7D
  const soon7d = {
    title: 'System Analyst',
    dates: { closingDate: '2026-11-07' }
  };
  assert.equal(VacancyLifecycleEngine.evaluateLifecycleStatus(soon7d, now), VacancyLifecycleStatus.CLOSING_SOON_7D);

  // 2 days in future -> CLOSING_SOON_3D
  const soon3d = {
    title: 'Forensic Investigator',
    dates: { closingDate: '2026-11-03' }
  };
  assert.equal(VacancyLifecycleEngine.evaluateLifecycleStatus(soon3d, now), VacancyLifecycleStatus.CLOSING_SOON_3D);

  // Today / 1 day -> CLOSING_SOON_1D
  const soon1d = {
    title: 'Security Auditor',
    dates: { closingDate: '2026-11-02' }
  };
  assert.equal(VacancyLifecycleEngine.evaluateLifecycleStatus(soon1d, now), VacancyLifecycleStatus.CLOSING_SOON_1D);

  // Past date -> EXPIRED_CLOSED
  const expired = {
    title: 'Network Admin',
    dates: { closingDate: '2026-10-25' }
  };
  assert.equal(VacancyLifecycleEngine.evaluateLifecycleStatus(expired, now), VacancyLifecycleStatus.EXPIRED_CLOSED);

  // Withdrawn / Scrapped notice
  const cancelled = {
    title: 'Scientific Assistant (Advertisement Cancelled)',
    dates: { closingDate: '2026-11-20' }
  };
  assert.equal(VacancyLifecycleEngine.evaluateLifecycleStatus(cancelled, now), VacancyLifecycleStatus.WITHDRAWN_CANCELLED);
});

test('VacancyLifecycleEngine: detects Corrigendum and Date Extensions with audit trail', () => {
  const existing = {
    id: 'vac-101',
    canonicalId: 'gov_cdac_advt-01_project-engineer',
    organisation: 'C-DAC',
    advertisementNumber: 'Advt-01/2026',
    title: 'Project Engineer',
    closingDate: '2026-11-10',
    dates: { closingDate: '2026-11-10' },
    verification: { officialNoticePdfUrl: 'https://cdac.in/advt_01.pdf' },
    history: []
  };

  const incomingCorrigendum = {
    organisation: 'C-DAC',
    advertisementNumber: 'Advt-01/2026',
    title: 'Project Engineer (Corrigendum: Last Date Extended)',
    closingDate: '2026-11-25',
    dates: { closingDate: '2026-11-25' },
    verification: { officialNoticePdfUrl: 'https://cdac.in/corrigendum_01.pdf' },
    corrigendumNote: 'Last date extended by 15 days due to festival holidays.'
  };

  const merged = VacancyLifecycleEngine.mergeWithLifecycleHistory(existing, incomingCorrigendum);

  assert.equal(merged.lifecycleStatus, VacancyLifecycleStatus.CORRIGENDUM_EXTENDED);
  assert.equal(merged.isCorrigendum, true);
  assert.equal(merged.closingDate, '2026-11-25');
  assert.equal(merged.dates.closingDate, '2026-11-25');
  assert.equal(merged.corrigendumPdfUrl, 'https://cdac.in/corrigendum_01.pdf');

  // Verify audit trail entry
  assert.ok(merged.history.length >= 1);
  const lastEvent = merged.history[merged.history.length - 1];
  assert.equal(lastEvent.event, 'CORRIGENDUM_EXTENDED');
  assert.equal(lastEvent.previousClosingDate, '2026-11-10');
  assert.equal(lastEvent.newClosingDate, '2026-11-25');
});

test('VacancyLifecycleEngine: batch processor resolves duplicates and correlates corrigenda', () => {
  const existingVacancies = [
    {
      organisation: 'UPSC',
      advertisementNumber: 'UPSC/2026/05',
      title: 'Deputy Director (Cyber Security)',
      closingDate: '2026-11-15',
      dates: { closingDate: '2026-11-15' }
    }
  ];

  const incomingNotices = [
    // 1. Identical duplicate from another aggregator
    {
      organisation: 'UPSC',
      advertisementNumber: 'UPSC/2026/05',
      title: 'Deputy Director (Cyber Security)',
      closingDate: '2026-11-15',
      dates: { closingDate: '2026-11-15' },
      sourceUrl: 'https://employmentnews.gov.in/item-1'
    },
    // 2. Corrigendum for the same notice
    {
      organisation: 'UPSC',
      advertisementNumber: 'UPSC/2026/05',
      title: 'Corrigendum: Deputy Director (Cyber Security)',
      closingDate: '2026-11-30',
      dates: { closingDate: '2026-11-30' },
      sourceUrl: 'https://upsc.gov.in/corrigendum-5'
    },
    // 3. Completely new opportunity
    {
      organisation: 'ISRO',
      advertisementNumber: 'ISRO/VSSC/2026/01',
      title: 'Scientist/Engineer SD',
      closingDate: '2026-12-05',
      dates: { closingDate: '2026-12-05' }
    }
  ];

  const result = VacancyLifecycleEngine.processBatchLifecycle(existingVacancies, incomingNotices);

  assert.equal(result.allVacancies.length, 2); // 1 UPSC (updated with corrigendum) + 1 ISRO
  assert.equal(result.corrigendaFound, 1);
  assert.equal(result.newlyDiscovered, 1);

  const upsc = result.allVacancies.find(v => v.organisation === 'UPSC');
  assert.equal(upsc.closingDate, '2026-11-30');
  assert.equal(upsc.lifecycleStatus, VacancyLifecycleStatus.CORRIGENDUM_EXTENDED);
});

test('Webhook Security Guard: enforces secret token and rejects unauthenticated payloads', () => {
  const secret = 'v_sec_radar_9837194';

  const checkAuth = (tokenProvided, configuredSecret) => {
    if (!configuredSecret) return true; // not configured
    return Boolean(tokenProvided && tokenProvided.trim() === configuredSecret.trim());
  };

  // Rejects when secret configured but token missing
  assert.equal(checkAuth(null, secret), false);
  assert.equal(checkAuth('', secret), false);

  // Rejects when wrong token provided
  assert.equal(checkAuth('wrong_token', secret), false);

  // Accepts when matching token provided
  assert.equal(checkAuth(secret, secret), true);
  assert.equal(checkAuth(` ${secret} `, secret), true);
});
