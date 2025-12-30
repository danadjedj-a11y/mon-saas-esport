import { createClient } from '@supabase/supabase-js'

// REMPLACE CES VALEURS PAR LES TIENNES !
// Tu les trouves sur Supabase dans : Settings (roue dentée bas gauche) > API
const supabaseUrl = 'https://tyjhbfvuhggtehmspayo.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5amhiZnZ1aGdndGVobXNwYXlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwMjc4MjAsImV4cCI6MjA4MjYwMzgyMH0.xNkDmaqaSeC-K1SwPnOOIfkXmS6-Jy512rmlwrMrNI4'

export const supabase = createClient(supabaseUrl, supabaseKey)