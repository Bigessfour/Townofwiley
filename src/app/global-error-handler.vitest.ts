import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { describe, expect, it, vi } from 'vitest';
import { GlobalErrorHandler } from './global-error-handler';
import { LoggingService } from './logging.service';

describe('GlobalErrorHandler', () => {
  function createHandler() {
    const mockLogging = { log: vi.fn() };
    const mockMessageService = { add: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: LoggingService, useValue: mockLogging },
        { provide: MessageService, useValue: mockMessageService },
        {
          provide: Router,
          useValue: { url: '/', getCurrentNavigation: () => null },
        },
      ],
    });

    return {
      handler: TestBed.inject(GlobalErrorHandler),
      mockLogging,
      mockMessageService,
    };
  }

  it('toasts operational TypeError from app code', () => {
    const { handler, mockLogging, mockMessageService } = createHandler();
    const testError = new TypeError('Cannot read properties of undefined');
    testError.stack =
      'TypeError: x\n    at https://www.townofwiley.gov/main-TEST.js:10:1';

    handler.handleError(testError);

    expect(mockLogging.log).toHaveBeenCalledWith(
      'error',
      'Uncaught operational application error',
      expect.objectContaining({ message: 'Cannot read properties of undefined' }),
    );
    expect(mockMessageService.add).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'error',
        summary: 'Unexpected Error',
        detail: expect.stringMatching(/Reference: err-[a-z0-9]+-[a-z0-9]+\./),
      }),
    );
  });

  it('logs auth failures without a toast', () => {
    const mockLogging = { log: vi.fn() };
    const mockMessageService = { add: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: LoggingService, useValue: mockLogging },
        { provide: MessageService, useValue: mockMessageService },
        {
          provide: Router,
          useValue: { url: '/admin/login', getCurrentNavigation: () => null },
        },
      ],
    });

    const handler = TestBed.inject(GlobalErrorHandler);
    const authError = new Error('Incorrect username or password.');
    authError.name = 'NotAuthorizedException';

    handler.handleError(authError);

    expect(mockMessageService.add).not.toHaveBeenCalled();
    expect(mockLogging.log).toHaveBeenCalledWith(
      'warn',
      'Handled application error (no global toast)',
      expect.objectContaining({ showToast: false }),
    );
  });

  it('suppresses toast for expected network degradation', () => {
    const { handler, mockLogging, mockMessageService } = createHandler();
    handler.handleError({ name: 'TimeoutError' });

    expect(mockLogging.log).toHaveBeenCalledWith(
      'warn',
      'Handled application error (no global toast)',
      expect.objectContaining({ expectedDegradation: true }),
    );
    expect(mockMessageService.add).not.toHaveBeenCalled();
  });

  it('logs generic non-operational errors without a toast', () => {
    const { handler, mockLogging, mockMessageService } = createHandler();
    handler.handleError('A string error');

    expect(mockMessageService.add).not.toHaveBeenCalled();
    expect(mockLogging.log).toHaveBeenCalledWith(
      'warn',
      'Handled application error (no global toast)',
      expect.objectContaining({ message: 'A string error', showToast: false }),
    );
  });
});
