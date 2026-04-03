import { load } from 'cheerio';

const LCSD_EVENTS_URL = 'https://www.lcsd.gov.hk/datagovhk/event/events.xml';
const LCSD_EVENT_DATES_URL = 'https://www.lcsd.gov.hk/datagovhk/event/eventDates.xml';
const LCSD_VENUES_URL = 'https://www.lcsd.gov.hk/datagovhk/event/venues.xml';

const HONG_KONG_TIMEZONE = 'Asia/Hong_Kong';
const HONG_KONG_CITY = 'Hong Kong';
const HONG_KONG_COUNTRY = 'Hong Kong';
const HK_LCSD_SOURCE_ID = 'hk-lcsd';
const HK_LCSD_ID_PREFIX = 'hk-lcsd__';

export const HONG_KONG_DISCOVER_CATEGORIES = [
  'Dance',
  'Drama',
  'Music',
  'Sport',
  'Exhibition',
  'Others',
] as const;

type DiscoverSort = 'relevance' | 'date';

type LcsdProgrammeRecord = {
  id: string;
  titlec: string;
  titlee: string;
  cat1: string;
  cat2: string;
  predatec: string;
  predatee: string;
  progtimec: string;
  progtimee: string;
  venueid: string;
  agelimitc: string;
  agelimite: string;
  pricec: string;
  pricee: string;
  descc: string;
  desce: string;
  urlc: string;
  urle: string;
  tagenturlc: string;
  tagenturle: string;
  remarkc: string;
  remarke: string;
  enquiry: string;
  fax: string;
  email: string;
  saledate: string;
  interbook: string;
  presenterorgc: string;
  presenterorge: string;
  prog_image: string;
  detail_image1: string;
  detail_image2: string;
  detail_image3: string;
  detail_image4: string;
  detail_image5: string;
  video_link: string;
  video2_link: string;
  submitdate: string;
};

type LcsdVenueRecord = {
  id: string;
  venue: string;
  venuec: string;
  latitude: string;
  longitude: string;
};

type PublicDiscoverEvent = {
  id: string;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string | null;
  all_day: boolean;
  timezone: string;
  venue_name: string | null;
  address: string | null;
  city: string;
  region: string | null;
  country: string;
  url: string | null;
  ticket_url: string | null;
  organizer_name: string | null;
  price_min: number | null;
  price_max: number | null;
  currency: string;
  is_free: boolean | null;
  categories: string[];
  images: string[];
  status: 'active';
  created_at: string;
  updated_at: string;
  source_id: string;
  source_event_id: string;
};

export type HongKongDiscoverFilters = {
  from: Date;
  to: Date;
  limit: number;
  offset: number;
  q: string;
  neighborhoods: string[];
  categories: string[];
  freeOnly: boolean;
  onlineOnly: boolean;
  sort: DiscoverSort;
};

export type HongKongDiscoverResponse = {
  data: PublicDiscoverEvent[];
  total: number;
};

function textOf(record: Record<string, string>, key: string): string {
  return (record[key] ?? '').trim();
}

