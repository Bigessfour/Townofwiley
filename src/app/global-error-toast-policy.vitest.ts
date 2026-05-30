import { HttpErrorResponse } from '@angular/common/http';
import { describe, expect, it } from 'vitest';
import { shouldShowGlobalErrorToast, shouldSuppressGlobalErrorToast } from './global-error-toast-policy';

describe('global-error-toast-policy', () => {
  it('suppresses Cognito auth failures', () => {
    const error = new Error('Incorrect username or password.');
    error.name = 'NotAuthorizedException';
    expect(shouldShowGlobalErrorToast(error, '/admin/login')).toBe(false);
  });

  it('suppresses retriable HTTP errors', () => {
    expect(shouldShowGlobalErrorToast(new HttpErrorResponse({ status: 503 }), '/')).toBe(false);
  });

  it('suppresses 401/403 API responses', () => {
    expect(shouldShowGlobalErrorToast(new HttpErrorResponse({ status: 403 }), '/admin')).toBe(
      false,
    );
  });

  it('suppresses chunk load and abort noise', () => {
    const chunk = new Error('Loading chunk 123 failed.');
    chunk.name = 'ChunkLoadError';
    expect(shouldSuppressGlobalErrorToast(chunk)).toBe(true);

    const abort = new Error('The operation was aborted.');
    abort.name = 'AbortError';
    expect(shouldSuppressGlobalErrorToast(abort)).toBe(true);
  });

  it('shows TypeError from app bundles', () => {
    const error = new TypeError('Cannot read properties of undefined');
    error.stack = 'TypeError: Cannot read properties of undefined\n    at https://www.townofwiley.gov/main-ABC123.js:1:1';
    expect(shouldShowGlobalErrorToast(error, '/')).toBe(true);
  });

  it('suppresses generic Error without app stack', () => {
    const error = new Error('Something went wrong');
    error.stack = 'Error: Something went wrong\n    at https://evil.example/hack.js:1:1';
    expect(shouldShowGlobalErrorToast(error, '/')).toBe(false);
  });

  it('suppresses non-Error throws', () => {
    expect(shouldShowGlobalErrorToast('string failure', '/')).toBe(false);
  });
});
