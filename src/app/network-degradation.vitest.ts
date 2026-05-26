import { HttpErrorResponse } from '@angular/common/http';
import { describe, expect, it } from 'vitest';
import { isExpectedNetworkDegradation } from './network-degradation';

describe('isExpectedNetworkDegradation', () => {
  it('returns true for retriable HTTP statuses', () => {
    expect(isExpectedNetworkDegradation(new HttpErrorResponse({ status: 504 }))).toBe(true);
    expect(isExpectedNetworkDegradation(new HttpErrorResponse({ status: 0 }))).toBe(true);
  });

  it('returns true for timeout-like errors', () => {
    expect(isExpectedNetworkDegradation({ name: 'TimeoutError' })).toBe(true);
    expect(isExpectedNetworkDegradation(new Error('Gateway Timeout'))).toBe(true);
  });

  it('returns false for unexpected application errors', () => {
    expect(isExpectedNetworkDegradation(new Error('Cannot read properties of undefined'))).toBe(
      false,
    );
  });
});
