import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key'

// Hanya inisialisasi jika URL valid HTTP/HTTPS
const isUrlValid = supabaseUrl.startsWith('http://') || supabaseUrl.startsWith('https://')

export const supabase = createClient(
  isUrlValid ? supabaseUrl : 'https://dummy-project.supabase.co', 
  supabaseAnonKey
)
