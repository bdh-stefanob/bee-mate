import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import react from '@astrojs/react';

// In CI these are injected by the deploy workflow from GitHub Actions context.
// Locally: override with a .env file or leave the defaults below.
const SITE = process.env.SITE_URL ?? 'https://example.github.io';
const BASE = process.env.SITE_BASE ?? '/bdd-automation-scaffold';

export default defineConfig({
  site: SITE,
  base: BASE,
  integrations: [
    starlight({
      title: 'BDD Step Catalog',
      description: 'Searchable reference for every Cucumber step in the automation scaffold.',
      customCss: ['./src/styles/boots-theme.css'],
      sidebar: [
        { label: 'Home', link: '/' },
        { label: 'Feature Editor', link: '/editor' },
        { label: 'Nuovo Step', link: '/new-step' },
        {
          label: 'Step Catalog',
          autogenerate: { directory: 'steps' },
        },
      ],
      pagefind: true,
    }),
    react(),
  ],
});
