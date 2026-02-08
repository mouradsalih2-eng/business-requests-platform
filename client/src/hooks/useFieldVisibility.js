import { useCallback } from 'react';
import { useFormConfig } from './useFormConfig';

const BUILTIN_MAP = {
  team: 'show_team',
  region: 'show_region',
  business_problem: 'show_business_problem',
  problem_size: 'show_problem_size',
  business_expectations: 'show_business_expectations',
  expected_impact: 'show_expected_impact',
};

export function useFieldVisibility() {
  const { config, customFields, loading } = useFormConfig();

  const isFieldVisible = useCallback((fieldKey) => {
    if (!config) return true; // default: show all

    if (BUILTIN_MAP[fieldKey]) {
      return config[BUILTIN_MAP[fieldKey]] !== false;
    }

    if (fieldKey.startsWith('custom_')) {
      const fieldId = parseInt(fieldKey.replace('custom_', ''), 10);
      const cf = customFields.find(f => f.id === fieldId);
      return cf ? cf.is_enabled !== false : false;
    }

    return true; // title, category, priority always visible
  }, [config, customFields]);

  return { isFieldVisible, loading };
}
