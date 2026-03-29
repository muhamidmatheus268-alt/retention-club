import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://yylvcwlzdqveffqdnjld.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_riKOVzmFXpP0se04unTMnQ_7OxCsJut'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
