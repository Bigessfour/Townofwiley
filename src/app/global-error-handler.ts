import { ErrorHandler, Injectable, inject } from '@angular/core';
import { LoggingService } from './logging.service';
import { MessageService } from 'primeng/api';

@Injectable({ providedIn: 'root' })
export class GlobalErrorHandler implements ErrorHandler {
  private readonly logging = inject(LoggingService);
  private readonly messageService = inject(MessageService);

  handleError(error: unknown): void {
    // Log to standard app logging, which could pipe to CloudWatch or console
    const message = error instanceof Error ? error.message : String(error);
    this.logging.log('error', 'Uncaught application error', { message, stack: error instanceof Error ? error.stack : undefined });

    // Show friendly accessible fallback using PrimeNG messages
    this.messageService.add({
      severity: 'error',
      summary: 'Unexpected Error',
      detail: 'An unexpected error occurred. Please try again or contact the Town Hall if the problem persists.',
      life: 10000, // 10 seconds so they have time to read
      closable: true,
    });
  }
}
