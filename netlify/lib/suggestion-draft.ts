// Turns a "Suggest a place" or "Share an event" form submission into a
// hidden draft listing (draft: true) for the team to review in the CMS.
// Pure functions + a small GitHub client, so it can be tested without Netlify.
import { accommodations, categories, regions } from '../../src/data/taxonomy';

export interface Draft {
  dir: 'src/content/places' | 'src/content/events';
  slug: string;
  title: string;
  kind: 'place' | 'event';
  content: string;
}

const clean = (v?: string) => (v ?? '').trim();
const yamlString = (s: string) => JSON.stringify(s); // a JSON string is a valid YAML string

export function slugify(s: string) {
  return (
    s
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60)
      .replace(/-+$/g, '') || 'suggestion'
  );
}

function toUrl(v?: string) {
  const s = clean(v);
  if (!s) return '';
  if (/^https?:\/\/[^\s.]+\.[^\s]+$/i.test(s)) return s;
  if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/i.test(s)) return `https://${s}`;
  return '';
}

// Checkbox values arrive as one string; match known tags (one contains a comma).
const pickAccommodations = (v?: string) => accommodations.map((a) => a.id).filter((id) => clean(v).includes(id));
const pickRegion = (v?: string) => ((regions as readonly string[]).includes(clean(v)) ? clean(v) : 'Statewide');
const pickCategory = (v?: string) => categories.find((c) => c.label === clean(v) || c.id === clean(v))?.id ?? 'community';
const validDate = (v?: string) => (/^\d{4}-\d{2}-\d{2}$/.test(clean(v)) ? clean(v) : '');
const validTime = (v?: string) => (/^([01]?\d|2[0-3]):[0-5]\d$/.test(clean(v)) ? clean(v) : '');

function frontmatter(fields: [string, unknown, { keepEmpty?: boolean }?][], body = '') {
  const lines = ['---'];
  for (const [key, value, opts] of fields) {
    const empty = value === undefined || value === '' || (Array.isArray(value) && value.length === 0);
    if (empty && !opts?.keepEmpty) continue;
    if (Array.isArray(value)) {
      lines.push(`${key}:`);
      value.forEach((v) => lines.push(`  - ${yamlString(String(v))}`));
    } else if (typeof value === 'boolean') {
      lines.push(`${key}: ${value}`);
    } else {
      lines.push(`${key}: ${yamlString(String(value ?? ''))}`);
    }
  }
  lines.push('---', '');
  if (body) lines.push(body, '');
  return lines.join('\n');
}

export function draftFromSubmission(data: Record<string, string>, now = new Date()): Draft | null {
  if (clean(data['bot-field'])) return null; // spam honeypot
  const received = now.toISOString().slice(0, 10);
  // The repository is public, so drafts never include the person's name, email, or message.
  // Those stay private in Netlify → Forms; the note just points there.
  const relationship = clean(data.relationship);

  // "Suggest a place"
  if (clean(data.business)) {
    const name = clean(data.business);
    const website = toUrl(data.website);
    const notes = [
      `Suggested through the website on ${received}${relationship ? ` (from: ${relationship})` : ''}.`,
      clean(data.website) && !website && `Website they gave: ${clean(data.website)}`,
      'Their name, email, and message are private: see Netlify → Forms → suggest-place.',
      'Before publishing: confirm the details with the business, write the short description, and untick “Hide from the website”.',
    ]
      .filter(Boolean)
      .join('\n\n');
    return {
      dir: 'src/content/places',
      slug: slugify(name),
      title: name,
      kind: 'place',
      content: frontmatter([
        ['name', name],
        ['category', pickCategory(data.category)],
        ['region', pickRegion(data.region)],
        ['city', clean(data.city)],
        ['summary', '', { keepEmpty: true }],
        ['accommodations', pickAccommodations(data.accommodations)],
        ['website', website],
        ['draft', true],
        ['notes', notes],
      ]),
    };
  }

  // "Share an event"
  if (clean(data.title) && clean(data.description)) {
    const title = clean(data.title);
    const date = validDate(data.date);
    const recurring = clean(data.recurring) || (date ? '' : 'Date to be confirmed');
    const url = toUrl(data.url);
    const description = clean(data.description);
    const notes = [
      `Submitted through the website on ${received}.`,
      `Full description:\n${description}`,
      clean(data.url) && !url && `Link they gave: ${clean(data.url)}`,
      'Their name and email are private: see Netlify → Forms → submit-event.',
      'Before publishing: confirm with the host, tidy the short description, and untick “Hide from the website”.',
    ]
      .filter(Boolean)
      .join('\n\n');
    return {
      dir: 'src/content/events',
      slug: `${slugify(title)}-${date || received}`,
      title,
      kind: 'event',
      content: frontmatter([
        ['title', title],
        ['host', clean(data.host)],
        ['date', date],
        ['startTime', validTime(data.start_time)],
        ['endTime', validTime(data.end_time)],
        ['recurring', recurring],
        ['location', clean(data.location)],
        ['region', pickRegion(data.region)],
        ['cost', clean(data.cost)],
        ['ages', clean(data.ages)],
        ['summary', description.length > 280 ? `${description.slice(0, 277).trimEnd()}…` : description],
        ['accommodations', pickAccommodations(data.accommodations)],
        ['url', url],
        ['draft', true],
        ['notes', notes],
      ]),
    };
  }

  return null; // contact form, newsletter, etc.
}

/** Save the draft to GitHub, picking a free file name (-2, -3, …) if needed. */
export async function saveDraft(
  draft: Draft,
  { token, repo, branch = 'main', fetchImpl = fetch }: { token: string; repo: string; branch?: string; fetchImpl?: typeof fetch },
) {
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'limitlesspa-site',
    'Content-Type': 'application/json',
  };
  const api = (path: string) => `https://api.github.com/repos/${repo}/contents/${path}`;

  let path = '';
  for (let n = 1; n <= 20; n++) {
    const candidate = `${draft.dir}/${draft.slug}${n > 1 ? `-${n}` : ''}.md`;
    const res = await fetchImpl(`${api(candidate)}?ref=${encodeURIComponent(branch)}`, { headers });
    if (res.status === 404) {
      path = candidate;
      break;
    }
    if (!res.ok) throw new Error(`GitHub lookup failed (${res.status}) for ${candidate}`);
  }
  if (!path) throw new Error(`No free file name for ${draft.slug}`);

  const res = await fetchImpl(api(path), {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      message: `Add suggested ${draft.kind} “${draft.title}” as a hidden draft (from the website form)`,
      content: Buffer.from(draft.content, 'utf8').toString('base64'),
      branch,
    }),
  });
  if (!res.ok) throw new Error(`GitHub save failed (${res.status}): ${await res.text()}`);
  return path;
}
