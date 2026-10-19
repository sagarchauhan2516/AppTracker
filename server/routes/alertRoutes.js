import {
  sendJson,
  readRequestBody,
  checkRateLimit,
  loadStoredCredentials,
  saveStoredCredentials
} from '../context.js';
import { TelegramAlertEngine } from '../../js/engine/telegramAlertEngine.js';

export async function handleAlertRoutes(req, res, reqPath) {
  // Telegram Get Updates
  if (reqPath === '/api/telegram-get-updates' && (req.method === 'GET' || req.method === 'POST')) {
    try {
      let body = {};
      if (req.method === 'POST') body = await readRequestBody(req);
      const creds = loadStoredCredentials();
      const botToken = (body.botToken || creds.telegramBotToken || '').trim();

      if (!botToken) {
        sendJson(res, 400, { success: false, error: 'Telegram Bot Token is required.' });
        return true;
      }

      let botUser = null;
      let botUrl = null;
      try {
        const meRes = await fetch(`https://api.telegram.org/bot${botToken}/getMe`, { signal: AbortSignal.timeout(6000) });
        const meData = await meRes.json();
        if (meData.ok) {
          botUser = meData.result;
          botUrl = `https://t.me/${botUser.username}`;
        }
      } catch (_) {}

      const updatesRes = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates?limit=20`, {
        signal: AbortSignal.timeout(10000)
      });
      const updatesData = await updatesRes.json();

      if (!updatesData.ok) {
        sendJson(res, 200, {
          success: false,
          botUser,
          botUrl,
          error: updatesData.description || 'Failed to fetch updates from Telegram API.'
        });
        return true;
      }

      const updates = updatesData.result || [];
      const discoveredChats = [];
      const seenIds = new Set();

      for (let i = updates.length - 1; i >= 0; i--) {
        const u = updates[i];
        const chat = u.message?.chat || u.channel_post?.chat || u.my_chat_member?.chat || u.callback_query?.message?.chat;
        if (chat && !seenIds.has(chat.id)) {
          seenIds.add(chat.id);
          discoveredChats.push({
            id: String(chat.id),
            title: chat.title || [chat.first_name, chat.last_name].filter(Boolean).join(' ') || chat.username || 'Personal Chat',
            username: chat.username || '',
            type: chat.type,
            lastMessage: u.message?.text || u.channel_post?.text || 'Activity'
          });
        }
      }

      const latestChat = discoveredChats[0] || null;
      if (latestChat) {
        saveStoredCredentials({ telegramChatId: latestChat.id });
      }

      sendJson(res, 200, {
        success: true,
        botUser,
        botUrl,
        totalUpdates: updates.length,
        discoveredChats,
        latestChatId: latestChat ? latestChat.id : null,
        latestChat,
        message: latestChat
          ? `Found Chat ID: ${latestChat.id} (${latestChat.title})`
          : `No chat activity found yet. Please open ${botUrl || 'your bot in Telegram'} and click START first.`
      });
    } catch (err) {
      sendJson(res, 500, { success: false, error: err.message });
    }
    return true;
  }

  // Test Telegram Connection
  if (reqPath === '/api/test-telegram' && req.method === 'POST') {
    try {
      const body = await readRequestBody(req);
      const creds = loadStoredCredentials();
      const botToken = (body.botToken || creds.telegramBotToken || '').trim();
      let chatId = (body.chatId || creds.telegramChatId || '').trim();

      if (!botToken) {
        sendJson(res, 400, { success: false, error: 'Telegram Bot Token is required.' });
        return true;
      }

      const getMeRes = await fetch(`https://api.telegram.org/bot${botToken}/getMe`, {
        signal: AbortSignal.timeout(10000)
      });
      const getMeData = await getMeRes.json();

      if (!getMeData.ok) {
        sendJson(res, 200, {
          success: false,
          error: `Telegram API: ${getMeData.description || 'Invalid Bot Token'}`,
          solution: 'Please ensure you copied the entire bot token from @BotFather, e.g. 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ'
        });
        return true;
      }

      const botUser = getMeData.result;
      const botUrl = `https://t.me/${botUser.username}`;

      if (!chatId) {
        try {
          const updRes = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates?limit=10`, {
            signal: AbortSignal.timeout(6000)
          });
          const updData = await updRes.json();
          if (updData.ok && updData.result?.length > 0) {
            const lastUpd = updData.result[updData.result.length - 1];
            const autoChat = lastUpd.message?.chat || lastUpd.channel_post?.chat;
            if (autoChat?.id) {
              chatId = String(autoChat.id);
            }
          }
        } catch (_) {}
      }

      const rawChatIds = (chatId || '').split(/[,\s;]+/).map(s => s.trim()).filter(Boolean);

      if (rawChatIds.length > 0) {
        const deliveryResults = [];
        let successCount = 0;

        for (const targetId of rawChatIds) {
          const pingMsg = `🛰️ *Vacancy Radar India — Bot Connection Active*\n\n` +
                          `✅ *Connection Verified Successfully!*\n` +
                          `🤖 Bot: @${botUser.username}\n` +
                          `🆔 Target Chat: \`${targetId}\`\n\n` +
                          `You are now set up to receive:\n` +
                          `• 📅 Daily Vacancy Digests\n` +
                          `• 🚨 Urgent Deadlines (< 48 hours to closing)\n` +
                          `• 📜 Official Corrigenda & Date Extension Alerts\n\n` +
                          `_Portal: http://localhost:3000_`;

          try {
            const sendRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: targetId,
                text: pingMsg,
                parse_mode: 'Markdown'
              }),
              signal: AbortSignal.timeout(10000)
            });
            const sendData = await sendRes.json();

            if (sendData.ok) {
              successCount++;
              deliveryResults.push({ id: targetId, ok: true, messageId: sendData.result?.message_id });
            } else {
              const errDesc = sendData.description || 'Failed to deliver message';
              const isNotFound = /chat not found|bot was blocked|user not found|can't initiate/i.test(errDesc);
              deliveryResults.push({ id: targetId, ok: false, error: errDesc, isChatNotFound: isNotFound });
            }
          } catch (tErr) {
            deliveryResults.push({ id: targetId, ok: false, error: tErr.message, isChatNotFound: false });
          }
        }

        const anySuccess = successCount > 0;
        const allSuccess = successCount === rawChatIds.length;
        if (anySuccess) {
          saveStoredCredentials({ telegramBotToken: botToken, telegramChatId: rawChatIds.join(', ') });
        }

        const failedList = deliveryResults.filter(r => !r.ok);
        const hasChatNotFound = failedList.some(r => r.isChatNotFound);

        sendJson(res, 200, {
          success: anySuccess,
          allSuccess,
          botUser,
          botUrl,
          totalTargets: rawChatIds.length,
          successCount,
          deliveryResults,
          chatId: rawChatIds.join(', '),
          pingSent: anySuccess,
          message: allSuccess
            ? `Telegram Bot @${botUser.username} connected & verified across all ${rawChatIds.length} target chat(s)!`
            : `Delivered to ${successCount} of ${rawChatIds.length} target chat(s).`,
          isChatNotFound: hasChatNotFound,
          error: failedList.length > 0 ? failedList.map(f => `${f.id}: ${f.error}`).join(' | ') : null,
          solution: hasChatNotFound
            ? `Telegram requires individual users to start the conversation first. Open ${botUrl} in Telegram, click START (or send /start), and test again. For channels or groups, make sure @${botUser.username} is added as an Admin.`
            : null
        });
        return true;
      }

      saveStoredCredentials({ telegramBotToken: botToken });
      sendJson(res, 200, {
        success: true,
        botUser,
        botUrl,
        pingSent: false,
        requiresChatId: true,
        message: `Bot @${botUser.username} is valid! Next step: Open ${botUrl} in Telegram, click START, and enter your Chat ID (or click "Auto-Detect Chat ID").`
      });
    } catch (err) {
      sendJson(res, 500, { success: false, error: err.message });
    }
    return true;
  }

  // Send Telegram Message
  if (reqPath === '/api/send-telegram' && req.method === 'POST') {
    const clientKey = `${req.socket?.remoteAddress || 'local'}:send-telegram`;
    if (!checkRateLimit(clientKey, 20, 60000)) {
      sendJson(res, 429, { success: false, error: 'Rate limit exceeded for Telegram dispatches. Please wait a minute.' });
      return true;
    }
    try {
      const body = await readRequestBody(req);
      const creds = loadStoredCredentials();
      const botToken = (body.botToken || creds.telegramBotToken || '').trim();
      const chatId = (body.chatId || creds.telegramChatId || '').trim();
      const text = (body.message || body.text || '').trim();

      if (!botToken || !chatId) {
        sendJson(res, 400, { success: false, error: 'Both Telegram Bot Token and Chat ID are required.' });
        return true;
      }
      if (!text) {
        sendJson(res, 400, { success: false, error: 'Message text is required.' });
        return true;
      }

      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: body.parseMode || 'Markdown',
          disable_web_page_preview: false
        }),
        signal: AbortSignal.timeout(12000)
      });
      const data = await response.json();

      sendJson(res, 200, {
        success: Boolean(data.ok),
        messageId: data.result?.message_id,
        error: data.ok ? null : data.description
      });
    } catch (err) {
      sendJson(res, 500, { success: false, error: err.message });
    }
    return true;
  }

  // Daily Digest
  if (reqPath === '/api/daily-digest' && req.method === 'POST') {
    try {
      const body = await readRequestBody(req);
      const vacancies = body.vacancies || [];
      const profile = body.profile || {};
      const digestText = TelegramAlertEngine.formatDailyDigest(vacancies, profile);

      let telegramSent = false;
      let telegramError = null;

      if (body.sendTelegram) {
        const creds = loadStoredCredentials();
        const botToken = (body.botToken || creds.telegramBotToken || '').trim();
        const chatId = (body.chatId || creds.telegramChatId || '').trim();

        if (botToken && chatId) {
          const rawChatIds = chatId.split(/[,\s;]+/).map(s => s.trim()).filter(Boolean);
          for (const targetId of rawChatIds) {
            try {
              const sendRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: targetId,
                  text: digestText,
                  parse_mode: 'Markdown'
                }),
                signal: AbortSignal.timeout(12000)
              });
              const sendData = await sendRes.json();
              if (sendData.ok) telegramSent = true;
              else telegramError = sendData.description;
            } catch (tErr) {
              telegramError = tErr.message;
            }
          }
        }
      }

      sendJson(res, 200, {
        success: true,
        digestText,
        sentToTelegram: telegramSent,
        telegramError
      });
    } catch (err) {
      sendJson(res, 500, { success: false, error: err.message });
    }
    return true;
  }

  return false;
}
