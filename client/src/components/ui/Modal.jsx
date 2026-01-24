import { useEffect, useCallback } from 'react';

/**
 * Modal - Mobile-first responsive dialog
 * Full screen on mobile, centered overlay on desktop
 */
export function Modal({ isOpen, onClose, title, children, size = 'md' }) {
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

  if (!isOpen) return null;

  const sizes = {
    sm: 'sm:max-w-md',
    md: 'sm:max-w-lg',
    lg: 'sm:max-w-2xl',
    xl: 'sm:max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop - only visible on desktop */}
      <div
        className="hidden sm:block fixed inset-0 bg-neutral-900/50 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal - full screen on mobile, centered on desktop */}
      <div className="fixed inset-0 sm:relative sm:flex sm:min-h-full sm:items-center sm:justify-center sm:p-4">
        <div
          className={`
            h-full w-full bg-white flex flex-col
            sm:relative sm:h-auto sm:rounded-xl sm:shadow-2xl
            ${sizes[size]}
            transform transition-all duration-300 ease-out
          `}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          {/* Header - sticky on mobile */}
          <div className="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 py-4 border-b border-neutral-100 bg-white sticky top-0 z-10">
            <h3 id="modal-title" className="text-base sm:text-lg font-semibold text-neutral-900 pr-8 line-clamp-1">
              {title}
            </h3>
            <button
              onClick={onClose}
              className="absolute right-3 sm:right-4 top-3 sm:top-4 p-2 text-neutral-400 hover:text-neutral-900
                         transition-colors duration-200 rounded-lg hover:bg-neutral-100 active:bg-neutral-200"
              aria-label="Close modal"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content - scrollable */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 sm:max-h-[70vh]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
