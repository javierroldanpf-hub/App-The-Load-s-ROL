import { createClient as _createClient } from "@supabase/supabase-js";

let _instance = null;

export function createClient() {
  if (_instance) return _instance;
  _instance = _createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  return _instance;
}
