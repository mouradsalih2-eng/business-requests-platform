import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { CARD_ELIGIBLE_TYPES } from './FormBuilder';

const FIELD_TYPES = [
  { value: 'text', label: 'Text', desc: 'Short answer', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" /></svg>
  ) },
  { value: 'textarea', label: 'Textarea', desc: 'Long answer', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
  ) },
  { value: 'select', label: 'Select', desc: 'Dropdown', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" /></svg>
  ) },
  { value: 'number', label: 'Number', desc: 'Numeric value', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" /></svg>
  ) },
  { value: 'date', label: 'Date', desc: 'Date picker', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
  ) },
  { value: 'checkbox', label: 'Checkbox', desc: 'Yes / No', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
  ) },
  { value: 'rating', label: 'Rating', desc: 'Star scale', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
  ) },
];

const BADGE_COLORS = ['#6366F1', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#8B5CF6', '#06B6D4'];

export function AddFieldModal({ isOpen, onClose, onAdd, existingCount = 0, cardLimitReached }) {
  const [selectedType, setSelectedType] = useState(null);
  const [name, setName] = useState('');
  const [label, setLabel] = useState('');
  const [required, setRequired] = useState(false);
  const [showOnCard, setShowOnCard] = useState(true);
  const [includeInAnalytics, setIncludeInAnalytics] = useState(false);
  const [color, setColor] = useState('#6366F1');
  const [optionList, setOptionList] = useState(['']);
  const [validation, setValidation] = useState({});

  const reset = () => {
    setSelectedType(null);
    setName('');
    setLabel('');
    setRequired(false);
    setShowOnCard(!cardLimitReached);
    setIncludeInAnalytics(false);
    setColor('#6366F1');
    setOptionList(['']);
    setValidation({});
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const slugify = (text) => text.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');

  const handleLabelChange = (val) => {
    setLabel(val);
    if (!name || name === slugify(label)) {
      setName(slugify(val));
    }
  };

  const handleTypeSelect = (type) => {
    setSelectedType(type);
    setValidation({});
    // Default analytics ON for select-like types
    setIncludeInAnalytics(['select', 'multi_select'].includes(type));
  };

  const updateValidation = (key, value) => {
    setValidation((prev) => ({ ...prev, [key]: value === '' ? undefined : value }));
  };

  const handleAdd = () => {
    if (!name || !label || !selectedType) return;

    const parsedOptions = ['select', 'multi_select'].includes(selectedType) && optionList.filter(Boolean).length > 0
      ? optionList.filter(Boolean).map((l) => ({ value: l.trim(), label: l.trim() }))
      : null;

    // Only select-like types can be shown on card
    const canShowOnCard = CARD_ELIGIBLE_TYPES.includes(selectedType);

    onAdd({
      name: name.trim(),
      label: label.trim(),
      field_type: selectedType,
      is_required: required,
      options: parsedOptions,
      sort_order: existingCount,
      show_on_card: canShowOnCard ? showOnCard : false,
      include_in_analytics: includeInAnalytics,
      color: color || null,
      validation: Object.keys(validation).length > 0 ? validation : null,
    });
    handleClose();
  };

  const addOption = () => setOptionList([...optionList, '']);
  const removeOption = (idx) => setOptionList(optionList.filter((_, i) => i !== idx));
  const updateOption = (idx, val) => {
    const updated = [...optionList];
    updated[idx] = val;
    setOptionList(updated);
  };

  const inputClass = "w-full px-3 py-2 bg-white dark:bg-[#161B22] border border-neutral-200 dark:border-[#30363D] rounded-lg text-neutral-900 dark:text-[#E6EDF3] text-sm focus:outline-none focus:border-[#6366F1] placeholder-neutral-400 dark:placeholder-[#484F58]";
  const smallLabelClass = "block text-xs font-medium text-neutral-700 dark:text-[#8B949E] mb-1";
  const hintClass = "text-[10px] text-neutral-400 dark:text-[#6E7681] mt-1";

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add Custom Field" size="md">
      <p className="text-xs text-neutral-500 dark:text-[#6E7681] -mt-2 mb-5">
        Create a new field for your request form
      </p>

      <div className="space-y-5">
        {/* Field Name */}
        <div>
          <label className="block text-xs font-medium text-neutral-900 dark:text-[#E6EDF3] mb-1.5">Field Name</label>
          <input
            value={label}
            onChange={(e) => handleLabelChange(e.target.value)}
            className={inputClass}
            placeholder="e.g. Sprint, Customer Tier, Revenue Impact..."
            autoFocus
          />
        </div>

        {/* Field Type Grid */}
        <div>
          <label className="block text-xs font-medium text-neutral-900 dark:text-[#E6EDF3] mb-2.5">Field Type</label>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {FIELD_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => handleTypeSelect(type.value)}
                className={`p-3 rounded-xl border text-center transition-all ${
                  selectedType === type.value
                    ? 'border-[#6366F1] bg-[#6366F1]/5 dark:bg-[#6366F1]/10'
                    : 'border-neutral-200 dark:border-[#30363D] hover:border-[#6366F1]/50'
                }`}
              >
                <div className={`mx-auto mb-1.5 ${selectedType === type.value ? 'text-[#818CF8]' : 'text-neutral-400 dark:text-[#8B949E]'}`}>
                  {type.icon}
                </div>
                <span className="text-xs font-medium text-neutral-900 dark:text-[#E6EDF3] block">{type.label}</span>
                <span className="text-[10px] text-neutral-400 dark:text-[#6E7681] block">{type.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Type-Specific Settings — shown when a type is selected */}
        {selectedType && renderTypeSettings(selectedType, validation, updateValidation, inputClass, smallLabelClass, hintClass)}

        {/* Options — shown for select types */}
        {['select', 'multi_select'].includes(selectedType) && (
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
                  <input
                    value={opt}
                    onChange={(e) => updateOption(idx, e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-white dark:bg-[#161B22] border border-neutral-200 dark:border-[#30363D] rounded-lg text-neutral-900 dark:text-[#E6EDF3] text-xs focus:outline-none focus:border-[#6366F1] placeholder-neutral-400 dark:placeholder-[#484F58]"
                    placeholder={`Option ${idx + 1}`}
                  />
                  {optionList.length > 1 && (
                    <button
                      onClick={() => removeOption(idx)}
                      className="p-1 text-neutral-300 dark:text-[#484F58] hover:text-red-400 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Badge Color */}
        <div>
          <label className="block text-xs font-medium text-neutral-900 dark:text-[#E6EDF3] mb-2">Badge Color</label>
          <p className="text-[10px] text-neutral-400 dark:text-[#6E7681] mb-2">
            Choose how this field appears as a badge on request cards
          </p>
          <div className="flex gap-2">
            {BADGE_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-7 h-7 rounded-lg transition-all ${
                  color === c
                    ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-[#161B22]'
                    : 'hover:scale-110'
                }`}
                style={{ backgroundColor: c, ...(color === c ? { '--tw-ring-color': c } : {}) }}
              />
            ))}
          </div>
        </div>

        {/* Toggles */}
        <div className="flex items-center gap-6 pt-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <button
              onClick={() => setRequired(!required)}
              className={`w-9 h-5 rounded-full relative flex-shrink-0 transition-colors ${required ? 'bg-[#4F46E5] dark:bg-[#6366F1]' : 'bg-neutral-300 dark:bg-[#30363D]'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full absolute top-[2px] transition-transform duration-200 ${required ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
            </button>
            <span className="text-xs text-neutral-900 dark:text-[#E6EDF3]">Required</span>
          </label>
          {CARD_ELIGIBLE_TYPES.includes(selectedType) ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => { if (!(cardLimitReached && !showOnCard)) setShowOnCard(!showOnCard); }}
                disabled={cardLimitReached && !showOnCard}
                className={`w-9 h-5 rounded-full relative flex-shrink-0 transition-colors ${
                  cardLimitReached && !showOnCard
                    ? 'bg-neutral-200 dark:bg-[#21262D] cursor-not-allowed'
                    : showOnCard ? 'bg-[#4F46E5] dark:bg-[#6366F1]' : 'bg-neutral-300 dark:bg-[#30363D]'
                }`}
              >
                <div className={`w-4 h-4 bg-white rounded-full absolute top-[2px] transition-transform duration-200 ${showOnCard ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
              </button>
              <div>
                <span className="text-xs text-neutral-900 dark:text-[#E6EDF3]">Show on card</span>
                {cardLimitReached && !showOnCard && (
                  <span className="block text-[10px] text-amber-500 dark:text-amber-400">Limit reached (max 5)</span>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 opacity-50">
              <div className="w-9 h-5 rounded-full relative flex-shrink-0 bg-neutral-200 dark:bg-[#21262D] cursor-not-allowed">
                <div className="w-4 h-4 bg-white rounded-full absolute top-[2px] translate-x-[2px]" />
              </div>
              <span className="text-xs text-neutral-500 dark:text-[#8B949E]" title="Only select/dropdown fields can be card badges">Show on card</span>
            </div>
          )}
          {['select', 'multi_select'].includes(selectedType) && (
            <label className="flex items-center gap-2 cursor-pointer">
              <button
                onClick={() => setIncludeInAnalytics(!includeInAnalytics)}
                className={`w-9 h-5 rounded-full relative flex-shrink-0 transition-colors ${includeInAnalytics ? 'bg-[#4F46E5] dark:bg-[#6366F1]' : 'bg-neutral-300 dark:bg-[#30363D]'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full absolute top-[2px] transition-transform duration-200 ${includeInAnalytics ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
              </button>
              <span className="text-xs text-neutral-900 dark:text-[#E6EDF3]">Include in analytics</span>
            </label>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-neutral-200 dark:border-[#30363D]/60">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm text-neutral-600 dark:text-[#8B949E] hover:text-neutral-900 dark:hover:text-[#E6EDF3] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!name || !label || !selectedType}
            className="px-4 py-2 text-sm font-medium bg-[#6366F1] text-white rounded-lg hover:bg-[#818CF8] disabled:opacity-50 disabled:hover:bg-[#6366F1] transition-colors"
          >
            Create Field
          </button>
        </div>
      </div>
    </Modal>
  );
}

/**
 * Renders type-specific configuration settings inline within the AddFieldModal.
 */
function renderTypeSettings(fieldType, validation, onUpdate, inputClass, labelClass, hintClass) {
  const sectionClass = "p-3 bg-neutral-50 dark:bg-[#161B22]/50 rounded-lg border border-neutral-100 dark:border-[#30363D]/30 space-y-3";

  switch (fieldType) {
    case 'text':
    case 'url':
      return (
        <div>
          <label className="block text-xs font-medium text-neutral-900 dark:text-[#E6EDF3] mb-2">Text Settings</label>
          <div className={sectionClass}>
            <div>
              <label className={labelClass}>Placeholder</label>
              <input type="text" value={validation.placeholder || ''} onChange={(e) => onUpdate('placeholder', e.target.value)} className={inputClass} placeholder="e.g. Enter your answer..." />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className={labelClass}>Min characters</label>
                <input type="number" min="0" value={validation.min_length || ''} onChange={(e) => onUpdate('min_length', e.target.value)} className={inputClass} placeholder="0" />
              </div>
              <div>
                <label className={labelClass}>Max characters</label>
                <input type="number" min="0" value={validation.max_length || ''} onChange={(e) => onUpdate('max_length', e.target.value)} className={inputClass} placeholder="No limit" />
              </div>
            </div>
          </div>
        </div>
      );

    case 'textarea':
      return (
        <div>
          <label className="block text-xs font-medium text-neutral-900 dark:text-[#E6EDF3] mb-2">Textarea Settings</label>
          <div className={sectionClass}>
            <div>
              <label className={labelClass}>Placeholder</label>
              <input type="text" value={validation.placeholder || ''} onChange={(e) => onUpdate('placeholder', e.target.value)} className={inputClass} placeholder="e.g. Describe in detail..." />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className={labelClass}>Min characters</label>
                <input type="number" min="0" value={validation.min_length || ''} onChange={(e) => onUpdate('min_length', e.target.value)} className={inputClass} placeholder="0" />
              </div>
              <div>
                <label className={labelClass}>Max characters</label>
                <input type="number" min="0" value={validation.max_length || ''} onChange={(e) => onUpdate('max_length', e.target.value)} className={inputClass} placeholder="No limit" />
              </div>
            </div>
            <div>
              <label className={labelClass}>Visible rows</label>
              <input type="number" min="1" max="20" value={validation.rows || ''} onChange={(e) => onUpdate('rows', e.target.value)} className={inputClass} placeholder="3" />
              <p className={hintClass}>Height of the text area (default: 3 rows)</p>
            </div>
          </div>
        </div>
      );

    case 'number':
      return (
        <div>
          <label className="block text-xs font-medium text-neutral-900 dark:text-[#E6EDF3] mb-2">Number Settings</label>
          <div className={sectionClass}>
            <div>
              <label className={labelClass}>Placeholder</label>
              <input type="text" value={validation.placeholder || ''} onChange={(e) => onUpdate('placeholder', e.target.value)} className={inputClass} placeholder="e.g. Enter amount..." />
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className={labelClass}>Min</label>
                <input type="number" value={validation.min || ''} onChange={(e) => onUpdate('min', e.target.value)} className={inputClass} placeholder="No min" />
              </div>
              <div>
                <label className={labelClass}>Max</label>
                <input type="number" value={validation.max || ''} onChange={(e) => onUpdate('max', e.target.value)} className={inputClass} placeholder="No max" />
              </div>
              <div>
                <label className={labelClass}>Step</label>
                <input type="number" min="0" value={validation.step || ''} onChange={(e) => onUpdate('step', e.target.value)} className={inputClass} placeholder="1" />
              </div>
            </div>
          </div>
        </div>
      );

    case 'date':
      return (
        <div>
          <label className="block text-xs font-medium text-neutral-900 dark:text-[#E6EDF3] mb-2">Date Settings</label>
          <div className={sectionClass}>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className={labelClass}>Earliest date</label>
                <input type="date" value={validation.min_date || ''} onChange={(e) => onUpdate('min_date', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Latest date</label>
                <input type="date" value={validation.max_date || ''} onChange={(e) => onUpdate('max_date', e.target.value)} className={inputClass} />
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
          </div>
        </div>
      );

    case 'checkbox':
      return (
        <div>
          <label className="block text-xs font-medium text-neutral-900 dark:text-[#E6EDF3] mb-2">Checkbox Settings</label>
          <div className={sectionClass}>
            <div>
              <label className={labelClass}>Helper text</label>
              <input type="text" value={validation.helper_text || ''} onChange={(e) => onUpdate('helper_text', e.target.value)} className={inputClass} placeholder="e.g. I agree to the terms" />
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
          </div>
        </div>
      );

    case 'rating':
      return (
        <div>
          <label className="block text-xs font-medium text-neutral-900 dark:text-[#E6EDF3] mb-2">Rating Settings</label>
          <div className={sectionClass}>
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
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-neutral-400 dark:text-[#6E7681]">Preview:</span>
              <div className="flex gap-0.5">
                {Array.from({ length: validation.max_rating || 5 }, (_, i) => (
                  <span key={i} className={`text-base ${i < Math.ceil((validation.max_rating || 5) / 2) ? 'text-amber-400' : 'text-neutral-300 dark:text-[#30363D]'}`}>&#9733;</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      );

    case 'select':
    case 'multi_select':
      return (
        <div>
          <label className="block text-xs font-medium text-neutral-900 dark:text-[#E6EDF3] mb-2">Dropdown Settings</label>
          <div className={sectionClass}>
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
              {fieldType === 'multi_select' ? 'Users can select multiple options' : 'Users select one option from the list'}
            </p>
          </div>
        </div>
      );

    default:
      return null;
  }
}
