import { useState, useEffect, useRef, memo } from 'react';
import { StatusBadge, CategoryBadge, PriorityBadge, TeamBadge, RegionBadge } from '../ui/Badge';
import { votes as votesApi, requests as requestsApi } from '../../lib/api';
import { useFieldVisibility } from '../../hooks/useFieldVisibility';

/**
 * RequestCard - Mobile-first responsive card with inline voting
 * Touch-friendly with hover tooltips on desktop
 */
export const RequestCard = memo(function RequestCard({ request, onClick, onVoteChange, positionChange, showUnreadBadge = false }) {
  const {
    id,
    title,
    category,
    priority,
    status,
    team,
    region,
    author_name,
    created_at,
    business_problem,
    upvotes: initialUpvotes = 0,
    likes: initialLikes = 0,
    userVotes: initialUserVotes = [],
    comment_count = 0,
    isRead = true
  } = request;

  const isUnread = showUnreadBadge && !isRead;
  const { isFieldVisible } = useFieldVisibility();

  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [likes, setLikes] = useState(initialLikes);
  const [userVotes, setUserVotes] = useState(initialUserVotes);
  const [voting, setVoting] = useState(false);
  const [animating, setAnimating] = useState({ upvote: false, like: false });

  // Hover tooltip state (desktop only)
  const [showTooltip, setShowTooltip] = useState(null);
  const [interactions, setInteractions] = useState(null);
  const [loadingInteractions, setLoadingInteractions] = useState(false);
  const tooltipTimeout = useRef(null);

  // Sync state with props when they change
  useEffect(() => {
    setUpvotes(initialUpvotes);
    setLikes(initialLikes);
    setUserVotes(initialUserVotes);
  }, [initialUpvotes, initialLikes, initialUserVotes]);

  const hasUpvoted = userVotes.includes('upvote');
  const hasLiked = userVotes.includes('like');

  // Format date as relative time
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Truncate description for preview
  const previewText = business_problem?.slice(0, 100) || '';

  // Load interactions on hover (desktop)
  const loadInteractions = async () => {
    if (interactions || loadingInteractions) return;
    setLoadingInteractions(true);
    try {
      const data = await requestsApi.getInteractions(id);
      setInteractions(data);
    } catch (err) {
      console.error('Failed to load interactions:', err);
    } finally {
      setLoadingInteractions(false);
    }
  };

  // Handle tooltip show with delay
  const handleTooltipEnter = (type) => {
    loadInteractions();
    tooltipTimeout.current = setTimeout(() => {
      setShowTooltip(type);
    }, 300);
  };

  const handleTooltipLeave = () => {
    if (tooltipTimeout.current) {
      clearTimeout(tooltipTimeout.current);
    }
    setShowTooltip(null);
  };

  // Handle vote click with optimistic update
  const handleVote = async (type, e) => {
    e.stopPropagation();
    if (voting) return;
    setVoting(true);

    // Trigger animation
    setAnimating((prev) => ({ ...prev, [type]: true }));
    setTimeout(() => setAnimating((prev) => ({ ...prev, [type]: false })), 300);

    const hasVoted = type === 'upvote' ? hasUpvoted : hasLiked;

    // Save previous state for rollback
    const prevUpvotes = upvotes;
    const prevLikes = likes;
    const prevUserVotes = userVotes;

    // Optimistic update — apply immediately
    const delta = hasVoted ? -1 : 1;
    const newUpvotes = type === 'upvote' ? upvotes + delta : upvotes;
    const newLikes = type === 'like' ? likes + delta : likes;
    const newUserVotes = hasVoted
      ? userVotes.filter(v => v !== type)
      : [...userVotes, type];

    setUpvotes(newUpvotes);
    setLikes(newLikes);
    setUserVotes(newUserVotes);
    setInteractions(null);
    onVoteChange?.(id, { upvotes: newUpvotes, likes: newLikes, userVotes: newUserVotes });

    try {
      const result = hasVoted
        ? await votesApi.remove(id, type)
        : await votesApi.add(id, type);

      // Reconcile with server truth
      setUpvotes(result.upvotes);
      setLikes(result.likes);
      setUserVotes(result.userVotes || []);
      onVoteChange?.(id, { upvotes: result.upvotes, likes: result.likes, userVotes: result.userVotes || [] });
    } catch (err) {
      // Rollback on error
      setUpvotes(prevUpvotes);
      setLikes(prevLikes);
      setUserVotes(prevUserVotes);
      onVoteChange?.(id, { upvotes: prevUpvotes, likes: prevLikes, userVotes: prevUserVotes });
      console.error('Vote error:', err);
    } finally {
      setVoting(false);
    }
  };

  // Get tooltip content - returns null if no content to show
  const getTooltipContent = (type) => {
    if (loadingInteractions) return 'Loading...';
    if (!interactions) return null;

    const list = type === 'upvote' ? interactions.upvoters :
                 type === 'like' ? interactions.likers :
                 interactions.commenters;

    if (!list || list.length === 0) {
      return null; // Don't show tooltip for empty lists
    }

    const names = list.slice(0, 5).map(u => u.name);
    const remaining = list.length - 5;

    if (remaining > 0) {
      return `${names.join(', ')} +${remaining}`;
    }
    return names.join(', ');
  };

  return (
    <article
      onClick={onClick}
      className={`
        relative group bg-white dark:bg-[#161B22] border rounded-xl p-4 sm:p-5 cursor-pointer
        card-lift
        active:scale-[0.99] active:bg-neutral-50 dark:active:bg-[#21262D]
        ${isUnread
          ? 'border-[#4F46E5]/30 dark:border-[#6366F1]/40 shadow-[0_0_12px_rgba(99,102,241,0.15)] ring-1 ring-[#4F46E5]/20 dark:ring-[#6366F1]/30'
          : 'border-neutral-100 dark:border-[#30363D]/60'}
        ${positionChange === 'up' ? 'animate-slide-up ring-2 ring-green-200 dark:ring-green-500/30' : ''}
        ${positionChange === 'down' ? 'animate-slide-down ring-2 ring-amber-200 dark:ring-amber-500/30' : ''}
      `}
    >
      {/* New badge for unread requests */}
      {isUnread && (
        <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-[#4F46E5] dark:bg-[#6366F1] text-white text-xs font-semibold rounded-full shadow-md z-10">
          New
        </div>
      )}

      {/* Position change indicator */}
      {positionChange && (
        <div className={`
          absolute -left-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center
          text-white text-xs font-bold transition-all duration-500
          ${positionChange === 'up' ? 'bg-green-500' : 'bg-amber-500'}
        `}>
          {positionChange === 'up' ? '↑' : '↓'}
        </div>
      )}

      {/* Header: Category, Priority, Team, Region, Status - responsive */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
          <CategoryBadge category={category} />
          <span className="hidden sm:inline-flex">
            <PriorityBadge priority={priority} />
          </span>
          {isFieldVisible('team') && team && <TeamBadge team={team} />}
          {isFieldVisible('region') && region && <RegionBadge region={region} />}
          {/* Custom field badges (show_on_card fields from list enrichment) */}
          {request.cardCustomValues?.filter(cv => cv.is_enabled !== false && isFieldVisible(`custom_${cv.field_id}`)).map(cv => {
            const displayValue = Array.isArray(cv.value) ? cv.value.join(', ') : String(cv.value ?? '');
            if (!displayValue) return null;
            return (
              <span
                key={cv.field_id}
                className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border"
                style={{
                  backgroundColor: cv.color ? `${cv.color}15` : '#6366F115',
                  color: cv.color || '#6366F1',
                  borderColor: cv.color ? `${cv.color}30` : '#6366F130',
                }}
              >
                {cv.color && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: cv.color }} />}
                {displayValue.length > 20 ? `${displayValue.slice(0, 20)}...` : displayValue}
              </span>
            );
          })}
        </div>
        {/* Status: dot on mobile, badge on desktop */}
        <div className="sm:hidden flex-shrink-0" title={status?.replace('_', ' ')}>
          <span className={`
            w-2.5 h-2.5 rounded-full inline-block
            ${status === 'pending' ? 'bg-neutral-400' : ''}
            ${status === 'backlog' ? 'bg-neutral-500' : ''}
            ${status === 'in_progress' ? 'bg-amber-500' : ''}
            ${status === 'completed' ? 'bg-green-500' : ''}
            ${status === 'rejected' ? 'bg-red-500' : ''}
            ${status === 'duplicate' ? 'bg-neutral-400' : ''}
            ${status === 'archived' ? 'bg-slate-400' : ''}
          `} />
        </div>
        <div className="hidden sm:block">
          <StatusBadge status={status} />
        </div>
      </div>

      {/* Title */}
      <h3 className="text-sm sm:text-base font-medium text-neutral-900 dark:text-[#E6EDF3] mb-2 group-hover:text-neutral-700 dark:group-hover:text-[#8B949E] transition-colors line-clamp-2">
        {title}
      </h3>

      {/* Description preview - hidden on very small screens */}
      {previewText && (
        <p className="hidden sm:block text-sm text-neutral-500 dark:text-[#8B949E] mb-4 line-clamp-2">
          {previewText}{previewText.length >= 100 ? '...' : ''}
        </p>
      )}

      {/* Footer: Author, Date, Engagement */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-neutral-100 dark:border-[#30363D]">
        {/* Author and date */}
        <div className="text-xs text-neutral-400 dark:text-[#6E7681] truncate">
          <span className="text-neutral-600 dark:text-[#8B949E]">
            {request.posted_by_admin_id
              ? (request.on_behalf_of_name || author_name)
              : author_name}
          </span>
          {request.posted_by_admin_id && (
            <span className="text-neutral-400 dark:text-[#6E7681] italic">
              {' '}via {request.posted_by_admin_name}
            </span>
          )}
          <span className="mx-1.5">·</span>
          <span>{formatDate(created_at)}</span>
        </div>

        {/* Interactive engagement buttons - larger touch targets on mobile */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Upvote button */}
          <div className="relative">
            <button
              onClick={(e) => handleVote('upvote', e)}
              onMouseEnter={() => handleTooltipEnter('upvote')}
              onMouseLeave={handleTooltipLeave}
              disabled={voting}
              className={`
                flex items-center gap-1.5 px-2.5 sm:px-2 py-1.5 sm:py-1 rounded-lg sm:rounded text-xs font-medium
                transition-all duration-200 ease-out min-w-[44px] sm:min-w-0 justify-center
                ${hasUpvoted
                  ? 'bg-[#4F46E5] dark:bg-[#6366F1] text-white'
                  : 'bg-neutral-100 dark:bg-[#21262D] text-neutral-500 dark:text-[#8B949E] hover:bg-neutral-200 dark:hover:bg-[#2D333B] hover:text-neutral-900 dark:hover:text-[#E6EDF3] active:bg-neutral-300 dark:active:bg-[#3D444D]'
                }
                ${voting ? 'opacity-50' : ''}
              `}
            >
              <svg
                className={`
                  w-4 h-4 sm:w-3.5 sm:h-3.5 transition-transform duration-200
                  ${animating.upvote ? 'scale-125 -translate-y-0.5' : 'scale-100'}
                `}
                fill={hasUpvoted ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
              </svg>
              <span className={`transition-transform duration-200 ${animating.upvote ? 'scale-110' : ''}`}>
                {upvotes}
              </span>
            </button>
            {/* Tooltip - desktop only, only show if there's content */}
            {showTooltip === 'upvote' && getTooltipContent('upvote') && (
              <div className="hidden sm:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-neutral-900 dark:bg-[#2D333B] text-white dark:text-[#E6EDF3] text-xs rounded-lg whitespace-nowrap z-50 border border-transparent dark:border-[#484F58]">
                {getTooltipContent('upvote')}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-neutral-900 dark:border-t-[#2D333B]" />
              </div>
            )}
          </div>

          {/* Like button */}
          <div className="relative">
            <button
              onClick={(e) => handleVote('like', e)}
              onMouseEnter={() => handleTooltipEnter('like')}
              onMouseLeave={handleTooltipLeave}
              disabled={voting}
              className={`
                flex items-center gap-1.5 px-2.5 sm:px-2 py-1.5 sm:py-1 rounded-lg sm:rounded text-xs font-medium
                transition-all duration-200 ease-out min-w-[44px] sm:min-w-0 justify-center
                ${hasLiked
                  ? 'bg-[#E11D48] dark:bg-[#F43F5E] text-white'
                  : 'bg-neutral-100 dark:bg-[#21262D] text-neutral-500 dark:text-[#8B949E] hover:bg-neutral-200 dark:hover:bg-[#2D333B] hover:text-neutral-900 dark:hover:text-[#E6EDF3] active:bg-neutral-300 dark:active:bg-[#3D444D]'
                }
                ${voting ? 'opacity-50' : ''}
              `}
            >
              <svg
                className={`
                  w-4 h-4 sm:w-3.5 sm:h-3.5 transition-transform duration-200
                  ${animating.like ? 'scale-125' : 'scale-100'}
                `}
                fill={hasLiked ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span className={`transition-transform duration-200 ${animating.like ? 'scale-110' : ''}`}>
                {likes}
              </span>
            </button>
            {/* Tooltip - desktop only, only show if there's content */}
            {showTooltip === 'like' && getTooltipContent('like') && (
              <div className="hidden sm:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-neutral-900 dark:bg-[#2D333B] text-white dark:text-[#E6EDF3] text-xs rounded-lg whitespace-nowrap z-50 border border-transparent dark:border-[#484F58]">
                {getTooltipContent('like')}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-neutral-900 dark:border-t-[#2D333B]" />
              </div>
            )}
          </div>

          {/* Comments count */}
          <div className="relative">
            <span
              onMouseEnter={() => handleTooltipEnter('comment')}
              onMouseLeave={handleTooltipLeave}
              className="flex items-center gap-1.5 px-2.5 sm:px-2 py-1.5 sm:py-1 text-xs text-neutral-400 dark:text-[#6E7681] cursor-default min-w-[44px] sm:min-w-0 justify-center"
            >
              <svg className="w-4 h-4 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {comment_count}
            </span>
            {/* Tooltip - desktop only, only show if there's content */}
            {showTooltip === 'comment' && getTooltipContent('comment') && (
              <div className="hidden sm:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-neutral-900 dark:bg-[#2D333B] text-white dark:text-[#E6EDF3] text-xs rounded-lg whitespace-nowrap z-50 border border-transparent dark:border-[#484F58]">
                {getTooltipContent('comment')}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-neutral-900 dark:border-t-[#2D333B]" />
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}, (prev, next) => {
  return (
    prev.request.id === next.request.id &&
    prev.request.upvotes === next.request.upvotes &&
    prev.request.likes === next.request.likes &&
    prev.request.status === next.request.status &&
    prev.request.isRead === next.request.isRead &&
    prev.positionChange === next.positionChange &&
    prev.showUnreadBadge === next.showUnreadBadge
  );
});
