import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { featureFlags } from '../lib/api';
import { useProject } from './ProjectContext';

const FeatureFlagContext = createContext({
  flags: {},
  isEnabled: () => true,
  loading: true,
  refresh: () => {},
});

export function FeatureFlagProvider({ children }) {
  const [flags, setFlags] = useState({});
  const [loading, setLoading] = useState(true);
  const { currentProject } = useProject();

  const loadFlags = useCallback(async () => {
    try {
      const data = await featureFlags.getAll();
      const flagMap = {};
      data.forEach(f => {
        flagMap[f.name] = !!f.enabled;
      });
      setFlags(flagMap);
    } catch (err) {
      console.error('Failed to load feature flags:', err);
      // Default all flags to enabled on error
      setFlags({});
    } finally {
      setLoading(false);
    }
  }, []);

  // Re-fetch flags when project changes
  useEffect(() => {
    loadFlags();
  }, [loadFlags, currentProject?.id]);

  // Check if a specific feature is enabled
  // Defaults to true if flag doesn't exist (permissive default)
  const isEnabled = useCallback((name) => {
    return flags[name] ?? true;
  }, [flags]);

  // Refresh flags from server
  const refresh = useCallback(async () => {
    setLoading(true);
    await loadFlags();
  }, [loadFlags]);

  return (
    <FeatureFlagContext.Provider value={{ flags, isEnabled, loading, refresh }}>
      {children}
    </FeatureFlagContext.Provider>
  );
}

// Hook to access the full feature flags context
export function useFeatureFlags() {
  return useContext(FeatureFlagContext);
}

// Convenience hook to check a single feature flag
export function useFeatureFlag(name) {
  const { isEnabled } = useFeatureFlags();
  return isEnabled(name);
}
