import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useProject } from '../../context/ProjectContext';
import { formConfig as formConfigApi } from '../../lib/api';
import { FieldList } from './FieldList';
import { FieldEditor } from './FieldEditor';
import { FormPreview } from './FormPreview';
import { CardPreview } from './CardPreview';
import { AddFieldModal } from './AddFieldModal';
import { useToast } from '../ui/Toast';

const MAX_CARD_FIELDS = 5;

// Only select-like fields make visual sense as card badges
export const CARD_ELIGIBLE_TYPES = ['select', 'multi_select'];
// Built-in select fields that are always eligible
export const CARD_ELIGIBLE_BUILTIN_KEYS = ['category', 'priority', 'team', 'region'];

export function isCardEligible(field) {
  // Built-in select fields
  if (!field.isCustom && CARD_ELIGIBLE_BUILTIN_KEYS.includes(field.key)) return true;
  // Title is always on card (locked)
  if (field.key === 'title' && field.locked) return true;
  // Custom select fields
  const type = field.type || field.field_type;
  if (field.isCustom && CARD_ELIGIBLE_TYPES.includes(type)) return true;
  return false;
}

const BUILTIN_FIELDS = [
  { key: 'title', label: 'Title', type: 'text', required: true, locked: true, showOnCard: true },
  { key: 'category', label: 'Category', type: 'select', required: true, configKey: 'show_category', showOnCard: true },
  { key: 'priority', label: 'Priority', type: 'select', required: true, configKey: 'show_priority', showOnCard: true },
  { key: 'team', label: 'Team', type: 'select', configKey: 'show_team', showOnCard: false },
  { key: 'region', label: 'Region', type: 'select', configKey: 'show_region', showOnCard: false },
  { key: 'business_problem', label: 'Business Problem', type: 'textarea', configKey: 'show_business_problem', showOnCard: false },
  { key: 'problem_size', label: 'Problem Size', type: 'textarea', configKey: 'show_problem_size', showOnCard: false },
  { key: 'business_expectations', label: 'Business Expectations', type: 'textarea', configKey: 'show_business_expectations', showOnCard: false },
  { key: 'expected_impact', label: 'Expected Impact', type: 'textarea', configKey: 'show_expected_impact', showOnCard: false },
];

