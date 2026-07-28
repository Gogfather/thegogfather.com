export type FeatureCard = {
  slug: string;
  title: string;
  eyebrow: string;
  image: string;
  description: string;
  summary: string;
  ctaLabel: string;
  tags: string[];
  sections: Array<{
    heading: string;
    body: string;
  }>;
};

export const featureCards: FeatureCard[] = [
  {
    slug: 'the-front',
    title: 'The Front',
    eyebrow: 'Digital Craft',
    image:
      'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=900&q=80',
    description:
      'A polished digital presence built for speed, clarity, and memorable first impressions.',
    summary:
      'Fast experiences, clean systems, and a brand that feels intentional from the first click.',
    ctaLabel: 'Explore the experience',
    tags: ['Web', 'Design', 'Performance'],
    sections: [
      {
        heading: 'What it does',
        body:
          'The Front brings together a refined visual identity with a practical content model that grows without friction.',
      },
      {
        heading: 'Why it matters',
        body:
          'The goal is a simple handoff from idea to launch, with structure that makes updates feel effortless.',
      },
    ],
  },
  {
    slug: 'the-pantry',
    title: 'The Pantry',
    eyebrow: 'Recipe Compass',
    image:
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=80',
    description:
      'A future-facing food guide that pairs meals with smart local suggestions and budget-aware choices.',
    summary:
      'A modular concept for discovery, planning, and making the next meal feel effortless.',
    ctaLabel: 'Open the kitchen',
    tags: ['Food', 'Discovery', 'Planning'],
    sections: [
      {
        heading: 'How it works',
        body:
          'The Pantry can connect ingredient ideas with nearby sourcing options and practical constraints in one experience.',
      },
      {
        heading: 'What makes it flexible',
        body:
          'Each recipe card, filter, and suggestion is designed to be added independently from the central content map.',
      },
    ],
  },
  {
    slug: 'the-archive',
    title: 'The Archive',
    eyebrow: 'Visual History',
    image:
      'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=900&q=80',
    description:
      'A living gallery of photography, art, and moments that can be expanded as new work arrives.',
    summary:
      'A curated archive that stays easy to maintain as new stories, images, and projects are added.',
    ctaLabel: 'Visit the archive',
    tags: ['Media', 'Gallery', 'Storytelling'],
    sections: [
      {
        heading: 'Built to grow',
        body:
          'New items can be added to the shared list and automatically show up in the experience without recreating the layout.',
      },
      {
        heading: 'Why it feels alive',
        body:
          'The archive is structured so each piece can carry its own image, title, and supporting details with minimal overhead.',
      },
    ],
  },
  {
    slug: 'the-counsel',
    title: 'The Counsel',
    eyebrow: 'Strategy',
    image:
      'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=900&q=80',
    description:
      'A calm, considered layer of guidance for projects that need direction without unnecessary noise.',
    summary:
      'A simple framework for turning ideas into a strong, well-communicated next step.',
    ctaLabel: 'See the approach',
    tags: ['Consulting', 'Planning', 'Direction'],
    sections: [
      {
        heading: 'The promise',
        body:
          'The Counsel keeps the emphasis on clarity, priorities, and forward momentum rather than complexity.',
      },
      {
        heading: 'How it stays maintainable',
        body:
          'Content can be updated in one place, while the presentation stays consistent across each route.',
      },
    ],
  },
  {
    slug: 'the-studio',
    title: 'The Studio',
    eyebrow: 'Creative Lab',
    image:
      'https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=900&q=80',
    description:
      'A flexible creative space for concepting visuals, motion, and product storytelling.',
    summary:
      'An adaptable studio lane that can grow with new ideas, campaigns, or moods.',
    ctaLabel: 'Step inside',
    tags: ['Creative', 'Brand', 'Motion'],
    sections: [
      {
        heading: 'Its focus',
        body:
          'The Studio keeps the aesthetic side of the experience rich without making it harder to maintain.',
      },
      {
        heading: 'What it supports',
        body:
          'It is a great home for fresh concepts, visual experiments, and evolving brand direction.',
      },
    ],
  },
  {
    slug: 'the-brief',
    title: 'The Brief',
    eyebrow: 'Signal',
    image:
      'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80',
    description:
      'A concise storytelling lane for announcements, updates, and sharp, high-signal messaging.',
    summary:
      'A lightweight channel that stays clear, focused, and easy to refresh as needs change.',
    ctaLabel: 'Read the brief',
    tags: ['Notes', 'Updates', 'Messaging'],
    sections: [
      {
        heading: 'How it helps',
        body:
          'The Brief gives the site a simple place for timely updates without overcomplicating the main experience.',
      },
      {
        heading: 'Why it works',
        body:
          'Its structure is intentionally simple so the message remains the centerpiece.',
      },
    ],
  },
  {
    slug: 'the-harbor',
    title: 'The Harbor',
    eyebrow: 'Connection',
    image:
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80',
    description:
      'A welcoming destination that ties together people, projects, and next steps in one place.',
    summary:
      'A calm landing space for relationships, referrals, and shared momentum.',
    ctaLabel: 'Open the harbor',
    tags: ['Community', 'Network', 'Next Steps'],
    sections: [
      {
        heading: 'Its role',
        body:
          'The Harbor makes it easier for visitors to feel oriented and find the right next destination.',
      },
      {
        heading: 'What it enables',
        body:
          'It supports cross-links, future expansion, and a softer approach to navigation.',
      },
    ],
  },
];
