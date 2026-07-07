import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
);

export async function uploadToBucket(
  bucket: string,
  fileName: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const { error } = await supabase.storage.from(bucket).upload(fileName, buffer, {
    contentType,
    upsert: true,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
  return data.publicUrl;
}

// Lets the browser upload large files straight to Supabase Storage instead of
// through the API, since Vercel serverless functions cap request bodies at
// 4.5MB well below the app's 20MB document upload limit.
export async function createSignedUploadUrl(
  bucket: string,
  fileName: string
): Promise<{ signedUrl: string; token: string; publicUrl: string }> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(fileName);
  if (error) throw error;

  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(fileName);
  return { signedUrl: data.signedUrl, token: data.token, publicUrl: pub.publicUrl };
}
