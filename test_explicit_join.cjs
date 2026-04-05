const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jylrpbkgyawqjmwuyrdt.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5bHJwYmtneWF3cWptd3V5cmR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MjMzMzIsImV4cCI6MjA4ODI5OTMzMn0.qoGU-lg8jhfbShyLsM6nVPAnqISmH35KaZBFNkSngx8'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testFetch() {
  const { data, error } = await supabase
    .from('applications')
    .select(`id, status, job_id, student_id, users!student_id(full_name, email)`)
    .limit(1);

  if (error) {
    console.log('Error Code:', error.code);
    console.log('Error Message:', error.message);
    console.log('Error Details:', error.details);
    console.log('Error Hint:', error.hint);
  } else {
    console.log('Success:', data);
  }
}

testFetch();