export function FormBuilder({ initialConfig, initialCustomFields, onConfigChange }) {
  const { currentProject } = useProject();
  const toast = useToast();
  const [config, setConfig] = useState(null);
  const [customFields, setCustomFields] = useState([]);
  const [loading, setLoading] = useState(!initialConfig);
  const [editingField, setEditingField] = useState(null);
  const [editingFieldDraft, setEditingFieldDraft] = useState(null);
  const [showAddField, setShowAddField] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewTab, setPreviewTab] = useState('form');

  // Draft mode: track original state for dirty detection
  const originalConfig = useRef(null);
  const originalCustomFields = useRef([]);
  // Track new/modified/deleted custom fields for batch save
  const pendingNewFields = useRef([]);
  const pendingDeletedFieldIds = useRef(new Set());
  const pendingModifiedFieldIds = useRef(new Set());

  // Confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [impactCount, setImpactCount] = useState(null);

  const isOnboarding = initialConfig !== undefined;

  // Load config from API or use initial props
  useEffect(() => {
    if (isOnboarding) {
      setConfig(initialConfig || {});
      setCustomFields(initialCustomFields || []);
      setLoading(false);
    } else {
      loadConfig();
    }
  }, [currentProject?.id]);

  const loadConfig = async () => {
    try {
      const data = await formConfigApi.get();
      const cfg = data.config || {};
      const cfs = data.customFields || [];
      setConfig(cfg);
      setCustomFields(cfs);
      originalConfig.current = JSON.parse(JSON.stringify(cfg));
      originalCustomFields.current = JSON.parse(JSON.stringify(cfs));
      pendingNewFields.current = [];
      pendingDeletedFieldIds.current = new Set();
      pendingModifiedFieldIds.current = new Set();
    } catch (err) {
      console.error('Failed to load form config:', err);
      setConfig({});
      originalConfig.current = {};
      originalCustomFields.current = [];
    } finally {
      setLoading(false);
    }
  };

  // Dirty detection
  const isDirty = useMemo(() => {
    if (!config || !originalConfig.current) return false;
    if (isOnboarding) return false; // onboarding uses its own save flow
    return JSON.stringify(config) !== JSON.stringify(originalConfig.current)
      || JSON.stringify(customFields) !== JSON.stringify(originalCustomFields.current);
  }, [config, customFields, isOnboarding]);

  // Build unified field list (built-in + custom), overlaying live draft when editing
  const getFields = useCallback(() => {
    if (!config) return [];

    // If card_fields was never configured, derive defaults from BUILTIN_FIELDS
    const hasExplicitCardFields = Array.isArray(config.card_fields);
    const cardFieldKeys = hasExplicitCardFields
      ? config.card_fields
      : BUILTIN_FIELDS.filter((f) => f.showOnCard).map((f) => f.key);

    // Built-in field overrides (label, required) from config
    const overrides = config.field_overrides || {};
    // Map built-in select fields to their custom options config key
    const optionsMap = {
      category: config.custom_categories,
      priority: config.custom_priorities,
      team: config.custom_teams,
      region: config.custom_regions,
    };

    const builtIn = BUILTIN_FIELDS.map((f) => {
      const ov = overrides[f.key] || {};
      // Overlay live draft for the built-in field being edited
      const draft = editingFieldDraft && editingFieldDraft.key === f.key && !editingFieldDraft.isCustom ? editingFieldDraft : null;
      return {
        ...f,
        label: draft ? draft.label : (ov.label || f.label),
        required: draft ? draft.is_required : (ov.required !== undefined ? ov.required : f.required),
        options: draft ? draft.options : (optionsMap[f.key] || f.options || null),
        enabled: f.configKey ? config[f.configKey] !== false : true,
        showOnCard: f.locked ? true : cardFieldKeys.includes(f.key),
        isCustom: false,
      };
    });

    const sortedCustom = [...customFields].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    const custom = sortedCustom.map((f) => {
      // Overlay live draft for the field being edited
      const draft = editingFieldDraft && editingFieldDraft.id === f.id ? editingFieldDraft : null;
      return {
        ...f,
        ...(draft ? {
          label: draft.label,
          field_type: draft.field_type,
          is_required: draft.is_required,
          show_on_card: draft.show_on_card,
          icon: draft.icon,
          color: draft.color,
          options: draft.options,
          validation: draft.validation,
        } : {}),
        key: `custom_${f.id}`,
        type: draft ? draft.field_type : f.field_type,
        enabled: f.is_enabled !== false,
        required: draft ? draft.is_required : f.is_required,
        showOnCard: draft ? (draft.show_on_card || false) : (f.show_on_card || false),
        isCustom: true,
      };
    });

    const combined = [...builtIn, ...custom];

    // Apply saved field_order if it exists
    const fieldOrder = config.field_order;
    if (Array.isArray(fieldOrder) && fieldOrder.length > 0) {
      const orderMap = new Map(fieldOrder.map((key, i) => [key, i]));
      combined.sort((a, b) => {
        const aKey = a.key || `custom_${a.id}`;
        const bKey = b.key || `custom_${b.id}`;
        const aIdx = orderMap.has(aKey) ? orderMap.get(aKey) : Infinity;
        const bIdx = orderMap.has(bKey) ? orderMap.get(bKey) : Infinity;
        return aIdx - bIdx;
      });
    }

    return combined;
  }, [config, customFields, editingFieldDraft]);

  const fields = getFields();
  const cardFieldCount = fields.filter((f) => f.showOnCard && f.enabled !== false && isCardEligible(f)).length;
  const cardLimitReached = cardFieldCount >= MAX_CARD_FIELDS;

  const notifyChange = (newConfig, newCustomFields) => {
    onConfigChange?.({ config: newConfig, customFields: newCustomFields });
  };

  // Toggle field visibility (built-in or custom) — LOCAL ONLY
  const handleToggle = (field) => {
    if (field.locked) return;

    if (field.isCustom) {
      const newEnabled = !(field.is_enabled !== false);
      const updated = customFields.map((f) =>
        f.id === field.id ? { ...f, is_enabled: newEnabled } : f
      );
      setCustomFields(updated);
      notifyChange(config, updated);
      if (!isOnboarding) pendingModifiedFieldIds.current.add(field.id);
      return;
    }

    const key = field.configKey;
    if (!key) return;

    const newValue = !(config[key] !== false);

    // Warn when hiding category or priority
    if (!newValue && (key === 'show_category' || key === 'show_priority')) {
      toast.warning('Hiding this field will default new requests to "New Feature" (category) or "Medium" (priority). Existing requests are not affected.');
    }
    let newConfig = { ...config, [key]: newValue };

    // When re-enabling a field that has showOnCard, check if it would exceed the limit
    if (newValue && field.showOnCard && cardLimitReached) {
      const currentCardFields = newConfig.card_fields || [];
      newConfig = { ...newConfig, card_fields: currentCardFields.filter((k) => k !== field.key) };
    }

    setConfig(newConfig);
    notifyChange(newConfig, customFields);
  };

  // Toggle card visibility — LOCAL ONLY
  const handleToggleCardVisibility = (field) => {
    const isCurrentlyOnCard = field.isCustom
      ? (field.show_on_card || field.showOnCard)
      : field.showOnCard;
    if (!isCurrentlyOnCard && cardLimitReached) {
      toast.error('Card badge limit reached (5/5). Remove a badge to add another.');
      return;
    }

    if (field.isCustom) {
      const updated = customFields.map((f) =>
        f.id === field.id ? { ...f, show_on_card: !f.show_on_card } : f
      );
      setCustomFields(updated);
      notifyChange(config, updated);
      if (!isOnboarding) pendingModifiedFieldIds.current.add(field.id);
    } else {
      // When card_fields hasn't been set yet, initialize from BUILTIN defaults
      const currentCardFields = Array.isArray(config.card_fields)
        ? config.card_fields
        : BUILTIN_FIELDS.filter((f) => f.showOnCard).map((f) => f.key);
      const newCardFields = currentCardFields.includes(field.key)
        ? currentCardFields.filter((k) => k !== field.key)
        : [...currentCardFields, field.key];
      const newConfig = { ...config, card_fields: newCardFields };
      setConfig(newConfig);
      notifyChange(newConfig, customFields);
    }
  };

  // Edit field via slide-out panel
  const handleEdit = (field) => {
    setEditingField(field);
    setEditingFieldDraft(null);
  };

  // Live preview update while editing
  const handleLiveChange = (draft) => {
    setEditingFieldDraft(draft);
  };

  const handleSaveField = (updatedField) => {
    if (updatedField.isCustom) {
      const { isCustom, key, type, enabled, showOnCard, ...fieldData } = updatedField;
      const updated = customFields.map((f) =>
        f.id === updatedField.id ? { ...f, ...fieldData } : f
      );
      setCustomFields(updated);
      notifyChange(config, updated);
      if (!isOnboarding) pendingModifiedFieldIds.current.add(updatedField.id);
    } else {
      // Built-in field: store label/required overrides in field_overrides,
      // and options in the corresponding custom_XXX config key
      const currentOverrides = config.field_overrides || {};
      const builtinDef = BUILTIN_FIELDS.find((f) => f.key === updatedField.key);
      const override = {};
      if (updatedField.label !== builtinDef?.label) override.label = updatedField.label;
      if (updatedField.is_required !== builtinDef?.required) override.required = updatedField.is_required;

      const newOverrides = { ...currentOverrides };
      if (Object.keys(override).length > 0) {
        newOverrides[updatedField.key] = { ...(currentOverrides[updatedField.key] || {}), ...override };
      } else {
        delete newOverrides[updatedField.key];
      }

      let newConfig = { ...config, field_overrides: newOverrides };

      // Store options for built-in select fields in custom_XXX keys
      const optionsKeyMap = { category: 'custom_categories', priority: 'custom_priorities', team: 'custom_teams', region: 'custom_regions' };
      const optionsKey = optionsKeyMap[updatedField.key];
      if (optionsKey && updatedField.options) {
        newConfig[optionsKey] = updatedField.options;
      }

      setConfig(newConfig);
      notifyChange(newConfig, customFields);
    }
    setEditingField(null);
    setEditingFieldDraft(null);
  };

  // Add custom field — LOCAL ONLY (creates temp ID for new fields)
  const handleAddField = (fieldData) => {
    const { include_in_analytics, ...fieldPayload } = fieldData;
    const tempId = `temp_${Date.now()}`;
    const newField = { ...fieldPayload, id: tempId, isNew: true };
    setCustomFields((prev) => [...prev, newField]);
    notifyChange(config, [...customFields, newField]);

    if (!isOnboarding) {
      pendingNewFields.current.push({ ...fieldPayload, tempId, include_in_analytics });
    }

    // Auto-add to analytics_fields if requested (using temp key)
    if (include_in_analytics) {
      const fieldKey = `custom_${tempId}`;
      const current = config.analytics_fields || [];
      if (!current.includes(fieldKey)) {
        const newConfig = { ...config, analytics_fields: [...current, fieldKey] };
        setConfig(newConfig);
        notifyChange(newConfig, [...customFields, newField]);
      }
    }
  };

  // Delete (soft-delete) a custom field — LOCAL ONLY
  const handleDeleteField = (field) => {
    if (!field.isCustom) return;
    const updated = customFields.map((f) =>
      f.id === field.id ? { ...f, is_enabled: false } : f
    );
    setCustomFields(updated);
    notifyChange(config, updated);

    if (!isOnboarding) {
      // If it's a new field (temp), just remove from pending
      if (String(field.id).startsWith('temp_')) {
        pendingNewFields.current = pendingNewFields.current.filter((f) => f.tempId !== field.id);
      } else {
        pendingDeletedFieldIds.current.add(field.id);
      }
    }
  };

  // Toggle analytics inclusion — LOCAL ONLY
  const handleToggleAnalytics = (field) => {
    const fieldKey = field.key || `custom_${field.id}`;
    const current = config.analytics_fields || [];
    const newAnalyticsFields = current.includes(fieldKey)
      ? current.filter((k) => k !== fieldKey)
      : [...current, fieldKey];
    const newConfig = { ...config, analytics_fields: newAnalyticsFields };
    setConfig(newConfig);
    notifyChange(newConfig, customFields);
  };

  // Toast callbacks for FieldCard error states
  const handleCardLimitReached = useCallback(() => {
    toast.error('Card badge limit reached (5/5). Remove a badge to add another.');
  }, [toast]);

  const handleCardIneligible = useCallback(() => {
    toast.error('Only select/dropdown fields can be shown as card badges.');
  }, [toast]);

  // Reorder fields — LOCAL ONLY
  const handleReorder = (reordered) => {
    const newCustom = reordered.filter((f) => f.isCustom);

    // Update field_order in config
    const fieldOrder = reordered.map((f) => f.key || `custom_${f.id}`);
    const newConfig = { ...config, field_order: fieldOrder };
    setConfig(newConfig);

    // Update custom field sort orders
    const updatedCustom = newCustom.map((f, i) => ({ ...f, sort_order: i }));
    const resolvedCustom = customFields.map((cf) => {
      const match = updatedCustom.find((u) => u.id === cf.id);
      return match ? { ...cf, sort_order: match.sort_order } : cf;
    });
    setCustomFields(resolvedCustom);
    notifyChange(newConfig, resolvedCustom);
  };

  // ── Draft Mode: Save / Discard ───────────────────────────

  const handleSaveClick = async () => {
    try {
      const { requestCount } = await formConfigApi.getImpact();
      setImpactCount(requestCount);
    } catch {
      setImpactCount(0);
    }
    setShowConfirmModal(true);
  };

  const handleConfirmSave = async () => {
    setSaving(true);
    setShowConfirmModal(false);

    try {
      // 1. Save config changes (diff)
      const configDiff = {};
      const orig = originalConfig.current || {};
      for (const key of Object.keys(config)) {
        if (JSON.stringify(config[key]) !== JSON.stringify(orig[key])) {
          configDiff[key] = config[key];
        }
      }

      if (Object.keys(configDiff).length > 0) {
        await formConfigApi.update(configDiff);
      }

      // 2. Create new custom fields
      const tempIdToRealId = {};
      for (const pending of pendingNewFields.current) {
        const { tempId, include_in_analytics, ...fieldPayload } = pending;
        try {
          const created = await formConfigApi.createField(fieldPayload);
          tempIdToRealId[tempId] = created.id;

          // Handle analytics_fields with real IDs
          if (include_in_analytics && created.id) {
            const tempKey = `custom_${tempId}`;
            const realKey = `custom_${created.id}`;
            const current = config.analytics_fields || [];
            const updated = current.map((k) => k === tempKey ? realKey : k);
            if (!updated.includes(realKey)) updated.push(realKey);
            await formConfigApi.update({ analytics_fields: updated });
          }
        } catch (err) {
          console.error('Failed to create field:', err);
        }
      }

      // 3. Delete removed custom fields
      for (const fieldId of pendingDeletedFieldIds.current) {
        try {
          await formConfigApi.deleteField(fieldId);
        } catch (err) {
          console.error('Failed to delete field:', err);
        }
      }

      // 4. Update modified custom fields
      for (const fieldId of pendingModifiedFieldIds.current) {
        if (pendingDeletedFieldIds.current.has(fieldId)) continue;
        if (String(fieldId).startsWith('temp_')) continue;
        const field = customFields.find((f) => f.id === fieldId);
        if (!field) continue;
        const { id, project_id, created_at, updated_at, isNew, ...updateData } = field;
        try {
          await formConfigApi.updateField(fieldId, updateData);
        } catch (err) {
          console.error('Failed to update field:', err);
        }
      }

      // 5. Reorder custom fields if order changed
      const fieldOrder = config.field_order;
      if (Array.isArray(fieldOrder) && fieldOrder.length > 0) {
        const customIds = customFields
          .filter((f) => f.is_enabled !== false && !String(f.id).startsWith('temp_'))
          .sort((a, b) => {
            const aKey = `custom_${a.id}`;
            const bKey = `custom_${b.id}`;
            const aIdx = fieldOrder.indexOf(aKey);
            const bIdx = fieldOrder.indexOf(bKey);
            return (aIdx === -1 ? Infinity : aIdx) - (bIdx === -1 ? Infinity : bIdx);
          })
          .map((f) => f.id);
        if (customIds.length > 0) {
          await formConfigApi.reorderFields(customIds);
        }
      }

      toast.success('Form configuration saved successfully.');

      // Reload fresh state from server
      await loadConfig();
    } catch (err) {
      console.error('Failed to save form config:', err);
      toast.error('Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setConfig(JSON.parse(JSON.stringify(originalConfig.current)));
    setCustomFields(JSON.parse(JSON.stringify(originalCustomFields.current)));
    pendingNewFields.current = [];
    pendingDeletedFieldIds.current = new Set();
    pendingModifiedFieldIds.current = new Set();
    notifyChange(originalConfig.current, originalCustomFields.current);
    toast.info('Changes discarded.');
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-12 bg-neutral-200 dark:bg-[#21262D] rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
      {/* Left: Field configuration (3 cols) */}
      <div className="lg:col-span-3 space-y-4">
        <div className="bg-white dark:bg-[#0D1117] border border-neutral-200 dark:border-[#30363D]/60 rounded-xl p-4 sm:p-5 relative">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-[#E6EDF3]">Form Fields</h3>
          </div>
          <p className="text-xs text-neutral-500 dark:text-[#6E7681] mb-3">
            <span className="hidden sm:inline">Configure field visibility, card badges, and analytics breakdowns. Drag to reorder.</span>
            <span className="sm:hidden">Toggle fields on/off and set card badge visibility.</span>
          </p>

          {/* Legend */}
          <div className="flex items-center gap-3 sm:gap-5 mb-3 px-2 sm:px-3 py-2 bg-neutral-50 dark:bg-[#161B22] rounded-lg text-[10px] text-neutral-500 dark:text-[#6E7681] uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <span className="w-6 h-3 rounded-full bg-[#4F46E5] dark:bg-[#6366F1] inline-block" />
              On form
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-3 h-3 text-[#4F46E5] dark:text-[#818CF8]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
              </svg>
              On card
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-3 h-3 text-[#4F46E5] dark:text-[#818CF8]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="hidden sm:inline">Analytics</span>
            </span>
          </div>

          <FieldList
            fields={fields}
            onToggle={handleToggle}
            onToggleCardVisibility={handleToggleCardVisibility}
            onEdit={handleEdit}
            onReorder={handleReorder}
            cardLimitReached={cardLimitReached}
            analyticsFields={config?.analytics_fields || []}
            onToggleAnalytics={handleToggleAnalytics}
            onCardLimitReachedClick={handleCardLimitReached}
            onCardIneligibleClick={handleCardIneligible}
          />

          {/* Add custom field button */}
          <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-[#30363D]/40">
            <button
              onClick={() => setShowAddField(true)}
              className="w-full py-2.5 rounded-lg border border-dashed border-neutral-200 dark:border-[#30363D]/60 text-neutral-400 dark:text-[#484F58] text-xs hover:border-[#6366F1]/40 hover:text-[#818CF8] transition-colors flex items-center justify-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add custom field
            </button>
          </div>

          {/* Draft mode: Save / Discard bar */}
          {isDirty && (
            <div className="sticky bottom-0 -mx-4 sm:-mx-5 -mb-4 sm:-mb-5 mt-4 px-4 sm:px-5 py-3 bg-white dark:bg-[#0D1117] border-t border-neutral-200 dark:border-[#30363D] rounded-b-xl flex items-center justify-between gap-3">
              <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                Unsaved changes
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDiscard}
                  disabled={saving}
                  className="px-3 py-1.5 text-xs font-medium text-neutral-600 dark:text-[#8B949E] hover:text-neutral-900 dark:hover:text-[#E6EDF3] hover:bg-neutral-100 dark:hover:bg-[#21262D] rounded-lg transition-colors disabled:opacity-50"
                >
                  Discard
                </button>
                <button
                  onClick={handleSaveClick}
                  disabled={saving}
                  className="px-4 py-1.5 text-xs font-medium text-white bg-[#4F46E5] dark:bg-[#6366F1] hover:bg-[#4338CA] dark:hover:bg-[#4F46E5] rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {saving ? (
                    <>
                      <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Saving...
                    </>
                  ) : 'Save Changes'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right: Preview panel (2 cols) */}
      <div className="lg:col-span-2">
        <div className="lg:sticky lg:top-20 space-y-4">
          {/* Preview tab switcher */}
          <div className="flex gap-1 p-1 bg-white dark:bg-[#0D1117] rounded-xl border border-neutral-200 dark:border-[#30363D]/40">
            <button
              onClick={() => setPreviewTab('form')}
              className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${
                previewTab === 'form'
                  ? 'bg-neutral-100 dark:bg-[#21262D] text-neutral-900 dark:text-[#E6EDF3]'
                  : 'text-neutral-500 dark:text-[#6E7681] hover:text-neutral-700 dark:hover:text-[#8B949E]'
              }`}
            >
              Request Form
            </button>
            <button
              onClick={() => setPreviewTab('card')}
              className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${
                previewTab === 'card'
                  ? 'bg-neutral-100 dark:bg-[#21262D] text-neutral-900 dark:text-[#E6EDF3]'
                  : 'text-neutral-500 dark:text-[#6E7681] hover:text-neutral-700 dark:hover:text-[#8B949E]'
              }`}
            >
              Request Card
            </button>
          </div>

          {/* Preview content */}
          {previewTab === 'form' ? (
            <FormPreview fields={fields} />
          ) : (
            <CardPreview fields={fields} maxCardFields={MAX_CARD_FIELDS} />
          )}
        </div>
      </div>

      {/* Field editor slide-out */}
      <FieldEditor
        field={editingField}
        isOpen={!!editingField}
        onClose={() => { setEditingField(null); setEditingFieldDraft(null); }}
        onSave={handleSaveField}
        onDelete={handleDeleteField}
        onLiveChange={handleLiveChange}
        cardLimitReached={cardLimitReached}
      />

      {/* Add field modal */}
      <AddFieldModal
        isOpen={showAddField}
        onClose={() => setShowAddField(false)}
        onAdd={handleAddField}
        existingCount={customFields.length}
        cardLimitReached={cardLimitReached}
      />

      {/* Confirmation modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 dark:bg-black/70" onClick={() => setShowConfirmModal(false)} />
          <div className="relative bg-white dark:bg-[#161B22] rounded-xl border border-neutral-200 dark:border-[#30363D] shadow-xl max-w-sm w-full p-5">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-[#E6EDF3] mb-2">
              Save Form Configuration?
            </h3>
            <p className="text-xs text-neutral-600 dark:text-[#8B949E] mb-4">
              {impactCount !== null && impactCount > 0
                ? `This will affect how new requests are created. There are currently ${impactCount} request${impactCount !== 1 ? 's' : ''} in this project.`
                : 'This will update the form configuration for this project.'}
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-3 py-1.5 text-xs font-medium text-neutral-600 dark:text-[#8B949E] hover:bg-neutral-100 dark:hover:bg-[#21262D] rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSave}
                className="px-4 py-1.5 text-xs font-medium text-white bg-[#4F46E5] dark:bg-[#6366F1] hover:bg-[#4338CA] dark:hover:bg-[#4F46E5] rounded-lg transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
