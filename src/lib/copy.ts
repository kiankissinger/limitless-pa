import { getEntry } from 'astro:content';

export { md, mdi } from './markdown';

/**
 * Load the editable wording for a page from src/content/copy/<id>.yaml.
 * These files are edited through the CMS at /admin.
 */
export async function getCopy<T = Record<string, any>>(id: string): Promise<T> {
  const entry = await getEntry('copy', id);
  if (!entry) throw new Error(`Missing page text file: src/content/copy/${id}.yaml`);
  return entry.data as T;
}
