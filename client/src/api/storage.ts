import { createClient } from '@supabase/supabase-js';

// Publishable/anon key only — safe to expose in the browser bundle. Used
// solely to PUT file bytes to a signed URL the API already authorized;
// it grants no access beyond that one upload.
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || '',
  import.meta.env.VITE_SUPABASE_ANON_KEY || ''
);

export async function uploadToSignedUrl(bucket: string, path: string, token: string, file: File) {
  const { error } = await supabase.storage.from(bucket).uploadToSignedUrl(path, token, file);
  if (error) throw error;
}
