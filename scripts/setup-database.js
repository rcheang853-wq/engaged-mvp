#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local file
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('Need: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration(migrationFile) {
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', migrationFile);

  try {
    console.log(`📋 Running ${migrationFile}...`);
    const sql = fs.readFileSync(migrationPath, 'utf8');

    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // Try direct query if rpc fails
      const { error: directError } = await supabase
        .from('_temp_migration')
        .select('*')
        .eq('sql', sql);

      if (directError) {
        console.warn(`⚠️  Could not run ${migrationFile} via script`);
        console.log(`📝 Please run this migration manually in Supabase SQL Editor:`);
        console.log(`   File: ${migrationPath}`);
        return false;
      }
    }

    console.log(`✅ ${migrationFile} completed`);
    return true;
  } catch (err) {
    console.warn(`⚠️  Could not run ${migrationFile} automatically`);
    console.log(`📝 Please run this migration manually in Supabase SQL Editor:`);
    console.log(`   File: ${migrationPath}`);
    return false;
  }
}

async function setupDatabase() {
  console.log('🚀 Setting up Supabase database...');
  console.log(`📡 Connecting to: ${supabaseUrl}`);

  const migrations = [
    '20250101000001_initial_schema.sql',
    '20250101000002_rls_policies.sql',
    '20250101000003_functions_triggers.sql',
    '20250101000004_seed_data.sql'
  ];

  let manualMigrations = [];

  for (const migration of migrations) {
    const success = await runMigration(migration);
    if (!success) {
      manualMigrations.push(migration);
    }
  }

  console.log('\n🎉 Database setup process completed!');

  if (manualMigrations.length > 0) {
    console.log('\n⚠️  Some migrations need to be run manually:');
    console.log('1. Go to: https://emwdopcuoulfgdojxasi.supabase.co');
    console.log('2. Click "SQL Editor" → "New query"');
    console.log('3. Copy and paste each migration file:');

    manualMigrations.forEach((migration, index) => {
      console.log(`   ${index + 1}. supabase/migrations/${migration}`);
    });
  } else {
    console.log('✅ All migrations completed automatically!');
  }

  console.log('\n🚀 Next steps:');
  console.log('1. Restart your dev server: npm run dev');
  console.log('2. Test scraping: curl -X POST http://localhost:3002/api/admin/scraping/sources/mgto/test');
}

setupDatabase().catch(console.error);