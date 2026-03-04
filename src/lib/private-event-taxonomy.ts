export type PrivateEventTaxonomyEntry = {
  category: string;
  tags: string[];
};

export const PRIVATE_EVENT_TAXONOMY: PrivateEventTaxonomyEntry[] = [
  {
    category: 'Personal',
    tags: ['Self-care', 'Appointments', 'Errands', 'Routine', 'Rest', 'Reflection'],
  },
  {
    category: 'Work',
    tags: ['Meetings', 'Deep work', 'Planning', 'Review', 'Deadline', 'Admin'],
  },
  {
    category: 'Family',
    tags: ['Kids', 'Parents', 'Family time', 'School', 'Celebration', 'Household'],
  },
  {
    category: 'Social',
    tags: ['Friends', 'Networking', 'Date night', 'Community', 'Party', 'Catch-up'],
  },
  {
    category: 'Health & Fitness',
    tags: ['Workout', 'Run', 'Yoga', 'Doctor', 'Therapy', 'Wellness'],
  },
  {
    category: 'Education',
    tags: ['Class', 'Study', 'Workshop', 'Reading', 'Practice', 'Exam'],
  },
  {
    category: 'Travel',
    tags: ['Flight', 'Hotel', 'Road trip', 'Commute', 'Packing', 'Adventure'],
  },
  {
    category: 'Finance',
    tags: ['Bills', 'Budget', 'Taxes', 'Banking', 'Investing', 'Insurance'],
  },
  {
    category: 'Home',
    tags: ['Cleaning', 'Maintenance', 'Repairs', 'Grocery', 'Cooking', 'Pet care'],
  },
  {
    category: 'Other',
    tags: ['Misc', 'Reminder', 'Goal', 'Project', 'Volunteer', 'Hobby'],
  },
];