function normalizeWhitespace(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function firstNonEmpty(...values: Array<string | null | undefined>): string {
  for (const value of values) {
    const normalized = normalizeWhitespace(value);
    if (normalized) return normalized;
  }
  return '';
}

function toAbsoluteUrl(value: string): string | null {
  const normalized = normalizeWhitespace(value);
  if (!normalized) return null;
  if (/^https?:\/\//i.test(normalized)) return normalized;
  return null;
}

function parseXmlRecords(xml: string, requiredKeys: string[]): Array<Record<string, string>> {
  const $ = load(xml, { xmlMode: true });
  const records = new Map<string, Record<string, string>>();

  for (const requiredKey of requiredKeys) {
    $(requiredKey).each((_, el) => {
      const parent = el.parent;
      if (!parent || parent.type !== 'tag') return;

      const entry: Record<string, string> = {};
      let hasRequiredKeys = true;

      for (const key of requiredKeys) {
        const child = $(parent).children(key).first();
        const value = normalizeWhitespace(child.text());
        if (!value) {
          hasRequiredKeys = false;
          break;
        }
        entry[key] = value;
      }

      if (!hasRequiredKeys) return;

      $(parent)
        .children()
        .each((__, child) => {
          if (child.type !== 'tag') return;
          entry[child.name] = normalizeWhitespace($(child).text());
        });

      const identity = requiredKeys.map((key) => entry[key]).join('::');
      if (identity) records.set(identity, entry);
    });
  }

  return Array.from(records.values());
}

function parseDateOnlyToUtcIso(rawDate: string): string | null {
  const normalized = normalizeWhitespace(rawDate);
  if (!normalized) return null;

  const match = normalized.match(/^(\d{4})[-/]?(\d{2})[-/]?(\d{2})$/);
  if (!match) return null;

  const [, year, month, day] = match;
  return new Date(`${year}-${month}-${day}T00:00:00+08:00`).toISOString();
}

function extractTimeComponents(value: string): { hour: number; minute: number } | null {
  const normalized = normalizeWhitespace(value).toLowerCase();
  if (!normalized) return null;

  const meridiemMatch = normalized.match(/(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)/i);
  if (meridiemMatch) {
    let hour = Number(meridiemMatch[1]);
    const minute = Number(meridiemMatch[2] ?? '0');
    const meridiem = meridiemMatch[3]?.toLowerCase();
    if (!meridiem) return null;

    if (hour === 12) hour = 0;
    if (meridiem === 'pm') hour += 12;

    return { hour, minute };
  }

  const twentyFourHourMatch = normalized.match(/\b(\d{1,2})[:.](\d{2})\b/);
  if (twentyFourHourMatch) {
    return {
      hour: Number(twentyFourHourMatch[1]),
      minute: Number(twentyFourHourMatch[2]),
    };
  }

  return null;
}

function applyTimeToUtcIso(dateIso: string, timeSource: string): { iso: string; allDay: boolean } {
  const time = extractTimeComponents(timeSource);
  if (!time) return { iso: dateIso, allDay: true };

  const base = new Date(dateIso);
  const year = base.getUTCFullYear();
  const month = String(base.getUTCMonth() + 1).padStart(2, '0');
  const day = String(base.getUTCDate()).padStart(2, '0');
  const hour = String(time.hour).padStart(2, '0');
  const minute = String(time.minute).padStart(2, '0');

  return {
    iso: new Date(`${year}-${month}-${day}T${hour}:${minute}:00+08:00`).toISOString(),
    allDay: false,
  };
}

function parsePrice(priceText: string): {
  isFree: boolean | null;
  priceMin: number | null;
  priceMax: number | null;
} {
  const normalized = normalizeWhitespace(priceText);
  if (!normalized) {
    return { isFree: null, priceMin: null, priceMax: null };
  }

  if (/\bfree\b|\u514d\u8cbb/i.test(normalized)) {
    return { isFree: true, priceMin: 0, priceMax: 0 };
  }

  const matches = Array.from(normalized.matchAll(/\d+(?:\.\d+)?/g)).map((match) =>
    Number(match[0])
  );

  if (!matches.length) {
    return { isFree: false, priceMin: null, priceMax: null };
  }

  return {
    isFree: false,
    priceMin: Math.min(...matches),
    priceMax: Math.max(...matches),
  };
}

function mapCategory(record: LcsdProgrammeRecord): string {
  const cat1 = textOf(record, 'cat1').toUpperCase();
  const cat2 = textOf(record, 'cat2').toUpperCase();
  const haystack = [
    textOf(record, 'titlee'),
    textOf(record, 'titlec'),
    textOf(record, 'desce'),
    textOf(record, 'descc'),
    cat1,
    cat2,
  ]
    .join(' ')
    .toLowerCase();

  if (cat2.includes('SC3') || /\bdance\b/.test(haystack)) return 'Dance';
  if (
    cat2.includes('SC6') ||
    cat2.includes('SC2') ||
    /\bdrama\b|\btheatre\b|\btheater\b|\bopera\b|\bchinese opera\b/.test(haystack)
  ) {
    return 'Drama';
  }
  if (
    cat2.includes('SC1') ||
    cat2.includes('SC9') ||
    /\bmusic\b|\bconcert\b|\bsymphony\b|\borchestra\b/.test(haystack)
  ) {
    return 'Music';
  }
  if (
    cat1 === 'INC1' ||
    /\bsport\b|\bfootball\b|\bbasketball\b|\brun\b|\brace\b|\bmatch\b/.test(haystack)
  ) {
    return 'Sport';
  }
  if (
    cat2.includes('SC4') ||
    (cat2.includes('SC1') && cat1 === 'INC6') ||
    /\bexhibition\b|\bmuseum\b|\bgallery\b/.test(haystack)
  ) {
    return 'Exhibition';
  }
  return 'Others';
}

function recordMatchesQuery(event: PublicDiscoverEvent, query: string): boolean {
  if (!query) return true;

  const haystack = [
    event.title,
    event.description,
    event.venue_name,
    event.address,
    event.organizer_name,
    event.region,
    event.city,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(query.toLowerCase());
}

function parseSubmittedAt(value: string): string {
  const normalized = normalizeWhitespace(value);
  if (!normalized.match(/^(\d{8})T(\d{4})$/)) {
    return new Date().toISOString();
  }

  return new Date(
    `${normalized.slice(0, 4)}-${normalized.slice(4, 6)}-${normalized.slice(6, 8)}T${normalized.slice(9, 11)}:${normalized.slice(11, 13)}:00+08:00`
  ).toISOString();
}

function buildDiscoverEvent(
  record: LcsdProgrammeRecord,
  venueById: Map<string, LcsdVenueRecord>,
  eventDatesById: Map<string, string[]>,
  window: { from: Date; to: Date }
): PublicDiscoverEvent | null {
  const rawDates = eventDatesById.get(record.id) ?? [];
  const candidateStarts = rawDates
    .map((rawDate) => parseDateOnlyToUtcIso(rawDate))
    .filter((value): value is string => Boolean(value))
    .map((dateIso) => applyTimeToUtcIso(dateIso, firstNonEmpty(record.progtimee, record.predatee)));

  const matchingStarts = candidateStarts.filter(({ iso }) => {
    const timestamp = new Date(iso).getTime();
    return timestamp >= window.from.getTime() && timestamp < window.to.getTime();
  });

  const selectedStart = matchingStarts[0] ?? candidateStarts[0];
  if (!selectedStart) return null;

  const selectedTime = new Date(selectedStart.iso).getTime();
  if (selectedTime < window.from.getTime() || selectedTime >= window.to.getTime()) {
    return null;
  }

  const venueIds = firstNonEmpty(record.venueid)
    .split(/[;,|]/)
    .map((value) => value.trim())
    .filter(Boolean);

  const venueNames = venueIds
    .map((venueId) => venueById.get(venueId))
    .filter((venue): venue is LcsdVenueRecord => Boolean(venue))
    .map((venue) => firstNonEmpty(venue.venue, venue.venuec))
    .filter(Boolean);

  const title = firstNonEmpty(record.titlee, record.titlec);
  if (!title) return null;

  const descriptionParts = [
    firstNonEmpty(record.desce, record.descc),
    firstNonEmpty(record.remarke, record.remarkc),
    firstNonEmpty(record.agelimite, record.agelimitc),
  ].filter(Boolean);

  const images = [
    record.prog_image,
    record.detail_image1,
    record.detail_image2,
    record.detail_image3,
    record.detail_image4,
    record.detail_image5,
  ]
    .map((image) => toAbsoluteUrl(image))
    .filter((image): image is string => Boolean(image));

  const price = parsePrice(firstNonEmpty(record.pricee, record.pricec));
  const createdAt = parseSubmittedAt(record.submitdate);

  return {
    id: `${HK_LCSD_ID_PREFIX}${record.id}`,
    title,
    description: descriptionParts.length ? descriptionParts.join('\n\n') : null,
    start_at: selectedStart.iso,
    end_at: null,
    all_day: selectedStart.allDay,
    timezone: HONG_KONG_TIMEZONE,
    venue_name: venueNames[0] ?? null,
    address: null,
    city: HONG_KONG_CITY,
    region: null,
    country: HONG_KONG_COUNTRY,
    url: toAbsoluteUrl(firstNonEmpty(record.urle, record.urlc)),
    ticket_url: toAbsoluteUrl(firstNonEmpty(record.tagenturle, record.tagenturlc)),
    organizer_name: firstNonEmpty(record.presenterorge, record.presenterorgc) || null,
    price_min: price.priceMin,
    price_max: price.priceMax,
    currency: 'HKD',
    is_free: price.isFree,
    categories: [mapCategory(record)],
    images,
    status: 'active',
    created_at: createdAt,
    updated_at: createdAt,
    source_id: HK_LCSD_SOURCE_ID,
    source_event_id: record.id,
  };
}

const LCSD_TIMEOUT_MS = 8000;

async function fetchLcsdXml(url: string, signal?: AbortSignal | null): Promise<string> {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/xml,text/xml;q=0.9,*/*;q=0.8',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate',
      Connection: 'keep-alive',
    },
    signal: signal ?? undefined,
    next: { revalidate: 1800 },
  });

  if (!response.ok) {
    throw new Error(`LCSD request failed: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

async function fetchRawLcsdData() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), LCSD_TIMEOUT_MS);

  try {
    const [eventsXml, datesXml, venuesXml] = await Promise.all([
      fetchLcsdXml(LCSD_EVENTS_URL, controller.signal),
      fetchLcsdXml(LCSD_EVENT_DATES_URL, controller.signal),
      fetchLcsdXml(LCSD_VENUES_URL, controller.signal),
    ]);

    clearTimeout(timeoutId);

    const programmeRecords = parseXmlRecords(eventsXml, ['id', 'cat1']);
    const dateRecords = parseXmlRecords(datesXml, ['id', 'indate']);
    const venueRecords = parseXmlRecords(venuesXml, ['id', 'venue']);

    const venuesById = new Map<string, LcsdVenueRecord>();
    for (const record of venueRecords) {
      const id = textOf(record, 'id');
      if (!id) continue;
      venuesById.set(id, {
        id,
        venue: textOf(record, 'venue'),
        venuec: textOf(record, 'venuec'),
        latitude: textOf(record, 'latitude'),
        longitude: textOf(record, 'longitude'),
      });
    }

    const eventDatesById = new Map<string, string[]>();
    for (const record of dateRecords) {
      const id = textOf(record, 'id');
      if (!id) continue;
      const dates = eventDatesById.get(id) ?? [];
      dates.push(textOf(record, 'indate'));
      eventDatesById.set(id, dates);
    }

    const programmes: LcsdProgrammeRecord[] = programmeRecords.map((record) => ({
      id: textOf(record, 'id'),
      titlec: textOf(record, 'titlec'),
      titlee: textOf(record, 'titlee'),
      cat1: textOf(record, 'cat1'),
      cat2: textOf(record, 'cat2'),
      predatec: textOf(record, 'predatec'),
      predatee: textOf(record, 'predatee'),
      progtimec: textOf(record, 'progtimec'),
      progtimee: textOf(record, 'progtimee'),
      venueid: textOf(record, 'venueid'),
      agelimitc: textOf(record, 'agelimitc'),
      agelimite: textOf(record, 'agelimite'),
      pricec: textOf(record, 'pricec'),
      pricee: textOf(record, 'pricee'),
      descc: textOf(record, 'descc'),
      desce: textOf(record, 'desce'),
      urlc: textOf(record, 'urlc'),
      urle: textOf(record, 'urle'),
      tagenturlc: textOf(record, 'tagenturlc'),
      tagenturle: textOf(record, 'tagenturle'),
      remarkc: textOf(record, 'remarkc'),
      remarke: textOf(record, 'remarke'),
      enquiry: textOf(record, 'enquiry'),
      fax: textOf(record, 'fax'),
      email: textOf(record, 'email'),
      saledate: textOf(record, 'saledate'),
      interbook: textOf(record, 'interbook'),
      presenterorgc: textOf(record, 'presenterorgc'),
      presenterorge: textOf(record, 'presenterorge'),
      prog_image: textOf(record, 'prog_image'),
      detail_image1: textOf(record, 'detail_image1'),
      detail_image2: textOf(record, 'detail_image2'),
      detail_image3: textOf(record, 'detail_image3'),
      detail_image4: textOf(record, 'detail_image4'),
      detail_image5: textOf(record, 'detail_image5'),
      video_link: textOf(record, 'video_link'),
      video2_link: textOf(record, 'video2_link'),
      submitdate: textOf(record, 'submitdate'),
    }));

    return {
      programmes,
      venuesById,
      eventDatesById,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    const err = error instanceof Error ? error : new Error(String(error));
    console.warn(err.message);
    return { programmes: [], venuesById: new Map(), eventDatesById: new Map() };
  }
}

function sortEvents(events: PublicDiscoverEvent[], sort: DiscoverSort) {
  events.sort((a, b) => {
    const dateDiff = new Date(a.start_at).getTime() - new Date(b.start_at).getTime();
    if (dateDiff !== 0) return dateDiff;
    if (sort === 'relevance') return a.title.localeCompare(b.title);
    return 0;
  });
}

export async function fetchHongKongDiscoverEvents(
  filters: HongKongDiscoverFilters
): Promise<HongKongDiscoverResponse> {
  try {
    const { programmes, venuesById, eventDatesById } = await fetchRawLcsdData();

    let events = programmes
      .map((programme) =>
        buildDiscoverEvent(programme, venuesById, eventDatesById, {
          from: filters.from,
          to: filters.to,
        })
      )
      .filter((event): event is PublicDiscoverEvent => Boolean(event));

    if (filters.q) {
      events = events.filter((event) => recordMatchesQuery(event, filters.q));
    }

    if (filters.neighborhoods.length) {
      events = events.filter((event) => {
        const region = event.region ?? event.city;
        return region ? filters.neighborhoods.includes(region) : false;
      });
    }

    if (filters.categories.length) {
      events = events.filter((event) =>
        event.categories.some((category) => filters.categories.includes(category))
      );
    }

    if (filters.freeOnly) {
      events = events.filter((event) => event.is_free === true);
    }

    if (filters.onlineOnly) {
      events = events.filter((event) => {
        const haystack = [event.title, event.venue_name, event.address, event.description]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes('online');
      });
    }

    sortEvents(events, filters.sort);

    if (events.length === 0) {
      console.warn('[discover][hk-lcsd] parsed 0 events', {
        from: filters.from.toISOString(),
        to: filters.to.toISOString(),
        q: filters.q,
        categories: filters.categories,
        neighborhoods: filters.neighborhoods,
        freeOnly: filters.freeOnly,
        onlineOnly: filters.onlineOnly,
        sort: filters.sort,
      });
    }

    return {
      data: events.slice(filters.offset, filters.offset + filters.limit),
      total: events.length,
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.warn(err.message);
    return { data: [], total: 0 };
  }
}

export async function fetchHongKongDiscoverEventById(
  id: string,
  window?: { from: Date; to: Date }
): Promise<PublicDiscoverEvent | null> {
  try {
    if (!id.startsWith(HK_LCSD_ID_PREFIX)) return null;

    const sourceEventId = id.slice(HK_LCSD_ID_PREFIX.length);
    const { programmes, venuesById, eventDatesById } = await fetchRawLcsdData();
    const programme = programmes.find((item) => item.id === sourceEventId);
    if (!programme) return null;

    return (
      buildDiscoverEvent(
        programme,
        venuesById,
        eventDatesById,
        window ?? {
          from: new Date('2000-01-01T00:00:00.000Z'),
          to: new Date('2100-01-01T00:00:00.000Z'),
        }
      ) ?? null
    );
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.warn(err.message);
    return null;
  }
}
