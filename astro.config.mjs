// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://limitlesspa.org',
  trailingSlash: 'ignore',
  integrations: [sitemap()],
  devToolbar: { enabled: false },
});
