/**
 * Vacancy Radar India - Theme Controller
 * Manages Dark Mode and Light Mode switching with localStorage persistence
 */

import { eventBus, EVENTS } from '../services/eventBus.js';

export function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  setTheme(savedTheme);
}

export function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  const icon = document.getElementById('themeToggleIcon');
  const label = document.getElementById('themeToggleLabel');
  if (icon) {
    icon.textContent = theme === 'dark' ? '☀️' : '🌙';
  }
  if (label) {
    label.textContent = theme === 'dark' ? 'Bright Mode' : 'Dark Mode';
  }
  eventBus.publish(EVENTS.THEME_CHANGED, theme);
}

export function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  setTheme(newTheme);
}
