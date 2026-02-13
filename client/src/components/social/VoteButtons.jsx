import { useState } from 'react';
import { votes as votesApi } from '../../lib/api';

/**
 * VoteButtons - Upvote and like buttons with micro-interactions
 * Uses monochrome design with subtle animations
 */
export function VoteButtons({
  requestId,
  initialUpvotes = 0,
  initialLikes = 0,
  initialUserVotes = [],
  onVoteChange  // Callback when votes change (for reordering)
}) {
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [likes, setLikes] = useState(initialLikes);
  const [userVotes, setUserVotes] = useState(initialUserVotes);
  const [loading, setLoading] = useState(false);
  const [animating, setAnimating] = useState({ upvote: false, like: false });

  const hasUpvoted = userVotes.includes('upvote');
  const hasLiked = userVotes.includes('like');

  // Handle vote with optimistic update
  const handleVote = async (type) => {
    if (loading) return;
    setLoading(true);

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
    onVoteChange?.({ upvotes: newUpvotes, likes: newLikes, userVotes: newUserVotes });

    try {
      const result = hasVoted
        ? await votesApi.remove(requestId, type)
        : await votesApi.add(requestId, type);

      // Reconcile with server truth
      setUpvotes(result.upvotes);
      setLikes(result.likes);
      setUserVotes(result.userVotes || []);
      onVoteChange?.({ upvotes: result.upvotes, likes: result.likes, userVotes: result.userVotes || [] });
    } catch (err) {
      // Rollback on error
      setUpvotes(prevUpvotes);
      setLikes(prevLikes);
      setUserVotes(prevUserVotes);
      onVoteChange?.({ upvotes: prevUpvotes, likes: prevLikes, userVotes: prevUserVotes });
      console.error('Vote error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Upvote button */}
      <button
        onClick={() => handleVote('upvote')}
        disabled={loading}
        className={`
          group flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg sm:rounded-md text-sm font-medium
          transition-all duration-200 ease-out min-w-[44px] min-h-[44px] sm:min-h-0
          active:scale-95
          ${hasUpvoted
            ? 'bg-[#4F46E5] dark:bg-[#6366F1] text-white'
            : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-600 hover:text-neutral-900 dark:hover:text-neutral-100'
          }
          ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <svg
          className={`
            w-4 h-4 transition-transform duration-200
            ${animating.upvote ? 'scale-125' : 'scale-100'}
            ${hasUpvoted ? '' : 'group-hover:-translate-y-0.5'}
          `}
          fill={hasUpvoted ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        </svg>
        <span className={`
          transition-transform duration-200
          ${animating.upvote ? 'scale-110' : 'scale-100'}
        `}>
          {upvotes}
        </span>
      </button>

      {/* Like button */}
      <button
        onClick={() => handleVote('like')}
        disabled={loading}
        className={`
          group flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg sm:rounded-md text-sm font-medium
          transition-all duration-200 ease-out min-w-[44px] min-h-[44px] sm:min-h-0
          active:scale-95
          ${hasLiked
            ? 'bg-[#E11D48] dark:bg-[#F43F5E] text-white'
            : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-600 hover:text-neutral-900 dark:hover:text-neutral-100'
          }
          ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <svg
          className={`
            w-4 h-4 transition-transform duration-200
            ${animating.like ? 'scale-125' : 'scale-100'}
            ${hasLiked ? '' : 'group-hover:scale-110'}
          `}
          fill={hasLiked ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
        <span className={`
          transition-transform duration-200
          ${animating.like ? 'scale-110' : 'scale-100'}
        `}>
          {likes}
        </span>
      </button>
    </div>
  );
}
