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
        <label className="block text-xs font-medium text-neutral-500 dark:text-[#8B949E] uppercase tracking-wide">
          {label}
        </label>
      )}
      <input
        className={`
          w-full px-3 py-2.5 bg-white dark:bg-[#0D1117] border border-neutral-200 dark:border-[#30363D] rounded-lg
          text-sm text-neutral-900 dark:text-[#E6EDF3] placeholder-neutral-400 dark:placeholder-[#6E7681]
          transition-all duration-200
          hover:border-neutral-300 dark:hover:border-[#484F58]
          focus:outline-none focus:border-[#4F46E5] dark:focus:border-[#6366F1] focus:ring-2 focus:ring-[#4F46E5]/20 dark:focus:ring-[#6366F1]/20
          disabled:bg-neutral-50 dark:disabled:bg-[#161B22] disabled:text-neutral-400 dark:disabled:text-[#6E7681] disabled:cursor-not-allowed
          ${error ? 'border-red-300 dark:border-red-500/50 focus:border-red-500 focus:ring-red-500/20' : ''}
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="text-xs text-red-500 dark:text-red-400">{error}</p>
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
        <label className="block text-xs font-medium text-neutral-500 dark:text-[#8B949E] uppercase tracking-wide">
          {label}
        </label>
      )}
      <textarea
        rows={rows}
        placeholder={placeholder}
        className={`
          w-full px-3 py-2.5 bg-white dark:bg-[#0D1117] border border-neutral-200 dark:border-[#30363D] rounded-lg
          text-sm text-neutral-900 dark:text-[#E6EDF3] placeholder-neutral-400 dark:placeholder-[#6E7681]
          transition-all duration-200 resize-none
          hover:border-neutral-300 dark:hover:border-[#484F58]
          focus:outline-none focus:border-[#4F46E5] dark:focus:border-[#6366F1] focus:ring-2 focus:ring-[#4F46E5]/20 dark:focus:ring-[#6366F1]/20
          disabled:bg-neutral-50 dark:disabled:bg-[#161B22] disabled:text-neutral-400 dark:disabled:text-[#6E7681] disabled:cursor-not-allowed
          ${error ? 'border-red-300 dark:border-red-500/50 focus:border-red-500 focus:ring-red-500/20' : ''}
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="text-xs text-red-500 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
