/**
 * Card components - container with consistent styling
 * Uses subtle shadows and borders for depth
 */

export function Card({ children, className = '', hover = false, ...props }) {
  return (
    <div
      className={`
        bg-white rounded-xl border border-neutral-100 shadow-sm
        ${hover ? 'transition-all duration-200 hover:shadow-md hover:border-neutral-200' : ''}
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
    <div className={`px-6 py-4 border-b border-neutral-100 ${className}`}>
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
    <div className={`px-6 py-4 border-t border-neutral-100 bg-neutral-50/50 rounded-b-xl ${className}`}>
      {children}
    </div>
  );
}
