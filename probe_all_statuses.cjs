const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jylrpbkgyawqjmwuyrdt.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5bHJwYmtneWF3cWptd3V5cmR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MjMzMzIsImV4cCI6MjA4ODI5OTMzMn0.qoGU-lg8jhfbShyLsM6nVPAnqISmH35KaZBFNkSngx8'

const supabase = createClient(supabaseUrl, supabaseKey)

async function probeStatuses() {
  const statuses = ['pending', 'applied', 'under_review', 'under review', 'Shortlisted', 'shortlisted', 'Selected', 'selected', 'Rejected', 'rejected', 'Approved', 'approved', 'hired'];
  for (const s of statuses) {
    const { error: err } = await supabase.from('applications').insert([{ 
      job_id: '00000000-0000-0000-0000-000000000000', 
      student_id: '00000000-0000-0000-0000-000000000000', 
      status: s, 
      score: 0 
    }]);
    if (err && err.message.includes('check constraint')) {
      console.log(`- '${s}': FAILED`);
    } else {
      console.log(`- '${s}': PROBABLY VALID`);
    }
  }
}

probeStatuses();
