import type { CollectionEntry } from 'astro:content';

type Event = CollectionEntry<'events'>;

const dayFmt = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
const longDayFmt = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});
const monthFmt = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });

export const isoDay = (d: Date) => d.toISOString().slice(0, 10);

export function formatTime(t?: string) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return m === 0 ? `${hour} ${suffix}` : `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
}

export function timeRange(e: Event['data']) {
  if (!e.startTime) return '';
  return e.endTime ? `${formatTime(e.startTime)} – ${formatTime(e.endTime)}` : formatTime(e.startTime);
}

export function dateLabel(e: Event['data'], long = false) {
  if (!e.date) return e.recurring ?? '';
  const fmt = long ? longDayFmt : dayFmt;
  if (e.endDate && isoDay(e.endDate) !== isoDay(e.date)) return `${fmt.format(e.date)} – ${fmt.format(e.endDate)}`;
  return fmt.format(e.date);
}

export const monthLabel = (d: Date) => monthFmt.format(d);

/** Last calendar day (YYYY-MM-DD) the event is still relevant. */
export const lastDay = (e: Event['data']) => (e.endDate ?? e.date ? isoDay((e.endDate ?? e.date)!) : '');

/** Today's date in Pennsylvania, as YYYY-MM-DD. */
export function todayInPA() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date());
}

export function splitEvents(all: Event[]) {
  const today = todayInPA();
  const live = all.filter((e) => !e.data.draft);
  const upcoming = live
    .filter((e) => e.data.date && lastDay(e.data) >= today)
    .sort((a, b) => {
      const ka = `${isoDay(a.data.date!)} ${a.data.startTime ?? '00:00'}`;
      const kb = `${isoDay(b.data.date!)} ${b.data.startTime ?? '00:00'}`;
      return ka.localeCompare(kb);
    });
  const recurring = live.filter((e) => !e.data.date && e.data.recurring).sort((a, b) => a.data.title.localeCompare(b.data.title));
  return { upcoming, recurring };
}

const compact = (day: Date, t?: string) => isoDay(day).replaceAll('-', '') + (t ? `T${t.replace(':', '')}00` : '');

function addDays(d: Date, n: number) {
  const c = new Date(d);
  c.setUTCDate(c.getUTCDate() + n);
  return c;
}

export function googleCalendarUrl(e: Event['data'], pageUrl: string) {
  if (!e.date) return '';
  const end = e.endDate ?? e.date;
  const dates = e.startTime
    ? `${compact(e.date, e.startTime)}/${compact(end, e.endTime ?? e.startTime)}`
    : `${compact(e.date)}/${compact(addDays(end, 1))}`;
  const details = `${e.summary}\n\nDetails: ${pageUrl}`;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: e.title,
    dates,
    ctz: 'America/New_York',
    details,
    location: [e.location, e.city].filter(Boolean).join(', '),
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

const icsEscape = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');

export function icsFile(e: Event, pageUrl: string) {
  const d = e.data;
  if (!d.date) return '';
  const end = d.endDate ?? d.date;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Limitless PA//Events//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${e.id}@limitlesspa.org`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
    d.startTime ? `DTSTART;TZID=America/New_York:${compact(d.date, d.startTime)}` : `DTSTART;VALUE=DATE:${compact(d.date)}`,
    d.startTime
      ? `DTEND;TZID=America/New_York:${compact(end, d.endTime ?? d.startTime)}`
      : `DTEND;VALUE=DATE:${compact(addDays(end, 1))}`,
    `SUMMARY:${icsEscape(d.title)}`,
    `DESCRIPTION:${icsEscape(`${d.summary}\n\n${pageUrl}`)}`,
    d.location || d.city ? `LOCATION:${icsEscape([d.location, d.city].filter(Boolean).join(', '))}` : '',
    `URL:${pageUrl}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);
  return lines.join('\r\n') + '\r\n';
}
