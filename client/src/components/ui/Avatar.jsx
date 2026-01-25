import { useState, useEffect } from 'react';

const sizeClasses = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg',
  xl: 'w-16 h-16 text-xl',
  '2xl': 'w-20 h-20 text-2xl',
};

export default function Avatar({
  src,
  name,
  size = 'md',
  className = '',
  onClick,
}) {
  const [imageError, setImageError] = useState(false);

  // Reset error state when src changes (e.g., new image uploaded)
  useEffect(() => {
    setImageError(false);
  }, [src]);

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const baseClasses = `
    inline-flex items-center justify-center rounded-full
    font-medium select-none flex-shrink-0
    ${sizeClasses[size] || sizeClasses.md}
    ${onClick ? 'cursor-pointer' : ''}
    ${className}
  `.trim();

  // Show image if src is provided and hasn't errored
  if (src && !imageError) {
    return (
      <img
        src={src}
        alt={name || 'Avatar'}
        className={`${baseClasses} object-cover`}
        onError={() => setImageError(true)}
        onClick={onClick}
      />
    );
  }

  // Show initials fallback
  return (
    <div
      className={`${baseClasses} bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300`}
      onClick={onClick}
      title={name}
    >
      {getInitials(name)}
    </div>
  );
}
