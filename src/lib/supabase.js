import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://jylrpbkgyawqjmwuyrdt.supabase.co'
const supabaseKey = 'sb_publishable_SE_ziWnEY0vRc9RisSSpeg_a1qcJB6I'

export const supabase = createClient(supabaseUrl, supabaseKey)