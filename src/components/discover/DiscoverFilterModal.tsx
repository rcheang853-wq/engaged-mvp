'use client';

import { useMemo, useState } from 'react';
import { X, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';

export type DiscoverDatePreset = 'any' | 'today' | 'tomorrow' | 'week' | 'weekend' | 'choose';
export type DiscoverSort = 'relevance' | 'date';

export type HolidayLocale = 'MO' | 'HK' | 'CN';

export type DiscoverFilters = {
  datePreset: DiscoverDatePreset;
  chosenDate?: string; // YYYY-MM-DD
  neighborhoods: string[];
  categories: string[];
  freeOnly: boolean;
  onlineOnly: boolean;
  sort: DiscoverSort;

  // Holiday overlay (built-in calendars)
  showHolidays: boolean;
  holidayLocale: HolidayLocale;
};

export const DEFAULT_DISCOVER_FILTERS: DiscoverFilters = {
  datePreset: 'any',
  neighborhoods: [],
  categories: [],
  freeOnly: false,
  onlineOnly: false,
  sort: 'relevance',

  showHolidays: false,
  holidayLocale: 'MO',
};

function toggleInList(list: string[], value: string) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export default function DiscoverFilterModal({
  open,
  onClose,
  value,
  onChange,
  onApply,
  availableNeighborhoods,
  availableCategories,
}: {
  open: boolean;
  onClose: () => void;
  value: DiscoverFilters;
  onChange: (next: DiscoverFilters) => void;
  onApply: () => void;
  availableNeighborhoods: string[];
  availableCategories: string[];
}) {
  const [showAllCategories, setShowAllCategories] = useState(false);

  const categoriesToShow = useMemo(() => {
    if (showAllCategories) return availableCategories;
    return availableCategories.slice(0, 7);
  }, [availableCategories, showAllCategories]);

  if (!open) return null;

  const reset = () => onChange(DEFAULT_DISCOVER_FILTERS);

  return (
    <div className="fixed inset-0 z-[999]">
      <button className="absolute inset-0 bg-black/30" onClick={onClose} aria-label="Close" />

      <div className="absolute inset-x-0 top-0 mx-auto max-w-md bg-[#F6F3EE] h-[100dvh] shadow-xl flex flex-col relative">
        <div className="px-4 pt-12 pb-3 flex items-center justify-between flex-shrink-0">
          <h1 className="text-lg font-bold text-[#111827]">Filter</h1>
          <button onClick={onClose} className="w-10 h-10 rounded-full flex items-center justify-center" aria-label="Close">
            <X size={18} className="text-[#111827]" />
          </button>
        </div>

        <div className="px-4 pb-28 space-y-8 flex-1 overflow-y-auto">
          <section>
            <h2 className="text-sm font-semibold text-[#111827] mb-3">Date</h2>
            <div className="space-y-3">
              {([
                { key: 'any', label: 'Any date' },
                { key: 'today', label: 'Today' },
                { key: 'tomorrow', label: 'Tomorrow' },
                { key: 'week', label: 'This week' },
                { key: 'weekend', label: 'This weekend' },
              ] as const).map((opt) => (
                <button key={opt.key} onClick={() => onChange({ ...value, datePreset: opt.key })} className="w-full flex items-center justify-between py-2">
                  <span className="text-sm text-[#111827]">{opt.label}</span>
                  <span className="w-5 h-5 rounded-full border border-[#111827] flex items-center justify-center">
                    {value.datePreset === opt.key ? <span className="w-3 h-3 rounded-full bg-[#111827]" /> : null}
                  </span>
                </button>
              ))}

              <button onClick={() => onChange({ ...value, datePreset: 'choose' })} className="w-full flex items-center justify-between py-2">
                <span className="text-sm font-semibold text-[#111827]">Choose a date</span>
                <ChevronRight size={18} className="text-[#6B7280]" />
              </button>

              {value.datePreset === 'choose' && (
                <input
                  type="date"
                  value={value.chosenDate ?? ''}
                  onChange={(e) => onChange({ ...value, chosenDate: e.target.value })}
                  className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3 py-2 text-sm"
                />
              )}
            </div>
          </section>

          <div className="h-px bg-[#E5E7EB]" />

          <section>
            <h2 className="text-sm font-semibold text-[#111827] mb-3">Neighborhood</h2>
            <div className="space-y-3">
              {availableNeighborhoods.length === 0 && <p className="text-xs text-[#6B7280]">No neighborhood data yet</p>}
              {availableNeighborhoods.map((n) => (
                <button
                  key={n}
                  onClick={() => onChange({ ...value, neighborhoods: toggleInList(value.neighborhoods, n) })}
                  className="w-full flex items-center justify-between py-2"
                >
                  <span className="text-sm text-[#111827]">{n}</span>
                  <span
                    className={
                      'w-5 h-5 rounded border flex items-center justify-center ' +
                      (value.neighborhoods.includes(n) ? 'bg-[#111827] border-[#111827]' : 'border-[#111827]')
                    }
                  >
                    {value.neighborhoods.includes(n) ? <span className="w-2.5 h-2.5 bg-white" /> : null}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <div className="h-px bg-[#E5E7EB]" />

          <section>
            <h2 className="text-sm font-semibold text-[#111827] mb-3">Category</h2>
            <div className="space-y-3">
              {availableCategories.length === 0 && <p className="text-xs text-[#6B7280]">No category data yet</p>}
              {categoriesToShow.map((c) => (
                <button
                  key={c}
                  onClick={() => onChange({ ...value, categories: toggleInList(value.categories, c) })}
                  className="w-full flex items-center justify-between py-2"
                >
                  <div className="flex items-center gap-2">
                    <ChevronRight size={18} className="text-[#6B7280]" />
                    <span className="text-sm text-[#111827]">{c}</span>
                  </div>
                  <span
                    className={
                      'w-5 h-5 rounded border flex items-center justify-center ' +
                      (value.categories.includes(c) ? 'bg-[#111827] border-[#111827]' : 'border-[#111827]')
                    }
                  >
                    {value.categories.includes(c) ? <span className="w-2.5 h-2.5 bg-white" /> : null}
                  </span>
                </button>
              ))}

              {availableCategories.length > 7 && (
                <button onClick={() => setShowAllCategories((s) => !s)} className="flex items-center gap-2 text-sm font-semibold text-[#111827] py-2">
                  {showAllCategories ? (
                    <>
                      <span>Show less</span>
                      <ChevronUp size={18} />
                    </>
                  ) : (
                    <>
                      <span>Show all</span>
                      <ChevronDown size={18} />
                    </>
                  )}
                </button>
              )}
            </div>
          </section>

          <div className="h-px bg-[#E5E7EB]" />

          <section>
            <h2 className="text-sm font-semibold text-[#111827] mb-3">Ticket price</h2>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-[#111827]">Show only free events</span>
              <button
                onClick={() => onChange({ ...value, freeOnly: !value.freeOnly })}
                className={'w-12 h-7 rounded-full p-1 transition-colors ' + (value.freeOnly ? 'bg-[#111827]' : 'bg-[#D1D5DB]')}
                aria-label="Toggle free events"
              >
                <div className={'w-5 h-5 bg-white rounded-full transition-transform ' + (value.freeOnly ? 'translate-x-5' : 'translate-x-0')} />
              </button>
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-[#111827] mb-3">Event type</h2>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-[#111827]">Show online events</span>
              <button
                onClick={() => onChange({ ...value, onlineOnly: !value.onlineOnly })}
                className={'w-12 h-7 rounded-full p-1 transition-colors ' + (value.onlineOnly ? 'bg-[#111827]' : 'bg-[#D1D5DB]')}
                aria-label="Toggle online events"
              >
                <div className={'w-5 h-5 bg-white rounded-full transition-transform ' + (value.onlineOnly ? 'translate-x-5' : 'translate-x-0')} />
              </button>
            </div>
          </section>

          <div className="h-px bg-[#E5E7EB]" />

          <section>
            <h2 className="text-sm font-semibold text-[#111827] mb-3">Holiday calendars</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-[#111827]">Show holidays</span>
                <button
                  onClick={() => onChange({ ...value, showHolidays: !value.showHolidays })}
                  className={'w-12 h-7 rounded-full p-1 transition-colors ' + (value.showHolidays ? 'bg-[#111827]' : 'bg-[#D1D5DB]')}
                  aria-label="Toggle holidays"
                >
                  <div className={'w-5 h-5 bg-white rounded-full transition-transform ' + (value.showHolidays ? 'translate-x-5' : 'translate-x-0')} />
                </button>
              </div>

              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-[#111827]">Locale</span>
                <select
                  value={value.holidayLocale}
                  onChange={(e) => onChange({ ...value, holidayLocale: e.target.value as HolidayLocale })}
                  className="bg-white border border-[#E5E7EB] rounded-xl px-3 py-2 text-sm"
                >
                  <option value="MO">Macau</option>
                  <option value="HK">Hong Kong</option>
                  <option value="CN">China</option>
                </select>
              </div>

              <p className="text-xs text-[#6B7280]">Holidays are an overlay (built-in calendar), separate from event listings.</p>
            </div>
          </section>

          <div className="h-px bg-[#E5E7EB]" />

          <section>
            <h2 className="text-sm font-semibold text-[#111827] mb-3">Sort by</h2>
            <div className="space-y-3">
              {([
                { key: 'relevance', label: 'Relevance' },
                { key: 'date', label: 'Date' },
              ] as const).map((opt) => (
                <button key={opt.key} onClick={() => onChange({ ...value, sort: opt.key })} className="w-full flex items-center justify-between py-2">
                  <span className="text-sm text-[#111827]">{opt.label}</span>
                  <span className="w-5 h-5 rounded-full border border-[#111827] flex items-center justify-center">
                    {value.sort === opt.key ? <span className="w-3 h-3 rounded-full bg-[#111827]" /> : null}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="absolute bottom-0 inset-x-0 mx-auto max-w-md px-4 py-4 bg-[#F6F3EE] border-t border-[#E5E7EB] flex items-center justify-between flex-shrink-0 z-10">
          <button onClick={reset} className="text-sm font-semibold text-[#9CA3AF]">Reset</button>
          <button onClick={onApply} className="bg-[#111827] text-white text-sm font-semibold px-6 py-3 rounded-full">Apply filters</button>
        </div>
      </div>
    </div>
  );
}
