import { vi } from 'vitest';

declare global {
  // `var` is required for ambient globalThis augmentation in TypeScript.
  var __amplifyGraphqlMock: ReturnType<typeof vi.fn> | undefined;
}

/** Hoisted mock from `unit-test-browser-isolation.setup.ts` (same fn `generateClient()` uses). */
export function getAmplifyGraphqlMock(): ReturnType<typeof vi.fn> {
  if (!globalThis.__amplifyGraphqlMock) {
    throw new Error(
      'Amplify GraphQL mock is not initialized. Ensure src/unit-test-browser-isolation.setup.ts is listed in angular.json test setupFiles.',
    );
  }
  return globalThis.__amplifyGraphqlMock;
}
