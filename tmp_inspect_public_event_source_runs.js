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
  const supabase = createClient(url, key);

  const { data, error } = await supabase
    .from('public_event_source_runs')
    .select('*')
    .limit(1);

  if (error) throw error;
  const row = (data && data[0]) ? data[0] : null;
  console.log(JSON.stringify({ columns: row ? Object.keys(row) : [], row }, null, 2));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
