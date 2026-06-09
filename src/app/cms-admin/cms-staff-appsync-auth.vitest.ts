import { describe, expect, it } from 'vitest';
import {
  extractGraphqlFailureMessage,
  STAFF_SIGN_IN_MESSAGE,
  toClerkFriendlyGraphqlError,
} from './cms-staff-appsync-auth';

describe('extractGraphqlFailureMessage', () => {
  it('reads Error.message', () => {
    expect(extractGraphqlFailureMessage(new Error('Not Authorized'))).toBe('Not Authorized');
  });

  it('reads Amplify-style errors array', () => {
    expect(
      extractGraphqlFailureMessage({
        errors: [{ message: 'Not Authorized' }, { message: 'GraphQL error' }],
      }),
    ).toBe('Not Authorized GraphQL error');
  });

  it('includes cause message when Error.message is empty', () => {
    const error = new Error('');
    error.cause = new Error('NoValidAuthTokens');
    expect(extractGraphqlFailureMessage(error)).toBe('NoValidAuthTokens');
  });

  it('falls back to non-generic error name when message is empty', () => {
    const error = new Error('');
    error.name = 'AuthError';
    expect(extractGraphqlFailureMessage(error)).toBe('AuthError');
  });

  it('does not surface generic Error name when message is empty', () => {
    expect(extractGraphqlFailureMessage(new Error(''))).toBe('');
  });
});

describe('toClerkFriendlyGraphqlError', () => {
  const cases: { label: string; error: unknown; expected: string }[] = [
    {
      label: 'Not Authorized Error',
      error: new Error('Not Authorized'),
      expected: STAFF_SIGN_IN_MESSAGE,
    },
    {
      label: 'GraphQL errors array',
      error: { errors: [{ message: 'Not Authorized' }] },
      expected: STAFF_SIGN_IN_MESSAGE,
    },
    {
      label: 'empty Error includes model in fallback',
      error: new Error(''),
      expected: 'Could not list SiteCopy. Try signing in again at /admin/login.',
    },
    {
      label: 'NoValidAuthTokens',
      error: new Error('NoValidAuthTokens: session expired'),
      expected: STAFF_SIGN_IN_MESSAGE,
    },
    {
      label: 'federated jwt',
      error: new Error('federated jwt expired'),
      expected: STAFF_SIGN_IN_MESSAGE,
    },
    {
      label: 'no current user',
      error: new Error('No current user'),
      expected: STAFF_SIGN_IN_MESSAGE,
    },
  ];

  it.each(cases)('maps $label', ({ error, expected }) => {
    expect(toClerkFriendlyGraphqlError(error, 'list', 'SiteCopy')).toBe(expected);
  });
});
