import { useState } from 'react';

/**
 * Input and Textarea components - clean, accessible styling
 * Features visible focus states and proper error handling
 */

// Eye icon for showing password
function EyeIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

// Eye-off icon for hiding password
function EyeOffIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  );
}

export function Input({
  label,
  error,
  className = '',
  type = 'text',
  showPasswordToggle = false,
  ...props
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isPasswordField = type === 'password';
  const inputType = isPasswordField && showPassword ? 'text' : type;

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-xs font-medium text-neutral-500 dark:text-[#8B949E] uppercase tracking-wide">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          type={inputType}
          className={`
            w-full px-3 py-2.5 bg-white dark:bg-[#0D1117] border border-neutral-200 dark:border-[#30363D] rounded-lg
            text-sm text-neutral-900 dark:text-[#E6EDF3] placeholder-neutral-400 dark:placeholder-[#6E7681]
            transition-all duration-200
            hover:border-neutral-300 dark:hover:border-[#484F58]
            focus:outline-none focus:border-[#4F46E5] dark:focus:border-[#6366F1] focus:ring-2 focus:ring-[#4F46E5]/20 dark:focus:ring-[#6366F1]/20
            disabled:bg-neutral-50 dark:disabled:bg-[#161B22] disabled:text-neutral-400 dark:disabled:text-[#6E7681] disabled:cursor-not-allowed
            ${error ? 'border-red-300 dark:border-red-500/50 focus:border-red-500 focus:ring-red-500/20' : ''}
            ${isPasswordField && showPasswordToggle ? 'pr-10' : ''}
            ${className}
          `}
          {...props}
        />
        {isPasswordField && showPasswordToggle && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300 transition-colors"
            tabIndex={-1}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <EyeOffIcon className="w-5 h-5" />
            ) : (
              <EyeIcon className="w-5 h-5" />
            )}
          </button>
        )}
      </div>
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
