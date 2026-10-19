/**
 * Vacancy Radar India - Application Event Bus (Pub-Sub State Manager)
 * Provides decoupled, reactive communication across UI components,
 * storage updates, search engines, and background synchronizers.
 */

export const EVENTS = Object.freeze({
  VACANCIES_UPDATED: 'vacancies:updated',
  PROFILE_CHANGED: 'profile:changed',
  PROFILES_UPDATED: 'profiles:updated',
  APPLICATIONS_UPDATED: 'applications:updated',
  THEME_CHANGED: 'theme:changed',
  FILTERS_CHANGED: 'filters:changed',
  SOURCES_UPDATED: 'sources:updated',
  PROVIDERS_UPDATED: 'providers:updated',
  SEARCH_COMPLETED: 'search:completed',
  NOTIFICATION_TRIGGERED: 'notification:triggered'
});

export class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  /**
   * Subscribe to an event topic.
   * @param {string} event - The event name from EVENTS or custom string.
   * @param {Function} handler - Callback invoked with event payload.
   * @returns {Function} Unsubscribe function to cleanly remove listener.
   */
  subscribe(event, handler) {
    if (typeof handler !== 'function') {
      throw new TypeError(`Event handler for "${event}" must be a function.`);
    }

    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    this.listeners.get(event).add(handler);

    // Return unbind handle
    return () => this.unsubscribe(event, handler);
  }

  /**
   * Unsubscribe a handler from an event.
   * @param {string} event 
   * @param {Function} handler 
   * @returns {boolean} True if removed, false otherwise.
   */
  unsubscribe(event, handler) {
    const handlers = this.listeners.get(event);
    if (!handlers) return false;
    const removed = handlers.delete(handler);
    if (handlers.size === 0) {
      this.listeners.delete(event);
    }
    return removed;
  }

  /**
   * Subscribe to an event once; automatically detaches after first delivery.
   * @param {string} event 
   * @param {Function} handler 
   * @returns {Function} Unsubscribe handle
   */
  once(event, handler) {
    if (typeof handler !== 'function') {
      throw new TypeError(`Event handler for "${event}" must be a function.`);
    }

    const wrapper = (payload) => {
      this.unsubscribe(event, wrapper);
      handler(payload);
    };

    return this.subscribe(event, wrapper);
  }

  /**
   * Publish an event with optional data payload.
   * Safeguarded against subscriber errors so one failing listener doesn't crash others.
   * @param {string} event 
   * @param {*} payload 
   * @returns {number} Count of notified listeners
   */
  publish(event, payload = null) {
    const handlers = this.listeners.get(event);
    if (!handlers || handlers.size === 0) {
      return 0;
    }

    // Clone set to prevent issues if a handler unsubscribes during loop
    const activeHandlers = Array.from(handlers);
    let notifiedCount = 0;

    for (const handler of activeHandlers) {
      try {
        handler(payload);
        notifiedCount++;
      } catch (err) {
        console.error(`[EventBus] Error in subscriber for event "${event}":`, err);
      }
    }

    return notifiedCount;
  }

  /**
   * Remove all listeners for an event, or all events if no event specified.
   * @param {string} [event] 
   */
  clear(event) {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Get active subscriber count for an event.
   * @param {string} event 
   * @returns {number}
   */
  listenerCount(event) {
    return this.listeners.get(event)?.size || 0;
  }
}

// Global Singleton Instance
export const eventBus = new EventBus();
