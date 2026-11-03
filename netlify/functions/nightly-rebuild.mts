// Rebuilds the site every night so past events drop off, "coming up" lists
// stay current, and the Site health page refreshes even on days with no edits.
//
// Switched off until BUILD_HOOK_URL is set in Netlify (Project configuration →
// Environment variables, scope: Functions). Create the hook under Project
// configuration → Build & deploy → Build hooks.
import type { Config } from '@netlify/functions';

export default async () => {
  const hook = Netlify.env.get('BUILD_HOOK_URL');
  if (!hook) {
    console.log('nightly-rebuild: BUILD_HOOK_URL is not set, so the nightly rebuild is off.');
    return;
  }
  const res = await fetch(hook, { method: 'POST' });
  console.log(`nightly-rebuild: rebuild requested (${res.status})`);
};

export const config: Config = {
  // 08:23 UTC = 4:23 AM Eastern in summer (EDT), 3:23 AM in winter (EST)
  schedule: '23 8 * * *',
};
