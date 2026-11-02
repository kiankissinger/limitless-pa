import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { categories, regions } from './data/taxonomy';

const categoryIds = categories.map((c) => c.id) as [string, ...string[]];

// The CMS saves untouched optional fields as "" (or null). Treat those as
// "not set" so a blank field never breaks the build.
const blank = (v: unknown) => (v === '' || v === null ? undefined : v);
const optText = z.preprocess(blank, z.string().optional());
const optUrl = z.preprocess(blank, z.string().url().optional());
const optDate = z.preprocess(blank, z.coerce.date().optional());
const optTime = z.preprocess(
  blank,
  z
    .string()
    .regex(/^([01]?\d|2[0-3]):[0-5]\d$/, 'Use 24-hour time like "09:30" or "14:00"')
    .optional(),
);
const tags = z.preprocess((v) => (v == null ? [] : v), z.array(z.string()).default([]));
const flag = z.preprocess((v) => (v == null || v === '' ? false : v), z.boolean().default(false));

// One Markdown file per place in src/content/places/.
// The file name becomes the URL: barbershop-name.md -> /places/barbershop-name/
const places = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/places' }),
  schema: z.object({
    name: z.string(),
    category: z.enum(categoryIds),
    region: z.enum(regions),
    city: optText,
    address: optText,
    summary: z.string(),
    accommodations: tags,
    ages: optText,
    cost: optText,
    schedule: optText,
    website: optUrl,
    phone: optText,
    source: optUrl,
    // Date Limitless PA last confirmed the details (YYYY-MM-DD)
    verified: optDate,
    // "Chain or program with locations around PA — check your nearest one"
    multiLocation: flag,
    featured: flag,
    draft: flag,
  }),
});

// One Markdown file per event in src/content/events/.
// Use `date` (YYYY-MM-DD) for one-time events, or `recurring` for things
// like "First Sunday of every month". Past one-time events hide
// automatically. Times are Eastern (Pennsylvania) time, 24-hour clock.
const events = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/events' }),
  schema: z
    .object({
      title: z.string(),
      host: optText,
      date: optDate,
      endDate: optDate,
      startTime: optTime,
      endTime: optTime,
      recurring: optText,
      location: optText,
      city: optText,
      region: z.enum(regions),
      cost: optText,
      ages: optText,
      summary: z.string(),
      accommodations: tags,
      url: optUrl,
      registration: optText,
      draft: flag,
    })
    .refine((e) => e.date || e.recurring, {
      message: 'Each event needs either a `date` or a `recurring` description.',
    }),
});

// Editable page wording, one YAML file per page in src/content/copy/.
// Edited through the CMS (/admin). Shapes are documented in src/lib/copy.ts.
const copy = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/content/copy' }),
  schema: z.record(z.string(), z.any()),
});

export const collections = { places, events, copy };
