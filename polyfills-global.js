/**
 * Global Polyfills for Turborepo Workspace
 * Required for React Native compatibility across all packages
 */

// Ensure global object exists
if (typeof global === 'undefined') {
  global = globalThis || this || window;
}

// EventTarget polyfill for React Native
if (typeof global.EventTarget === 'undefined') {
  global.EventTarget = class EventTarget {
    constructor() {
      this.listeners = new Map();
    }

    addEventListener(type, listener, options = {}) {
      if (!this.listeners.has(type)) {
        this.listeners.set(type, new Set());
      }
      this.listeners.get(type).add(listener);
    }

    removeEventListener(type, listener) {
      if (this.listeners.has(type)) {
        this.listeners.get(type).delete(listener);
      }
    }

    dispatchEvent(event) {
      if (!this.listeners.has(event.type)) return true;
      
      const listeners = this.listeners.get(event.type);
      for (const listener of listeners) {
        try {
          if (typeof listener === 'function') {
            listener.call(this, event);
          } else if (listener && typeof listener.handleEvent === 'function') {
            listener.handleEvent(event);
          }
        } catch (error) {
          console.error('Error in event listener:', error);
        }
      }
      return !event.defaultPrevented;
    }
  };
}

// Event polyfill
if (typeof global.Event === 'undefined') {
  global.Event = class Event {
    constructor(type, eventInitDict = {}) {
      this.type = type;
      this.bubbles = eventInitDict.bubbles || false;
      this.cancelable = eventInitDict.cancelable || false;
      this.composed = eventInitDict.composed || false;
      this.currentTarget = null;
      this.defaultPrevented = false;
      this.eventPhase = 0;
      this.isTrusted = false;
      this.target = null;
      this.timeStamp = Date.now();
    }

    preventDefault() {
      if (this.cancelable) {
        this.defaultPrevented = true;
      }
    }

    stopPropagation() {
      // No-op for basic implementation
    }

    stopImmediatePropagation() {
      // No-op for basic implementation
    }
  };
}

console.log('✅ Global polyfills loaded - EventTarget:', typeof global.EventTarget !== 'undefined');
