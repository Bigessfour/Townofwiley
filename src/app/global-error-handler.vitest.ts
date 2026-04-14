import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { GlobalErrorHandler } from './global-error-handler';
import { LoggingService } from './logging.service';
import { MessageService } from 'primeng/api';

describe('GlobalErrorHandler', () => {
  it('logs uncaught errors and displays a friendly toast', () => {
    const mockLogging = { log: vi.fn() };
    const mockMessageService = { add: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: LoggingService, useValue: mockLogging },
        { provide: MessageService, useValue: mockMessageService },
      ]
    });

    const handler = TestBed.inject(GlobalErrorHandler);

    const testError = new Error('Test backend exploded');
    handler.handleError(testError);

    expect(mockLogging.log).toHaveBeenCalledWith('error', 'Uncaught application error', expect.objectContaining({ message: 'Test backend exploded' }));
    expect(mockMessageService.add).toHaveBeenCalledWith(expect.objectContaining({
      severity: 'error',
      summary: 'Unexpected Error',
      detail: expect.stringContaining('contact the Town Hall'),
      life: 10000,
    }));
  });

  it('handles non-Error objects safely', () => {
    const mockLogging = { log: vi.fn() };
    const mockMessageService = { add: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: LoggingService, useValue: mockLogging },
        { provide: MessageService, useValue: mockMessageService },
      ]
    });

    const handler = TestBed.inject(GlobalErrorHandler);

    handler.handleError('A string error');

    expect(mockLogging.log).toHaveBeenCalledWith('error', 'Uncaught application error', expect.objectContaining({ message: 'A string error' }));
    expect(mockMessageService.add).toHaveBeenCalled(); // Friendly message still shown
  });
});