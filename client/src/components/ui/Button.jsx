/**
 * Button component - Tesla-inspired minimal design
 * Variants: primary (filled), secondary (outlined), ghost (text only)
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  type = 'button',
  ...props
}) {
  const base = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/30 dark:focus:ring-[#6366F1]/30 focus:ring-offset-1 dark:focus:ring-offset-[#0D1117] disabled:opacity-40 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-[#4F46E5] dark:bg-[#6366F1] text-white hover:bg-[#4338CA] dark:hover:bg-[#818CF8] active:bg-[#3730A3] dark:active:bg-[#6366F1]',
    secondary: 'bg-white dark:bg-[#21262D] text-neutral-900 dark:text-[#E6EDF3] border border-neutral-200 dark:border-[#30363D] hover:border-neutral-300 dark:hover:border-[#484F58] hover:bg-neutral-50 dark:hover:bg-[#2D333B]',
    ghost: 'text-neutral-600 dark:text-[#8B949E] hover:text-neutral-900 dark:hover:text-[#E6EDF3] hover:bg-neutral-100 dark:hover:bg-[#21262D]',
    danger: 'bg-red-600 dark:bg-red-500 text-white hover:bg-red-700 dark:hover:bg-red-600 active:bg-red-800',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-2.5 text-sm',
  };

  return (
    <button
      type={type}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
