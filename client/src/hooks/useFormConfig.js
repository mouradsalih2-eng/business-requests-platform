import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useProject } from '../context/ProjectContext';
import { formConfig as formConfigApi } from '../lib/api';
import { queryKeys } from '../lib/queryClient';

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
  const queryClient = useQueryClient();
  const projectId = currentProject?.id;

  const { data, isLoading: loading } = useQuery({
    queryKey: queryKeys.formConfig.byProject(projectId),
    queryFn: () => formConfigApi.get(),
    enabled: !!projectId,
  });

  const config = data?.config ?? null;
  const customFields = data?.customFields ?? [];

  // Resolve option lists — use custom if defined, otherwise defaults
  const categories = config?.custom_categories?.length ? config.custom_categories : DEFAULTS.categories;
  const priorities = config?.custom_priorities?.length ? config.custom_priorities : DEFAULTS.priorities;
  const teams = config?.custom_teams?.length ? config.custom_teams : DEFAULTS.teams;
  const regions = config?.custom_regions?.length ? config.custom_regions : DEFAULTS.regions;

  // Field visibility
  const showField = useCallback((fieldName) => {
    if (!config) return true; // default: show all
    return config[`show_${fieldName}`] !== false;
  }, [config]);

  // Built-in field overrides (label, required) from config
  const fieldOverrides = config?.field_overrides || {};

  // Get the display label for a built-in field (uses override if set)
  const getFieldLabel = useCallback((fieldName, defaultLabel) => {
    return fieldOverrides[fieldName]?.label || defaultLabel;
  }, [fieldOverrides]);

  // Check if a built-in field is required (uses override if set)
  const isFieldRequired = useCallback((fieldName, defaultRequired) => {
    const override = fieldOverrides[fieldName];
    if (override?.required !== undefined) return override.required;
    return defaultRequired;
  }, [fieldOverrides]);

  // Card fields — which built-in fields show on request cards
  const cardFields = config?.card_fields || [];
  const fieldOrder = config?.field_order || [];

  const refresh = useCallback(() => {
    return queryClient.invalidateQueries({ queryKey: queryKeys.formConfig.byProject(projectId) });
  }, [queryClient, projectId]);

  return {
    config,
    customFields,
    loading,
    categories,
    priorities,
    teams,
    regions,
    showField,
    getFieldLabel,
    isFieldRequired,
    fieldOverrides,
    cardFields,
    fieldOrder,
    refresh,
  };
}
