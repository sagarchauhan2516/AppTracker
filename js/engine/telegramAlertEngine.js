/**
 * Vacancy Radar India - Telegram & Daily Digest Notification Engine
 * 
 * Rules Enforced:
 * 1. Daily Digest over Real-Time Spam: One clean summary per day.
 * 2. Instant Alerts ONLY for:
 *    - Closing-Soon warnings (< 48 hours remaining)
 *    - Official Corrigenda / Date Extensions
 * 3. Formatted for instant readability on mobile Telegram / WhatsApp.
 */

export class TelegramAlertEngine {
  /**
   * Generates a concise, high-signal Daily Digest message.
   * @param {Array<Object>} vacancies - List of active vacancies
   * @param {Object} profile - Candidate profile
   * @returns {string} Formatted Telegram Markdown message
   */
  static formatDailyDigest(vacancies = [], profile = {}) {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

    const closingSoon = [];
    const corrigenda = [];
    const topMatches = [];

    for (const v of vacancies) {
      // Check corrigendum
      if (v.isCorrigendum || v.isExtension) {
        corrigenda.push(v);
        continue;
      }

      // Check closing soon (< 48 hrs)
      const closeStr = v.dates?.closingDate || v.closingDate;
      if (closeStr) {
        const closeTime = new Date(closeStr).getTime();
        const diffHrs = (closeTime - now.getTime()) / (1000 * 60 * 60);
        if (diffHrs > 0 && diffHrs <= 48) {
          closingSoon.push({ ...v, diffHrs: Math.round(diffHrs) });
          continue;
        }
      }

      // Check high match (score >= 80%)
      const score = v.matchAnalysis?.overallScore || 0;
      if (score >= 80) {
        topMatches.push(v);
      }
    }

    let msg = `🛰️ *VACANCY RADAR INDIA — DAILY DIGEST*\n📅 ${dateStr}\n`;
    if (profile.name) {
      msg += `👤 Profile: *${profile.name}*\n`;
    }
    msg += `------------------------------------\n\n`;

    // 1. Urgent Deadlines (<48h)
    if (closingSoon.length > 0) {
      msg += `🚨 *URGENT: CLOSING IN < 48 HOURS*\n`;
      closingSoon.forEach((v, i) => {
        const link = v.verification?.applicationUrl || v.verification?.evidenceUrl || v.verification?.officialNoticePdfUrl || '';
        msg += `${i + 1}. *${v.title}* (${v.organisation || 'Govt'})\n`;
        msg += `   ⏳ Closing in ~${v.diffHrs}h | [Apply Link](${link})\n`;
      });
      msg += `\n`;
    }

    // 2. Corrigenda & Extensions
    if (corrigenda.length > 0) {
      msg += `📜 *OFFICIAL CORRIGENDA & EXTENSIONS*\n`;
      corrigenda.forEach((v, i) => {
        const type = v.isExtension ? '⏳ Date Extended' : '📜 Corrigendum';
        msg += `${i + 1}. [${type}] *${v.title}* (${v.organisation || 'Govt'})\n`;
        if (v.dates?.closingDate) msg += `   📅 New Closing: ${v.dates.closingDate}\n`;
      });
      msg += `\n`;
    }

    // 3. Top Relevant Vacancies
    if (topMatches.length > 0) {
      msg += `🎯 *RECOMMENDED HIGH-MATCH OPENINGS*\n`;
      topMatches.slice(0, 5).forEach((v, i) => {
        const score = v.matchAnalysis?.overallScore || 85;
        const org = v.organisation || 'Govt Body';
        const advt = v.advertisementNumber ? ` (Advt: ${v.advertisementNumber})` : '';
        const link = v.verification?.officialNoticePdfUrl || v.verification?.evidenceUrl || '';
        msg += `${i + 1}. *${v.title}* — ${org}${advt}\n`;
        msg += `   ⭐ Score: ${score}% | [Notice PDF / Portal](${link})\n`;
      });
      msg += `\n`;
    }

    if (closingSoon.length === 0 && corrigenda.length === 0 && topMatches.length === 0) {
      msg += `✅ *All clear:* No urgent deadlines or new corrigenda today. ${vacancies.length} active vacancies currently monitored in radar.\n\n`;
    }

    msg += `🔗 Open Dashboard: http://localhost:3000\n`;
    return msg;
  }

  /**
   * Formats an instant critical alert message for a single vacancy (e.g. immediate corrigendum).
   */
  static formatInstantAlert(vacancy, alertReason = 'CORRIGENDUM_ISSUED') {
    const isCorrigendum = alertReason === 'CORRIGENDUM_ISSUED';
    const icon = isCorrigendum ? '📜' : '⏳';
    const title = isCorrigendum ? 'CORRIGENDUM ISSUED' : 'URGENT: CLOSING IN < 24 HOURS';

    let msg = `${icon} *VACANCY RADAR ALERT: ${title}*\n\n`;
    msg += `📌 *Position:* ${vacancy.title}\n`;
    msg += `🏢 *Organisation:* ${vacancy.organisation || 'Government / Apex Body'}\n`;
    if (vacancy.advertisementNumber) {
      msg += `📄 *Advt Ref:* ${vacancy.advertisementNumber}\n`;
    }
    if (vacancy.dates?.closingDate) {
      msg += `📅 *Closing Date:* ${vacancy.dates.closingDate}\n`;
    }

    const pdfUrl = vacancy.verification?.officialNoticePdfUrl;
    if (pdfUrl) {
      msg += `\n📄 [Official PDF Notification](${pdfUrl})\n`;
    }
    const applyUrl = vacancy.verification?.applicationUrl;
    if (applyUrl) {
      msg += `🌐 [Application Portal](${applyUrl})\n`;
    }

    return msg;
  }
}
