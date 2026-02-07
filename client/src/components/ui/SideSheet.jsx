import { useEffect, useCallback } from 'react';

/**
 * SideSheet - Slide-in panel from the right
 * Used for filters, settings, and secondary actions
 */
export function SideSheet({ isOpen, onClose, title, children }) {
  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Handle escape key
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`
          fixed inset-0 bg-black/50 dark:bg-[#0D1117]/80 z-40 transition-opacity duration-300
          ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Side Sheet */}
      <div
        className={`
          fixed top-0 right-0 bottom-0 w-full sm:max-w-md bg-white dark:bg-[#161B22] z-50
          shadow-2xl transform transition-transform duration-300 ease-out
          flex flex-col border-l border-neutral-200 dark:border-[#30363D]
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sidesheet-title"
      >
        {/* Header */}
        <div className="flex items-center px-4 py-4 border-b border-neutral-100 dark:border-[#30363D]">
          {/* Back button */}
          <button
            onClick={onClose}
            className="p-2 -ml-2 mr-2 text-neutral-600 dark:text-[#8B949E] hover:text-neutral-900 dark:hover:text-[#E6EDF3] hover:bg-neutral-100 dark:hover:bg-[#21262D] rounded-lg transition-colors"
            aria-label="Go back"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h3 id="sidesheet-title" className="flex-1 text-base font-semibold text-neutral-900 dark:text-[#E6EDF3]">
            {title}
          </h3>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {children}
        </div>
      </div>
    </>
  );
}
