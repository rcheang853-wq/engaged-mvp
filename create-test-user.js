const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://emwdopcuoulfgdojxasi.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtd2RvcGN1b3VsZmdkb2p4YXNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NTU4NjYsImV4cCI6MjA3NDEzMTg2Nn0.MoiouqEEG8OKEivf9NBRRdnlelHFlSFk4h5fTYlbLYw'
);

async function createUser() {
  const { data, error } = await supabase.auth.signUp({
    email: 'demo@engaged.app',
    password: 'Demo123456',
  });

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Success! User created:', data);
    console.log('\nLogin with:');
    console.log('Email: demo@engaged.app');
    console.log('Password: Demo123456');
  }
}

createUser();
