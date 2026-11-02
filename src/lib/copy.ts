import { getEntry } from 'astro:content';
import { marked } from 'marked';

// Links to other websites open in a new tab, like the rest of the site.
marked.use({
  renderer: {
    link(token) {
      const text = this.parser.parseInline(token.tokens);
      const external = /^https?:\/\//.test(token.href);
      const title = token.title ? ` title="${token.title}"` : '';
      return `<a href="${token.href}"${title}${external ? ' target="_blank" rel="noopener"' : ''}>${text}</a>`;
    },
  },
});

/**
 * Load the editable wording for a page from src/content/copy/<id>.yaml.
 * These files are edited through the CMS at /admin.
 */
export async function getCopy<T = Record<string, any>>(id: string): Promise<T> {
  const entry = await getEntry('copy', id);
  if (!entry) throw new Error(`Missing page text file: src/content/copy/${id}.yaml`);
  return entry.data as T;
}

/** Render a Markdown block (paragraphs, lists, links). */
export const md = (s?: string) => (s ? (marked.parse(s, { async: false }) as string) : '');

/** Render inline Markdown (bold, italics, links) without wrapping <p>. */
export const mdi = (s?: string) => (s ? (marked.parseInline(s, { async: false }) as string) : '');
