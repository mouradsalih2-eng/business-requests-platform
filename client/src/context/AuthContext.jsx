import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { auth as authApi } from '../lib/api';

const AuthContext = createContext(null);

// Session timeout in milliseconds (60 minutes of inactivity)
const SESSION_TIMEOUT = 60 * 60 * 1000;
// Warning time before timeout (5 minutes)
const WARNING_TIME = 5 * 60 * 1000;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionWarning, setSessionWarning] = useState(false);

  const lastActivityRef = useRef(Date.now());
  const warningShownRef = useRef(false);
  const timeoutCheckRef = useRef(null);

  const navigate = useNavigate();

  // Update last activity timestamp
  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (warningShownRef.current) {
      warningShownRef.current = false;
      setSessionWarning(false);
    }
  }, []);

  // Check session timeout
  const checkTimeout = useCallback(() => {
    if (!user) return;

    const now = Date.now();
    const timeSinceActivity = now - lastActivityRef.current;
    const timeRemaining = SESSION_TIMEOUT - timeSinceActivity;

    if (timeRemaining <= 0) {
      if (timeoutCheckRef.current) {
        clearInterval(timeoutCheckRef.current);
        timeoutCheckRef.current = null;
      }
      supabase.auth.signOut();
      setUser(null);
      setSessionWarning(false);
      warningShownRef.current = false;
      navigate('/login', {
        state: { message: 'Your session has expired. Please sign in again.' }
      });
      return;
    }

    if (timeRemaining <= WARNING_TIME && !warningShownRef.current) {
      warningShownRef.current = true;
      setSessionWarning(true);
    }
  }, [user, navigate]);

  // Set up activity listeners
  useEffect(() => {
    if (!user) return;

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];

    let lastUpdate = 0;
    const throttledUpdate = () => {
      const now = Date.now();
      if (now - lastUpdate >= 1000) {
        lastUpdate = now;
        updateActivity();
      }
    };

    events.forEach((event) => {
      window.addEventListener(event, throttledUpdate, { passive: true });
    });

    timeoutCheckRef.current = setInterval(checkTimeout, 60 * 1000);
    updateActivity();

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, throttledUpdate);
      });
      if (timeoutCheckRef.current) {
        clearInterval(timeoutCheckRef.current);
        timeoutCheckRef.current = null;
      }
    };
  }, [user, updateActivity, checkTimeout]);

  // Initialize auth state from Supabase session
  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && mounted) {
          const userData = await authApi.me();
          setUser(userData);
          updateActivity();
          if (userData.must_change_password) {
            navigate('/change-password', { replace: true });
          }
        }
      } catch {
        // Session invalid or user not found in app — sign out
        await supabase.auth.signOut();
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initAuth();

    // Listen for auth state changes (token refresh, sign out, OAuth redirect, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT') {
        setUser(null);
        setSessionWarning(false);
        warningShownRef.current = false;
      } else if (event === 'SIGNED_IN' && session && !user) {
        // OAuth redirect or fresh sign-in — fetch app user data
        try {
          const userData = await authApi.me();
          if (mounted) {
            setUser(userData);
            updateActivity();
          }
        } catch {
          // User not provisioned yet or error — will be handled on next page load
        }
      } else if (event === 'TOKEN_REFRESHED' && session && !user) {
        // Token was refreshed but we lost the user state — refetch
        try {
          const userData = await authApi.me();
          setUser(userData);
        } catch {
          await supabase.auth.signOut();
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = async (email, password) => {
    const { user: userData } = await authApi.login(email, password);
    setUser(userData);
    updateActivity();
    warningShownRef.current = false;
    setSessionWarning(false);

    // Force password change redirect
    if (userData.must_change_password) {
      navigate('/change-password', { replace: true });
    }

    return userData;
  };

  const register = async (email, password, name) => {
    // Registration is handled via initiate/verify flow, then user signs in
    throw new Error('Use registration.initiate/verify flow');
  };

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSessionWarning(false);
    warningShownRef.current = false;
    if (timeoutCheckRef.current) {
      clearInterval(timeoutCheckRef.current);
      timeoutCheckRef.current = null;
    }
  }, []);

  const extendSession = useCallback(() => {
    updateActivity();
  }, [updateActivity]);

  const updateUser = useCallback((updates) => {
    setUser((prev) => prev ? { ...prev, ...updates } : null);
  }, []);

  const isSuperAdmin = user?.role === 'super_admin';
  const isAdmin = user?.role === 'admin' || isSuperAdmin;

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      register,
      logout,
      isAdmin,
      isSuperAdmin,
      updateUser,
      sessionWarning,
      extendSession,
    }}>
      {children}
      {/* Session Warning Toast */}
      {sessionWarning && (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="bg-yellow-50 dark:bg-yellow-900/50 border border-yellow-200 dark:border-yellow-800 rounded-lg shadow-lg p-4 max-w-sm">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Session expiring soon
                </p>
                <p className="mt-1 text-xs text-yellow-700 dark:text-yellow-300">
                  Your session will expire in less than 5 minutes due to inactivity.
                </p>
                <button
                  onClick={extendSession}
                  className="mt-2 text-xs font-medium text-yellow-800 dark:text-yellow-200 hover:underline"
                >
                  Click here or interact with the page to stay signed in
                </button>
              </div>
              <button
                onClick={() => setSessionWarning(false)}
                className="flex-shrink-0 text-yellow-500 hover:text-yellow-700 dark:hover:text-yellow-300"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
