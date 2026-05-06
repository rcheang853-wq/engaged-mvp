const fs = require('node:fs');
const dns = require('node:dns/promises');
const path = require('node:path');

const REQUIRED_ENV = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
];

function loadDotEnvLocal() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;

  for (const rawLine of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;

    const [, key, rawValue] = match;
    if (process.env[key]) continue;

    process.env[key] = rawValue.replace(/^(['"])(.*)\1$/, '$2');
  }
}

function requireSupabaseEnv() {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required Supabase env: ${missing.join(', ')}`);
  }

  const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL must use http or https');
  }

  return url;
}

async function verifySupabaseDns(url) {
  if (['localhost', '127.0.0.1', '::1'].includes(url.hostname)) return;

  try {
    await dns.lookup(url.hostname);
  } catch {
    throw new Error(
      `Supabase host could not be resolved: ${url.hostname}. Check that NEXT_PUBLIC_SUPABASE_URL points to an active Supabase project.`
    );
  }
}

async function main() {
  loadDotEnvLocal();
  const supabaseUrl = requireSupabaseEnv();

  if (process.argv.includes('--network')) {
    await verifySupabaseDns(supabaseUrl);
  }

  console.log('Supabase environment check passed.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
