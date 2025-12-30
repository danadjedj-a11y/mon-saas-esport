import { createClient } from '@supabase/supabase-js'

// On utilise les "variables magiques" (Environment Variables)
// Cela permet de sécuriser ton site et de le faire marcher sur Vercel
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)