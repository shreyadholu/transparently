const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jylrpbkgyawqjmwuyrdt.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5bHJwYmtneWF3cWptd3V5cmR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MjMzMzIsImV4cCI6MjA4ODI5OTMzMn0.qoGU-lg8jhfbShyLsM6nVPAnqISmH35KaZBFNkSngx8'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkAppStatus() {
  const { data: apps, error } = await supabase.from('applications').select('*').limit(5);
  console.log('Sample Applications:', apps);
  
  if (apps && apps.length > 0) {
    const id = apps[0].id;
    const testStatus = 'rejected';
    const { error: err } = await supabase.from('applications').update({ status: testStatus }).eq('id', id);
    if (err) {
      console.log('Update Error for status', testStatus, ':', err);
    } else {
      console.log('Update Success for status', testStatus);
    }
  }
}

checkAppStatus();
