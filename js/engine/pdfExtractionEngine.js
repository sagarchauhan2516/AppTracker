/**
 * Vacancy Radar India - Government PDF Text & Notification Parser
 * Extracts structured fields from official recruitment circulars:
 * - Advertisement / Notification Reference Number
 * - Crucial Cut-off Date for Age & Eligibility
 * - Closing Date & Extension Notices
 * - Upper Age Limit & Statutory Reservation Relaxations
 * - Reservation Category Breakout (UR, OBC, SC, ST, EWS, Total Posts)
 * - Essential Qualifications & Minimum Marks
 * - Selection Process (CBT, Written Exam, Interview)
 */

export class GovernmentPdfParser {
  /**
   * Parses official notification text into structured metadata.
   * @param {string} rawText - Full extracted text from PDF
   * @param {string} sourceUrl - Optional URL of the PDF
   * @returns {Object} Structured vacancy metadata
   */
  static parseNotificationText(rawText, sourceUrl = '') {
    if (!rawText || typeof rawText !== 'string') {
      return {
        success: false,
        advertisementNumber: '',
        dates: {},
        qualifications: {},
        reservationBreakout: {},
        selectionProcess: [],
        isCorrigendum: false,
        isExtension: false
      };
    }

    const text = rawText.replace(/\r\n/g, '\n');
    const isCorrigendum = /(?:corrigendum|addendum|amendment|errata)\b/i.test(text.slice(0, 2000));
    const isExtension = /(?:extension\s+of\s+(?:last\s+)?date|date\s+extended|last\s+date\s+is\s+extended)\b/i.test(text.slice(0, 3000));

    const advertisementNumber = this.extractAdvtNumber(text);
    const dates = this.extractDates(text);
    const qualifications = this.extractQualifications(text);
    const reservationBreakout = this.extractReservationBreakout(text);
    const selectionProcess = this.extractSelectionProcess(text);
    const remuneration = this.extractRemuneration(text);

    return {
      success: true,
      sourceUrl,
      advertisementNumber,
      dates,
      qualifications,
      reservationBreakout,
      selectionProcess,
      remuneration,
      isCorrigendum,
      isExtension,
      summarySnippet: text.slice(0, 400).replace(/\s+/g, ' ').trim()
    };
  }

  /**
   * Extracts Advertisement Number from circular text.
   */
  static extractAdvtNumber(text) {
    const patterns = [
      /(?:Advt\.?\s*(?:No\.?|Notice)?|Notification\s*No\.?|Advertisement\s*(?:No\.?|Notice))\s*[:\-]?\s*([A-Za-z0-9\/\-_\.\(\)]{3,45})/i,
      /(?:EN\s*No\.?|Ref\s*No\.?|File\s*No\.?)\s*[:\-]?\s*([A-Za-z0-9\/\-_\.\(\)]{3,45})/i,
      /\b([A-Z0-9]{2,10}(?:\([A-Za-z0-9]+\))?\/\d{4}(?:-\d{2,4})?(?:\/[A-Za-z0-9\-_]+)?)\b/
    ];

    for (const pat of patterns) {
      const match = text.match(pat);
      if (match && match[1] && !/^(the|and|for|date|page|post)$/i.test(match[1].trim())) {
        return match[1].trim();
      }
    }
    return '';
  }

