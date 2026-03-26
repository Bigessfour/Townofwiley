import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoggingService {
  log(level: 'debug' | 'info' | 'warn' | 'error', message: string, context?: any) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      page: window.location.pathname,
    };
    console[level](entry);

    // Non-blocking remote logging for prod (CloudFront/Amplify compatible)
    const config = (window as any).__TOW_RUNTIME_CONFIG__;
    if (config?.logging?.endpoint && typeof navigator?.sendBeacon === 'function') {
      try {
        const blob = new Blob([JSON.stringify(entry)], { type: 'application/json' });
        navigator.sendBeacon(config.logging.endpoint, blob);
      } catch {
        // Silent fallback
      }
    }
  }

  buttonClick(button: string, action: string = 'clicked') {
    this.log('info', `Button ${action}`, { button });
  }
}
