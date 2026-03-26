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
    // TODO: For live/production remote logging, post to a backend endpoint, AppSync mutation, or AWS CloudWatch via Lambda proxy
  }

  buttonClick(button: string, action: string = 'clicked') {
    this.log('info', `Button ${action}`, { button });
  }
}
