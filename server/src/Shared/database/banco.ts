import { createClient } from "@supabase/supabase-js";
import {env} from "../../config/env.js";

const supabaseUrl = env.SUPABASE_URL;
const supabaseKey = env.SUPABASE_SECRET_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);