import { storageService } from '../../services/storageService.js';
import { showConfirmationBanner } from '../../services/notificationService.js';
import { escapeHtml } from '../../utils/htmlUtils.js';

export function renderSettingsTab(profile) {
    const schedule = profile.scheduleSettings || {
      preset: 'THRICE_DAILY',
      hours: ['08:00', '14:00', '20:00'],
      emailAddress: 'candidate@dfir-india.org',
      emailAlertsEnabled: true,
      deadlineLeadDays: 7
    };
    const creds = storageService.getProviderConfig() || {};
    const emailVal = schedule.emailAddress && schedule.emailAddress !== 'candidate@dfir-india.org'
      ? schedule.emailAddress
      : (creds.notificationEmail || schedule.emailAddress || 'sagarmc2516@gmail.com');

    return `
      <div class="dash-panel-card">
        <h3 style="font-family: var(--font-heading); font-size: 1.25rem; color: var(--text-main); margin: 0 0 0.4rem 0; display: flex; align-items: center; gap: 0.5rem;">
          <i data-lucide="clock" class="icon icon-md" style="color: var(--accent-primary);"></i>
          <span>Automated Monitoring Schedule &amp; Alert Channels</span>
        </h3>
        <p style="font-size: 0.82rem; color: var(--text-secondary); margin: 0 0 1.5rem 0; line-height: 1.5;">
          Configure background scans across registered government portals (IST Asia/Kolkata), multi-email alerts, and Telegram Bot push notifications with automated infrastructure.
        </p>

        <!-- Telegram Bot Channel Card -->
        <div style="background: var(--bg-surface-elevated); padding: 1.35rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle); margin-bottom: 1.5rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 0.85rem;">
            <div>
              <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                <strong style="color: #38bdf8; font-size: 1rem; display: flex; align-items: center; gap: 0.4rem;">
                  <i data-lucide="send" class="icon icon-sm" style="color: #38bdf8;"></i>
                  <span>Telegram Alert &amp; Daily Digest Channel</span>
                </strong>
                <span class="badge-test-flag" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; border-color: rgba(56, 189, 248, 0.35);">
                  REAL-TIME PUSH
                </span>
              </div>
              <div style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 0.25rem;">
                Receive daily bulletins, official corrigenda updates, and urgent closing alerts directly on your phone or desktop Telegram app.
              </div>
            </div>
            <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
              <button type="button" id="btnTestTelegram" class="btn btn-outline btn-sm" style="color: #38bdf8; border-color: rgba(56, 189, 248, 0.5); font-weight: 600;">
                <i data-lucide="send" class="icon icon-sm"></i> Test Telegram Connection
              </button>
              <button type="button" id="btnSendDailyDigest" class="btn btn-primary btn-sm" style="background: #0284c7; border-color: #0284c7; font-weight: 600;">
                <i data-lucide="mail" class="icon icon-sm"></i> Send Daily Digest Now
              </button>
            </div>
          </div>

          <!-- Quick 3-Step Setup Guide Banner -->
          <div style="background: rgba(56, 189, 248, 0.07); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 8px; padding: 0.75rem 1rem; margin-bottom: 1rem; font-size: 0.78rem; line-height: 1.55;">
            <div style="font-weight: 700; color: #38bdf8; margin-bottom: 0.3rem; display: flex; align-items: center; gap: 0.4rem;">
              <i data-lucide="info" class="icon icon-sm"></i> <span>Quick Setup in 3 Easy Steps (Required by Telegram Anti-Spam Security):</span>
            </div>
            <div style="color: var(--text-secondary); display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.75rem;">
              <div>
                <strong style="color: var(--text-main);">1. Start the Bot:</strong><br>
                Open <a href="https://t.me/vacancy_radar1_bot" target="_blank" rel="noopener noreferrer" style="color: #38bdf8; text-decoration: underline; font-weight: 700;">@vacancy_radar1_bot</a> and tap <strong>START</strong>. Telegram security requires users to initiate the conversation first.
              </div>
              <div>
                <strong style="color: var(--text-main);">2. Auto-Detect Your ID:</strong><br>
                Click the <strong>"Auto-Detect ID"</strong> button below. The system automatically reads your unique numeric ID from Telegram and saves it.
              </div>
              <div>
                <strong style="color: var(--text-main);">3. Test &amp; Verify:</strong><br>
                Click <strong>"Test Telegram Connection"</strong> to verify live message delivery.
              </div>
            </div>
          </div>

          <div id="statusTelegram" style="display: none; margin-bottom: 0.85rem;"></div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
                <label style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted);">
                  Telegram Bot API Token
                </label>
                <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" style="font-size: 0.72rem; color: #38bdf8; text-decoration: underline;">
                  Open @BotFather ↗
                </a>
              </div>
              <div style="display: flex; gap: 0.4rem;">
                <input type="password" id="inputTelegramBotToken" class="search-input" value="${escapeHtml(creds.telegramBotToken || '')}" placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ..." style="flex: 1; font-family: var(--font-mono); font-size: 0.82rem;">
                <button type="button" class="btn btn-outline btn-sm btn-toggle-mask" data-target="inputTelegramBotToken" title="Toggle token visibility"><i data-lucide="eye" class="icon icon-xs"></i></button>
              </div>
              <small style="display: block; font-size: 0.72rem; color: var(--text-muted); margin-top: 0.3rem;">
                Created via <code>@BotFather</code>. Grants your private bot permission to deliver job radar bulletins.
              </small>
            </div>
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
                <label style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted);">
                  Target Telegram Chat ID(s) for "${escapeHtml(profile.name)}"
                </label>
                <a href="https://t.me/vacancy_radar1_bot" target="_blank" rel="noopener noreferrer" style="font-size: 0.72rem; color: #38bdf8; text-decoration: underline; font-weight: 600;">
                  Open @vacancy_radar1_bot ↗
                </a>
              </div>
              <div style="display: flex; gap: 0.4rem;">
                <input type="text" id="inputTelegramChatId" class="search-input" value="${escapeHtml(schedule.telegramChatId || creds.telegramChatId || '')}" placeholder="e.g. 987654321, 123456789, @my_channel" style="flex: 1; font-family: var(--font-mono); font-size: 0.82rem;">
                <button type="button" id="btnDetectTelegramChatId" class="btn btn-outline btn-sm" style="color: #38bdf8; border-color: rgba(56, 189, 248, 0.4); font-weight: 600; white-space: nowrap;" title="Query recent updates to automatically find your numeric Chat ID">
                  <i data-lucide="search" class="icon icon-sm"></i> Auto-Detect ID
                </button>
              </div>
              <small style="display: block; font-size: 0.72rem; color: var(--text-muted); margin-top: 0.3rem;">
                Configured separately per profile. Enter multiple comma-separated IDs (personal users, groups, or channels).
              </small>
            </div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem;">
          <!-- Schedule Preset -->
          <div class="dash-card-elevated">
            <label style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); display: block; margin-bottom: 0.4rem;">
              Daily Scan Frequency Preset
            </label>
            <select id="dashSchedulePreset" class="filter-select" style="width: 100%; margin-bottom: 1rem;">
              <option value="THRICE_DAILY" ${schedule.preset === 'THRICE_DAILY' ? 'selected' : ''}>Thrice Daily (08:00, 14:00, 20:00 IST) — Recommended</option>
              <option value="TWICE_DAILY" ${schedule.preset === 'TWICE_DAILY' ? 'selected' : ''}>Twice Daily (09:00, 18:00 IST)</option>
              <option value="ONCE_DAILY" ${schedule.preset === 'ONCE_DAILY' ? 'selected' : ''}>Once Daily (08:00 IST Morning Bulletin)</option>
              <option value="CUSTOM" ${schedule.preset === 'CUSTOM' ? 'selected' : ''}>Custom Hours</option>
            </select>

            <label style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); display: block; margin-bottom: 0.4rem;">
              Email Alert Recipient(s) for "${escapeHtml(profile.name)}" (Supports Multiple)
            </label>
            <input type="text" id="dashScheduleEmail" class="search-input" value="${escapeHtml(emailVal)}" placeholder="e.g. user1@gmail.com, alerts@org.in" style="width: 100%; margin-bottom: 0.35rem; font-weight: 500;">
            <small style="display: block; font-size: 0.72rem; color: var(--text-muted); margin-bottom: 0.75rem;">
              Configured separately per profile. Enter multiple comma-separated emails.
            </small>

            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: 0.82rem;">
              <input type="checkbox" id="dashScheduleEmailAlerts" ${schedule.emailAlertsEnabled ? 'checked' : ''}>
              <span>Send instant email alerts on verified apex vacancies</span>
            </label>
          </div>

          <!-- Deadline Reminders & General Prefs -->
          <div class="dash-card-elevated">
            <label style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); display: block; margin-bottom: 0.4rem;">
              Urgent Deadline Warning Threshold
            </label>
            <select id="dashScheduleDeadlineDays" class="filter-select" style="width: 100%; margin-bottom: 1.25rem;">
              <option value="7" ${schedule.deadlineLeadDays === 7 ? 'selected' : ''}>Flag ≤ 7 Days to Closing</option>
              <option value="5" ${schedule.deadlineLeadDays === 5 ? 'selected' : ''}>Flag ≤ 5 Days to Closing</option>
              <option value="3" ${schedule.deadlineLeadDays === 3 ? 'selected' : ''}>Flag ≤ 3 Days to Closing (Urgent Only)</option>
            </select>

            <strong style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; display: block; margin-bottom: 0.5rem;">
              System Health &amp; Integrity Policies
            </strong>
            <div style="display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.82rem;">
              <label style="display: flex; align-items: center; gap: 0.4rem;">
                <input type="checkbox" checked disabled>
                <span>Automated Anti-Aggregator Domain Integrity Verification (Enforced)</span>
              </label>
              <label style="display: flex; align-items: center; gap: 0.4rem;">
                <input type="checkbox" checked disabled>
                <span>Circuit Breaker Protection (Auto-Trip after 3 consecutive failures)</span>
              </label>
              <label style="display: flex; align-items: center; gap: 0.4rem;">
                <input type="checkbox" checked disabled>
                <span>Cross-Provider Result Deduplication &amp; Provenance Retention</span>
              </label>
            </div>
          </div>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
          <button type="button" id="btnSaveScheduleAndSettings" class="btn btn-primary" style="font-weight: 600;">
            <i data-lucide="save" class="icon icon-sm"></i> Save Automation Settings
          </button>
        </div>
      </div>
    `;
}

