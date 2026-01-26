import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth as authApi, refreshCsrfToken } from '../lib/api';

const AuthContext = createContext(null);

// Session timeout in milliseconds (60 minutes)
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

  // Get navigation for redirect
  const navigate = useNavigate();
  const location = useLocation();

  // Update last activity timestamp
  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    // Reset warning if user becomes active again
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

    // Session expired
    if (timeRemaining <= 0) {
      // Clear interval
      if (timeoutCheckRef.current) {
        clearInterval(timeoutCheckRef.current);
        timeoutCheckRef.current = null;
      }
      // Logout and redirect
      localStorage.removeItem('token');
      authApi.logout();
      setUser(null);
      setSessionWarning(false);
      warningShownRef.current = false;
      navigate('/login', {
        state: { message: 'Your session has expired. Please sign in again.' }
      });
      return;
    }

    // Show warning at 5 minutes remaining
    if (timeRemaining <= WARNING_TIME && !warningShownRef.current) {
      warningShownRef.current = true;
      setSessionWarning(true);
    }
  }, [user, navigate]);

  // Set up activity listeners
  useEffect(() => {
    if (!user) return;

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];

    // Throttle activity updates to once per second
    let lastUpdate = 0;
    const throttledUpdate = () => {
      const now = Date.now();
      if (now - lastUpdate >= 1000) {
        lastUpdate = now;
        updateActivity();
      }
    };

    // Add event listeners
    events.forEach((event) => {
      window.addEventListener(event, throttledUpdate, { passive: true });
    });

    // Set up timeout check interval (every minute)
    timeoutCheckRef.current = setInterval(checkTimeout, 60 * 1000);

    // Initial activity timestamp
    updateActivity();

    return () => {
      // Remove event listeners
      events.forEach((event) => {
        window.removeEventListener(event, throttledUpdate);
      });
      // Clear interval
      if (timeoutCheckRef.current) {
        clearInterval(timeoutCheckRef.current);
        timeoutCheckRef.current = null;
      }
    };
  }, [user, updateActivity, checkTimeout]);

  // Load user on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      authApi.me()
        .then((userData) => {
          setUser(userData);
          updateActivity();
        })
        .catch(() => {
          localStorage.removeItem('token');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [updateActivity]);

  const login = async (email, password) => {
    const { user: userData, token } = await authApi.login(email, password);
    localStorage.setItem('token', token);
    setUser(userData);
    updateActivity();
    warningShownRef.current = false;
    setSessionWarning(false);
    return userData;
  };

  const register = async (email, password, name) => {
    const { user: userData, token } = await authApi.register(email, password, name);
    localStorage.setItem('token', token);
    setUser(userData);
    updateActivity();
    return userData;
  };

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    authApi.logout();
    setUser(null);
    setSessionWarning(false);
    warningShownRef.current = false;
    if (timeoutCheckRef.current) {
      clearInterval(timeoutCheckRef.current);
      timeoutCheckRef.current = null;
    }
  }, []);

  // Extend session by updating activity
  const extendSession = useCallback(() => {
    updateActivity();
  }, [updateActivity]);

  // Update user data (e.g., after profile picture change)
  const updateUser = useCallback((updates) => {
    setUser((prev) => prev ? { ...prev, ...updates } : null);
  }, []);

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      register,
      logout,
      isAdmin,
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
