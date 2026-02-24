// Quick smoke test — no DB writes
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
const LISTING_URL = 'https://www.macauticket.com/TicketWeb2023/en'
const DETAIL_BASE = 'https://www.macauticket.com/TicketWeb2023/en/programme'

function parseMacauDate(dateStr) {
  if (!dateStr || /please|see|below|--|TBD/i.test(dateStr)) return null
  const first = dateStr.split(/\s+&\s+/)[0].split(' - ')[0].trim()
  const m = first.match(/(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2})/)
  if (m) {
    const [,y,mo,d,h,mi] = m
    return new Date(`${y}-${mo}-${d}T${h}:${mi}:00+08:00`).toISOString()
  }
  return null
}

// 1. Listing
console.log('=== LISTING ===')
const res = await fetch(LISTING_URL, { headers: { 'User-Agent': UA } })
const html = await res.text()
const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)
const data = JSON.parse(match[1])
const events = data?.props?.pageProps?.showListData ?? []
console.log(`Events found: ${events.length}`)
events.slice(0,8).forEach(e => {
  const utc = parseMacauDate(e.ShowDate)
  console.log(`  ${e.ProCode}  | ${(e.ShowDate||'').padEnd(28)} → ${utc ?? '(no parseable date)'}  | ${e.ProName1?.substring(0,45)}`)
})

// 2. Detail for first event with a date
const withDate = events.find(e => parseMacauDate(e.ShowDate))
if (withDate) {
  console.log(`\n=== DETAIL: ${withDate.ProCode} ===`)
  await new Promise(r => setTimeout(r, 1200))
  const dr = await fetch(`${DETAIL_BASE}/${withDate.ProCode}`, { headers: { 'User-Agent': UA, Referer: LISTING_URL } })
  const dhtml = await dr.text()
  const dm = dhtml.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)
  const dd = JSON.parse(dm[1])
  const pp = dd?.props?.pageProps
  const venue = pp?.proList?.ProListData?.[0]?.VenueName
  const descHtml = pp?.proInfo?.[0]?.Content ?? ''
  const desc = descHtml.replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim().substring(0,120)
  console.log(`  Venue:  ${venue}`)
  console.log(`  Org:    ${pp?.proList?.SPName}`)
  console.log(`  Desc:   ${desc}...`)
  console.log('\n✅ Worker is ready to run against Supabase.')
}
