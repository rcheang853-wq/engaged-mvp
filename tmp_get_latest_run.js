const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

function loadEnvLocal() {
  const envFile = fs.readFileSync('.env.local', 'utf8');
  const envVars = {};
  for (const rawLine of envFile.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    // strip surrounding quotes if present
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    envVars[m[1]] = v;
  }
  return envVars;
}

(async () => {
  const envVars = loadEnvLocal();
  const url = envVars.SUPABASE_URL || envVars.NEXT_PUBLIC_SUPABASE_URL;
  const key = envVars.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) throw new Error('Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL in .env.local');
  if (!key) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY in .env.local');

  const supabase = createClient(url, key);
  const { data: sources, error: srcErr } = await supabase
    .from('event_sources')
    .select('id,name')
    .ilike('name', '%macau%ticket%')
    .limit(5);

  if (srcErr) throw srcErr;
  if (!sources || sources.length === 0) {
    throw new Error('Could not find event_sources row matching MacauTicket');
  }
  const sourceId = sources[0].id;

  const { data, error } = await supabase
    .from('public_event_source_runs')
    .select('events_found,events_upserted,errors_count,started_at')
    .eq('source_id', sourceId)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  console.log(JSON.stringify({
    events_found: data?.events_found ?? null,
    events_upserted: data?.events_upserted ?? null,
    errors_count: data?.errors_count ?? null,
  }));
  return;

  if (error) throw error;
  console.log(JSON.stringify(data));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
