import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { categories, regions } from './data/taxonomy';

const categoryIds = categories.map((c) => c.id) as [string, ...string[]];

// One Markdown file per place in src/content/places/.
// The file name becomes the URL: barbershop-name.md -> /places/barbershop-name/
const places = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/places' }),
  schema: z.object({
    name: z.string(),
    category: z.enum(categoryIds),
    region: z.enum(regions),
    city: z.string().optional(),
    address: z.string().optional(),
    summary: z.string(),
    accommodations: z.array(z.string()).default([]),
    ages: z.string().optional(),
    cost: z.string().optional(),
    schedule: z.string().optional(),
    website: z.string().url().optional(),
    phone: z.string().optional(),
    source: z.string().url().optional(),
    // Date Limitless PA last confirmed the details (YYYY-MM-DD)
    verified: z.coerce.date().optional(),
    // "Chain or program with locations around PA — check your nearest one"
    multiLocation: z.boolean().default(false),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});

const time = z
  .string()
  .regex(/^([01]?\d|2[0-3]):[0-5]\d$/, 'Use 24-hour time like "09:30" or "14:00"');

// One Markdown file per event in src/content/events/.
// Use `date` (YYYY-MM-DD) for one-time events, or `recurring` for things
// like "First Sunday of every month". Past one-time events hide
// automatically. Times are Eastern (Pennsylvania) time, 24-hour clock.
const events = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/events' }),
  schema: z
    .object({
      title: z.string(),
      host: z.string().optional(),
      date: z.coerce.date().optional(),
      endDate: z.coerce.date().optional(),
      startTime: time.optional(),
      endTime: time.optional(),
      recurring: z.string().optional(),
      location: z.string().optional(),
      city: z.string().optional(),
      region: z.enum(regions),
      cost: z.string().optional(),
      ages: z.string().optional(),
      summary: z.string(),
      accommodations: z.array(z.string()).default([]),
      url: z.string().url().optional(),
      registration: z.string().optional(),
      draft: z.boolean().default(false),
    })
    .refine((e) => e.date || e.recurring, {
      message: 'Each event needs either a `date` or a `recurring` description.',
    }),
});

export const collections = { places, events };
