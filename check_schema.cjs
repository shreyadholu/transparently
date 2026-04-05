const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jylrpbkgyawqjmwuyrdt.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5bHJwYmtneWF3cWptd3V5cmR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MjMzMzIsImV4cCI6MjA4ODI5OTMzMn0.qoGU-lg8jhfbShyLsM6nVPAnqISmH35KaZBFNkSngx8'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSchema() {
  const { data: cols, error } = await supabase.rpc('get_table_columns', { table_name: 'application_feedback' });
  if (error) {
    // If RPC doesn't exist, try a direct query to information_schema
    const { data: info, error: infoErr } = await supabase
      .from('application_feedback')
      .select('*')
      .limit(1);
    console.log('Sample data from application_feedback:', info);
  } else {
    console.log('Columns in application_feedback:', cols);
  }

  const { data: appCols, error: appErr } = await supabase
    .from('applications')
    .select('*')
    .limit(1);
  console.log('Sample data from applications:', appCols);
}

checkSchema();