export function bindSettingsTabEvents(container, ctx) {
    // Persistent credentials synchronization to both browser storage and disk
    const persistCredentials = (key, val) => {
      if (!key) return;
      const cfg = storageService.getProviderConfig();
      cfg[key] = val;
      storageService.saveProviderConfig(cfg);
      fetch('/api/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: val })
      }).catch(() => {});
    };

    // Save Schedule & System Settings
    document.getElementById('btnSaveScheduleAndSettings')?.addEventListener('click', () => {
      const preset = document.getElementById('dashSchedulePreset')?.value || 'THRICE_DAILY';
      const email = document.getElementById('dashScheduleEmail')?.value.trim() || '';
      const emailAlerts = document.getElementById('dashScheduleEmailAlerts')?.checked || false;
      const deadlineDays = parseInt(document.getElementById('dashScheduleDeadlineDays')?.value || '7', 10);
      const tgToken = document.getElementById('inputTelegramBotToken')?.value.trim() || '';
      const tgChatId = document.getElementById('inputTelegramChatId')?.value.trim() || '';

      const hours = preset === 'THRICE_DAILY' ? ['08:00', '14:00', '20:00']
                  : preset === 'TWICE_DAILY' ? ['09:00', '18:00']
                  : ['08:00'];

      const notificationEmails = email
        .split(/[,;]+/)
        .map(e => e.trim())
        .filter(e => e && e.includes('@'));

      ctx.currentProfile.scheduleSettings = {
        preset,
        hours,
        emailAddress: email,
        notificationEmails,
        emailAlertsEnabled: emailAlerts,
        deadlineLeadDays: deadlineDays,
        telegramChatId: tgChatId,
        telegramAlertsEnabled: Boolean(tgChatId)
      };

      storageService.saveProfile(ctx.currentProfile);

      // Persist all tokens permanently
      const credPayload = {};
      if (tgToken) {
        persistCredentials('telegramBotToken', tgToken);
        credPayload.telegramBotToken = tgToken;
      }
      if (tgChatId) {
        persistCredentials('telegramChatId', tgChatId);
        credPayload.telegramChatId = tgChatId;
      }
      if (email && email.includes('@')) {
        persistCredentials('notificationEmail', email);
        credPayload.notificationEmail = email;
        const webhookUrl = storageService.getProviderConfig()?.googleAppsScriptWebhookUrl?.trim();
        if (webhookUrl) {
          fetch('/api/sync-webhook', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: webhookUrl, payload: { action: 'SET_CONFIG', email } })
          }).catch(() => {});
        }
      }

      if (Object.keys(credPayload).length > 0) {
        fetch('/api/credentials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(credPayload)
        }).catch(() => {});
      }

      showConfirmationBanner(
        'Automation & API Credentials Saved',
        `Schedule, Telegram Bot Token, Chat ID, and Email saved permanently to disk and browser.`,
        'success',
        3000
      );
      if (this.onStateChanged) ctx.onStateChanged && ctx.onStateChanged();
      ctx.render();
    });

    // Telegram Bot Credentials persistence
    const tgTokenInput = document.getElementById('inputTelegramBotToken');
    tgTokenInput?.addEventListener('input', (e) => {
      persistCredentials('telegramBotToken', e.target.value.trim());
    });
    tgTokenInput?.addEventListener('change', (e) => {
      persistCredentials('telegramBotToken', e.target.value.trim());
    });

    const tgChatInput = document.getElementById('inputTelegramChatId');
    const syncProfileTgChat = (val) => {
      if (ctx.currentProfile) {
        if (!ctx.currentProfile.scheduleSettings) ctx.currentProfile.scheduleSettings = {};
        ctx.currentProfile.scheduleSettings.telegramChatId = val;
        ctx.currentProfile.scheduleSettings.telegramAlertsEnabled = Boolean(val);
        storageService.saveProfile(ctx.currentProfile);
      }
      persistCredentials('telegramChatId', val);
    };

    tgChatInput?.addEventListener('input', (e) => syncProfileTgChat(e.target.value.trim()));
    tgChatInput?.addEventListener('change', (e) => syncProfileTgChat(e.target.value.trim()));

    // Auto-Detect Telegram Chat ID from Recent Updates
    document.getElementById('btnDetectTelegramChatId')?.addEventListener('click', async () => {
      const btn = document.getElementById('btnDetectTelegramChatId');
      const statusDiv = document.getElementById('statusTelegram');
      const token = document.getElementById('inputTelegramBotToken')?.value.trim();
      const chatInput = document.getElementById('inputTelegramChatId');

      if (!token) {
        if (statusDiv) {
          statusDiv.style.display = 'block';
          statusDiv.innerHTML = `<div class="alert-box alert-box-error">Please enter your Telegram Bot Token first.</div>`;
        }
        return;
      }

      btn.disabled = true;
      const origText = btn.innerHTML;
      btn.innerHTML = '<i data-lucide="loader-2" class="icon icon-sm spin"></i> Scanning...';
      if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
      if (statusDiv) {
        statusDiv.style.display = 'block';
        statusDiv.innerHTML = `<div class="alert-box alert-box-cyan">Checking recent bot interactions on Telegram API...</div>`;
      }

      try {
        const res = await fetch('/api/telegram-get-updates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ botToken: token })
        });
        const data = await res.json();

        if (statusDiv) {
          if (data.success && data.latestChatId) {
            let combinedChatIds = String(data.latestChatId);
            if (chatInput) {
              const currentVal = (chatInput.value || '').trim();
              if (currentVal) {
                const existing = currentVal.split(/[,;\s]+/).map(s => s.trim()).filter(Boolean);
                if (!existing.includes(String(data.latestChatId))) {
                  existing.push(String(data.latestChatId));
                  combinedChatIds = existing.join(', ');
                } else {
                  combinedChatIds = currentVal;
                }
              }
              chatInput.value = combinedChatIds;
            }

            syncProfileTgChat(combinedChatIds);
            const userTitle = data.latestChat?.title || data.latestChat?.first_name || 'Personal User';
            statusDiv.innerHTML = `
              <div class="alert-box alert-box-success">
                <strong>Chat ID Successfully Detected &amp; Linked to "${escapeHtml(ctx.currentProfile.name)}"!</strong><br>
                Latest Chat: <code>${data.latestChatId}</code> (${userTitle})<br>
                Active Chat ID(s) for this Profile: <code>${escapeHtml(combinedChatIds)}</code><br>
                <span style="color: var(--text-secondary); font-size: 0.76rem; display: block; margin-top: 0.35rem;">
                  Saved automatically to disk. Click <strong>"Test Telegram Connection"</strong> to verify live delivery across all target accounts!
                </span>
              </div>
            `;
          } else {
            const botUrl = data.botUrl || 'https://t.me/vacancy_radar1_bot';
            const botUsername = data.botUser?.username || 'vacancy_radar1_bot';
            statusDiv.innerHTML = `
              <div style="background: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.35); border-radius: 6px; padding: 0.85rem; color: #fbbf24; font-size: 0.82rem; line-height: 1.5;">
                <strong>No Messages Found Yet for @${botUsername}</strong><br>
                <span style="color: var(--text-secondary); font-size: 0.78rem; display: block; margin-top: 0.3rem;">
                  Telegram bots cannot message users until the user initiates the conversation:<br>
                  <strong>Step 1:</strong> Have the new user open <a href="${botUrl}" target="_blank" rel="noopener noreferrer" style="color: #38bdf8; font-weight: 700; text-decoration: underline;">@${botUsername} in Telegram</a>.<br>
                  <strong>Step 2:</strong> Tap the <strong>START</strong> button at the bottom (or send /start).<br>
                  <strong>Step 3:</strong> Click <strong>"Auto-Detect ID"</strong> here to append their ID automatically!
                </span>
              </div>
            `;
          }
        }
      } catch (err) {
        if (statusDiv) {
          statusDiv.innerHTML = `<div class="alert-box alert-box-error">Auto-detect error: ${err.message}</div>`;
        }
      } finally {
        btn.disabled = false;
        btn.innerHTML = origText;
        if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
      }
    });

    // Test Telegram Connection
    document.getElementById('btnTestTelegram')?.addEventListener('click', async () => {
      const btn = document.getElementById('btnTestTelegram');
      const statusDiv = document.getElementById('statusTelegram');
      const token = document.getElementById('inputTelegramBotToken')?.value.trim();
      const chatId = document.getElementById('inputTelegramChatId')?.value.trim();

      if (!token) {
        if (statusDiv) {
          statusDiv.style.display = 'block';
          statusDiv.innerHTML = `<div class="alert-box alert-box-error">Please enter your Telegram Bot Token.</div>`;
        }
        return;
      }

      btn.disabled = true;
      const origText = btn.innerHTML;
      btn.innerHTML = '<i data-lucide="loader-2" class="icon icon-sm spin"></i> Testing Bot...';
      if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
      if (statusDiv) {
        statusDiv.style.display = 'block';
        statusDiv.innerHTML = `<div class="alert-box alert-box-cyan">Connecting to Telegram Bot API...</div>`;
      }

      try {
        const res = await fetch('/api/test-telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ botToken: token, chatId })
        });
        const data = await res.json();

        if (statusDiv) {
          if (data.success) {
            if (data.requiresChatId) {
              const botUrl = data.botUrl || 'https://t.me/vacancy_radar1_bot';
              const botUsername = data.botUser?.username || 'vacancy_radar1_bot';
              statusDiv.innerHTML = `
                <div style="background: rgba(56, 189, 248, 0.12); border: 1px solid rgba(56, 189, 248, 0.4); border-radius: 6px; padding: 0.85rem; color: #38bdf8; font-size: 0.82rem; line-height: 1.5;">
                  <strong>Bot @${botUsername} is Active &amp; Valid!</strong><br>
                  <span style="color: var(--text-secondary); font-size: 0.78rem; display: block; margin-top: 0.3rem;">
                    Almost ready! To receive alerts on your phone:<br>
                    <strong>Step 1:</strong> Open <a href="${botUrl}" target="_blank" rel="noopener noreferrer" style="color: #38bdf8; font-weight: 700; text-decoration: underline;">@${botUsername} in Telegram</a> and tap <strong>START</strong>.<br>
                    <strong>Step 2:</strong> Click <strong>"Auto-Detect ID"</strong> above to fill your Chat ID.<br>
                    <strong>Step 3:</strong> Click <strong>"Test Telegram Connection"</strong> to verify!<br>
                  </span>
                </div>
              `;
            } else {
              const deliveryList = Array.isArray(data.deliveryResults) ? data.deliveryResults : [];
              const breakdownHtml = deliveryList.length > 1 ? `
                <div style="margin-top: 0.5rem; display: flex; flex-direction: column; gap: 0.25rem;">
                  ${deliveryList.map(d => `
                    <div style="font-size: 0.76rem; display: flex; align-items: center; gap: 0.4rem;">
                      <i data-lucide="${d.ok ? 'check' : 'x'}" class="icon-xs ${d.ok ? 'text-emerald' : 'text-rose'}"></i>
                      <code>${d.id}</code>:
                      <span style="color: ${d.ok ? '#34d399' : '#f87171'};">${d.ok ? 'Delivered successfully' : d.error}</span>
                    </div>
                  `).join('')}
                </div>
              ` : '';

              statusDiv.innerHTML = `
                <div class="alert-box alert-box-success">
                  <strong>${data.message}</strong><br>
                  <span style="color: var(--text-secondary); font-size: 0.76rem;">
                    Bot: <strong>@${data.botUser?.username}</strong> (${data.botUser?.first_name}) | Profile: <strong>${escapeHtml(ctx.currentProfile.name)}</strong>
                  </span>
                  ${breakdownHtml}
                </div>
              `;
            }
          } else {
            if (data.isChatNotFound) {
              const botUrl = data.botUrl || 'https://t.me/vacancy_radar1_bot';
              const botUsername = data.botUser?.username || 'vacancy_radar1_bot';
              statusDiv.innerHTML = `
                <div style="background: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.35); border-radius: 6px; padding: 0.85rem; color: #fbbf24; font-size: 0.82rem; line-height: 1.5;">
                  <strong>Telegram Chat Not Initiated (${data.chatId || 'Blank'})</strong><br>
                  <span style="color: var(--text-secondary); font-size: 0.78rem; display: block; margin-top: 0.3rem;">
                    Telegram security requires users to initiate the chat with the bot first.<br>
                    <strong>Step 1:</strong> Open <a href="${botUrl}" target="_blank" rel="noopener noreferrer" style="color: #38bdf8; font-weight: 700; text-decoration: underline;">@${botUsername} in Telegram</a>.<br>
                    <strong>Step 2:</strong> Tap the <strong>START</strong> button at the bottom (or send /start).<br>
                    <strong>Step 3:</strong> Click <strong>"Auto-Detect ID"</strong> above, then Test again.
                  </span>
                </div>
              `;
            } else {
              statusDiv.innerHTML = `
                <div class="alert-box alert-box-error">
                  <strong>Telegram Bot Error:</strong> ${data.error || 'Failed to authenticate bot token'}<br>
                  ${data.solution ? `<span style="color: var(--text-secondary); font-size: 0.76rem; display: block; margin-top: 0.25rem;">${data.solution}</span>` : ''}
                </div>
              `;
            }
          }
        }
      } catch (err) {
        if (statusDiv) {
          statusDiv.innerHTML = `<div class="alert-box alert-box-error">Network error: ${err.message}</div>`;
        }
      } finally {
        btn.disabled = false;
        btn.innerHTML = origText;
        if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
      }
    });

    // Send Daily Digest Now
    document.getElementById('btnSendDailyDigest')?.addEventListener('click', async () => {
      const btn = document.getElementById('btnSendDailyDigest');
      const statusDiv = document.getElementById('statusTelegram');
      const vacancies = storageService.getVacancies();

      btn.disabled = true;
      const origText = btn.innerHTML;
      btn.innerHTML = '<i data-lucide="loader-2" class="icon icon-sm spin"></i> Compiling Digest...';
      if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
      if (statusDiv) {
        statusDiv.style.display = 'block';
        statusDiv.innerHTML = `<div class="alert-box alert-box-cyan">Compiling Daily Digest for ${vacancies.length} active vacancies...</div>`;
      }

      try {
        const res = await fetch('/api/daily-digest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vacancies, profile: ctx.currentProfile, sendTelegram: true })
        });
        const data = await res.json();

        if (statusDiv) {
          if (data.success) {
            statusDiv.innerHTML = `
              <div class="alert-box alert-box-success">
                <strong>Daily Digest Generated!</strong> ${data.sentToTelegram ? 'Successfully pushed to your Telegram channel.' : 'Digest compiled (configure Telegram credentials to enable auto-push).'}<br>
                <details style="margin-top: 0.4rem; cursor: pointer;">
                  <summary style="font-size: 0.76rem; color: #38bdf8;">View Digest Content Preview</summary>
                  <pre style="background: var(--bg-surface); padding: 0.5rem; border-radius: 4px; font-size: 0.72rem; color: var(--text-main); white-space: pre-wrap; margin-top: 0.3rem;">${escapeHtml(data.digestText)}</pre>
                </details>
              </div>
            `;
            showConfirmationBanner('Daily Digest Sent', 'Daily Digest compiled and notification sent.', 'success', 3000);
          } else {
            statusDiv.innerHTML = `<div class="alert-box alert-box-error">Failed to generate digest: ${data.error || 'Server error'}</div>`;
          }
        }
      } catch (err) {
        if (statusDiv) {
          statusDiv.innerHTML = `<div class="alert-box alert-box-error">Network error: ${err.message}</div>`;
        }
      } finally {
        btn.disabled = false;
        btn.innerHTML = origText;
        if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
      }
    });

    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
    }

}
