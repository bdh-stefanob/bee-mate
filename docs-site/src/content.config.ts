import { defineCollection } from 'astro:content';
import { docsSchema } from '@astrojs/starlight/schema';
import { catalogDocsLoader } from './loaders/step-catalog.loader';

export const collections = {
  docs: defineCollection({
    loader: catalogDocsLoader(),
    schema: docsSchema(),
  }),
};
