const HK_TICKETING_ORIGIN = 'https://hkt.hkticketing.com';

export const HK_DISCOVER_CATEGORIES = [
  'Dance',
  'Drama',
  'Music',
  'Sport',
  'Exhibition',
  'Others',
] as const;

export type HkDiscoverCategory = (typeof HK_DISCOVER_CATEGORIES)[number];

export type HkTicketingEvent = {
  id: string;
  title: string;
  start_at: string;
  venue_name: string | null;
  images: string[];
  categories: HkDiscoverCategory[];
  url: string;
  price_min: number | null;
  price_max: number | null;
  currency: string;
};

function normalizeText(v: unknown) {
  return typeof v === 'string' ? v.trim() : '';
}

function guessCategoryFromText(text: string): HkDiscoverCategory {
  const t = text.toLowerCase();

  if (t.includes('dance') || t.includes('ballet')) return 'Dance';
  if (t.includes('drama') || t.includes('theatre') || t.includes('theater')) return 'Drama';
  if (t.includes('music') || t.includes('concert') || t.includes('pop')) return 'Music';
  if (t.includes('sport') || t.includes('football') || t.includes('basketball') || t.includes('marathon')) return 'Sport';
  if (t.includes('exhibition') || t.includes('expo') || t.includes('museum')) return 'Exhibition';

  return 'Others';
}

function parseDateMaybe(v: unknown): string | null {
  // HK Ticketing payloads vary; attempt a few common patterns.
  if (!v) return null;
  if (typeof v === 'string') {
    const s = v.trim();
    if (!s) return null;
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }

  // unix millis
  if (typeof v === 'number' && Number.isFinite(v)) {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }

  return null;
}

function buildHeaders() {
  return {
    // These headers are required for the vendor API to determine tenant/domain.
    Origin: HK_TICKETING_ORIGIN,
    Referer: HK_TICKETING_ORIGIN + '/en/#/home',
    'User-Agent': 'Mozilla/5.0 (compatible; EngagedBot/1.0)',
    Accept: 'application/json',
  };
}

export async function fetchHkTicketingEvents(opts: {
  page?: number;
  pageSize?: number;
  categories?: string[];
}): Promise<{ events: HkTicketingEvent[]; total: number | null }> {
  const page = Math.max(1, Number(opts.page ?? 1));
  const pageSize = Math.min(Math.max(Number(opts.pageSize ?? 20), 1), 50);

  // Vendor endpoint observed in HK Ticketing web app.
  const apiUrl = new URL('https://rest-sig.imaitix.com/api/pro/customizableProjects');
  apiUrl.searchParams.set('page', String(page));
  apiUrl.searchParams.set('pageSize', String(pageSize));
  apiUrl.searchParams.set('projectClass', '');
  apiUrl.searchParams.set('city', '');
  apiUrl.searchParams.set('startTime', '');
  apiUrl.searchParams.set('endTime', '');
  apiUrl.searchParams.set('langType', '2'); // English

  const res = await fetch(apiUrl.toString(), {
    method: 'GET',
    headers: buildHeaders(),
    // This endpoint can be slow.
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`HK Ticketing fetch failed: ${res.status}`);
  }

  const json: any = await res.json();
  const list: any[] = json?.data?.dataList ?? [];

  const events: HkTicketingEvent[] = [];
  for (const item of list) {
    const id = String(item?.projectId ?? item?.id ?? '');
    if (!id) continue;

    const title = normalizeText(item?.projectName ?? item?.name ?? item?.title);

    // date/time fields vary by project; pick the earliest we can find
    const startAt =
      parseDateMaybe(item?.minShowTime) ||
      parseDateMaybe(item?.startTime) ||
      parseDateMaybe(item?.showTime) ||
      parseDateMaybe(item?.createdTime) ||
      new Date().toISOString();

    const venue = normalizeText(item?.venueName ?? item?.venue ?? item?.placeName);

    const poster = normalizeText(item?.posterUrl ?? item?.poster ?? item?.imgUrl ?? item?.imageUrl);

    const priceMin =
      typeof item?.minPrice === 'number'
        ? item.minPrice
        : typeof item?.priceMin === 'number'
          ? item.priceMin
          : null;

    const priceMax =
      typeof item?.maxPrice === 'number'
        ? item.maxPrice
        : typeof item?.priceMax === 'number'
          ? item.priceMax
          : null;

    // Guess category from vendor provided class/type fields and title.
    const typeText = normalizeText(item?.projectClassName ?? item?.projectTypeName ?? item?.typeName);
    const category = guessCategoryFromText(`${typeText} ${title}`);

    // Official deep link pattern used by their SPA.
    const url = `${HK_TICKETING_ORIGIN}/en/#/event/${encodeURIComponent(id)}`;

    events.push({
      id: `hkticketing_${id}`,
      title,
      start_at: startAt,
      venue_name: venue || null,
      images: poster ? [poster] : [],
      categories: [category],
      url,
      price_min: priceMin,
      price_max: priceMax,
      currency: 'HKD',
    });
  }

  // Apply category filter (from Discover UI). If multiple selected, treat as OR.
  const selected = (opts.categories ?? []).filter(Boolean);
  const filtered = selected.length
    ? events.filter((e) => e.categories.some((c) => selected.includes(c)))
    : events;

  const total = typeof json?.data?.totalRow === 'number' ? json.data.totalRow : null;

  return { events: filtered, total };
}
