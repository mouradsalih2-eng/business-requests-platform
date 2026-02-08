export function FormPreview({ fields }) {
  const enabledFields = fields.filter((f) => f.enabled !== false);

  return (
    <div className="bg-white dark:bg-[#0D1117] border border-neutral-200 dark:border-[#30363D]/60 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-1">
        <svg className="w-4 h-4 text-neutral-400 dark:text-[#6E7681]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-[#E6EDF3]">New Request Form</h3>
      </div>
      <p className="text-[11px] text-neutral-500 dark:text-[#6E7681] mb-4">
        This is what users see when submitting a new request
      </p>

      <div className="space-y-3.5 p-4 bg-neutral-50 dark:bg-[#161B22] rounded-lg border border-neutral-100 dark:border-[#30363D]/30">
        {enabledFields.map((field) => (
          <FormField key={field.key || field.id || field.name} field={field} showColorDot={field.isCustom} />
        ))}

        {enabledFields.length === 0 && (
          <p className="text-sm text-neutral-400 dark:text-[#484F58] text-center py-4">No fields enabled</p>
        )}
      </div>

      <p className="text-[10px] text-neutral-400 dark:text-[#484F58] mt-3 flex items-center gap-1.5">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Toggle fields on/off in the field list to control what appears here
      </p>
    </div>
  );
}

function FormField({ field, showColorDot }) {
  const type = field.type || field.field_type;
  const label = field.label;
  const required = field.required || field.is_required;
  const v = field.validation || {};

  // Build constraint hint text
  const getConstraintHint = () => {
    const hints = [];
    if (v.min_length) hints.push(`min ${v.min_length} chars`);
    if (v.max_length) hints.push(`max ${v.max_length} chars`);
    if (v.min !== undefined && v.min !== '') hints.push(`min: ${v.min}`);
    if (v.max !== undefined && v.max !== '') hints.push(`max: ${v.max}`);
    if (v.step) hints.push(`step: ${v.step}`);
    return hints.length > 0 ? hints.join(' · ') : null;
  };

  const placeholder = v.placeholder || `Enter ${label.toLowerCase()}...`;
  const constraintHint = getConstraintHint();

  return (
    <div>
      <label className="block text-xs font-medium text-neutral-900 dark:text-[#E6EDF3] mb-1.5">
        {showColorDot && field.color && (
          <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5" style={{ backgroundColor: field.color }} />
        )}
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {type === 'textarea' ? (
        <textarea
          rows={v.rows || 2}
          className="w-full px-3 py-2 bg-white dark:bg-[#0D1117] border border-neutral-200 dark:border-[#30363D] rounded-lg text-neutral-400 dark:text-[#484F58] text-sm resize-none"
          placeholder={v.placeholder || `Enter ${label.toLowerCase()}...`}
          disabled
        />
      ) : type === 'select' || type === 'multi_select' ? (
        <select
          className="w-full px-3 py-2 bg-white dark:bg-[#0D1117] border border-neutral-200 dark:border-[#30363D] rounded-lg text-neutral-400 dark:text-[#484F58] text-sm appearance-none"
          disabled
        >
          <option>
            {type === 'multi_select' ? `Select ${label.toLowerCase()} (multiple)...` : `Select ${label.toLowerCase()}...`}
          </option>
          {Array.isArray(field.options) && field.options.map((opt, i) => (
            <option key={i}>{typeof opt === 'string' ? opt : opt.label}</option>
          ))}
        </select>
      ) : type === 'checkbox' ? (
        <label className="flex items-center gap-2">
          <input type="checkbox" disabled checked={v.default_checked || false} className="w-4 h-4 rounded" />
          <span className="text-sm text-neutral-400 dark:text-[#484F58]">{v.helper_text || label}</span>
        </label>
      ) : type === 'rating' ? (
        <div className="flex gap-1">
          {Array.from({ length: v.max_rating || 5 }, (_, i) => (
            <span key={i} className={`text-lg ${i <= Math.ceil((v.max_rating || 5) / 2) - 1 ? 'text-amber-400' : 'text-neutral-300 dark:text-[#30363D]'}`}>
              &#9733;
            </span>
          ))}
        </div>
      ) : type === 'date' ? (
        <input
          type="date"
          min={v.min_date || undefined}
          max={v.max_date || undefined}
          className="w-full px-3 py-2 bg-white dark:bg-[#0D1117] border border-neutral-200 dark:border-[#30363D] rounded-lg text-neutral-400 dark:text-[#484F58] text-sm"
          disabled
        />
      ) : type === 'number' ? (
        <input
          type="number"
          min={v.min || undefined}
          max={v.max || undefined}
          step={v.step || undefined}
          className="w-full px-3 py-2 bg-white dark:bg-[#0D1117] border border-neutral-200 dark:border-[#30363D] rounded-lg text-neutral-400 dark:text-[#484F58] text-sm"
          placeholder={v.placeholder || '0'}
          disabled
        />
      ) : (
        <input
          type="text"
          className="w-full px-3 py-2 bg-white dark:bg-[#0D1117] border border-neutral-200 dark:border-[#30363D] rounded-lg text-neutral-400 dark:text-[#484F58] text-sm"
          placeholder={placeholder}
          disabled
        />
      )}
      {/* Constraint hints */}
      {constraintHint && (
        <p className="text-[10px] text-neutral-400 dark:text-[#6E7681] mt-1">{constraintHint}</p>
      )}
    </div>
  );
}
