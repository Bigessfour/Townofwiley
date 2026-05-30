import { TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { describe, expect, it, vi } from 'vitest';
import { GlobalErrorHandler } from './global-error-handler';
import { LoggingService } from './logging.service';

describe('GlobalErrorHandler', () => {
  it('logs uncaught errors and displays a friendly toast', () => {
    const mockLogging = { log: vi.fn() };
    const mockMessageService = { add: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: LoggingService, useValue: mockLogging },
        { provide: MessageService, useValue: mockMessageService },
      ],
    });

    const handler = TestBed.inject(GlobalErrorHandler);

    const testError = new Error('Test backend exploded');
    handler.handleError(testError);

    expect(mockLogging.log).toHaveBeenCalledWith(
      'error',
      'Uncaught application error',
      expect.objectContaining({ message: 'Test backend exploded' }),
    );
    expect(mockMessageService.add).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'error',
        summary: 'Unexpected Error',
        detail: expect.stringMatching(
          /contact the Town Hall.*Reference: err-[a-z0-9]+-[a-z0-9]+\./,
        ),
        life: 10000,
      }),
    );

    const logContext = mockLogging.log.mock.calls[0]?.[2] as { errorId?: string };
    expect(logContext?.errorId).toMatch(/^err-/);
  });

  it('handles non-Error objects safely', () => {
    const mockLogging = { log: vi.fn() };
    const mockMessageService = { add: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: LoggingService, useValue: mockLogging },
        { provide: MessageService, useValue: mockMessageService },
      ],
    });

    const handler = TestBed.inject(GlobalErrorHandler);

    handler.handleError('A string error');

    expect(mockLogging.log).toHaveBeenCalledWith(
      'error',
      'Uncaught application error',
      expect.objectContaining({ message: 'A string error' }),
    );
    expect(mockMessageService.add).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: expect.stringContaining('Reference: err-'),
      }),
    );
  });

  it('suppresses toast for expected network degradation', () => {
    const mockLogging = { log: vi.fn() };
    const mockMessageService = { add: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: LoggingService, useValue: mockLogging },
        { provide: MessageService, useValue: mockMessageService },
      ],
    });

    const handler = TestBed.inject(GlobalErrorHandler);
    handler.handleError({ name: 'TimeoutError' });

    expect(mockLogging.log).toHaveBeenCalledWith(
      'warn',
      'Expected service degradation',
      expect.objectContaining({ expectedDegradation: true }),
    );
    expect(mockMessageService.add).not.toHaveBeenCalled();
  });
});
