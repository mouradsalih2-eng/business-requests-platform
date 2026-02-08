import { useState, useEffect, useCallback } from 'react';
import { useProject } from '../../context/ProjectContext';
import { formConfig as formConfigApi } from '../../lib/api';
import { FieldList } from './FieldList';
import { FieldEditor } from './FieldEditor';
import { FormPreview } from './FormPreview';
import { CardPreview } from './CardPreview';
import { AddFieldModal } from './AddFieldModal';

const MAX_CARD_FIELDS = 5;

const BUILTIN_FIELDS = [
  { key: 'title', label: 'Title', type: 'text', required: true, locked: true, showOnCard: true },
  { key: 'category', label: 'Category', type: 'select', required: true, configKey: null, showOnCard: true },
  { key: 'priority', label: 'Priority', type: 'select', required: true, configKey: null, showOnCard: true },
  { key: 'team', label: 'Team', type: 'select', configKey: 'show_team', showOnCard: false },
  { key: 'region', label: 'Region', type: 'select', configKey: 'show_region', showOnCard: false },
  { key: 'business_problem', label: 'Business Problem', type: 'textarea', configKey: 'show_business_problem', showOnCard: false },
  { key: 'problem_size', label: 'Problem Size', type: 'textarea', configKey: 'show_problem_size', showOnCard: false },
  { key: 'business_expectations', label: 'Business Expectations', type: 'textarea', configKey: 'show_business_expectations', showOnCard: false },
  { key: 'expected_impact', label: 'Expected Impact', type: 'textarea', configKey: 'show_expected_impact', showOnCard: false },
];

