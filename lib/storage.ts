import { supabase } from './supabase';

/**
 * Upload a locally-picked image (file:// URI from expo-image-picker) to a Supabase
 * Storage bucket and return its public URL. The path is always
 * `<userId>/photo_<ts>.<ext>` so the per-bucket RLS policies (which scope writes
 * to the user's own folder) accept the upload.
 *
 * Returns null on failure; caller can fall back to keeping the existing pic.
 */
async function uploadToBucket(bucket: string, localUri: string, userId: string): Promise<string | null> {
  if (!userId) return null;
  const dotIdx = localUri.lastIndexOf('.');
  const ext = (dotIdx >= 0 ? localUri.slice(dotIdx + 1) : 'jpg').toLowerCase();
  const contentType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  const path = `${userId}/photo_${Date.now()}.${ext}`;

  try {
    const res = await fetch(localUri);
    const bytes = await res.arrayBuffer();
    const { error } = await supabase.storage.from(bucket).upload(path, bytes, {
      contentType,
      upsert: false,
    });
    if (error) {
      // eslint-disable-next-line no-console
      console.warn(`[upload:${bucket}] upload error:`, error.message);
      return null;
    }
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl ?? null;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn(`[upload:${bucket}] exception:`, e);
    return null;
  }
}

export function uploadProviderPhoto(localUri: string, userId: string): Promise<string | null> {
  return uploadToBucket('provider-photos', localUri, userId);
}

export function uploadReviewPhoto(localUri: string, userId: string): Promise<string | null> {
  return uploadToBucket('review-photos', localUri, userId);
}

export function uploadPetPhoto(localUri: string, userId: string): Promise<string | null> {
  return uploadToBucket('pet-photos', localUri, userId);
}

export function uploadIdPhoto(localUri: string, userId: string, side: 'front' | 'back'): Promise<string | null> {
  if (!userId) return Promise.resolve(null);
  const dotIdx = localUri.lastIndexOf('.');
  const ext = (dotIdx >= 0 ? localUri.slice(dotIdx + 1) : 'jpg').toLowerCase();
  const contentType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  const path = `${userId}/${side}_${Date.now()}.${ext}`;

  return (async () => {
    try {
      const res = await fetch(localUri);
      const bytes = await res.arrayBuffer();
      const { error } = await supabase.storage.from('id-documents').upload(path, bytes, {
        contentType, upsert: true,
      });
      if (error) { console.warn('[upload:id-documents]', error.message); return null; }
      const { data } = supabase.storage.from('id-documents').getPublicUrl(path);
      return data.publicUrl ?? null;
    } catch (e) {
      console.warn('[upload:id-documents] exception:', e);
      return null;
    }
  })();
}
