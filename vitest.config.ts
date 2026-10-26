import { defineConfig } from 'vitest/config';

// Unit tests cover pure gameplay code only, so they skip vite.config.ts and
// its IWSDK dev plugin (which would contend with the running dev runtime).
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    // Some tests import modules on first use; on a loaded 8 GB machine the
    // first import alone can pass the default 5 s.
    testTimeout: 30000,
  },
});
