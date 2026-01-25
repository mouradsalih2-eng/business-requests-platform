import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { useAuth } from '../context/AuthContext';
import { users } from '../lib/api';
import ProfileSection from '../components/settings/ProfileSection';
import PasswordSection from '../components/settings/PasswordSection';
import ThemeSection from '../components/settings/ThemeSection';

export default function Settings() {
  const navigate = useNavigate();
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
      <Layout>
        <div className="max-w-2xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-32 bg-neutral-200 dark:bg-neutral-700 rounded" />
            <div className="h-48 bg-neutral-200 dark:bg-neutral-700 rounded-xl" />
            <div className="h-48 bg-neutral-200 dark:bg-neutral-700 rounded-xl" />
            <div className="h-32 bg-neutral-200 dark:bg-neutral-700 rounded-xl" />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        {/* Header with back button */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
            aria-label="Go back"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </button>
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
            Settings
          </h1>
        </div>

        <div className="space-y-6">
          <ProfileSection user={user} onUpdate={handleUserUpdate} />
          <PasswordSection />
          <ThemeSection />
        </div>
      </div>
    </Layout>
  );
}
