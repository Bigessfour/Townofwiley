import { vi } from 'vitest';

declare global {
  // eslint-disable-next-line no-var
  var __amplifyGraphqlMock: ReturnType<typeof vi.fn> | undefined;
}

/** GraphQL mock installed globally in `unit-test-browser-isolation.setup.ts`. */
export const amplifyGraphqlMock = globalThis.__amplifyGraphqlMock ?? vi.fn();
