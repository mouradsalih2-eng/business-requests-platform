/**
 * Select dropdown component - minimal styling
 */
export function Select({
  label,
  options,
  error,
  className = '',
  placeholder = 'Select...',
  ...props
}) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wide">
          {label}
        </label>
      )}
      <select
        className={`
          w-full px-3 py-2.5 bg-white border border-neutral-200 rounded-lg
          text-sm text-neutral-900 transition-all duration-200
          hover:border-neutral-300
          focus:outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10
          appearance-none cursor-pointer
          ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500/10' : ''}
          ${className}
        `}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23737373' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
          backgroundPosition: 'right 0.5rem center',
          backgroundRepeat: 'no-repeat',
          backgroundSize: '1.25em 1.25em',
          paddingRight: '2rem',
        }}
        {...props}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}