  /**
   * Extracts cut-off date, closing date, and start date.
   */
  static extractDates(text) {
    const dates = {};
    const datePatterns = {
      closingDate: [
        /(?:closing\s*date|last\s*date(?:\s*of\s*(?:receipt|submission|application|online\s*application))?|last\s*date\s*(?:for|is)?)\s*[:\-]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+,?\s+\d{4})/i,
        /(?:up\s*to|before)\s*[:\-]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/i
      ],
      ageCutOffDate: [
        /(?:crucial\s*date(?:\s*for\s*determining\s*eligibility|\s*for\s*age)?|cut[\s\-]*off\s*date|age\s*reckoned\s*as\s*on|as\s*on)\s*[:\-]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+,?\s+\d{4})/i
      ],
      startDate: [
        /(?:opening\s*date|commencement\s*of\s*(?:online\s*)?applications?|starting\s*date)\s*[:\-]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+,?\s+\d{4})/i
      ]
    };

    for (const [key, regexList] of Object.entries(datePatterns)) {
      for (const regex of regexList) {
        const match = text.match(regex);
        if (match && match[1]) {
          const standardized = this.standardizeDateStr(match[1]);
          if (standardized) {
            dates[key] = standardized;
            break;
          }
        }
      }
    }

    // Default: if ageCutOffDate not explicitly separated, government norms use closing date
    if (!dates.ageCutOffDate && dates.closingDate) {
      dates.ageCutOffDate = dates.closingDate;
    }

    return dates;
  }

  /**
   * Normalizes DD/MM/YYYY or DD Month YYYY to ISO YYYY-MM-DD.
   */
  static standardizeDateStr(str) {
    if (!str) return '';
    const clean = str.replace(/(?:st|nd|rd|th)/gi, '').replace(/,/g, ' ').trim();

    // Check DD/MM/YYYY or DD-MM-YYYY
    const dmy = clean.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
    if (dmy) {
      let day = parseInt(dmy[1], 10);
      let month = parseInt(dmy[2], 10);
      let year = parseInt(dmy[3], 10);
      if (year < 100) year += 2000;
      if (month <= 12 && day <= 31) {
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }

    // Check Month Name parsing e.g. 15 November 2026 or Nov 15 2026
    const parsed = new Date(clean);
    if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 2000) {
      return parsed.toISOString().slice(0, 10);
    }

    return clean;
  }

  /**
   * Extracts age limits, qualifications, and marks thresholds.
   */
  static extractQualifications(text) {
    const quals = {};

    // Upper age limit
    const ageMatch = text.match(/(?:upper\s*age\s*limit|maximum\s*age|age\s*limit|not\s*exceeding)\s*[:\-]?\s*(\d{2})\s*(?:years|yrs)?/i);
    if (ageMatch && ageMatch[1]) {
      const ageVal = parseInt(ageMatch[1], 10);
      if (ageVal >= 18 && ageVal <= 65) {
        quals.ageLimit = ageVal;
      }
    }

    // Essential degree requirements
    const degrees = [];
    if (/b\.?e\.?\b|b\.?tech\b|bachelor\s+of\s+(?:engineering|technology)/i.test(text)) {
      degrees.push('B.E. / B.Tech');
    }
    if (/\bmca\b|master\s+of\s+computer\s+applications/i.test(text)) {
      degrees.push('MCA');
    }
    if (/m\.?sc\.?\b|master\s+of\s+science/i.test(text)) {
      degrees.push('M.Sc.');
    }
    if (/m\.?tech\b|m\.?e\.?\b|master\s+of\s+technology/i.test(text)) {
      degrees.push('M.Tech / M.E.');
    }
    if (/\bbca\b|\bb\.?sc\.?\b|bachelor\s+of\s+science/i.test(text) && degrees.length === 0) {
      degrees.push('BCA / B.Sc.');
    }

    if (degrees.length > 0) {
      quals.requiredDegree = degrees.join(' / ');
    }

    // Minimum marks percentage (e.g. 60% or 65%)
    const marksMatch = text.match(/(?:minimum|at\s*least|with\s*(?:not\s*less\s*than)?)\s*(\d{2})%\s*(?:marks|aggregate)/i);
    if (marksMatch && marksMatch[1]) {
      quals.minMarksPercentage = parseInt(marksMatch[1], 10);
    }

    // Experience requirement
    const expMatch = text.match(/(\d+)\s*(?:years?|yrs?)(?:\s*(?:of)?\s*(?:post[\s\-]*qualification)?\s*experience)/i);
    if (expMatch && expMatch[1]) {
      quals.minExperienceYears = parseInt(expMatch[1], 10);
    } else if (/(?:freshers?\s*(?:can|may)\s*apply|no\s*experience\s*(?:is\s*)?required)/i.test(text)) {
      quals.minExperienceYears = 0;
    }

    return quals;
  }

  /**
   * Extracts category-wise vacancy distribution (UR, OBC, SC, ST, EWS).
   */
  static extractReservationBreakout(text) {
    const breakout = {};

    const totalMatch = text.match(/(?:total\s*(?:no\.?\s*of\s*)?(?:posts?|vacancies)|number\s*of\s*posts?|vacancies)\s*[:\-]?\s*(\d+)/i);
    if (totalMatch && totalMatch[1]) {
      const count = parseInt(totalMatch[1], 10);
      breakout.totalPosts = count;
      breakout.totalposts = count;
    }

    const categories = ['UR', 'OBC', 'SC', 'ST', 'EWS', 'PwD', 'ESM'];
    for (const cat of categories) {
      const reg = new RegExp(`\\b${cat}\\s*[:\\-=]\\s*(\\d+)`, 'i');
      const m = text.match(reg);
      if (m && m[1]) {
        breakout[cat.toLowerCase()] = parseInt(m[1], 10);
      }
    }

    return breakout;
  }

  /**
   * Detects the selection methodology.
   */
  static extractSelectionProcess(text) {
    const modes = [];
    if (/written\s*(?:test|exam|examination)|computer\s*based\s*(?:test|exam)|cbt\b/i.test(text)) {
      modes.push('Written Examination / CBT');
    }
    if (/interview|personality\s*test|viva\s*voce/i.test(text)) {
      modes.push('Personal Interview');
    }
    if (/skill\s*test|trade\s*test|practical\s*test/i.test(text)) {
      modes.push('Skill / Practical Test');
    }
    if (/gate\s*score/i.test(text)) {
      modes.push('GATE Score Shortlisting');
    }
    return modes;
  }

  /**
   * Extracts pay scale / pay matrix level / CTC.
   */
  static extractRemuneration(text) {
    // Pay Level (e.g. Level 10, Level 7 in 7th CPC)
    const levelMatch = text.match(/(?:Pay\s*Level|Level)\s*[:\-]?\s*(\d{1,2})\s*(?:of\s*7th\s*CPC)?/i);
    if (levelMatch && levelMatch[1]) {
      return {
        type: 'PAY_MATRIX',
        amountText: `7th CPC Pay Matrix Level ${levelMatch[1]}`
      };
    }

    // Consolidated Salary e.g. Rs. 50,000/- or ₹ 67,000 p.m.
    const salaryMatch = text.match(/(?:₹|Rs\.?|INR)\s*([\d,]{4,10})\s*(?:(?:\/-)?\s*(?:p\.?m\.?|per\s*month)?)/i);
    if (salaryMatch && salaryMatch[1]) {
      return {
        type: 'CONSOLIDATED',
        amountText: `₹ ${salaryMatch[1]} per month`
      };
    }

    return { type: 'UNSPECIFIED', amountText: '' };
  }
}
