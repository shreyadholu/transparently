import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkResumeUrl() {
  const { data: profiles, error } = await supabase.from('student_profiles').select('user_id, resume_url').not('resume_url', 'is', null).limit(3);
  console.log('Profiles with resume_url:', profiles);
  console.log('Error:', error);
  
  const { data: apps } = await supabase.from('applications').select('student_id').limit(3);
  console.log('Apps:', apps);
}

checkResumeUrl();
