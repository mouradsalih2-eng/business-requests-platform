/**
 * Spinner - Reusable loading indicator component
 * Provides consistent loading animations across the application
 */

/**
 * @param {Object} props
 * @param {'xs' | 'sm' | 'md' | 'lg'} [props.size='sm'] - Size variant
 * @param {string} [props.className] - Additional CSS classes
 */
export function Spinner({ size = 'sm', className = '' }) {
  const sizes = {
    xs: 'w-3 h-3 border',
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-2'
  };

  return (
    <div
      className={`
        ${sizes[size]}
        border-neutral-300 dark:border-neutral-600
        border-t-indigo-500 dark:border-t-indigo-400
        rounded-full animate-spin
        ${className}
      `.trim().replace(/\s+/g, ' ')}
    />
  );
}

export default Spinner;
