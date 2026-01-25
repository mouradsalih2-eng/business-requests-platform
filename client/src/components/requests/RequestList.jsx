import { RequestCard } from './RequestCard';

/**
 * RequestList - Displays a grid of request cards with position change animations
 * Supports real-time vote updates via onVoteChange callback
 * Supports exit animations for archived/deleted items via exitingIds
 */
export function RequestList({
  requests,
  onRequestClick,
  onVoteChange,
  positionChanges = {},
  exitingIds = new Set(),
  emptyMessage = 'No requests found',
  showUnreadBadge = false
}) {
  if (requests.length === 0) {
    return (
      <div className="text-center py-16 px-4">
        <div className="w-16 h-16 mx-auto mb-4 bg-neutral-100 dark:bg-neutral-700 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-neutral-400 dark:text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <p className="text-neutral-600 dark:text-neutral-300 font-medium mb-1">{emptyMessage}</p>
        <p className="text-sm text-neutral-400 dark:text-neutral-500">Try adjusting your filters or search query</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {requests.map((request) => {
        const isExiting = exitingIds.has(request.id);
        return (
          <div
            key={request.id}
            className={`
              relative transition-all duration-300 ease-out
              ${isExiting ? 'opacity-0 scale-95 -translate-x-4' : 'opacity-100 scale-100 translate-x-0'}
            `}
          >
            <RequestCard
              request={request}
              onClick={() => onRequestClick(request)}
              onVoteChange={onVoteChange}
              positionChange={positionChanges[request.id]}
              showUnreadBadge={showUnreadBadge}
            />
          </div>
        );
      })}
    </div>
  );
}
