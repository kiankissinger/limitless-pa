// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://limitlesspa.org',
  trailingSlash: 'ignore',
  integrations: [
    sitemap({
      // Keep CMS screens and form confirmation pages out of search results.
      filter: (page) => !/\/(admin|thank-you|subscribed)\//.test(page),
    }),
  ],
  devToolbar: { enabled: false },
});
