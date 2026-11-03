// Calendar subscription feed: https://limitlesspa.org/events.ics
// Families can subscribe once and new events appear in their calendar.
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { icsFeed } from '../lib/events';

export const GET: APIRoute = async ({ site }) =>
  new Response(icsFeed(await getCollection('events'), site!), {
    headers: { 'Content-Type': 'text/calendar; charset=utf-8' },
  });
