import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { useProject } from '../context/ProjectContext';
import { formConfig as formConfigApi } from '../lib/api';
import { useToast } from '../components/ui/Toast';

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Text Area' },
  { value: 'select', label: 'Dropdown' },
  { value: 'multi_select', label: 'Multi-Select' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'rating', label: 'Rating (1-5)' },
  { value: 'url', label: 'URL' },
];

export default function ProjectSettings() {
  const navigate = useNavigate();
  const { currentProject } = useProject();
  const { addToast } = useToast();
  const [config, setConfig] = useState(null);
  const [customFields, setCustomFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // New field form
  const [showNewField, setShowNewField] = useState(false);
  const [newField, setNewField] = useState({ name: '', label: '', field_type: 'text', is_required: false, options: '' });

  useEffect(() => {
    loadConfig();
  }, [currentProject?.id]);

  const loadConfig = async () => {
    try {
      const data = await formConfigApi.get();
      setConfig(data.config || {});
      setCustomFields(data.customFields || []);
    } catch (err) {
      console.error('Failed to load form config:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (field, value) => {
    const updates = { [field]: value };
    setConfig(prev => ({ ...prev, ...updates }));
    try {
      await formConfigApi.update(updates);
    } catch (err) {
      addToast('Failed to update', 'error');
    }
  };

  const handleSaveCustomOptions = async (field, value) => {
    setSaving(true);
    try {
      const parsed = value.split('\n').filter(l => l.trim()).map(l => {
        const parts = l.split('|');
        return parts.length > 1
          ? { value: parts[0].trim(), label: parts[1].trim() }
          : { value: l.trim(), label: l.trim() };
      });
      await formConfigApi.update({ [field]: parsed.length ? parsed : null });
      addToast('Saved', 'success');
    } catch (err) {
      addToast('Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateField = async () => {
    if (!newField.name || !newField.label || !newField.field_type) return;
    setSaving(true);
    try {
      const options = ['select', 'multi_select'].includes(newField.field_type) && newField.options
        ? newField.options.split('\n').filter(l => l.trim()).map(l => {
            const parts = l.split('|');
            return parts.length > 1
              ? { value: parts[0].trim(), label: parts[1].trim() }
              : { value: l.trim(), label: l.trim() };
          })
        : null;

      await formConfigApi.createField({
        name: newField.name,
        label: newField.label,
        field_type: newField.field_type,
        is_required: newField.is_required,
        options,
        sort_order: customFields.length,
      });
      setNewField({ name: '', label: '', field_type: 'text', is_required: false, options: '' });
      setShowNewField(false);
      addToast('Field created', 'success');
      loadConfig();
    } catch (err) {
      addToast(err.message || 'Failed to create field', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteField = async (fieldId) => {
    try {
      await formConfigApi.deleteField(fieldId);
      addToast('Field deleted', 'success');
      loadConfig();
    } catch (err) {
      addToast('Failed to delete field', 'error');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto animate-pulse space-y-6">
          <div className="h-8 w-48 bg-neutral-200 dark:bg-[#21262D] rounded" />
          <div className="h-32 bg-neutral-200 dark:bg-[#21262D] rounded-xl" />
        </div>
      </Layout>
    );
  }

  const toggleClass = "relative inline-flex h-5 w-9 items-center rounded-full transition-colors";
  const inputClass = "w-full px-3 py-2 text-sm bg-white dark:bg-[#0D1117] border border-neutral-200 dark:border-[#30363D] rounded-lg text-neutral-900 dark:text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/30";

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Project Settings</h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{currentProject?.name}</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Level 1: Field Visibility */}
          <section className="bg-white dark:bg-[#161B22] rounded-xl border border-neutral-200 dark:border-[#30363D] p-5">
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-[#E6EDF3] mb-4">Field Visibility</h2>
            <p className="text-xs text-neutral-500 dark:text-[#8B949E] mb-4">Toggle which fields appear on the request form</p>
            <div className="space-y-3">
              {[
                { key: 'show_team', label: 'Team' },
                { key: 'show_region', label: 'Region' },
                { key: 'show_business_problem', label: 'Business Problem' },
                { key: 'show_problem_size', label: 'Problem Size' },
                { key: 'show_business_expectations', label: 'Business Expectations' },
                { key: 'show_expected_impact', label: 'Expected Impact' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center justify-between">
                  <span className="text-sm text-neutral-700 dark:text-[#E6EDF3]">{label}</span>
                  <button
                    type="button"
                    onClick={() => handleToggle(key, config?.[key] === false ? true : false)}
                    className={`${toggleClass} ${config?.[key] !== false ? 'bg-[#4F46E5] dark:bg-[#6366F1]' : 'bg-neutral-300 dark:bg-[#30363D]'}`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${config?.[key] !== false ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
                  </button>
                </label>
              ))}
            </div>
          </section>

          {/* Level 2: Custom Option Lists */}
          <section className="bg-white dark:bg-[#161B22] rounded-xl border border-neutral-200 dark:border-[#30363D] p-5">
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-[#E6EDF3] mb-4">Custom Option Lists</h2>
            <p className="text-xs text-neutral-500 dark:text-[#8B949E] mb-4">Override default dropdown options. One per line (value|label or just value)</p>
            {[
              { key: 'custom_categories', label: 'Categories', placeholder: 'bug|Bug\nnew_feature|New Feature' },
              { key: 'custom_priorities', label: 'Priorities', placeholder: 'low|Low\nmedium|Medium\nhigh|High' },
              { key: 'custom_teams', label: 'Teams', placeholder: 'Engineering|Engineering\nDesign|Design' },
              { key: 'custom_regions', label: 'Regions', placeholder: 'EMEA|EMEA\nNorth America|North America' },
            ].map(({ key, label, placeholder }) => (
              <CustomOptionEditor
                key={key}
                label={label}
                placeholder={placeholder}
                value={config?.[key]}
                onSave={(val) => handleSaveCustomOptions(key, val)}
                saving={saving}
              />
            ))}
          </section>

          {/* Level 3: Custom Fields */}
          <section className="bg-white dark:bg-[#161B22] rounded-xl border border-neutral-200 dark:border-[#30363D] p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-neutral-900 dark:text-[#E6EDF3]">Custom Fields</h2>
                <p className="text-xs text-neutral-500 dark:text-[#8B949E]">Add extra fields to the request form</p>
              </div>
              <button
                onClick={() => setShowNewField(true)}
                className="text-xs px-3 py-1.5 bg-[#4F46E5] dark:bg-[#6366F1] text-white rounded-lg hover:bg-[#4338CA] dark:hover:bg-[#4F46E5] transition-colors"
              >
                Add Field
              </button>
            </div>

            {customFields.length === 0 && !showNewField && (
              <p className="text-sm text-neutral-400 dark:text-[#484F58]">No custom fields defined</p>
            )}

            {customFields.map(field => (
              <div key={field.id} className="flex items-center justify-between py-2 border-b border-neutral-100 dark:border-[#21262D] last:border-0">
                <div>
                  <span className="text-sm text-neutral-900 dark:text-[#E6EDF3]">{field.label}</span>
                  <span className="ml-2 text-xs text-neutral-400 dark:text-[#484F58]">({field.field_type})</span>
                  {field.is_required && <span className="ml-1 text-xs text-red-500">*</span>}
                </div>
                <button
                  onClick={() => handleDeleteField(field.id)}
                  className="p-1 text-neutral-400 hover:text-red-500 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>
              </div>
            ))}

            {showNewField && (
              <div className="mt-4 p-4 bg-neutral-50 dark:bg-[#0D1117] rounded-lg border border-neutral-200 dark:border-[#30363D] space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 dark:text-[#8B949E] mb-1">Name (slug)</label>
                    <input
                      value={newField.name}
                      onChange={(e) => setNewField(p => ({ ...p, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') }))}
                      className={inputClass}
                      placeholder="field_name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 dark:text-[#8B949E] mb-1">Label</label>
                    <input
                      value={newField.label}
                      onChange={(e) => setNewField(p => ({ ...p, label: e.target.value }))}
                      className={inputClass}
                      placeholder="Display Label"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 dark:text-[#8B949E] mb-1">Type</label>
                    <select
                      value={newField.field_type}
                      onChange={(e) => setNewField(p => ({ ...p, field_type: e.target.value }))}
                      className={inputClass}
                    >
                      {FIELD_TYPES.map(ft => (
                        <option key={ft.value} value={ft.value}>{ft.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-[#E6EDF3]">
                      <input
                        type="checkbox"
                        checked={newField.is_required}
                        onChange={(e) => setNewField(p => ({ ...p, is_required: e.target.checked }))}
                        className="w-4 h-4 rounded"
                      />
                      Required
                    </label>
                  </div>
                </div>
                {['select', 'multi_select'].includes(newField.field_type) && (
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 dark:text-[#8B949E] mb-1">Options (one per line)</label>
                    <textarea
                      value={newField.options}
                      onChange={(e) => setNewField(p => ({ ...p, options: e.target.value }))}
                      className={inputClass + " min-h-[60px]"}
                      placeholder="option1|Label 1&#10;option2|Label 2"
                    />
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateField}
                    disabled={saving || !newField.name || !newField.label}
                    className="px-3 py-1.5 text-xs bg-[#4F46E5] dark:bg-[#6366F1] text-white rounded-lg hover:bg-[#4338CA] disabled:opacity-50 transition-colors"
                  >
                    {saving ? 'Creating...' : 'Create'}
                  </button>
                  <button
                    onClick={() => setShowNewField(false)}
                    className="px-3 py-1.5 text-xs text-neutral-600 dark:text-[#8B949E] hover:bg-neutral-200 dark:hover:bg-[#21262D] rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </Layout>
  );
}

function CustomOptionEditor({ label, placeholder, value, onSave, saving }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');

  const startEditing = () => {
    const lines = (value || []).map(opt =>
      typeof opt === 'string' ? opt : `${opt.value}|${opt.label}`
    );
    setText(lines.join('\n'));
    setEditing(true);
  };

  const inputClass = "w-full px-3 py-2 text-sm bg-white dark:bg-[#0D1117] border border-neutral-200 dark:border-[#30363D] rounded-lg text-neutral-900 dark:text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/30 min-h-[60px]";

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-neutral-700 dark:text-[#E6EDF3]">{label}</span>
        {!editing ? (
          <button
            onClick={startEditing}
            className="text-xs text-[#4F46E5] dark:text-[#818CF8] hover:underline"
          >
            {value?.length ? 'Edit' : 'Customize'}
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => { onSave(text); setEditing(false); }}
              disabled={saving}
              className="text-xs text-[#4F46E5] dark:text-[#818CF8] hover:underline"
            >
              Save
            </button>
            <button onClick={() => setEditing(false)} className="text-xs text-neutral-400 hover:underline">Cancel</button>
          </div>
        )}
      </div>
      {value?.length > 0 && !editing && (
        <div className="flex flex-wrap gap-1 mt-1">
          {value.map((opt, i) => (
            <span key={i} className="text-xs px-2 py-0.5 bg-neutral-100 dark:bg-[#21262D] text-neutral-600 dark:text-[#8B949E] rounded">
              {typeof opt === 'string' ? opt : opt.label}
            </span>
          ))}
        </div>
      )}
      {editing && (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className={inputClass}
          placeholder={placeholder}
        />
      )}
    </div>
  );
}
