export type PrivateEventTaxonomyEntry = {
  category: string;
  emoji?: string;
  tags: string[];
  tagGroups?: { label: string; tags: string[] }[];
};

export const PRIVATE_EVENT_TAXONOMY: PrivateEventTaxonomyEntry[] = [
  {
    category: 'Family & Kids',
    emoji: '👨‍👩‍👧‍👦',
    tagGroups: [
      {
        label: 'Age',
        tags: ['Infant (0–2)', 'Toddler (2–4)', 'Kids (5–10)', 'Teen'],
      },
      {
        label: 'Type',
        tags: ['Educational', 'Creative', 'Physical', 'STEM', 'Montessori', 'Interactive'],
      },
    ],
    tags: [
      'Infant (0–2)',
      'Toddler (2–4)',
      'Kids (5–10)',
      'Teen',
      'Educational',
      'Creative',
      'Physical',
      'STEM',
      'Montessori',
      'Interactive',
    ],
  },
  {
    category: 'Date & Romance',
    emoji: '💕',
    tagGroups: [
      {
        label: 'Mood',
        tags: ['Romantic', 'Fun', 'Cozy', 'Scenic', 'Luxury', 'Surprise'],
      },
      {
        label: 'Occasion',
        tags: ['Anniversary', 'Proposal', 'Birthday', 'First Date'],
      },
    ],
    tags: [
      'Romantic',
      'Fun',
      'Cozy',
      'Scenic',
      'Luxury',
      'Surprise',
      'Anniversary',
      'Proposal',
      'Birthday',
      'First Date',
    ],
  },
  {
    category: 'Friends & Social',
    emoji: '🎉',
    tagGroups: [
      {
        label: 'Energy Level',
        tags: ['Chill', 'Competitive', 'Party', 'Active'],
      },
      {
        label: 'Format',
        tags: ['Reservation Needed', 'Walk-In', 'Group Booking'],
      },
    ],
    tags: ['Chill', 'Competitive', 'Party', 'Active', 'Reservation Needed', 'Walk-In', 'Group Booking'],
  },
  {
    category: 'Food & Drink',
    emoji: '🍽️',
    tagGroups: [
      {
        label: 'Cuisine',
        tags: ['Japanese', 'Korean', 'Italian', 'Street Food', 'Dessert', 'Café'],
      },
      {
        label: 'Experience',
        tags: ['Tasting Menu', 'Buffet', 'Pop-Up', 'Limited Edition', 'New Opening'],
      },
    ],
    tags: [
      'Japanese',
      'Korean',
      'Italian',
      'Street Food',
      'Dessert',
      'Café',
      'Tasting Menu',
      'Buffet',
      'Pop-Up',
      'Limited Edition',
      'New Opening',
    ],
  },
  {
    category: 'Outdoor & Adventure',
    emoji: '⛰️',
    tagGroups: [
      {
        label: 'Difficulty',
        tags: ['Easy', 'Moderate', 'Advanced'],
      },
      {
        label: 'Environment',
        tags: ['Mountain', 'Beach', 'Urban', 'Nature'],
      },
    ],
    tags: ['Easy', 'Moderate', 'Advanced', 'Mountain', 'Beach', 'Urban', 'Nature'],
  },
  {
    category: 'Wellness & Fitness',
    emoji: '🧘',
    tagGroups: [
      {
        label: 'Focus',
        tags: ['Mindfulness', 'Strength', 'Cardio', 'Flexibility', 'Recovery'],
      },
      {
        label: 'Format',
        tags: ['Beginner-Friendly', 'Advanced', 'Trial Class', 'Membership Required'],
      },
    ],
    tags: [
      'Mindfulness',
      'Strength',
      'Cardio',
      'Flexibility',
      'Recovery',
      'Beginner-Friendly',
      'Advanced',
      'Trial Class',
      'Membership Required',
    ],
  },
  {
    category: 'Culture & Entertainment',
    emoji: '🎭',
    tagGroups: [
      {
        label: 'Type',
        tags: ['Live Show', 'Exhibition', 'Festival', 'Movie Screening'],
      },
      {
        label: 'Audience',
        tags: ['Family', 'Adults Only', 'All Ages'],
      },
    ],
    tags: ['Live Show', 'Exhibition', 'Festival', 'Movie Screening', 'Family', 'Adults Only', 'All Ages'],
  },
  {
    category: 'Workshops & Learning',
    emoji: '📚',
    tagGroups: [
      {
        label: 'Skill Type',
        tags: ['Creative', 'Business', 'Tech', 'Cooking', 'Language'],
      },
      {
        label: 'Level',
        tags: ['Beginner', 'Intermediate', 'Advanced'],
      },
    ],
    tags: ['Creative', 'Business', 'Tech', 'Cooking', 'Language', 'Beginner', 'Intermediate', 'Advanced'],
  },
  {
    category: 'Travel & Short Getaways',
    emoji: '✈️',
    tagGroups: [
      {
        label: 'Distance',
        tags: ['Within 1 Hour', '1–3 Hours', 'Overseas'],
      },
      {
        label: 'Style',
        tags: ['Relaxing', 'Adventure', 'Family', 'Luxury', 'Budget'],
      },
    ],
    tags: ['Within 1 Hour', '1–3 Hours', 'Overseas', 'Relaxing', 'Adventure', 'Family', 'Luxury', 'Budget'],
  },
];
