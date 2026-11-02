// Generates the Decap CMS configuration (served at /admin/config.yml).
// Built from src/data/taxonomy.ts so the CMS dropdowns always match the
// categories, regions, and accommodation filters the site uses.
// JSON is valid YAML, so Decap reads this as-is.
import type { APIRoute } from 'astro';
import { accommodations, categories, regions } from '../../data/taxonomy';

const iconOptions = [
  ['check', 'Check mark'],
  ['heart', 'Heart'],
  ['headphones', 'Headphones'],
  ['clock', 'Clock'],
  ['calendar', 'Calendar'],
  ['sparkle', 'Sparkle'],
  ['people', 'People'],
  ['search', 'Magnifying glass'],
  ['store', 'Storefront'],
  ['phone', 'Phone'],
  ['bag', 'Bag'],
  ['arrow', 'Arrow'],
  ['message', 'Speech bubble'],
  ['shield', 'Shield'],
  ['pin', 'Map pin'],
  ['ticket', 'Ticket'],
  ['film', 'Film'],
  ['leaf', 'Leaf'],
  ['palette', 'Palette'],
  ['medal', 'Trophy'],
].map(([value, label]) => ({ label, value }));

// ---- field helpers -------------------------------------------------------
type Field = Record<string, unknown>;
const str = (name: string, label: string, extra: Field = {}): Field => ({ name, label, widget: 'string', ...extra });
const opt = (name: string, label: string, extra: Field = {}): Field => str(name, label, { required: false, ...extra });
const text = (name: string, label: string, extra: Field = {}): Field => ({ name, label, widget: 'text', ...extra });
const inlineMd = (name: string, label: string, extra: Field = {}): Field => ({
  name,
  label,
  widget: 'markdown',
  minimal: true,
  buttons: ['bold', 'italic', 'link'],
  editor_components: [],
  ...extra,
});
const blockMd = (name: string, label: string, extra: Field = {}): Field => ({
  name,
  label,
  widget: 'markdown',
  buttons: ['bold', 'italic', 'link', 'heading-two', 'bulleted-list', 'numbered-list'],
  editor_components: [],
  ...extra,
});
const icon = (name = 'icon', label = 'Icon'): Field => ({ name, label, widget: 'select', options: iconOptions });
const obj = (name: string, label: string, fields: Field[], extra: Field = {}): Field => ({
  name,
  label,
  widget: 'object',
  collapsed: false,
  fields,
  ...extra,
});
const list = (name: string, label: string, fields: Field[], extra: Field = {}): Field => ({
  name,
  label,
  widget: 'list',
  // Show every item's fields open, so editors can change what they see.
  collapsed: false,
  fields,
  ...extra,
});
const stringList = (name: string, label: string, extra: Field = {}): Field => ({
  name,
  label,
  widget: 'list',
  field: { name: 'item', label: 'Item', widget: 'string' },
  ...extra,
});
const iconCards = (name: string, label: string) =>
  list(name, label, [icon(), str('title', 'Title'), text('text', 'Text')], { summary: '{{fields.title}}' });

const dateOnly = (name: string, label: string, extra: Field = {}): Field => ({
  name,
  label,
  widget: 'datetime',
  format: 'YYYY-MM-DD',
  date_format: 'MMMM D, YYYY',
  time_format: false,
  picker_utc: true,
  required: false,
  ...extra,
});
const timeOnly = (name: string, label: string, extra: Field = {}): Field => ({
  name,
  label,
  widget: 'datetime',
  format: 'HH:mm',
  date_format: false,
  time_format: 'h:mm A',
  required: false,
  ...extra,
});

const regionField: Field = { name: 'region', label: 'Region', widget: 'select', options: [...regions], default: 'Statewide' };
const accField: Field = {
  name: 'accommodations',
  label: 'Accommodations',
  widget: 'select',
  multiple: true,
  required: false,
  options: accommodations.map((a) => a.id),
  hint: 'These become the filters families use on the site.',
};
const urlField = (name: string, label: string, hint?: string): Field =>
  opt(name, label, { hint, pattern: ['^https?://.+', 'Must be a full web address starting with https://'] });
