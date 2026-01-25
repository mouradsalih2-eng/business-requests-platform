/**
 * Card components - container with consistent styling
 * Uses subtle shadows and borders for depth
 */

export function Card({ children, className = '', hover = false, ...props }) {
  return (
    <div
      className={`
        bg-white dark:bg-[#161B22] rounded-xl border border-neutral-100 dark:border-[#30363D] shadow-sm
        ${hover ? 'transition-all duration-200 hover:shadow-md hover:border-neutral-200 dark:hover:border-[#484F58]' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }) {
  return (
    <div className={`px-6 py-4 border-b border-neutral-100 dark:border-[#30363D] ${className}`}>
      {children}
    </div>
  );
}

export function CardBody({ children, className = '' }) {
  return (
    <div className={`px-6 py-5 ${className}`}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = '' }) {
  return (
    <div className={`px-6 py-4 border-t border-neutral-100 dark:border-[#30363D] bg-neutral-50/50 dark:bg-[#0D1117]/50 rounded-b-xl ${className}`}>
      {children}
    </div>
  );
}
