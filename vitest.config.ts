/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

// Astro's own Vite setup, so tests resolve imports the way the site does.
export default getViteConfig({
  test: {
    include: ['src/**/*.test.ts'],
  },
});
