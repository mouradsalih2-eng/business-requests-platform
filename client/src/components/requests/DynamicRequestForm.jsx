import { useState } from 'react';
import { useFormConfig } from '../../hooks/useFormConfig';

/**
 * Dynamic request form that adapts to project form configuration.
 * Supports Level 1 (field visibility), Level 2 (custom options), Level 3 (custom fields).
 */
export function DynamicRequestForm({ onSubmit, loading: submitLoading, initialValues = {} }) {
  const { categories, priorities, teams, regions, showField, customFields, loading: configLoading } = useFormConfig();

  const [title, setTitle] = useState(initialValues.title || '');
  const [category, setCategory] = useState(initialValues.category || '');
  const [priority, setPriority] = useState(initialValues.priority || '');
  const [team, setTeam] = useState(initialValues.team || '');
  const [region, setRegion] = useState(initialValues.region || '');
  const [businessProblem, setBusinessProblem] = useState(initialValues.business_problem || '');
  const [problemSize, setProblemSize] = useState(initialValues.problem_size || '');
  const [businessExpectations, setBusinessExpectations] = useState(initialValues.business_expectations || '');
  const [expectedImpact, setExpectedImpact] = useState(initialValues.expected_impact || '');
  const [customValues, setCustomValues] = useState({});
  const [files, setFiles] = useState([]);
  const [errors, setErrors] = useState({});

  const handleCustomFieldChange = (fieldId, value) => {
    setCustomValues(prev => ({ ...prev, [fieldId]: value }));
  };

  const validate = () => {
    const newErrors = {};
    if (!title.trim()) {
      newErrors.title = 'Title is required';
    } else if (title.trim().length < 5) {
      newErrors.title = 'Title must be at least 5 characters';
    }
    if (showField('category') && !category) newErrors.category = 'Category is required';
    if (showField('priority') && !priority) newErrors.priority = 'Priority is required';

    // Validate required custom fields
    for (const field of customFields.filter(f => f.visibility === 'all' && f.is_enabled !== false && f.is_required)) {
      const val = customValues[field.id];
      if (val === undefined || val === '' || val === null) {
        newErrors[`custom_${field.id}`] = `${field.label} is required`;
      } else if (['text', 'textarea'].includes(field.field_type) && field.validation?.min_length) {
        if (String(val).trim().length < Number(field.validation.min_length)) {
          newErrors[`custom_${field.id}`] = `${field.label} must be at least ${field.validation.min_length} characters`;
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const formData = new FormData();
    formData.append('title', title);
    if (category) formData.append('category', category);
    if (priority) formData.append('priority', priority);
    if (team) formData.append('team', team);
    if (region) formData.append('region', region);
    if (businessProblem) formData.append('business_problem', businessProblem);
    if (problemSize) formData.append('problem_size', problemSize);
    if (businessExpectations) formData.append('business_expectations', businessExpectations);
    if (expectedImpact) formData.append('expected_impact', expectedImpact);

    // Custom fields
    const customFieldsPayload = Object.entries(customValues)
      .filter(([, value]) => value !== '' && value !== null && value !== undefined)
      .map(([fieldId, value]) => {
        const field = customFields.find(f => f.id === parseInt(fieldId, 10));
        return { field_id: parseInt(fieldId, 10), value, field_type: field?.field_type };
      });
    if (customFieldsPayload.length) {
      formData.append('custom_fields', JSON.stringify(customFieldsPayload));
    }

    files.forEach(file => formData.append('attachments', file));

    onSubmit(formData);
  };

  if (configLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-neutral-200 dark:bg-[#21262D] rounded-lg" />
        <div className="h-10 bg-neutral-200 dark:bg-[#21262D] rounded-lg" />
        <div className="h-10 bg-neutral-200 dark:bg-[#21262D] rounded-lg" />
      </div>
    );
  }

  const inputClass = "w-full px-3 py-2.5 text-sm bg-white dark:bg-[#0D1117] border border-neutral-200 dark:border-[#30363D] rounded-lg text-neutral-900 dark:text-[#E6EDF3] placeholder:text-neutral-400 dark:placeholder:text-[#484F58] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/30 dark:focus:ring-[#6366F1]/30 focus:border-[#4F46E5] dark:focus:border-[#6366F1]";
  const selectClass = inputClass;
  const textareaClass = inputClass + " min-h-[80px] resize-y";
  const labelClass = "block text-sm font-medium text-neutral-700 dark:text-[#E6EDF3] mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Title (always shown) */}
      <div>
        <label className={labelClass}>Title *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => { setTitle(e.target.value); setErrors(prev => ({ ...prev, title: undefined })); }}
          className={`${inputClass} ${errors.title ? 'border-red-400 dark:border-red-500' : ''}`}
          placeholder="Brief description of the request"
          required
          minLength={5}
        />
        {errors.title && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{errors.title}</p>}
      </div>

      {/* Category + Priority row */}
      {(showField('category') || showField('priority')) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {showField('category') && (
            <div>
              <label className={labelClass}>Category *</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={selectClass} required>
                <option value="">Select category</option>
                {categories.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          )}
          {showField('priority') && (
            <div>
              <label className={labelClass}>Priority *</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)} className={selectClass} required>
                <option value="">Select priority</option>
                {priorities.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Team + Region row */}
      {(showField('team') || showField('region')) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {showField('team') && (
            <div>
              <label className={labelClass}>Team</label>
              <select value={team} onChange={(e) => setTeam(e.target.value)} className={selectClass}>
                <option value="">Select team</option>
                {teams.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          )}
          {showField('region') && (
            <div>
              <label className={labelClass}>Region</label>
              <select value={region} onChange={(e) => setRegion(e.target.value)} className={selectClass}>
                <option value="">Select region</option>
                {regions.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Business Problem */}
      {showField('business_problem') && (
        <div>
          <label className={labelClass}>Business Problem</label>
          <textarea
            value={businessProblem}
            onChange={(e) => setBusinessProblem(e.target.value)}
            className={textareaClass}
            placeholder="Describe the business problem this request addresses"
          />
        </div>
      )}

      {/* Problem Size */}
      {showField('problem_size') && (
        <div>
          <label className={labelClass}>Problem Size</label>
          <textarea
            value={problemSize}
            onChange={(e) => setProblemSize(e.target.value)}
            className={textareaClass}
            placeholder="How big is this problem? Who is affected?"
          />
        </div>
      )}

      {/* Business Expectations */}
      {showField('business_expectations') && (
        <div>
          <label className={labelClass}>Business Expectations</label>
          <textarea
            value={businessExpectations}
            onChange={(e) => setBusinessExpectations(e.target.value)}
            className={textareaClass}
            placeholder="What are the expected business outcomes?"
          />
        </div>
      )}

      {/* Expected Impact */}
      {showField('expected_impact') && (
        <div>
          <label className={labelClass}>Expected Impact</label>
          <textarea
            value={expectedImpact}
            onChange={(e) => setExpectedImpact(e.target.value)}
            className={textareaClass}
            placeholder="What impact do you expect this to have?"
          />
        </div>
      )}

      {/* Custom Fields (Level 3) */}
      {customFields.filter(f => f.visibility === 'all' && f.is_enabled !== false).map(field => (
        <div key={field.id}>
          <label className={labelClass}>
            {field.label}{field.is_required && ' *'}
          </label>
          {renderCustomField(field, customValues[field.id] || '', (val) => { handleCustomFieldChange(field.id, val); setErrors(prev => ({ ...prev, [`custom_${field.id}`]: undefined })); }, { inputClass, selectClass, textareaClass })}
          {errors[`custom_${field.id}`] && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{errors[`custom_${field.id}`]}</p>}
        </div>
      ))}

      {/* Attachments */}
      <div>
        <label className={labelClass}>Attachments</label>
        <input
          type="file"
          multiple
          onChange={(e) => setFiles(Array.from(e.target.files))}
          className="block w-full text-sm text-neutral-500 dark:text-[#8B949E] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-neutral-100 dark:file:bg-[#21262D] file:text-neutral-700 dark:file:text-[#E6EDF3] hover:file:bg-neutral-200 dark:hover:file:bg-[#30363D] file:cursor-pointer"
          accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={submitLoading || title.trim().length < 5 || (showField('category') && !category) || (showField('priority') && !priority)}
        className="w-full px-4 py-2.5 bg-[#4F46E5] dark:bg-[#6366F1] text-white text-sm font-medium rounded-lg hover:bg-[#4338CA] dark:hover:bg-[#4F46E5] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {submitLoading ? 'Submitting...' : 'Submit Request'}
      </button>
    </form>
  );
}

function renderCustomField(field, value, onChange, classes) {
  switch (field.field_type) {
    case 'text':
    case 'url':
      return (
        <input
          type={field.field_type === 'url' ? 'url' : 'text'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={classes.inputClass}
          required={field.is_required}
          placeholder={field.label}
        />
      );
    case 'textarea':
      return (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={classes.textareaClass}
          required={field.is_required}
          placeholder={field.label}
        />
      );
    case 'number':
      return (
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={classes.inputClass}
          required={field.is_required}
        />
      );
    case 'date':
      return (
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={classes.inputClass}
          required={field.is_required}
        />
      );
    case 'checkbox':
      return (
        <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-[#E6EDF3]">
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
            className="w-4 h-4 rounded border-neutral-300 dark:border-[#30363D] text-[#4F46E5] focus:ring-[#4F46E5]"
          />
          {field.label}
        </label>
      );
    case 'select':
      return (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={classes.selectClass}
          required={field.is_required}
        >
          <option value="">Select...</option>
          {(field.options || []).map(opt => (
            <option key={opt.value || opt} value={opt.value || opt}>{opt.label || opt}</option>
          ))}
        </select>
      );
    case 'multi_select': {
      const selected = Array.isArray(value) ? value : [];
      return (
        <div className="flex flex-wrap gap-2">
          {(field.options || []).map(opt => {
            const val = opt.value || opt;
            const label = opt.label || opt;
            const isSelected = selected.includes(val);
            return (
              <button
                key={val}
                type="button"
                onClick={() => {
                  if (isSelected) onChange(selected.filter(s => s !== val));
                  else onChange([...selected, val]);
                }}
                className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                  isSelected
                    ? 'bg-[#4F46E5] dark:bg-[#6366F1] text-white border-[#4F46E5] dark:border-[#6366F1]'
                    : 'bg-white dark:bg-[#0D1117] text-neutral-600 dark:text-[#8B949E] border-neutral-200 dark:border-[#30363D] hover:border-neutral-300'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      );
    }
    case 'rating':
      return (
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
                n <= (value || 0)
                  ? 'bg-yellow-400 text-yellow-900'
                  : 'bg-neutral-100 dark:bg-[#21262D] text-neutral-400 dark:text-[#484F58] hover:bg-neutral-200 dark:hover:bg-[#30363D]'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      );
    default:
      return (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={classes.inputClass}
          placeholder={field.label}
        />
      );
  }
}
