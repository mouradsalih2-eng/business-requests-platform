import { useState } from 'react';

const BADGE_COLORS = ['#6366F1', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#8B5CF6', '#06B6D4'];

// Analytics-eligible field types (only select-like fields produce meaningful breakdowns)
const ANALYTICS_ELIGIBLE_TYPES = ['select', 'multi_select'];

function isAnalyticsEligible(field) {
  const type = field.type || field.field_type;
  // Built-in select fields: category, priority, team, region
  if (['category', 'priority', 'team', 'region'].includes(field.key)) return true;
  // Custom select/multi_select fields
  if (field.isCustom && ANALYTICS_ELIGIBLE_TYPES.includes(type)) return true;
  return false;
}

/**
 * FieldCard - Single draggable field row in the form builder.
 * Standard fields show toggle + eye. Custom fields also show color dot, option count, and settings gear.
 */
export function FieldCard({ field, index, isCustom, onToggle, onToggleCardVisibility, onEdit, onDragStart, onDragOver, onDrop, cardLimitReached, analyticsFields, onToggleAnalytics }) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragStart = (e) => {
    e.dataTransfer.setData('text/plain', index.toString());
    e.dataTransfer.effectAllowed = 'move';
    onDragStart?.(index);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
    onDragOver?.(index);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
    onDrop?.(fromIndex, index);
  };

  const isLocked = field.locked;
  const isEnabled = field.enabled !== false;

  // Count options for select fields
  const optionCount = Array.isArray(field.options) ? field.options.length : 0;
  const fieldType = field.type || field.field_type;

  // Check if this field is in the analytics config
  const fieldKey = field.key || `custom_${field.id}`;
  const isInAnalytics = Array.isArray(analyticsFields) && analyticsFields.includes(fieldKey);
  const showAnalyticsToggle = isAnalyticsEligible(field);

  // Check if toggle should be shown (built-in fields with configKey, or custom fields)
  const showToggle = isCustom || field.configKey;

  return (
    <div
      draggable={!isLocked}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        group field-row flex items-center gap-3 py-3 px-3 rounded-lg transition-all duration-200
        ${isDragOver ? 'border-t-2 border-[#4F46E5] dark:border-[#6366F1]' : ''}
        ${isLocked
          ? 'bg-neutral-50 dark:bg-[#161B22]/50 border border-neutral-200 dark:border-[#30363D]/30'
          : 'hover:bg-neutral-50 dark:hover:bg-[#161B22]/40'
        }
        ${isCustom ? 'border-l-2 border-l-[#6366F1] bg-neutral-50/50 dark:bg-[#161B22]/30' : ''}
        ${!isEnabled ? 'opacity-45' : ''}
      `}
    >
      {/* Drag handle — always visible on mobile, hover on desktop */}
      {!isLocked && (
        <div className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity cursor-grab text-neutral-400 dark:text-[#484F58]">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 6h2v2H8V6zm6 0h2v2h-2V6zM8 11h2v2H8v-2zm6 0h2v2h-2v-2zm-6 5h2v2H8v-2zm6 0h2v2h-2v-2z" />
          </svg>
        </div>
      )}

      {/* Color dot for custom fields */}
      {isCustom && field.color && (
        <div
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: field.color }}
        />
      )}

      {/* Field info */}
      <div className="flex-1 flex items-center gap-2 min-w-0">
        <span className={`text-sm font-medium truncate ${isEnabled ? 'text-neutral-900 dark:text-[#E6EDF3]' : 'text-neutral-500 dark:text-[#8B949E]'}`}>
          {field.label}
        </span>
        <span className="hidden sm:inline text-[10px] px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-[#21262D] text-neutral-500 dark:text-[#8B949E] flex-shrink-0">
          {fieldType}
        </span>
        {field.required && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20 flex-shrink-0">
            req
            <span className="hidden sm:inline">uired</span>
          </span>
        )}
        {isCustom && optionCount > 0 && (
          <span className="hidden sm:inline text-[10px] text-neutral-400 dark:text-[#6E7681] flex-shrink-0">
            {optionCount} options
          </span>
        )}
      </div>

      {/* Locked indicator */}
      {isLocked && (
        <span className="text-[10px] text-neutral-400 dark:text-[#484F58] uppercase tracking-wider flex-shrink-0">always visible</span>
      )}

      {/* Action buttons */}
      {!isLocked && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Analytics chart icon — only for eligible select fields */}
          {showAnalyticsToggle && (
            <button
              onClick={() => onToggleAnalytics?.(field)}
              className={`p-1.5 rounded-md transition-colors ${
                isInAnalytics
                  ? 'text-[#4F46E5] dark:text-[#818CF8] hover:bg-[#4F46E5]/10 dark:hover:bg-[#818CF8]/10'
                  : 'text-neutral-300 dark:text-[#484F58] hover:text-neutral-500 dark:hover:text-[#8B949E] hover:bg-neutral-100 dark:hover:bg-[#21262D]'
              }`}
              title={isInAnalytics ? 'Included in analytics' : 'Excluded from analytics'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </button>
          )}

          {/* Card visibility eye icon */}
          <button
            onClick={() => onToggleCardVisibility?.(field)}
            disabled={cardLimitReached && !field.showOnCard}
            className={`p-1.5 rounded-md transition-colors ${
              cardLimitReached && !field.showOnCard
                ? 'text-neutral-200 dark:text-[#30363D] cursor-not-allowed'
                : field.showOnCard
                  ? 'text-[#4F46E5] dark:text-[#818CF8] hover:bg-[#4F46E5]/10 dark:hover:bg-[#818CF8]/10'
                  : 'text-neutral-300 dark:text-[#484F58] hover:text-neutral-500 dark:hover:text-[#8B949E] hover:bg-neutral-100 dark:hover:bg-[#21262D]'
            }`}
            title={cardLimitReached && !field.showOnCard ? 'Card badge limit reached (max 5)' : field.showOnCard ? 'Visible on card' : 'Hidden from card'}
          >
            {field.showOnCard ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            )}
          </button>

          {/* Settings gear — always visible on mobile, hover on desktop */}
          {isCustom && (
            <button
              onClick={() => onEdit?.(field)}
              className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-1.5 rounded-md text-neutral-400 dark:text-[#6E7681] hover:text-neutral-700 dark:hover:text-[#E6EDF3] hover:bg-neutral-100 dark:hover:bg-[#21262D] transition-all"
              title="Edit field"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
          )}

          {/* Form toggle — shown for built-in fields with configKey AND custom fields */}
          {showToggle && (
            <button
              onClick={() => onToggle?.(field)}
              className={`w-9 h-5 rounded-full relative flex-shrink-0 transition-colors ${isEnabled ? 'bg-[#4F46E5] dark:bg-[#6366F1]' : 'bg-neutral-300 dark:bg-[#30363D]'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full absolute top-[2px] transition-transform duration-200 ${isEnabled ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
