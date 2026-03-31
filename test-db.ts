import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  const { data: apps, error: e1 } = await supabase.from('applications').select('*').limit(1);
  console.log('applications: ', e1 || 'exists', apps);
  
  const { data: fb, error: e2 } = await supabase.from('application_feedback').select('*').limit(1);
  console.log('application_feedback: ', e2 || 'exists', fb);
}
checkTables();
