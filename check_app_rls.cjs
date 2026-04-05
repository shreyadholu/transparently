const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jylrpbkgyawqjmwuyrdt.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5bHJwYmtneWF3cWptd3V5cmR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MjMzMzIsImV4cCI6MjA4ODI5OTMzMn0.qoGU-lg8jhfbShyLsM6nVPAnqISmH35KaZBFNkSngx8'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkAppRLS() {
  const { data: apps } = await supabase.from('applications').select('id').limit(1);
  if (!apps || apps.length === 0) {
    console.log('No applications found');
    return;
  }
  const id = apps[0].id;
  console.log('Testing update for app id:', id);
  const { data, error, status, statusText } = await supabase
    .from('applications')
    .update({ status: 'rejected' })
    .eq('id', id)
    .select();
  
  console.log('Update result:', { data, error, status, statusText });
}

checkAppRLS();
