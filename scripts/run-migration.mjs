/**
 * Run a SQL migration file via Supabase Management API
 * Usage: node scripts/run-migration.mjs <path-to-sql-file>
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'

const envFile = readFileSync('.env.local', 'utf8')
const env = Object.fromEntries(
  envFile.split('\n')
    .filter(l => l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0,i).trim(), l.slice(i+1).trim()] })
)

const PROJECT_REF   = env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)\./)?.[1]
const ACCESS_TOKEN  = env.SUPABASE_ACCESS_TOKEN
const sqlFile       = process.argv[2]

if (!sqlFile) { console.error('Usage: node scripts/run-migration.mjs <file.sql>'); process.exit(1) }
if (!PROJECT_REF)  { console.error('Could not extract project ref from SUPABASE_URL'); process.exit(1) }
if (!ACCESS_TOKEN) { console.error('SUPABASE_ACCESS_TOKEN not found in .env.local'); process.exit(1) }

const sql = readFileSync(resolve(sqlFile), 'utf8')
console.log(`Running migration: ${sqlFile}`)
console.log(`Project: ${PROJECT_REF}`)
console.log(`SQL length: ${sql.length} chars\n`)

const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query: sql }),
})

const body = await res.json().catch(() => res.text())

if (!res.ok) {
  console.error(`❌ Migration failed (HTTP ${res.status}):`)
  console.error(JSON.stringify(body, null, 2))
  process.exit(1)
}

console.log(`✅ Migration applied successfully!`)
console.log(JSON.stringify(body, null, 2))
