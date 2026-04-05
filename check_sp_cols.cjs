const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jylrpbkgyawqjmwuyrdt.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5bHJwYmtneWF3cWptd3V5cmR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MjMzMzIsImV4cCI6MjA4ODI5OTMzMn0.qoGU-lg8jhfbShyLsM6nVPAnqISmH35KaZBFNkSngx8'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkStudentProfilesCols() {
  const { data, error } = await supabase.from('student_profiles').select('*').limit(1);
  if (error) {
    console.error('Error fetching student_profiles: ', error);
  } else {
    console.log('student_profiles columns: ', data && data.length > 0 ? Object.keys(data[0]) : 'no data');
  }
}

checkStudentProfilesCols();
