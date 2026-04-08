import { load } from 'cheerio';
import { cache, CACHE_TTL } from '@/lib/cache';

// Sentinel object so we can distinguish "cached: no image" from "not in cache"
type OgImageCacheEntry = { ogImage: string | null };

const OG_CACHE_PREFIX = 'og-image:';
const FETCH_TIMEOUT_MS = 5000;
const DEFAULT_CONCURRENCY = 5;

export async function scrapeOgImage(url: string): Promise<string | null> {
  const cacheKey = `${OG_CACHE_PREFIX}${url}`;

  const cached = await cache.get<OgImageCacheEntry>(cacheKey);
  if (cached !== null) return cached.ogImage;

  let result: string | null = null;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Engage-Timetree/1.0',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (response.ok) {
      const html = await response.text();
      const $ = load(html);
      const content = $('meta[property="og:image"]').attr('content') ?? null;
      result = content && /^https?:\/\//i.test(content) ? content : null;
    }
  } catch {
    // Network error or timeout — fall through with result = null
  }

  await cache.set(cacheKey, { ogImage: result } satisfies OgImageCacheEntry, {
    ttl: CACHE_TTL.MEDIUM,
  });

  return result;
}

/**
 * Enrich events in-place: for events whose images[] is empty and have a url,
 * fetch the OG image and prepend it to images[]. Runs at most `concurrency`
 * fetches in parallel to avoid hammering the origin.
 */
export async function enrichEventsWithOgImages<
  T extends { url: string | null; images: string[] },
>(events: T[], concurrency = DEFAULT_CONCURRENCY): Promise<void> {
  const targets = events.filter((e) => e.url && e.images.length === 0);
  if (!targets.length) return;

  let index = 0;

  async function worker() {
    while (index < targets.length) {
      const event = targets[index++];
      const ogImage = await scrapeOgImage(event.url!);
      if (ogImage) event.images = [ogImage];
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, targets.length) }, worker)
  );
}
