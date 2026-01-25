import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { users } from '../lib/api';
import ProfileSection from '../components/settings/ProfileSection';
import PasswordSection from '../components/settings/PasswordSection';
import ThemeSection from '../components/settings/ThemeSection';

export default function Settings() {
  const { user: authUser } = useAuth();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settings = await users.getSettings();
        setUser(settings);
      } catch (error) {
        console.error('Failed to fetch settings:', error);
        // Fallback to auth context user
        setUser(authUser);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [authUser]);

  const handleUserUpdate = (updatedUser) => {
    setUser((prev) => ({ ...prev, ...updatedUser }));
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-32 bg-neutral-200 dark:bg-neutral-700 rounded" />
          <div className="h-48 bg-neutral-200 dark:bg-neutral-700 rounded-xl" />
          <div className="h-48 bg-neutral-200 dark:bg-neutral-700 rounded-xl" />
          <div className="h-32 bg-neutral-200 dark:bg-neutral-700 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-6">
        Settings
      </h1>

      <div className="space-y-6">
        <ProfileSection user={user} onUpdate={handleUserUpdate} />
        <PasswordSection />
        <ThemeSection />
      </div>
    </div>
  );
}
