import { ErrorHandler, Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { LoggingService } from './logging.service';

interface ErrorDetails {
  message: string;
  name?: string;
  stack?: string;
  cause?: string;
  topStackFrame?: string;
  rawType?: string;
}

@Injectable({ providedIn: 'root' })
export class GlobalErrorHandler implements ErrorHandler {
  private readonly logging = inject(LoggingService);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);

  handleError(error: unknown): void {
    const errorId = this.createErrorId();
    const details = this.toErrorDetails(error);
    const currentNavigation = this.router.getCurrentNavigation();

    const context = {
      errorId,
      route: this.router.url,
      href: typeof window !== 'undefined' ? window.location.href : undefined,
      navId: currentNavigation?.id,
      navTrigger: currentNavigation?.trigger,
      navInitialUrl: currentNavigation?.initialUrl?.toString(),
      navFinalUrl: currentNavigation?.finalUrl?.toString(),
      historyNavigationId: this.getHistoryNavigationId(),
      ...details,
    };

    this.logging.log('error', 'Uncaught application error', context);

    // Keep the raw object in console for local debugging sessions.
    console.error(GlobalErrorHandler.name, {
      ...context,
      error,
    });

    this.messageService.add({
      severity: 'error',
      summary: 'Unexpected Error',
      detail: 'An unexpected error occurred. Please try again or contact the Town Hall if the problem persists.',
      life: 10000,
      closable: true,
    });
  }

  private toErrorDetails(error: unknown): ErrorDetails {
    if (error instanceof Error) {
      return {
        message: error.message,
        name: error.name,
        stack: error.stack,
        cause: this.stringifyCause(error.cause),
        topStackFrame: this.extractTopStackFrame(error.stack),
      };
    }

    return {
      message: this.stringifyUnknown(error),
      rawType: typeof error,
    };
  }

  private createErrorId(): string {
    return `err-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  private getHistoryNavigationId(): number | undefined {
    if (typeof history === 'undefined' || !history.state) {
      return undefined;
    }

    const navId = (history.state as { navigationId?: unknown }).navigationId;
    return typeof navId === 'number' ? navId : undefined;
  }

  private extractTopStackFrame(stack: string | undefined): string | undefined {
    if (!stack) {
      return undefined;
    }

    return stack
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line.startsWith('at '));
  }

  private stringifyCause(cause: unknown): string | undefined {
    if (cause === undefined || cause === null) {
      return undefined;
    }

    return this.stringifyUnknown(cause);
  }

  private stringifyUnknown(value: unknown): string {
    if (typeof value === 'string') {
      return value;
    }

    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
}
