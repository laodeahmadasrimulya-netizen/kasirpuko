import { createClient } from '@supabase/supabase-js';

// Gunakan environment variable jika tersedia (Vercel/Local), atau fallback ke kredensial Supabase PUKO
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://upfxaaejxufwxqgldigz.supabase.co';

const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_jWsXdU1oFn399beE3t80Jw_R8ds6mEt';

export const supabase = createClient(supabaseUrl, supabasePublishableKey);