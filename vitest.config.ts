import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/api/**/*.test.ts', 'tests/functional/**/*.test.ts'],
    environment: 'node',
    globals: true,
    testTimeout: 30000,
  },
});
