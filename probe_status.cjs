const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jylrpbkgyawqjmwuyrdt.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5bHJwYmtneWF3cWptd3V5cmR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MjMzMzIsImV4cCI6MjA4ODI5OTMzMn0.qoGU-lg8jhfbShyLsM6nVPAnqISmH35KaZBFNkSngx8'

const supabase = createClient(supabaseUrl, supabaseKey)

async function inspectConstraints() {
  // Query information_schema for check constraints
  const { data, error } = await supabase.rpc('get_table_constraints', { t_name: 'applications' });
  if (error) {
    console.log('RPC failed, trying generic SQL check...');
    // Since I can't run arbitrary SQL easily, I'll try to insert different statuses to find what works
    const statuses = ['pending', 'Applied', 'applied', 'under_review', 'under review', 'open'];
    for (const s of statuses) {
      const { error: err } = await supabase.from('applications').insert([{ job_id: '00000000-0000-0000-0000-000000000000', student_id: '00000000-0000-0000-0000-000000000000', status: s, score: 0 }]);
      if (err && err.message.includes('check constraint')) {
        console.log(`Status '${s}': FAILED (${err.message})`);
      } else if (err && err.message.includes('foreign key')) {
        console.log(`Status '${s}': PROBABLY VALID (Foreign key error means it passed check constraint)`);
      } else {
        console.log(`Status '${s}': SUCCESS or unknown error (${err ? err.message : 'No error'})`);
      }
    }
  } else {
    console.log('Constraints:', data);
  }
}

inspectConstraints();
