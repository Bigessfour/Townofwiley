import { Injectable } from '@angular/core';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface RuntimeBuildConfig {
  timestamp?: string;
  gitSha?: string;
}

interface RuntimeLoggingConfig {
  endpoint?: string;
}

interface RuntimeConfigShape {
  build?: RuntimeBuildConfig;
  logging?: RuntimeLoggingConfig;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  page: string;
  url: string;
  referrer?: string;
  build?: RuntimeBuildConfig;
}

@Injectable({ providedIn: 'root' })
export class LoggingService {
  constructor() {
    if (typeof window === 'undefined') {
      return;
    }

    window.addEventListener('error', (event) => {
      this.log('error', 'Unhandled browser error', {
        eventType: 'browser_error',
        source: event.filename,
        line: event.lineno,
        column: event.colno,
        errorMessage: event.message,
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.log('error', 'Unhandled promise rejection', {
        eventType: 'unhandled_rejection',
        reason: this.stringifyReason(event.reason),
      });
    });
  }

  log(level: LogLevel, message: string, context?: Record<string, unknown>) {
    if (typeof window === 'undefined') {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      page: window.location.pathname,
      url: window.location.href,
      referrer: document.referrer || undefined,
      build: this.getRuntimeConfig()?.build,
    };
    const consoleMethod = level === 'debug' ? 'debug' : level === 'warn' ? 'warn' : level === 'error' ? 'error' : 'info';
    console[consoleMethod](entry);

    const endpoint = this.getRuntimeConfig()?.logging?.endpoint?.trim();

    if (endpoint && typeof navigator?.sendBeacon === 'function') {
      try {
        const blob = new Blob([JSON.stringify(entry)], { type: 'application/json' });
        navigator.sendBeacon(endpoint, blob);
      } catch {
        // Silent fallback
      }
    }
  }

  pageView(path: string, fragment?: string, title?: string): void {
    this.log('info', 'Page view', {
      eventType: 'page_view',
      path,
      fragment: fragment || undefined,
      title: title || undefined,
    });
  }

  buttonClick(button: string, action: string = 'clicked') {
    this.log('info', `Button ${action}`, {
      eventType: 'button_click',
      button,
      action,
    });
  }

  private stringifyReason(reason: unknown): string {
    if (reason instanceof Error) {
      return reason.message;
    }

    if (typeof reason === 'string') {
      return reason;
    }

    try {
      return JSON.stringify(reason);
    } catch {
      return String(reason);
    }
  }

  private getRuntimeConfig(): RuntimeConfigShape | undefined {
    if (typeof window === 'undefined') {
      return undefined;
    }

    return (window as Window & { __TOW_RUNTIME_CONFIG__?: RuntimeConfigShape }).__TOW_RUNTIME_CONFIG__;
  }
}
