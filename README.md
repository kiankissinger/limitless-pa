# Limitless PA — limitlesspa.org

**Connecting Families. Celebrating Inclusion. Strengthening Community.**

A free guide to sensory-friendly businesses, inclusive events, and everyday (non-medical) resources for
Pennsylvania families raising children with special needs, especially autistic kids.

Built with [Astro](https://astro.build) as a fully static site and hosted on Netlify. No database and no
server: listings are plain Markdown files in this repo, and form submissions go to Netlify Forms.

---

## Quick start

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # outputs to dist/
```

Requires Node 20+.

## Project layout

```
src/
  content/
    places/        ← one .md file per business / venue
    events/        ← one .md file per event or recurring program
    copy/          ← page wording, one .yaml file per page (edited in the CMS)
  data/
    taxonomy.ts    ← categories, regions, accommodation tags
    site.ts        ← site name, tagline, nav links
  pages/           ← every page on the site
  components/      ← header, footer, cards, icons, logo
  styles/global.css← brand colors + shared styles (see BRAND TOKENS at top)
public/
  brand/           ← logo files (extracted from design/Branding-limitlesspa.svg)
design/            ← original brand sheet from Limitless PA
```

---

## Adding a place

Create a new file in `src/content/places/`. The file name becomes the web address, so
`quiet-corner-barbershop.md` is published at `/places/quiet-corner-barbershop/`.

```markdown
---
name: Quiet Corner Barbershop
category: haircuts-grooming        # see src/data/taxonomy.ts for the list
region: Southwestern PA            # Statewide, Southeastern PA, Lehigh Valley, Northeastern PA,
                                   # Central PA, Southwestern PA, Northwestern PA
city: Pittsburgh
address: 123 Main St, Pittsburgh, PA 15222
summary: One or two plain-language sentences parents will see on the card.
accommodations:
  - Quiet space
  - Flexible appointments
  - Trained staff
schedule: Sensory-friendly appointments Tuesday mornings
ages: All ages
cost: Regular prices
website: https://example.com
phone: (412) 555-0100
verified: 2026-11-01               # the date you last confirmed the details
featured: false                    # true = shows first on the home page
draft: false                       # true = hidden from the site
---

Optional longer notes go here ("Good to know" on the listing page). Markdown works.
```

Only `name`, `category`, `region`, and `summary` are required.

**Accommodation tags.** Use the names in `src/data/taxonomy.ts` (for example "Quiet space",
"Sensory hours", "Noise-reducing headphones") so they show up as filters. You can write other tags too.
They'll display on the listing but won't be filterable.

## Adding an event

Create a file in `src/content/events/`. For a **one-time event**:

```markdown
---
title: Sensory-Friendly Holiday Photos
host: Example Library
date: 2026-12-06
startTime: "10:00"        # 24-hour clock, Eastern time, in quotes
endTime: "12:00"
location: Example Library, 1 Main St
city: Harrisburg
region: Central PA
cost: Free
ages: All ages
summary: Quiet, unhurried photos with Santa. Lights low and no lines.
accommodations:
  - Quiet space
  - Low-crowd times
url: https://example.com/event
registration: Sign up online. Spots are limited.
---
```

For a **recurring program**, leave out `date` and add `recurring: First Sunday of every month`.

One-time events disappear from the Events page by themselves after their date passes (`endDate`
works for multi-day events). Every dated event also gets "Add to Google Calendar" and `.ics` download
buttons.

---

## Editing the site (CMS) — for Limitless PA

Go to **https://limitlesspa.org/admin** and choose **Login with GitHub**. From there you can:

- **Events**: add one-time events (with a date) or recurring programs. Past one-time events disappear on their own.
- **Places**: add or update directory listings and choose which accommodations each place offers.
- **Page text**: change the wording on every page, including the home page, About, For businesses, Resources,
  Donate, form pages, Privacy, and the footer/newsletter text.

**Edit mode (live preview).** Next to every form, the CMS shows the real page — same design, fonts, and
logo — and updates it as you type, highlighting what changed. Use **Desktop / Tablet / Phone** to see it on
different screens. On "Forms & confirmation pages", the **Show** buttons switch between those pages. The eye
button hides the preview if you want more room to type.

**View mode.** Browse limitlesspa.org as usual. On a browser where you're signed in to the CMS, an
**Edit this page** button appears in the corner and opens that exact page in the editor. Visitors never see it.

Click **Publish → Publish now** to save. The live site updates in about a minute. Every change is saved
to the GitHub repo history, so nothing is ever lost and any change can be undone.

The logo, brand colors, and layout are deliberately **not** editable in the CMS (see "Brand — do not modify").
The lists of categories, regions, and accommodation filters live in `src/data/taxonomy.ts` and need a
developer to change.

**Donations:** when Limitless PA has a donation page (PayPal, Givebutter, etc.), open **Page text → Donate page**,
paste the link into **Donation link**, and publish. A Donate button appears.

### One-time CMS setup (site owner)

Editors sign in with a free GitHub account. To turn this on:

1. **Create a GitHub OAuth app**: GitHub → Settings → Developer settings → OAuth Apps → New OAuth App.
   - Application name: `Limitless PA CMS`
   - Homepage URL: `https://limitlesspa.org`
   - Authorization callback URL: `https://api.netlify.com/auth/done`
   - Then generate a client secret.
2. **Connect it to Netlify**: open the Netlify project (limitlesspa), go to **Project configuration → Access & security →
   OAuth → Install provider**, choose **GitHub**, and paste the Client ID and Client secret.
3. **Add each editor** as a collaborator on `kiankissinger/limitless-pa` with **Write** access
   (GitHub repo → Settings → Collaborators). They accept the email invite, then log in at `/admin`.

The CMS settings are generated from code (`src/pages/admin/config.yml.ts`), so the dropdowns always match the site.

How the live preview works (for developers): `public/admin/preview.js` loads the real page with `?cms-preview`
in an iframe and posts the unsaved entry to it; `src/scripts/cms-preview.ts` writes it into elements marked
with `data-cms-*` attributes. When adding editable text to a page, add the matching `data-cms` attribute.

## Newsletter

The footer signup saves emails to the Netlify form named `newsletter` (Netlify → Forms). Export them as a CSV
any time and import them into an email tool (Mailchimp, Buttondown, etc.) when you're ready to send updates.

## Forms (Netlify Forms)

Four forms are detected automatically when the site deploys:

| Form name        | Page             | Purpose                          |
| ---------------- | ---------------- | -------------------------------- |
| `suggest-place`  | `/suggest/`      | Families and owners suggest places |
| `submit-event`   | `/submit-event/` | Hosts share events               |
| `contact`        | `/contact/`      | General messages and corrections |
| `newsletter`     | every page footer | Newsletter signups (email only)  |

Submissions show up in the Netlify dashboard under **Forms**. To get them by email, open
**Project configuration → Notifications → Emails and webhooks → Form submission notifications** and add
an email notification. Spam filtering (Akismet plus a honeypot field) is on by default.

Reviewing a submission means turning it into a Markdown file (see above) and committing it.

## Brand — do not modify

All brand assets were created by Limitless PA's designer. **Do not recolor, crop, restyle, or
redraw the logo, change the tagline wording, or add new brand colors.**

**Colors** (exact values from `design/Branding-limitlesspa.svg`):

| Color      | Hex       |
| ---------- | --------- |
| Deep teal  | `#11404e` |
| Sage green | `#6b8753` |
| Text       | `#231f20` |

Everything else on the site is white or a neutral gray. Tokens live at the top of `src/styles/global.css`.

**Logo files** in `public/brand/` were cut directly from the brand sheet. Each file's paths are copied
verbatim, and each renders pixel-identical to the same lockup on the original sheet:

- `logo-horizontal.svg` (mark + wordmark + tagline), used in the header and footer
- `logo-stacked.svg`
- `logo-mark.svg`, also used for the favicon and app icons
- `logo-domain.svg` (limitlesspa.org)

**Tagline** (exact): "Connecting Families. Celebrating Inclusion. Strengthening Community."

**Typeface.** The brand font is **Co Headline**, a commercial Monotype font. Its web use needs a web
license, and that license isn't in this repo, so the website currently uses free stand-ins: Lexend for
headings and Atkinson Hyperlegible for body text. If Limitless PA has (or buys) Co Headline web font files,
add them under `public/fonts/` with an `@font-face` rule and set `--font-display` in `src/styles/global.css`.

## Accessibility notes

The audience includes people with sensory sensitivities, so the site deliberately has:

- no autoplaying media, carousels, pop-ups, or flashing animation, and `prefers-reduced-motion` is respected
- a calm, low-glare palette and high text contrast
- large tap targets, visible focus outlines, a skip link, and full keyboard navigation
- filters that work with plain URLs (`/places/?category=haircuts-grooming&acc=Quiet+space`), so searches can be shared

## Deploying

Netlify builds the site from `netlify.toml` (`npm run build` → `dist/`). The `www.` host redirects to the bare
`limitlesspa.org` domain.
