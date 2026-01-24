/**
 * Input and Textarea components - clean, accessible styling
 * Features visible focus states and proper error handling
 */

export function Input({
  label,
  error,
  className = '',
  ...props
}) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wide">
          {label}
        </label>
      )}
      <input
        className={`
          w-full px-3 py-2.5 bg-white border border-neutral-200 rounded-lg
          text-sm text-neutral-900 placeholder-neutral-400
          transition-all duration-200
          hover:border-neutral-300
          focus:outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10
          disabled:bg-neutral-50 disabled:text-neutral-400 disabled:cursor-not-allowed
          ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500/10' : ''}
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}

export function Textarea({
  label,
  error,
  placeholder,
  className = '',
  rows = 3,
  ...props
}) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wide">
          {label}
        </label>
      )}
      <textarea
        rows={rows}
        placeholder={placeholder}
        className={`
          w-full px-3 py-2.5 bg-white border border-neutral-200 rounded-lg
          text-sm text-neutral-900 placeholder-neutral-400
          transition-all duration-200 resize-none
          hover:border-neutral-300
          focus:outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10
          disabled:bg-neutral-50 disabled:text-neutral-400 disabled:cursor-not-allowed
          ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500/10' : ''}
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}