const hidden: Field = {
  name: 'draft',
  label: 'Hide from the website (draft)',
  widget: 'boolean',
  default: false,
  required: false,
};

// ---- collections ---------------------------------------------------------
const eventsCollection = {
  name: 'events',
  label: 'Events',
  label_singular: 'Event',
  description: 'One-time events (with a date) and recurring programs. Past one-time events hide themselves automatically.',
  folder: 'src/content/events',
  create: true,
  slug: '{{slug}}-{{year}}{{month}}{{day}}',
  identifier_field: 'title',
  summary: '{{title}}',
  sortable_fields: ['title', 'date'],
  preview_path: 'events/{{slug}}/',
  fields: [
    str('title', 'Event name'),
    opt('host', 'Hosted by'),
    dateOnly('date', 'Date', { hint: 'For one-time events. Leave blank for a recurring program.' }),
    dateOnly('endDate', 'End date', { hint: 'Only for events that last more than one day.' }),
    timeOnly('startTime', 'Start time'),
    timeOnly('endTime', 'End time'),
    opt('recurring', 'Repeats', {
      hint: 'For recurring programs instead of a date, e.g. “First Sunday of every month”.',
    }),
    opt('location', 'Location or address'),
    opt('city', 'Town or city'),
    regionField,
    opt('cost', 'Cost', { hint: 'e.g. Free, $5 per child, Regular admission' }),
    opt('ages', 'Ages'),
    text('summary', 'Short description', { hint: 'One or two sentences shown on the event card.' }),
    accField,
    urlField('url', 'Event link', 'Where families can find details or register.'),
    opt('registration', 'Registration notes', { hint: 'e.g. Sign up online — spots are limited.' }),
    hidden,
    blockMd('body', 'More details (optional)', { required: false }),
  ],
};

const placesCollection = {
  name: 'places',
  label: 'Places',
  label_singular: 'Place',
  description: 'Sensory-friendly businesses and venues in the directory.',
  folder: 'src/content/places',
  create: true,
  slug: '{{slug}}',
  identifier_field: 'name',
  summary: '{{name}} — {{city}}',
  sortable_fields: ['name', 'region'],
  preview_path: 'places/{{slug}}/',
  fields: [
    str('name', 'Name'),
    {
      name: 'category',
      label: 'Type of place',
      widget: 'select',
      options: categories.map((c) => ({ label: c.label, value: c.id })),
    },
    regionField,
    opt('city', 'Town or city'),
    opt('address', 'Street address'),
    text('summary', 'Short description', { hint: 'One or two sentences shown on the directory card.' }),
    accField,
    opt('schedule', 'When', { hint: 'e.g. Sensory hours every Tuesday, 9–11 a.m.' }),
    opt('ages', 'Ages'),
    opt('cost', 'Cost'),
    urlField('website', 'Website'),
    opt('phone', 'Phone'),
    urlField('source', 'Source link', 'Where you confirmed the details (shown as “Source”).'),
    dateOnly('verified', 'Details last checked'),
    {
      name: 'multiLocation',
      label: 'Chain or program with several PA locations',
      widget: 'boolean',
      default: false,
      required: false,
    },
    { name: 'featured', label: 'Feature on the home page', widget: 'boolean', default: false, required: false },
    hidden,
    blockMd('body', 'Good to know (optional)', { required: false }),
  ],
};

// Where each page-text file shows up on the site ("View Live" link in the editor).
const livePath: Record<string, string> = {
  home: '/',
  about: 'about/',
  'for-businesses': 'for-businesses/',
  resources: 'resources/',
  donate: 'donate/',
  'places-page': 'places/',
  'events-page': 'events/',
  forms: 'suggest/',
  privacy: 'privacy/',
  site: '/',
};

const page = (name: string, label: string, fields: Field[]) => ({
  name,
  label,
  file: `src/content/copy/${name}.yaml`,
  preview_path: livePath[name],
  fields,
});

