import { useState, useEffect, useCallback } from 'react';
import { useProject } from '../context/ProjectContext';
import { formConfig as formConfigApi } from '../lib/api';

// Default categories/priorities/teams/regions
const DEFAULTS = {
  categories: [
    { value: 'bug', label: 'Bug' },
    { value: 'new_feature', label: 'New Feature' },
    { value: 'optimization', label: 'Optimization' },
  ],
  priorities: [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
  ],
  teams: [
    { value: 'Manufacturing', label: 'Manufacturing' },
    { value: 'Sales', label: 'Sales' },
    { value: 'Service', label: 'Service' },
    { value: 'Energy', label: 'Energy' },
  ],
  regions: [
    { value: 'EMEA', label: 'EMEA' },
    { value: 'North America', label: 'North America' },
    { value: 'APAC', label: 'APAC' },
    { value: 'Global', label: 'Global' },
  ],
};

export function useFormConfig() {
  const { currentProject } = useProject();
  const [config, setConfig] = useState(null);
  const [customFields, setCustomFields] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadConfig = useCallback(async () => {
    if (!currentProject) {
      setLoading(false);
      return;
    }

    try {
      const data = await formConfigApi.get();
      setConfig(data.config);
      setCustomFields(data.customFields || []);
    } catch (err) {
      console.error('Failed to load form config:', err);
      setConfig(null);
      setCustomFields([]);
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id]);

  useEffect(() => {
    setLoading(true);
    loadConfig();
  }, [loadConfig]);

  // Resolve option lists — use custom if defined, otherwise defaults
  const categories = config?.custom_categories?.length ? config.custom_categories : DEFAULTS.categories;
  const priorities = config?.custom_priorities?.length ? config.custom_priorities : DEFAULTS.priorities;
  const teams = config?.custom_teams?.length ? config.custom_teams : DEFAULTS.teams;
  const regions = config?.custom_regions?.length ? config.custom_regions : DEFAULTS.regions;

  // Field visibility
  const showField = (fieldName) => {
    if (!config) return true; // default: show all
    return config[`show_${fieldName}`] !== false;
  };

  return {
    config,
    customFields,
    loading,
    categories,
    priorities,
    teams,
    regions,
    showField,
    refresh: loadConfig,
  };
}
