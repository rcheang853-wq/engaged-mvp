const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Read environment variables manually
const envFile = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    envVars[key.trim()] = value.trim();
  }
});

async function updateMGTOSelectors() {
  try {
    console.log('🔗 Connecting to Supabase...');

    // Initialize Supabase client
    const supabase = createClient(
      envVars.NEXT_PUBLIC_SUPABASE_URL,
      envVars.SUPABASE_SERVICE_ROLE_KEY
    );

    console.log('⚡ Updating MGTO source selectors...');

    // Update the MGTO source with correct selectors
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
      return;
    }

    console.log('✅ MGTO source updated successfully!');
    console.log('Updated source:', JSON.stringify(data[0], null, 2));

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
      console.log('✅ Verification successful!');
      console.log('Name:', verification.name);
      console.log('Selectors:', JSON.stringify(verification.scrape_config.selectors, null, 2));
      console.log('Updated at:', verification.updated_at);
    }

    console.log('\n🎉 Database update completed! You can now test scraping again.');

  } catch (error) {
    console.error('💥 Error:', error);
  }
}

updateMGTOSelectors();