import { useState, useRef } from 'react';
import { Button } from '../ui/Button';
import Avatar from '../ui/Avatar';
import { users } from '../../lib/api';
import { useToast } from '../ui/Toast';

export default function ProfileSection({ user, onUpdate }) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const toast = useToast();

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please select a JPEG, PNG, or WebP image');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const updatedUser = await users.uploadProfilePicture(formData);
      onUpdate(updatedUser);
      toast.success('Profile picture updated');
    } catch (error) {
      toast.error(error.message || 'Failed to upload image');
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = async () => {
    if (!user.profile_picture) return;

    setUploading(true);
    try {
      await users.deleteProfilePicture();
      onUpdate({ ...user, profile_picture: null });
      toast.success('Profile picture removed');
    } catch (error) {
      toast.error(error.message || 'Failed to remove image');
    } finally {
      setUploading(false);
    }
  };

  const profilePictureUrl = user.profile_picture
    ? `${import.meta.env.VITE_API_URL || ''}${user.profile_picture}`
    : null;

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
      <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
        Profile Picture
      </h2>

      <div className="flex items-center gap-6">
        <Avatar
          src={profilePictureUrl}
          name={user.name}
          size="2xl"
          className="ring-4 ring-neutral-100 dark:ring-neutral-700"
        />

        <div className="space-y-3">
          <div className="flex gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? 'Uploading...' : 'Upload new'}
            </Button>
            {user.profile_picture && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                disabled={uploading}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                Remove
              </Button>
            )}
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            JPG, PNG or WebP. Max 5MB.
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      <div className="mt-6 pt-6 border-t border-neutral-200 dark:border-neutral-700">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-1.5">
              Name
            </label>
            <p className="text-neutral-900 dark:text-neutral-100">{user.name}</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-1.5">
              Email
            </label>
            <p className="text-neutral-900 dark:text-neutral-100">{user.email}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
