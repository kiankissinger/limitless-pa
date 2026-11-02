// Markdown rendering shared by the site build and the CMS live preview,
// so editors see exactly the markup the published page will have.
import { Marked, type MarkedExtension } from 'marked';
import { markedSmartypants } from 'marked-smartypants';

const links: MarkedExtension = {
  renderer: {
    // Links to other websites open in a new tab, like the rest of the site.
    link(token) {
      const text = this.parser.parseInline(token.tokens);
      const external = /^https?:\/\//.test(token.href);
      const title = token.title ? ` title="${token.title}"` : '';
      return `<a href="${token.href}"${title}${external ? ' target="_blank" rel="noopener"' : ''}>${text}</a>`;
    },
  },
};

const marked = new Marked(links);
// Event and place descriptions get typographic quotes and dashes ("it's" -> "it’s"),
// matching how Astro renders Markdown files.
const markedEntry = new Marked(links, markedSmartypants());

/** Render a Markdown block (paragraphs, lists, links). */
export const md = (s?: string) => (s ? (marked.parse(s, { async: false }) as string) : '');

/** Render inline Markdown (bold, italics, links) without wrapping <p>. */
export const mdi = (s?: string) => (s ? (marked.parseInline(s, { async: false }) as string) : '');

/** Render the Markdown body of an event or place listing. */
export const mdEntry = (s?: string) => (s ? (markedEntry.parse(s, { async: false }) as string) : '');
