import { createClient } from '@supabase/supabase-js'
import { env } from '../../config/env.js'

const supabaseUrl = env.VITE_SUPABASE_URL
const supabaseKey = env.VITE_SUPABASE_PUBLISHABLE_KEY
const supabaseSecretKey = env.SUPABASE_SECRET_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)
export const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey)
