import { defineConfig } from 'vitest/config';

// Unit tests cover pure gameplay code only, so they skip vite.config.ts and
// its IWSDK dev plugin (which would contend with the running dev runtime).
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
