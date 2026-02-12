import { useState, useEffect, useCallback } from 'react';
import { isCardEligible, CARD_ELIGIBLE_TYPES } from './FormBuilder';

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Text Area' },
  { value: 'select', label: 'Select (dropdown)' },
  { value: 'multi_select', label: 'Multi-Select' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'rating', label: 'Rating (1-5)' },
  { value: 'url', label: 'URL' },
];

const BADGE_COLORS = ['#6366F1', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#8B5CF6', '#06B6D4'];

export function FieldEditor({ field, isOpen, onClose, onSave, onDelete, onLiveChange, cardLimitReached }) {
  const [label, setLabel] = useState('');
  const [fieldType, setFieldType] = useState('text');
  const [required, setRequired] = useState(false);
  const [optionList, setOptionList] = useState([]);
  const [showOnCard, setShowOnCard] = useState(false);
  const [icon, setIcon] = useState('');
  const [color, setColor] = useState('');
  const [validation, setValidation] = useState({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (field) {
      setLabel(field.label || '');
      setFieldType(field.field_type || field.type || 'text');
      setRequired(field.is_required || field.required || false);
      setShowOnCard(field.show_on_card || field.showOnCard || false);
      setIcon(field.icon || '');
      setColor(field.color || '');
      setValidation(field.validation || {});
      const opts = field.options || [];
      if (Array.isArray(opts)) {
        setOptionList(opts.map((o) => (typeof o === 'string' ? o : o.label || o.value)));
      } else {
        setOptionList([]);
      }
    }
  }, [field]);

  // Emit live changes for real-time preview
  const emitLiveChange = useCallback((overrides = {}) => {
    if (!field) return;
    const currentLabel = overrides.label !== undefined ? overrides.label : label;
    const currentFieldType = overrides.fieldType !== undefined ? overrides.fieldType : fieldType;
    const currentRequired = overrides.required !== undefined ? overrides.required : required;
    const currentShowOnCard = overrides.showOnCard !== undefined ? overrides.showOnCard : showOnCard;
    const currentIcon = overrides.icon !== undefined ? overrides.icon : icon;
    const currentColor = overrides.color !== undefined ? overrides.color : color;
    const currentOptionList = overrides.optionList !== undefined ? overrides.optionList : optionList;
    const currentValidation = overrides.validation !== undefined ? overrides.validation : validation;

    const parsedOptions = ['select', 'multi_select'].includes(currentFieldType) && currentOptionList.length > 0
      ? currentOptionList.filter(Boolean).map((l) => ({ value: l.trim(), label: l.trim() }))
      : null;

    onLiveChange?.({
      ...field,
      label: currentLabel,
      field_type: currentFieldType,
      is_required: currentRequired,
      options: parsedOptions,
      show_on_card: currentShowOnCard,
      icon: currentIcon || null,
      color: currentColor || null,
      validation: currentValidation,
    });
  }, [field, label, fieldType, required, showOnCard, icon, color, optionList, validation, onLiveChange]);

  if (!isOpen || !field) return null;

  const handleSave = () => {
    const parsedOptions = ['select', 'multi_select'].includes(fieldType) && optionList.length > 0
      ? optionList.filter(Boolean).map((l) => ({ value: l.trim(), label: l.trim() }))
      : null;

    onSave({
      ...field,
      label,
      field_type: fieldType,
      is_required: required,
      options: parsedOptions,
      show_on_card: showOnCard,
      icon: icon || null,
      color: color || null,
      validation,
    });
    onClose();
  };

  const isBuiltIn = !field.isCustom;

  const addOption = () => {
    const updated = [...optionList, ''];
    setOptionList(updated);
    emitLiveChange({ optionList: updated });
  };
  const removeOption = (idx) => {
    const updated = optionList.filter((_, i) => i !== idx);
    setOptionList(updated);
    emitLiveChange({ optionList: updated });
  };
  const updateOption = (idx, val) => {
    const updated = [...optionList];
    updated[idx] = val;
    setOptionList(updated);
    emitLiveChange({ optionList: updated });
  };

  const updateLabel = (val) => {
    setLabel(val);
    emitLiveChange({ label: val });
  };

  const updateFieldType = (val) => {
    setFieldType(val);
    setValidation({});
    emitLiveChange({ fieldType: val, validation: {} });
  };

  const toggleRequired = () => {
    const newVal = !required;
    setRequired(newVal);
    emitLiveChange({ required: newVal });
  };

  const toggleShowOnCard = () => {
    const newVal = !showOnCard;
    setShowOnCard(newVal);
    emitLiveChange({ showOnCard: newVal });
  };

  const updateColor = (c) => {
    setColor(c);
    emitLiveChange({ color: c });
  };

  const updateValidation = (key, value) => {
    const updated = { ...validation, [key]: value === '' ? undefined : value };
    setValidation(updated);
    emitLiveChange({ validation: updated });
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

      {/* Slide-out panel */}
      <div className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-white dark:bg-[#0D1117] border-l border-neutral-200 dark:border-[#30363D] z-50 flex flex-col animate-in slide-in-from-right">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-200 dark:border-[#30363D]/60">
          <div className="flex items-center gap-3">
            {color && (
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
            )}
            <div>
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-[#E6EDF3]">
                Edit: {field.label}
              </h3>
              <p className="text-[10px] text-neutral-500 dark:text-[#6E7681]">
                {isBuiltIn ? 'Standard field' : 'Custom field'} &middot; {fieldType}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-500 dark:text-[#6E7681] hover:text-neutral-900 dark:hover:text-[#E6EDF3] hover:bg-neutral-100 dark:hover:bg-[#21262D] rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Field Name */}
          <div>
            <label className="block text-xs font-medium text-neutral-900 dark:text-[#E6EDF3] mb-1.5">Field Name</label>
            <input
              value={label}
              onChange={(e) => updateLabel(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-[#161B22] border border-neutral-200 dark:border-[#30363D] rounded-lg text-neutral-900 dark:text-[#E6EDF3] text-sm focus:outline-none focus:border-[#6366F1]"
            />
          </div>

          {/* Field Type */}
          {!isBuiltIn && (
            <div>
              <label className="block text-xs font-medium text-neutral-900 dark:text-[#E6EDF3] mb-1.5">Field Type</label>
              <select
                value={fieldType}
                onChange={(e) => updateFieldType(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-[#161B22] border border-neutral-200 dark:border-[#30363D] rounded-lg text-neutral-900 dark:text-[#E6EDF3] text-sm focus:outline-none focus:border-[#6366F1] appearance-none"
              >
                {FIELD_TYPES.map((ft) => (
                  <option key={ft.value} value={ft.value}>{ft.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Badge Color */}
          {!isBuiltIn && (
            <div>
              <label className="block text-xs font-medium text-neutral-900 dark:text-[#E6EDF3] mb-2">Badge Color</label>
              <div className="flex gap-2 flex-wrap">
                {BADGE_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => updateColor(c)}
                    className={`w-7 h-7 rounded-lg transition-all ${
                      color === c
                        ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-[#0D1117]'
                        : 'hover:scale-110'
                    }`}
                    style={{ backgroundColor: c, ...(color === c ? { '--tw-ring-color': c } : {}) }}
                  />
                ))}
              </div>
              {/* Badge preview */}
              {color && (
                <div className="mt-2.5 flex items-center gap-2">
                  <span className="text-[10px] text-neutral-400 dark:text-[#6E7681]">Preview:</span>
                  <span
                    className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded"
                    style={{
                      backgroundColor: `${color}18`,
                      color: color,
                      border: `1px solid ${color}30`,
                    }}
                  >
                    {label || 'Field'}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Type-Specific Settings */}
          <TypeSpecificSettings
            fieldType={fieldType}
            validation={validation}
            onUpdate={updateValidation}
            isBuiltIn={isBuiltIn}
          />

          {/* Options */}
          {['select', 'multi_select'].includes(fieldType) && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-neutral-900 dark:text-[#E6EDF3]">Options</label>
                <button
                  onClick={addOption}
                  className="text-[10px] text-[#818CF8] hover:text-[#A5B4FC] transition-colors"
                >
                  + Add option
                </button>
              </div>
              <div className="space-y-1.5">
                {optionList.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-neutral-300 dark:text-[#484F58] cursor-grab flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 6h2v2H8V6zm6 0h2v2h-2V6zM8 11h2v2H8v-2zm6 0h2v2h-2v-2zm-6 5h2v2H8v-2zm6 0h2v2h-2v-2z" />
                    </svg>
                    <input
                      value={opt}
                      onChange={(e) => updateOption(idx, e.target.value)}
                      className="flex-1 px-2.5 py-1.5 bg-white dark:bg-[#161B22] border border-neutral-200 dark:border-[#30363D] rounded-lg text-neutral-900 dark:text-[#E6EDF3] text-xs focus:outline-none focus:border-[#6366F1]"
                      placeholder={`Option ${idx + 1}`}
                    />
                    <button
                      onClick={() => removeOption(idx)}
                      className="p-1 text-neutral-300 dark:text-[#484F58] hover:text-red-400 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
                {optionList.length === 0 && (
                  <button
                    onClick={addOption}
                    className="w-full py-2.5 rounded-lg border border-dashed border-neutral-200 dark:border-[#30363D]/60 text-neutral-400 dark:text-[#484F58] text-xs hover:border-[#6366F1]/40 hover:text-[#818CF8] transition-colors"
                  >
                    + Add first option
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Toggles */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-neutral-900 dark:text-[#E6EDF3]">Required</span>
                <span className="block text-[10px] text-neutral-400 dark:text-[#6E7681]">Users must fill this field</span>
              </div>
              <button
                onClick={toggleRequired}
                className={`w-9 h-5 rounded-full relative flex-shrink-0 transition-colors ${required ? 'bg-[#4F46E5] dark:bg-[#6366F1]' : 'bg-neutral-300 dark:bg-[#30363D]'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full absolute top-[2px] transition-transform duration-200 ${required ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
              </button>
            </div>
            {CARD_ELIGIBLE_TYPES.includes(fieldType) || (!field.isCustom && ['category', 'priority', 'team', 'region'].includes(field.key)) ? (
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-neutral-900 dark:text-[#E6EDF3]">Show on card</span>
                  <span className={`block text-[10px] ${cardLimitReached && !showOnCard ? 'text-amber-500 dark:text-amber-400' : 'text-neutral-400 dark:text-[#6E7681]'}`}>
                    {cardLimitReached && !showOnCard ? 'Card badge limit reached (max 5)' : 'Display as badge on request cards'}
                  </span>
                </div>
                <button
                  onClick={toggleShowOnCard}
                  disabled={cardLimitReached && !showOnCard}
                  className={`w-9 h-5 rounded-full relative flex-shrink-0 transition-colors ${
                    cardLimitReached && !showOnCard
                      ? 'bg-neutral-200 dark:bg-[#21262D] cursor-not-allowed'
                      : showOnCard ? 'bg-[#4F46E5] dark:bg-[#6366F1]' : 'bg-neutral-300 dark:bg-[#30363D]'
                  }`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-[2px] transition-transform duration-200 ${showOnCard ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between opacity-50">
                <div>
                  <span className="text-xs text-neutral-500 dark:text-[#8B949E]">Show on card</span>
                  <span className="block text-[10px] text-neutral-400 dark:text-[#6E7681]">Only select/dropdown fields can be shown as card badges</span>
                </div>
                <div className="w-9 h-5 rounded-full relative flex-shrink-0 bg-neutral-200 dark:bg-[#21262D] cursor-not-allowed">
                  <div className="w-4 h-4 bg-white rounded-full absolute top-[2px] translate-x-[2px]" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-neutral-200 dark:border-[#30363D]/60">
          {!isBuiltIn && (
            <div className="relative">
              {showDeleteConfirm ? (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-neutral-500 dark:text-[#8B949E]">Existing data will be preserved.</span>
                  <button
                    onClick={() => { onDelete?.(field); onClose(); setShowDeleteConfirm(false); }}
                    className="text-xs text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 font-medium transition-colors"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="text-xs text-neutral-400 dark:text-[#6E7681] hover:text-neutral-600 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-xs text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors"
                >
                  Delete field
                </button>
              )}
            </div>
          )}
          <div className={`flex gap-3 ${isBuiltIn ? 'ml-auto' : ''}`}>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-neutral-600 dark:text-[#8B949E] hover:text-neutral-900 dark:hover:text-[#E6EDF3] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium bg-[#6366F1] text-white rounded-lg hover:bg-[#818CF8] transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * TypeSpecificSettings — renders validation/configuration inputs based on field type.
 */
function TypeSpecificSettings({ fieldType, validation, onUpdate, isBuiltIn }) {
  if (isBuiltIn) return null;

  const inputClass = "w-full px-3 py-2 bg-white dark:bg-[#161B22] border border-neutral-200 dark:border-[#30363D] rounded-lg text-neutral-900 dark:text-[#E6EDF3] text-sm focus:outline-none focus:border-[#6366F1] placeholder-neutral-400 dark:placeholder-[#484F58]";
  const labelClass = "block text-xs font-medium text-neutral-700 dark:text-[#8B949E] mb-1";
  const hintClass = "text-[10px] text-neutral-400 dark:text-[#6E7681] mt-1";

  const renderSection = (title, children) => (
    <div>
      <label className="block text-xs font-medium text-neutral-900 dark:text-[#E6EDF3] mb-2.5">{title}</label>
      <div className="p-3 bg-neutral-50 dark:bg-[#161B22]/50 rounded-lg border border-neutral-100 dark:border-[#30363D]/30 space-y-3">
        {children}
      </div>
    </div>
  );

  switch (fieldType) {
    case 'text':
    case 'url':
      return renderSection('Text Settings', <>
        <div>
          <label className={labelClass}>Placeholder</label>
          <input
            type="text"
            value={validation.placeholder || ''}
            onChange={(e) => onUpdate('placeholder', e.target.value)}
            className={inputClass}
            placeholder="e.g. Enter your answer..."
          />
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className={labelClass}>Min characters</label>
            <input
              type="number"
              min="0"
              value={validation.min_length || ''}
              onChange={(e) => onUpdate('min_length', e.target.value)}
              className={inputClass}
              placeholder="0"
            />
          </div>
          <div>
            <label className={labelClass}>Max characters</label>
            <input
              type="number"
              min="0"
              value={validation.max_length || ''}
              onChange={(e) => onUpdate('max_length', e.target.value)}
              className={inputClass}
              placeholder="No limit"
            />
          </div>
        </div>
        {(validation.min_length || validation.max_length) && (
          <p className={hintClass}>
            {validation.min_length && validation.max_length
              ? `${validation.min_length}–${validation.max_length} characters allowed`
              : validation.min_length ? `At least ${validation.min_length} characters` : `Up to ${validation.max_length} characters`}
          </p>
        )}
      </>);

    case 'textarea':
      return renderSection('Textarea Settings', <>
        <div>
          <label className={labelClass}>Placeholder</label>
          <input
            type="text"
            value={validation.placeholder || ''}
            onChange={(e) => onUpdate('placeholder', e.target.value)}
            className={inputClass}
            placeholder="e.g. Describe in detail..."
          />
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className={labelClass}>Min characters</label>
            <input
              type="number"
              min="0"
              value={validation.min_length || ''}
              onChange={(e) => onUpdate('min_length', e.target.value)}
              className={inputClass}
              placeholder="0"
            />
          </div>
          <div>
            <label className={labelClass}>Max characters</label>
            <input
              type="number"
              min="0"
              value={validation.max_length || ''}
              onChange={(e) => onUpdate('max_length', e.target.value)}
              className={inputClass}
              placeholder="No limit"
            />
          </div>
        </div>
        <div>
          <label className={labelClass}>Visible rows</label>
          <input
            type="number"
            min="1"
            max="20"
            value={validation.rows || ''}
            onChange={(e) => onUpdate('rows', e.target.value)}
            className={inputClass}
            placeholder="3"
          />
          <p className={hintClass}>Height of the text area (default: 3 rows)</p>
        </div>
      </>);

    case 'number':
      return renderSection('Number Settings', <>
        <div>
          <label className={labelClass}>Placeholder</label>
          <input
            type="text"
            value={validation.placeholder || ''}
            onChange={(e) => onUpdate('placeholder', e.target.value)}
            className={inputClass}
            placeholder="e.g. Enter amount..."
          />
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          <div>
            <label className={labelClass}>Min</label>
            <input
              type="number"
              value={validation.min || ''}
              onChange={(e) => onUpdate('min', e.target.value)}
              className={inputClass}
              placeholder="No min"
            />
          </div>
          <div>
            <label className={labelClass}>Max</label>
            <input
              type="number"
              value={validation.max || ''}
              onChange={(e) => onUpdate('max', e.target.value)}
              className={inputClass}
              placeholder="No max"
            />
          </div>
          <div>
            <label className={labelClass}>Step</label>
            <input
              type="number"
              min="0"
              value={validation.step || ''}
              onChange={(e) => onUpdate('step', e.target.value)}
              className={inputClass}
              placeholder="1"
            />
          </div>
        </div>
        {(validation.min || validation.max) && (
          <p className={hintClass}>
            Range: {validation.min || '∞'} — {validation.max || '∞'}
            {validation.step ? ` (step: ${validation.step})` : ''}
          </p>
        )}
      </>);

    case 'date':
      return renderSection('Date Settings', <>
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className={labelClass}>Earliest date</label>
            <input
              type="date"
              value={validation.min_date || ''}
              onChange={(e) => onUpdate('min_date', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Latest date</label>
            <input
              type="date"
              value={validation.max_date || ''}
              onChange={(e) => onUpdate('max_date', e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <button
            onClick={() => onUpdate('allow_future', validation.allow_future === false ? true : false)}
            className={`w-9 h-5 rounded-full relative flex-shrink-0 transition-colors ${validation.allow_future !== false ? 'bg-[#4F46E5] dark:bg-[#6366F1]' : 'bg-neutral-300 dark:bg-[#30363D]'}`}
          >
            <div className={`w-4 h-4 bg-white rounded-full absolute top-[2px] transition-transform duration-200 ${validation.allow_future !== false ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
          </button>
          <span className="text-xs text-neutral-700 dark:text-[#8B949E]">Allow future dates</span>
        </label>
      </>);

    case 'checkbox':
      return renderSection('Checkbox Settings', <>
        <div>
          <label className={labelClass}>Helper text</label>
          <input
            type="text"
            value={validation.helper_text || ''}
            onChange={(e) => onUpdate('helper_text', e.target.value)}
            className={inputClass}
            placeholder="e.g. I agree to the terms"
          />
          <p className={hintClass}>Shown next to the checkbox</p>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <button
            onClick={() => onUpdate('default_checked', !validation.default_checked)}
            className={`w-9 h-5 rounded-full relative flex-shrink-0 transition-colors ${validation.default_checked ? 'bg-[#4F46E5] dark:bg-[#6366F1]' : 'bg-neutral-300 dark:bg-[#30363D]'}`}
          >
            <div className={`w-4 h-4 bg-white rounded-full absolute top-[2px] transition-transform duration-200 ${validation.default_checked ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
          </button>
          <span className="text-xs text-neutral-700 dark:text-[#8B949E]">Checked by default</span>
        </label>
      </>);

    case 'rating':
      return renderSection('Rating Settings', <>
        <div>
          <label className={labelClass}>Maximum rating</label>
          <div className="flex gap-2">
            {[3, 5, 7, 10].map((n) => (
              <button
                key={n}
                onClick={() => onUpdate('max_rating', n)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  (validation.max_rating || 5) === n
                    ? 'bg-[#6366F1] text-white'
                    : 'bg-neutral-100 dark:bg-[#21262D] text-neutral-600 dark:text-[#8B949E] hover:bg-neutral-200 dark:hover:bg-[#30363D]'
                }`}
              >
                1–{n}
              </button>
            ))}
          </div>
        </div>
        {/* Star preview */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-neutral-400 dark:text-[#6E7681]">Preview:</span>
          <div className="flex gap-0.5">
            {Array.from({ length: validation.max_rating || 5 }, (_, i) => (
              <span key={i} className={`text-base ${i < Math.ceil((validation.max_rating || 5) / 2) ? 'text-amber-400' : 'text-neutral-300 dark:text-[#30363D]'}`}>
                &#9733;
              </span>
            ))}
          </div>
        </div>
      </>);

    case 'select':
    case 'multi_select':
      // Options are handled separately above; show allow-other toggle
      return renderSection('Dropdown Settings', <>
        <label className="flex items-center gap-2 cursor-pointer">
          <button
            onClick={() => onUpdate('allow_other', !validation.allow_other)}
            className={`w-9 h-5 rounded-full relative flex-shrink-0 transition-colors ${validation.allow_other ? 'bg-[#4F46E5] dark:bg-[#6366F1]' : 'bg-neutral-300 dark:bg-[#30363D]'}`}
          >
            <div className={`w-4 h-4 bg-white rounded-full absolute top-[2px] transition-transform duration-200 ${validation.allow_other ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
          </button>
          <span className="text-xs text-neutral-700 dark:text-[#8B949E]">Allow "Other" option</span>
        </label>
        <p className={hintClass}>
          {fieldType === 'multi_select'
            ? 'Users can select multiple options'
            : 'Users select one option from the list'}
        </p>
      </>);

    default:
      return null;
  }
}
