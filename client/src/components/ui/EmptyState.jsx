import { Button } from './Button';

/**
 * Empty state component with illustration and CTA
 */
export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
}) {
  return (
    <div className="text-center py-12 px-4">
      {/* Icon/Illustration */}
      <div className="w-12 h-12 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
        {icon || (
          <svg
            className="w-6 h-6 text-neutral-400 dark:text-neutral-500"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
        )}
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto mb-6">
          {description}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center justify-center gap-3">
        {actionLabel && onAction && (
          <Button onClick={onAction}>{actionLabel}</Button>
        )}
        {secondaryLabel && onSecondary && (
          <Button variant="secondary" onClick={onSecondary}>
            {secondaryLabel}
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Empty state for no requests
 */
export function NoRequestsEmptyState({ onCreateNew }) {
  return (
    <EmptyState
      icon={
        <svg
          className="w-6 h-6 text-neutral-400 dark:text-neutral-500"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      }
      title="No requests yet"
      description="Be the first to submit a request. Your ideas help shape the product!"
      actionLabel="Create first request"
      onAction={onCreateNew}
    />
  );
}

/**
 * Empty state for no filter matches
 */
export function NoMatchesEmptyState({ onClearFilters }) {
  return (
    <EmptyState
      icon={
        <svg
          className="w-6 h-6 text-neutral-400 dark:text-neutral-500"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
          />
        </svg>
      }
      title="No matching requests"
      description="Try adjusting your filters or search terms to find what you're looking for."
      actionLabel="Clear filters"
      onAction={onClearFilters}
    />
  );
}

export default EmptyState;
