const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function executeSqlScript() {
  try {
    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    console.log('🔗 Connected to Supabase...');

    // Read the SQL script
    const sqlScript = fs.readFileSync('update-mgto-selectors.sql', 'utf8');
    console.log('📄 SQL script loaded...');

    // Split the script into individual statements
    const statements = sqlScript
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute...\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      if (statement.toLowerCase().startsWith('select')) {
        // For SELECT statements, show the results
        console.log(`🔍 Executing query ${i + 1}...`);
        const { data, error } = await supabase.rpc('exec_sql', {
          sql_query: statement
        });

        if (error) {
          // Try direct query for SELECT statements
          const { data: selectData, error: selectError } = await supabase
            .from('event_sources')
            .select('id, name, base_url, scrape_config->selectors as selectors, updated_at')
            .eq('name', 'MGTO City Events');

          if (selectError) {
            console.error('❌ Error executing SELECT:', selectError);
          } else {
            console.log('✅ MGTO Source configuration:');
            console.log(JSON.stringify(selectData, null, 2));
          }
        } else {
          console.log('✅ Query result:', data);
        }
      } else {
        // For UPDATE statements
        console.log(`⚡ Executing update ${i + 1}...`);

        // Parse and execute the UPDATE manually
        if (statement.toLowerCase().includes('update event_sources')) {
          const { data, error } = await supabase
            .from('event_sources')
            .update({
              scrape_config: {
                selectors: {
                  title: ".m-calendar__event-name, .cx-t20.m-calendar__event-name",
                  date: ".cx-list__item:has(.fa-calendar), .cx-t01.cx-list--sm .-fade",
                  venue: ".m-calendar__item",
                  description: "article .cx-col:last-child"
                },
                delay: 3000,
                rateLimit: "0.5 req/sec",
                pagination: true
              },
              updated_at: new Date().toISOString()
            })
            .eq('name', 'MGTO City Events')
            .select();

          if (error) {
            console.error('❌ Error updating MGTO source:', error);
          } else {
            console.log('✅ MGTO source updated successfully!');
            console.log('Updated source:', data);
          }
        }
      }
    }

    console.log('\n🎉 SQL script execution completed!');

    // Verify the update
    console.log('\n🔍 Verifying update...');
    const { data: verification, error: verifyError } = await supabase
      .from('event_sources')
      .select('name, scrape_config, updated_at')
      .eq('name', 'MGTO City Events')
      .single();

    if (verifyError) {
      console.error('❌ Error verifying update:', verifyError);
    } else {
      console.log('✅ Verification successful:');
      console.log('Name:', verification.name);
      console.log('Selectors:', verification.scrape_config.selectors);
      console.log('Updated at:', verification.updated_at);
    }

  } catch (error) {
    console.error('💥 Error executing SQL script:', error);
  }
}

executeSqlScript();