import { useState } from 'react';
import { users } from '../../lib/api';

export default function NotificationSection({ user, onUpdate }) {
  const [saving, setSaving] = useState(false);

  const handleToggle = async (field, currentValue) => {
    setSaving(true);
    try {
      const updated = await users.updateSettings({ [field]: !currentValue });
      onUpdate(updated);
    } catch (err) {
      console.error('Failed to update preference:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white dark:bg-[#161B22] rounded-xl border border-neutral-200 dark:border-[#30363D] p-6">
      <h2 className="text-lg font-semibold text-neutral-900 dark:text-[#E6EDF3] mb-2">
        Watch Preferences
      </h2>
      <p className="text-sm text-neutral-500 dark:text-[#8B949E] mb-5">
        Automatically watch requests when you interact with them.
      </p>

      <div className="space-y-4">
        <label className="flex items-center justify-between cursor-pointer group">
          <div className="flex-1">
            <p className="text-sm font-medium text-neutral-900 dark:text-[#E6EDF3] group-hover:text-[#4F46E5] dark:group-hover:text-[#818CF8] transition-colors">
              Auto-watch on comment
            </p>
            <p className="text-xs text-neutral-500 dark:text-[#8B949E] mt-0.5">
              Watch a request when you leave a comment
            </p>
          </div>
          <button
            role="switch"
            aria-checked={user?.auto_watch_on_comment !== false}
            onClick={() => handleToggle('auto_watch_on_comment', user?.auto_watch_on_comment !== false)}
            disabled={saving}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              user?.auto_watch_on_comment !== false
                ? 'bg-[#4F46E5] dark:bg-[#6366F1]'
                : 'bg-neutral-300 dark:bg-neutral-600'
            } ${saving ? 'opacity-50' : ''}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                user?.auto_watch_on_comment !== false ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </label>

        <label className="flex items-center justify-between cursor-pointer group">
          <div className="flex-1">
            <p className="text-sm font-medium text-neutral-900 dark:text-[#E6EDF3] group-hover:text-[#4F46E5] dark:group-hover:text-[#818CF8] transition-colors">
              Auto-watch on vote
            </p>
            <p className="text-xs text-neutral-500 dark:text-[#8B949E] mt-0.5">
              Watch a request when you upvote or like it
            </p>
          </div>
          <button
            role="switch"
            aria-checked={!!user?.auto_watch_on_vote}
            onClick={() => handleToggle('auto_watch_on_vote', !!user?.auto_watch_on_vote)}
            disabled={saving}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              user?.auto_watch_on_vote
                ? 'bg-[#4F46E5] dark:bg-[#6366F1]'
                : 'bg-neutral-300 dark:bg-neutral-600'
            } ${saving ? 'opacity-50' : ''}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                user?.auto_watch_on_vote ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </label>
      </div>
    </div>
  );
}
