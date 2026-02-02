import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MatchingPreferences, EventFilters } from '@/types';

interface PreferencesState {
  matchingPreferences: MatchingPreferences;
  eventFilters: EventFilters;
  setMatchingPreferences: (preferences: Partial<MatchingPreferences>) => void;
  setEventFilters: (filters: Partial<EventFilters>) => void;
  resetFilters: () => void;
}

const defaultMatchingPreferences: MatchingPreferences = {
  categoryWeights: {},
  locationWeights: {},
  timePreferences: {
    weekdays: true,
    weekends: true,
    mornings: true,
    afternoons: true,
    evenings: true,
  },
};

const defaultEventFilters: EventFilters = {
  categories: undefined,
  location: undefined,
  search: undefined,
  dateRange: undefined,
};

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    set => ({
      matchingPreferences: defaultMatchingPreferences,
      eventFilters: defaultEventFilters,

      setMatchingPreferences: preferences =>
        set(state => ({
          matchingPreferences: { ...state.matchingPreferences, ...preferences },
        })),

      setEventFilters: filters =>
        set(state => ({
          eventFilters: { ...state.eventFilters, ...filters },
        })),

      resetFilters: () =>
        set({
          eventFilters: defaultEventFilters,
        }),
    }),
    {
      name: 'preferences-storage',
      partialize: state => ({
        matchingPreferences: state.matchingPreferences,
      }),
    }
  )
);
