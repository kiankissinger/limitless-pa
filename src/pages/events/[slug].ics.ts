import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection, type CollectionEntry } from 'astro:content';
import { icsFile } from '../../lib/events';

export const getStaticPaths: GetStaticPaths = async () => {
  const events = (await getCollection('events')).filter((e) => !e.data.draft && e.data.date);
  return events.map((event) => ({ params: { slug: event.id }, props: { event } }));
};

export const GET: APIRoute = ({ props, site }) => {
  const event = props.event as CollectionEntry<'events'>;
  const pageUrl = new URL(`/events/${event.id}/`, site).toString();
  return new Response(icsFile(event, pageUrl), {
    headers: { 'Content-Type': 'text/calendar; charset=utf-8' },
  });
};
