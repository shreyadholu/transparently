const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jylrpbkgyawqjmwuyrdt.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5bHJwYmtneWF3cWptd3V5cmR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MjMzMzIsImV4cCI6MjA4ODI5OTMzMn0.qoGU-lg8jhfbShyLsM6nVPAnqISmH35KaZBFNkSngx8'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testReject() {
  const { data: apps } = await supabase.from('applications').select('id').limit(1);
  if (!apps || apps.length === 0) {
    console.log('No applications to test with');
    return;
  }
  const id = apps[0].id;
  console.log('Testing reject for application id:', id);

  const { error: appError } = await supabase.from("applications").update({ status: "rejected" }).eq("id", id);
  console.log('Update application status error:', appError);
  
  const { error: fbError } = await supabase.from("application_feedback").insert([{
    application_id: id,
    recruiter_notes: 'Test Rejection'
  }]);
  console.log('Insert feedback error:', fbError);
}

testReject();