export function FormBuilder({ initialConfig, initialCustomFields, onConfigChange }) {
  const { currentProject } = useProject();
  const [config, setConfig] = useState(null);
  const [customFields, setCustomFields] = useState([]);
  const [loading, setLoading] = useState(!initialConfig);
  const [editingField, setEditingField] = useState(null);
  const [editingFieldDraft, setEditingFieldDraft] = useState(null);
  const [showAddField, setShowAddField] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewTab, setPreviewTab] = useState('form');

  // Load config from API or use initial props
  useEffect(() => {
    if (initialConfig !== undefined) {
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
      setConfig(data.config || {});
      setCustomFields(data.customFields || []);
    } catch (err) {
      console.error('Failed to load form config:', err);
      setConfig({});
    } finally {
      setLoading(false);
    }
  };

  // Build unified field list (built-in + custom), overlaying live draft when editing
  const getFields = useCallback(() => {
    if (!config) return [];

    const cardFieldKeys = config.card_fields || [];

    const builtIn = BUILTIN_FIELDS.map((f) => ({
      ...f,
      enabled: f.configKey ? config[f.configKey] !== false : true,
      showOnCard: f.locked ? true : cardFieldKeys.includes(f.key) || f.showOnCard,
      isCustom: false,
    }));

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
  const cardFieldCount = fields.filter((f) => f.showOnCard && f.enabled !== false).length;
  const cardLimitReached = cardFieldCount >= MAX_CARD_FIELDS;

  const notifyChange = (newConfig, newCustomFields) => {
    onConfigChange?.({ config: newConfig, customFields: newCustomFields });
  };

  // Toggle field visibility (built-in or custom)
  const handleToggle = async (field) => {
    if (field.locked) return;

    if (field.isCustom) {
      // Toggle is_enabled for custom field
      const newEnabled = !(field.is_enabled !== false);
      const updated = customFields.map((f) =>
        f.id === field.id ? { ...f, is_enabled: newEnabled } : f
      );
      setCustomFields(updated);
      notifyChange(config, updated);

      if (!initialConfig) {
        try {
          await formConfigApi.updateField(field.id, { is_enabled: newEnabled });
        } catch (err) {
          console.error('Failed to toggle custom field:', err);
        }
      }
      return;
    }

    const key = field.configKey;
    if (!key) return;

    const newValue = !(config[key] !== false);
    let newConfig = { ...config, [key]: newValue };

    // When re-enabling a field that has showOnCard, check if it would exceed the limit
    if (newValue && field.showOnCard && cardLimitReached) {
      // Auto-remove from card to stay within limit
      const currentCardFields = newConfig.card_fields || [];
      newConfig = { ...newConfig, card_fields: currentCardFields.filter((k) => k !== field.key) };
    }

    setConfig(newConfig);
    notifyChange(newConfig, customFields);

    if (!initialConfig) {
      try {
        const updates = { [key]: newValue };
        if (newValue && field.showOnCard && cardLimitReached) {
          updates.card_fields = newConfig.card_fields;
        }
        await formConfigApi.update(updates);
      } catch (err) {
        console.error('Failed to toggle field:', err);
      }
    }
  };

  // Toggle card visibility
  const handleToggleCardVisibility = async (field) => {
    // Block adding more fields if limit reached (always allow removing)
    const isCurrentlyOnCard = field.isCustom
      ? (field.show_on_card || field.showOnCard)
      : field.showOnCard;
    if (!isCurrentlyOnCard && cardLimitReached) return;

    if (field.isCustom) {
      // Toggle show_on_card for custom field
      const updated = customFields.map((f) =>
        f.id === field.id ? { ...f, show_on_card: !f.show_on_card } : f
      );
      setCustomFields(updated);
      notifyChange(config, updated);

      if (!initialConfig) {
        try {
          await formConfigApi.updateField(field.id, { show_on_card: !field.show_on_card });
        } catch (err) {
          console.error('Failed to toggle card visibility:', err);
        }
      }
    } else {
      // Toggle card visibility for built-in field
      const currentCardFields = config.card_fields || [];
      const newCardFields = currentCardFields.includes(field.key)
        ? currentCardFields.filter((k) => k !== field.key)
        : [...currentCardFields, field.key];
      const newConfig = { ...config, card_fields: newCardFields };
      setConfig(newConfig);
      notifyChange(newConfig, customFields);

      if (!initialConfig) {
        try {
          await formConfigApi.update({ card_fields: newCardFields });
        } catch (err) {
          console.error('Failed to toggle card field:', err);
        }
      }
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

  const handleSaveField = async (updatedField) => {
    if (updatedField.isCustom) {
      const { isCustom, key, type, enabled, showOnCard, ...fieldData } = updatedField;
      const updated = customFields.map((f) =>
        f.id === updatedField.id ? { ...f, ...fieldData } : f
      );
      setCustomFields(updated);
      notifyChange(config, updated);

      if (!initialConfig) {
        try {
          await formConfigApi.updateField(updatedField.id, fieldData);
        } catch (err) {
          console.error('Failed to save field:', err);
        }
      }
    }
    setEditingField(null);
    setEditingFieldDraft(null);
  };

  // Add custom field
  const handleAddField = async (fieldData) => {
    const { include_in_analytics, ...fieldPayload } = fieldData;

    if (initialConfig) {
      // In onboarding mode, just add locally
      const tempId = `temp_${Date.now()}`;
      setCustomFields((prev) => [...prev, { ...fieldPayload, id: tempId, isNew: true }]);
      notifyChange(config, [...customFields, { ...fieldPayload, id: tempId, isNew: true }]);
    } else {
      setSaving(true);
      try {
        const created = await formConfigApi.createField(fieldPayload);
        setCustomFields((prev) => [...prev, created]);
        notifyChange(config, [...customFields, created]);

        // Auto-add to analytics_fields if requested
        if (include_in_analytics && created.id) {
          const fieldKey = `custom_${created.id}`;
          const current = config.analytics_fields || [];
          if (!current.includes(fieldKey)) {
            const newAnalyticsFields = [...current, fieldKey];
            const newConfig = { ...config, analytics_fields: newAnalyticsFields };
            setConfig(newConfig);
            notifyChange(newConfig, [...customFields, created]);
            await formConfigApi.update({ analytics_fields: newAnalyticsFields });
          }
        }
      } catch (err) {
        console.error('Failed to create field:', err);
      } finally {
        setSaving(false);
      }
    }
  };

  // Toggle analytics inclusion for a field
  const handleToggleAnalytics = async (field) => {
    const fieldKey = field.key || `custom_${field.id}`;
    const current = config.analytics_fields || [];
    const newAnalyticsFields = current.includes(fieldKey)
      ? current.filter((k) => k !== fieldKey)
      : [...current, fieldKey];
    const newConfig = { ...config, analytics_fields: newAnalyticsFields };
    setConfig(newConfig);
    notifyChange(newConfig, customFields);

    if (!initialConfig) {
      try {
        await formConfigApi.update({ analytics_fields: newAnalyticsFields });
      } catch (err) {
        console.error('Failed to toggle analytics field:', err);
      }
    }
  };

  // Reorder fields
  const handleReorder = async (reordered) => {
    // Split back into built-in and custom
    const newBuiltIn = reordered.filter((f) => !f.isCustom);
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

    if (!initialConfig) {
      try {
        await formConfigApi.update({ field_order: fieldOrder });
        const customIds = newCustom.map((f) => f.id).filter(Boolean);
        if (customIds.length > 0) {
          await formConfigApi.reorderFields(customIds);
        }
      } catch (err) {
        console.error('Failed to reorder fields:', err);
      }
    }
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
        <div className="bg-white dark:bg-[#0D1117] border border-neutral-200 dark:border-[#30363D]/60 rounded-xl p-4 sm:p-5">
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
    </div>
  );
}
