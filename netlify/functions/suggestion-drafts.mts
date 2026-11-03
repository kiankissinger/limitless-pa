// When someone suggests a place or shares an event on the website, save it
// as a hidden draft in the CMS so the team only has to review and publish.
//
// Switched off until GITHUB_TOKEN is set in Netlify (Project configuration →
// Environment variables, scope: Functions). Use a fine-grained GitHub token
// limited to this repository with "Contents: Read and write".
import type { FormSubmittedEvent } from '@netlify/functions';
import { draftFromSubmission, saveDraft } from '../lib/suggestion-draft';

export default {
  async formSubmitted(event: FormSubmittedEvent) {
    const token = Netlify.env.get('GITHUB_TOKEN');
    if (!token) {
      console.log('suggestion-drafts: GITHUB_TOKEN is not set, so drafts are not being created.');
      return;
    }
    const draft = draftFromSubmission(event.data ?? {});
    if (!draft) return;
    const repo = Netlify.env.get('GITHUB_REPO') ?? 'kiankissinger/limitless-pa';
    try {
      const path = await saveDraft(draft, { token, repo });
      console.log(`suggestion-drafts: saved ${path}`);
    } catch (err) {
      console.error('suggestion-drafts: could not save draft', err);
    }
  },
};
