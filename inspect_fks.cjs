const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jylrpbkgyawqjmwuyrdt.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5bHJwYmtneWF3cWptd3V5cmR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MjMzMzIsImV4cCI6MjA4ODI5OTMzMn0.qoGU-lg8jhfbShyLsM6nVPAnqISmH35KaZBFNkSngx8'

const supabase = createClient(supabaseUrl, supabaseKey)

async function inspectForeignKeys() {
  const { data, error } = await supabase.rpc('get_table_foreign_keys', { t_name: 'applications' });
  if (error) {
    console.log('RPC failed. Trying to list all tables and their columns might help.');
    // Try to get sample data again but with specific hints
    const { data: d1, error: e1 } = await supabase.from('applications').select('id, student_id, recruiter_id').limit(1);
    console.log('Columns: ', d1 ? Object.keys(d1[0]) : e1);
  } else {
    console.log('Foreign Keys for applications:', data);
  }
}

inspectForeignKeys();
