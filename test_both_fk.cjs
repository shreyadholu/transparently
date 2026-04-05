const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jylrpbkgyawqjmwuyrdt.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5bHJwYmtneWF3cWptd3V5cmR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MjMzMzIsImV4cCI6MjA4ODI5OTMzMn0.qoGU-lg8jhfbShyLsM6nVPAnqISmH35KaZBFNkSngx8'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testFetchBoth() {
  const { data, error } = await supabase
    .from('applications')
    .select(`id, users!fk_student(full_name, email), jobs!fk_app_job(title, company)`)
    .limit(1);

  if (error) {
    console.log('Error:', error.message);
  } else {
    console.log('Success:', data);
  }
}

testFetchBoth();
