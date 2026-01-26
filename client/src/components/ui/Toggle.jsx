/**
 * Toggle - Accessible toggle switch component
 * Used for feature flags and on/off settings
 */

export function Toggle({ checked, onChange, disabled = false, label, description }) {
  const handleClick = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        {label && (
          <span className="font-medium text-neutral-900 dark:text-neutral-100">
            {label}
          </span>
        )}
        {description && (
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            {description}
          </p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={`
          relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4F46E5] dark:focus:ring-offset-neutral-900
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${checked
            ? 'bg-[#4F46E5] dark:bg-[#6366F1]'
            : 'bg-neutral-300 dark:bg-neutral-600'
          }
        `}
      >
        <span
          className={`
            absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ease-in-out
            ${checked ? 'translate-x-5' : 'translate-x-0'}
          `}
        />
      </button>
    </div>
  );
}
