/**
 * Vacancy Radar India - Notification & Confirmation Banner Service
 * Provides smooth, professional overlay confirmation banners across all forms,
 * settings, credentials, and actions on the website.
 */

import { escapeHtml } from '../utils/htmlUtils.js';

export function showConfirmationBanner(title, message, type = 'success', durationMs = 3800) {
  let container = document.getElementById('confirmationBannerContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'confirmationBannerContainer';
    container.className = 'confirmation-overlay-container';
    document.body.appendChild(container);
  }

  const banner = document.createElement('div');
  const typeClass = type === 'info' ? 'banner-info' : (type === 'warning' ? 'banner-warning' : (type === 'error' ? 'banner-error' : ''));
  banner.className = `confirmation-banner ${typeClass}`;
  
  const iconName = type === 'warning' ? 'alert-triangle' : (type === 'info' ? 'info' : (type === 'error' ? 'x-circle' : 'check-circle-2'));
  const iconClass = type === 'warning' ? 'text-amber' : (type === 'info' ? 'text-blue' : (type === 'error' ? 'text-rose' : 'text-emerald'));

  banner.innerHTML = `
    <span class="banner-icon"><i data-lucide="${iconName}" class="icon-md ${iconClass}"></i></span>
    <div class="banner-body">
      <div class="banner-title">${escapeHtml(title)}</div>
      <div class="banner-desc">${escapeHtml(message)}</div>
    </div>
    <button type="button" class="banner-close-btn" aria-label="Close notification"><i data-lucide="x" class="icon-xs"></i></button>
    <div class="banner-progress" style="animation-duration: ${durationMs}ms;"></div>
  `;

  const closeBtn = banner.querySelector('.banner-close-btn');
  const dismiss = () => {
    banner.style.animation = 'bannerSlideOut 0.25s forwards';
    setTimeout(() => {
      try { banner.remove(); } catch (_) {}
    }, 260);
  };

  closeBtn?.addEventListener('click', dismiss);
  setTimeout(dismiss, durationMs);

  container.appendChild(banner);
  if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
}

// Make globally accessible across all modules and inline handlers
if (typeof window !== 'undefined') {
  window.showConfirmationBanner = showConfirmationBanner;
}
