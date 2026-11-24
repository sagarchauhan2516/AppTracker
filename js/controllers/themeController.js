/**
 * Vacancy Radar India - Theme Controller
 * Manages Dark Mode and Light Mode switching with localStorage persistence
 */

import { eventBus, EVENTS } from '../services/eventBus.js';

export function initTheme() {
  const savedTheme = localStorage.getItem('vacancy_radar_theme_v2') || 'light';
  setTheme(savedTheme);
}

export function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('vacancy_radar_theme_v2', theme);
  localStorage.setItem('theme', theme);
  const icon = document.getElementById('themeToggleIcon') || document.getElementById('themeIcon');
  const label = document.getElementById('themeToggleLabel') || document.getElementById('themeText');
  if (icon) {
    icon.setAttribute('data-lucide', theme === 'dark' ? 'sun' : 'moon');
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
    }
  }
  if (label) {
    label.textContent = theme === 'dark' ? 'Light' : 'Dark';
  }
  eventBus.publish(EVENTS.THEME_CHANGED, theme);
}

export function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  setTheme(newTheme);
}
