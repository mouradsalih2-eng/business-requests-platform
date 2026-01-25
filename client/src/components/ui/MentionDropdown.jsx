import { forwardRef } from 'react';

/**
 * MentionDropdown - Autocomplete dropdown for @mentions
 * Shows user suggestions when typing @ in comment input
 */
export const MentionDropdown = forwardRef(function MentionDropdown(
  { users, selectedIndex, onSelect, position, visible },
  ref
) {
  if (!visible || users.length === 0) return null;

  return (
    <div
      ref={ref}
      className="absolute z-50 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg
                 max-h-48 overflow-y-auto min-w-[200px]"
      style={{
        top: position?.top ?? 'auto',
        left: position?.left ?? 0,
        bottom: position?.bottom ?? 'auto',
      }}
    >
      {users.map((user, index) => (
        <button
          key={user.id}
          type="button"
          onClick={() => onSelect(user)}
          className={`
            w-full px-3 py-2 text-left flex items-center gap-2 transition-colors
            ${index === selectedIndex
              ? 'bg-neutral-100 dark:bg-neutral-700'
              : 'hover:bg-neutral-50 dark:hover:bg-neutral-700/50'
            }
          `}
        >
          {/* User avatar */}
          <div className="w-6 h-6 rounded-full bg-neutral-200 dark:bg-neutral-600 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
              {user.name?.charAt(0)?.toUpperCase() || '?'}
            </span>
          </div>
          {/* User info */}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
              {user.name}
            </div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
              {user.email}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
});
