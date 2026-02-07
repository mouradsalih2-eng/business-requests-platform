import { supabase } from '../db/supabase.js';
import { AppError } from '../errors/AppError.js';

const AVATAR_BUCKET = 'avatars';
const ATTACHMENT_BUCKET = 'attachments';

/**
 * Extract the storage path from a Supabase public URL.
 * URL format: https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
 */
function extractPathFromUrl(publicUrl, bucket) {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return publicUrl.slice(idx + marker.length);
}

export const storageService = {
  /**
   * Upload a user avatar. Returns the public URL.
   * Files are stored under: avatars/<userId>/<timestamp>-<originalName>
   */
  async uploadAvatar(userId, buffer, originalName, mimeType) {
    const ext = originalName.split('.').pop().toLowerCase();
    const storagePath = `${userId}/${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (error) {
      console.error('storageService.uploadAvatar:', error.message);
      throw new AppError('Failed to upload avatar', 500);
    }

    const { data: urlData } = supabase.storage
      .from(AVATAR_BUCKET)
      .getPublicUrl(storagePath);

    return urlData.publicUrl;
  },

  /**
   * Delete an avatar by its full public URL.
   */
  async deleteAvatar(publicUrl) {
    const storagePath = extractPathFromUrl(publicUrl, AVATAR_BUCKET);
    if (!storagePath) return; // nothing to delete

    const { error } = await supabase.storage
      .from(AVATAR_BUCKET)
      .remove([storagePath]);

    if (error) {
      console.error('storageService.deleteAvatar:', error.message);
      // Non-fatal — the DB record will still be cleared
    }
  },

  /**
   * Upload a request attachment. Returns { storagePath, publicUrl }.
   * Files are stored under: attachments/<timestamp>-<random>-<sanitizedName>
   */
  async uploadAttachment(buffer, originalName, mimeType) {
    const sanitized = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${sanitized}`;

    const { error } = await supabase.storage
      .from(ATTACHMENT_BUCKET)
      .upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (error) {
      console.error('storageService.uploadAttachment:', error.message);
      throw new AppError('Failed to upload attachment', 500);
    }

    const { data: urlData } = supabase.storage
      .from(ATTACHMENT_BUCKET)
      .getPublicUrl(storagePath);

    return {
      storagePath,
      publicUrl: urlData.publicUrl,
    };
  },

  /**
   * Delete multiple attachments by their storage paths or public URLs.
   */
  async deleteAttachments(filepaths) {
    if (!filepaths?.length) return;

    // Normalize: if full URLs, extract paths; otherwise assume paths
    const paths = filepaths.map((fp) => {
      const extracted = extractPathFromUrl(fp, ATTACHMENT_BUCKET);
      return extracted || fp;
    });

    const { error } = await supabase.storage
      .from(ATTACHMENT_BUCKET)
      .remove(paths);

    if (error) {
      console.error('storageService.deleteAttachments:', error.message);
    }
  },
};