const pagesCollection = {
  name: 'pages',
  label: 'Page text',
  description: 'The wording on each page of the site.',
  files: [
    page('home', 'Home page', [
      obj('hero', 'Top of page', [
        str('eyebrow', 'Small label above the heading'),
        str('title', 'Heading'),
        text('intro', 'Intro paragraph'),
        str('search_placeholder', 'Search box hint'),
      ]),
      obj('example', 'Example card (next to the heading)', [
        str('title', 'Title'),
        str('category', 'Type of place'),
        stringList('items', 'Checklist'),
      ]),
      obj('notice', 'Dark band (“not medical” message)', [str('title', 'Bold lead-in'), text('text', 'Text')]),
      obj('categories', 'Categories section', [str('eyebrow', 'Small label'), str('title', 'Heading')]),
      obj('featured', 'Featured places section', [str('eyebrow', 'Small label'), str('title', 'Heading')]),
      obj('look_for', '“What we look for” section', [
        str('eyebrow', 'Small label'),
        str('title', 'Heading'),
        text('intro', 'Intro'),
        iconCards('items', 'Cards'),
      ]),
      obj('events', 'Events section', [
        str('eyebrow', 'Small label'),
        str('title', 'Heading'),
        inlineMd('empty', 'Message when there are no events'),
      ]),
      obj('cta_suggest', '“Know a great place?” box', [str('title', 'Heading'), text('text', 'Text'), str('button', 'Button')]),
      obj('cta_business', '“Own a business?” box', [str('title', 'Heading'), text('text', 'Text'), str('button', 'Button')]),
    ]),
    page('about', 'About page', [
      str('eyebrow', 'Small label'),
      str('title', 'Heading'),
      text('intro', 'Intro'),
      str('why_title', '“Why we started” heading'),
      blockMd('why_body', '“Why we started” text'),
      str('do_title', '“What we do” heading'),
      iconCards('do_items', '“What we do” list'),
      str('not_title', '“What we’re not” heading'),
      blockMd('not_body', '“What we’re not” text'),
      str('how_title', '“How listings work” heading'),
      blockMd('how_body', '“How listings work” text'),
      str('help_title', 'Sidebar heading'),
    ]),
    page('for-businesses', 'For businesses page', [
      str('eyebrow', 'Small label'),
      str('title', 'Heading'),
      text('intro', 'Intro'),
      str('stat_number', 'Big number'),
      inlineMd('stat_text', 'Text under the number'),
      str('why_title', '“Why it matters” heading'),
      blockMd('why_body', '“Why it matters” text'),
      str('ideas_eyebrow', 'Ideas: small label'),
      str('ideas_title', 'Ideas: heading'),
      text('ideas_intro', 'Ideas: intro'),
      iconCards('ideas', 'Ideas'),
      str('steps_eyebrow', 'Steps: small label'),
      str('steps_title', 'Steps: heading'),
      list('steps', 'Steps', [str('title', 'Step (bold)'), text('text', 'Details')], { summary: '{{fields.title}}' }),
      str('cta_title', 'Box heading'),
      str('cta_text', 'Box text'),
      inlineMd('cta_note', 'Box small print'),
    ]),
    page('resources', 'Resources page', [
      str('eyebrow', 'Small label'),
      str('title', 'Heading'),
      text('intro', 'Intro'),
      str('tips_title', 'Tips: heading'),
      text('tips_intro', 'Tips: intro'),
      iconCards('tips', 'Tips'),
      str('questions_eyebrow', 'Questions: small label'),
      str('questions_title', 'Questions: heading'),
      text('questions_intro', 'Questions: intro'),
      stringList('questions', 'Questions'),
      str('orgs_eyebrow', 'Organizations: small label'),
      str('orgs_title', 'Organizations: heading'),
      text('orgs_intro', 'Organizations: intro'),
      list('orgs', 'Organizations', [str('name', 'Name'), urlField('url', 'Website'), text('text', 'Description')], {
        summary: '{{fields.name}}',
      }),
      inlineMd('note', 'Note at the bottom'),
    ]),
    page('donate', 'Donate page', [
      str('title', 'Heading'),
      text('lead', 'Intro'),
      urlField(
        'donation_link',
        'Donation link',
        'Paste your donation page link (PayPal, Givebutter, etc.). A Donate button appears and the page becomes searchable.',
      ),
      opt('donation_button', 'Button text'),
      str('ways_title', '“Ways to help” heading'),
      blockMd('ways', '“Ways to help” list'),
      inlineMd('notify', 'Small print (shown until a donation link is added)', { required: false }),
    ]),
    page('places-page', 'Find places page', [
      str('eyebrow', 'Small label'),
      str('title', 'Heading'),
      text('intro', 'Intro'),
      str('no_results_title', 'No-results heading'),
      text('no_results_text', 'No-results text'),
      inlineMd('suggest_band', 'Bottom band text'),
    ]),
    page('events-page', 'Events page', [
      str('eyebrow', 'Small label'),
      str('title', 'Heading'),
      text('intro', 'Intro'),
      str('upcoming_title', '“Coming up” heading'),
      str('empty_title', 'No-events message (bold)'),
      inlineMd('empty_text', 'No-events message'),
      str('recurring_title', 'Recurring heading'),
      text('recurring_intro', 'Recurring intro'),
      str('host_title', 'Bottom box heading'),
      text('host_text', 'Bottom box text'),
    ]),
    page('forms', 'Forms & confirmation pages', [
      obj('suggest', 'Suggest a place', [
        str('eyebrow', 'Small label'),
        str('title', 'Heading'),
        text('intro', 'Intro'),
        str('next_title', '“What happens next” heading'),
        blockMd('next_body', '“What happens next” text'),
        str('owner_title', '“Business owner?” heading'),
        blockMd('owner_body', '“Business owner?” text'),
      ]),
      obj('event', 'Share an event', [
        str('eyebrow', 'Small label'),
        str('title', 'Heading'),
        text('intro', 'Intro'),
        str('guidelines_title', 'Guidelines heading'),
        blockMd('guidelines_body', 'Guidelines'),
      ]),
      obj('contact', 'Contact', [
        str('eyebrow', 'Small label'),
        str('title', 'Heading'),
        text('intro', 'Intro'),
        str('note_title', 'Side note heading'),
        blockMd('note_body', 'Side note text'),
      ]),
      obj('thank_you', 'Thank-you page (after a form)', [str('title', 'Heading'), text('text', 'Text')]),
      obj('subscribed', 'Newsletter confirmation page', [str('title', 'Heading'), text('text', 'Text')]),
    ]),
    page('privacy', 'Privacy page', [str('title', 'Heading'), text('intro', 'Intro'), blockMd('body', 'Text')]),
    page('site', 'Footer & newsletter', [
      text('footer_blurb', 'Footer description'),
      str('newsletter_title', 'Newsletter heading'),
      str('newsletter_text', 'Newsletter text'),
      str('newsletter_button', 'Newsletter button'),
      inlineMd('disclaimer', '“Not medical providers” notice'),
    ]),
  ],
};

const config = {
  backend: {
    name: 'github',
    repo: 'kiankissinger/limitless-pa',
    branch: 'main',
    site_domain: 'limitlesspa.org',
    commit_messages: {
      create: 'Add {{collection}} “{{slug}}” (via CMS)',
      update: 'Update {{collection}} “{{slug}}” (via CMS)',
      delete: 'Delete {{collection}} “{{slug}}” (via CMS)',
      uploadMedia: 'Upload “{{path}}” (via CMS)',
      deleteMedia: 'Delete “{{path}}” (via CMS)',
    },
  },
  site_url: 'https://limitlesspa.org',
  display_url: 'https://limitlesspa.org',
  logo_url: '/brand/logo-mark.svg',
  media_folder: 'public/uploads',
  public_folder: '/uploads',
  slug: { encoding: 'ascii', clean_accents: true, sanitize_replacement: '-' },
  collections: [eventsCollection, placesCollection, pagesCollection],
};

export const GET: APIRoute = () =>
  new Response(JSON.stringify(config, null, 2), { headers: { 'Content-Type': 'text/yaml; charset=utf-8' } });
