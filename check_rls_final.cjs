const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jylrpbkgyawqjmwuyrdt.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5bHJwYmtneWF3cWptd3V5cmR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MjMzMzIsImV4cCI6MjA4ODI5OTMzMn0.qoGU-lg8jhfbShyLsM6nVPAnqISmH35KaZBFNkSngx8'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkRLS() {
  const { data, error } = await supabase.rpc('get_table_rls_status', { table_name: 'applications' });
  if (error) {
    // Try another way to check RLS
    console.log('Trying direct query for RLS status...');
    const { data: d2, error: e2 } = await supabase.from('applications').select('*').limit(1);
    console.log('Select works:', !!d2);
    
    // Test update
    if (d2 && d2.length > 0) {
      const id = d2[0].id;
      const { error: updateErr } = await supabase.from('applications').update({ status: 'pending' }).eq('id', id);
      console.log('Update result:', updateErr ? updateErr.message : 'Success');
    }
    
    // Test feedback insert
    const { error: fbErr } = await supabase.from('application_feedback').insert([{ application_id: '00000000-0000-0000-0000-000000000000', recruiter_notes: 'test' }]);
    console.log('Feedback Insert result:', fbErr ? fbErr.message : 'Success');
  } else {
    console.log('RLS Status:', data);
  }
}

checkRLS();
