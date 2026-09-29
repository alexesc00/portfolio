// @ts-check
import { defineConfig, fontProviders } from 'astro/config';

import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://alexescudero.design',
  integrations: [react(), mdx()],

  fonts: [
    {
      provider: fontProviders.local(),
      name: 'Overused Grotesk',
      cssVariable: '--font-overused-grotesk',
      fallbacks: ['system-ui'],
      options: {
        variants: [
          {
            src: [
              './src/assets/fonts/overused-grotesk/overused-grotesk-variable.woff2',
            ],
            weight: '300 900',
            style: 'normal',
          },
        ],
      },
    },
  ],

  vite: {
    plugins: [tailwindcss()],
  },
});
