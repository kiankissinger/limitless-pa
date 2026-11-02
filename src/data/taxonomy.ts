// Shared lists used across the site. Add to these when you need a new
// category, region, or accommodation — listings reference them by `id`.

export const categories = [
  { id: 'haircuts-grooming', label: 'Haircuts & grooming', icon: 'scissors', blurb: 'Barbers and salons with quiet rooms, extra time, and patient stylists.' },
  { id: 'entertainment', label: 'Movies & entertainment', icon: 'film', blurb: 'Sensory-friendly showings, performances, and shows.' },
  { id: 'attractions', label: 'Theme parks & attractions', icon: 'ticket', blurb: 'Parks and attractions with access passes, calming rooms, and ride guides.' },
  { id: 'museums-learning', label: 'Museums & learning', icon: 'museum', blurb: 'Museums, science centers, and libraries with sensory hours and kits.' },
  { id: 'animals-nature', label: 'Zoos, animals & nature', icon: 'leaf', blurb: 'Zoos, aquariums, farms, and outdoor spaces.' },
  { id: 'play-recreation', label: 'Play & recreation', icon: 'ball', blurb: 'Play spaces, trampoline parks, and arcades with sensory times.' },
  { id: 'sports-fitness', label: 'Sports, swim & fitness', icon: 'medal', blurb: 'Adaptive leagues, swim lessons, gyms, and camps.' },
  { id: 'shopping', label: 'Shopping', icon: 'bag', blurb: 'Stores with quiet hours, dimmed lights, and calmer checkouts.' },
  { id: 'food-dining', label: 'Food & dining', icon: 'utensils', blurb: 'Restaurants that make room for families — quiet tables, flexible menus.' },
  { id: 'arts-music', label: 'Arts, music & classes', icon: 'palette', blurb: 'Art studios, music, dance, and enrichment classes.' },
  { id: 'community', label: 'Community & faith', icon: 'people', blurb: 'Support groups, faith communities, and family meetups.' },
] as const;

export const regions = [
  'Statewide',
  'Southeastern PA',
  'Lehigh Valley',
  'Northeastern PA',
  'Central PA',
  'Southwestern PA',
  'Northwestern PA',
] as const;

// Accommodations families can filter by. Listings may also use free-text
// tags; anything not in this list still displays, it just isn't a filter.
export const accommodations = [
  { id: 'Quiet space', hint: 'A calmer room or area to take a break.' },
  { id: 'Sensory hours', hint: 'Set times with lower lights, lower sound, and smaller crowds.' },
  { id: 'Lights up, sound down', hint: 'Showings or events with house lights on and volume lowered.' },
  { id: 'Noise-reducing headphones', hint: 'Headphones or ear defenders available to borrow.' },
  { id: 'Sensory kits', hint: 'Bags with fidgets, headphones, and other comfort items.' },
  { id: 'Trained staff', hint: 'Staff have had autism or sensory awareness training.' },
  { id: 'Certified Autism Center', hint: 'Certified by IBCCES or a similar program.' },
  { id: 'Visual guides', hint: 'Social stories, visual schedules, or sensory guides to plan ahead.' },
  { id: 'Flexible appointments', hint: 'Extra time, first or last slot of the day, or breaks as needed.' },
  { id: 'Low-crowd times', hint: 'Quieter days or hours the venue recommends.' },
  { id: 'Calming room', hint: 'A dedicated, staffed calming or sensory room.' },
  { id: 'Ride & access pass', hint: 'Accessibility programs that reduce waiting in lines.' },
  { id: 'Free to move around', hint: 'Kids can walk, talk, stim, and move — no shushing.' },
  { id: 'Adaptive program', hint: 'A program designed for kids with disabilities.' },
] as const;

export type CategoryId = (typeof categories)[number]['id'];

export const categoryById = Object.fromEntries(categories.map((c) => [c.id, c])) as Record<
  CategoryId,
  (typeof categories)[number]
>;

export const accommodationIds = accommodations.map((a) => a.id) as string[];
