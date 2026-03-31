import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type HolidayEvent = {
  id: string;
  title: string;
  start_at: string;
  end_at: string;
  all_day: boolean;
  timezone: string;
  categories: string[];
  is_free: boolean;
  currency: string;
  images: string[];
  created_at: string;
};

function ymd(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const locale = (searchParams.get('locale') ?? 'MO').toUpperCase();

    // Nager.Date supports HK and CN, but not MO (Macau).
    // For Macau we fall back to CN holidays and add a minimal set of Macau-specific public holidays.
    const nagerLocale = locale === 'MO' ? 'CN' : locale;
    const fromStr = searchParams.get('from');
    const toStr = searchParams.get('to');

    if (!fromStr || !toStr) {
      return NextResponse.json({ success: false, error: 'Missing from/to' }, { status: 400 });
    }

    const from = new Date(fromStr);
    const to = new Date(toStr);

    const years = Array.from(new Set([from.getFullYear(), to.getFullYear()]));

    const holidays: any[] = [];
    for (const year of years) {
      const url = `https://date.nager.at/api/v3/PublicHolidays/${year}/${nagerLocale}`;
      const res = await fetch(url, { next: { revalidate: 60 * 60 } });
      if (!res.ok) continue;
      const json = await res.json();
      if (Array.isArray(json)) holidays.push(...json);
    }

    const fromYmd = ymd(from);
    const toYmd = ymd(to);

    let events: HolidayEvent[] = holidays
      .filter((h) => typeof h?.date === 'string')
      .filter((h) => h.date >= fromYmd && h.date <= toYmd)
      .map((h) => {
        const start = new Date(`${h.date}T00:00:00`);
        const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
        return {
          id: `holiday:${locale}:${h.date}:${String(h.localName ?? h.name ?? 'holiday')}`,
          title: String(h.localName ?? h.name ?? 'Holiday'),
          start_at: start.toISOString(),
          end_at: end.toISOString(),
          all_day: true,
          timezone: 'Asia/Macau',
          categories: ['Holiday'],
          is_free: true,
          currency: 'MOP',
          images: [],
          created_at: new Date().toISOString(),
        };
      });

    // Macau-specific public holidays not present in the CN dataset (minimal v1 coverage).
    if (locale === 'MO') {
      const extra = [
        { month: 12, day: 20, name: 'Macau SAR Establishment Day' },
      ];

      for (const year of years) {
        for (const h of extra) {
          const date = `${year}-${String(h.month).padStart(2, '0')}-${String(h.day).padStart(2, '0')}`;
          if (date < fromYmd || date > toYmd) continue;
          const start = new Date(`${date}T00:00:00`);
          const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
          const id = `holiday:MO:${date}:${h.name}`;
          if (events.some((e) => e.id === id)) continue;
          events.push({
            id,
            title: h.name,
            start_at: start.toISOString(),
            end_at: end.toISOString(),
            all_day: true,
            timezone: 'Asia/Macau',
            categories: ['Holiday'],
            is_free: true,
            currency: 'MOP',
            images: [],
            created_at: new Date().toISOString(),
          });
        }
      }

      events.sort((a, b) => a.start_at.localeCompare(b.start_at));
    }

    return NextResponse.json({ success: true, data: events, meta: { locale, from: from.toISOString(), to: to.toISOString() } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
