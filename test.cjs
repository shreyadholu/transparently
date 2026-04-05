const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jylrpbkgyawqjmwuyrdt.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5bHJwYmtneWF3cWptd3V5cmR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MjMzMzIsImV4cCI6MjA4ODI5OTMzMn0.qoGU-lg8jhfbShyLsM6nVPAnqISmH35KaZBFNkSngx8'

const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
  const { data: apps, error: e1 } = await supabase.from('applications').select('*').limit(1);
  console.log('applications: ', e1 || 'exists', apps);
  
  const { data: fb, error: e2 } = await supabase.from('application_feedback').select('*').limit(1);
  console.log('application_feedback: ', e2 || 'exists', fb);
}

test();
