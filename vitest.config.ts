import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.vitest.ts'],
    environment: 'jsdom',
    exclude: ['**/node_modules/**', '**/dist/**', '**/coverage/**', '**/test-validation/**'],
    globals: true,
    setupFiles: ['./src/vitest.setup.ts'],
    restoreMocks: true,
    clearMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      exclude: ['node_modules/', 'dist/', 'coverage/', '**/*.test.ts', '**/*.spec.ts'],
    },
  },
});
