import { StatusBadge, CategoryBadge, PriorityBadge, TeamBadge, RegionBadge } from '../ui/Badge';
import { isCardEligible } from './FormBuilder';

const STATUS_DOT_COLORS = {
  pending: 'bg-amber-400',
  backlog: 'bg-blue-400',
  in_progress: 'bg-sky-500',
  completed: 'bg-emerald-500',
  rejected: 'bg-red-500',
  duplicate: 'bg-neutral-400',
  archived: 'bg-neutral-400',
};

/**
 * Returns a type-appropriate preview value for a custom field badge.
 */
function getBadgeContent(field) {
  const type = field.type || field.field_type;

  switch (type) {
    case 'rating': {
      const max = field.validation?.max_rating || 5;
      const filled = Math.ceil(max * 0.8); // Show 4/5 or 3/3 etc.
      return (
        <span className="inline-flex items-center gap-0.5">
          {Array.from({ length: max }, (_, i) => (
            <span key={i} className={`text-[9px] leading-none ${i < filled ? 'opacity-100' : 'opacity-30'}`}>&#9733;</span>
          ))}
        </span>
      );
    }
    case 'number':
      return (
        <span className="inline-flex items-center gap-1">
          <span className="font-semibold">42</span>
        </span>
      );
    case 'date':
      return (
        <span className="inline-flex items-center gap-1">
          <svg className="w-2.5 h-2.5 opacity-60" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
          Mar 15
        </span>
      );
    case 'checkbox':
      return (
        <span className="inline-flex items-center gap-1">
          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          Yes
        </span>
      );
    case 'select':
    case 'multi_select': {
      // Show first option if available, otherwise label
      const firstOpt = Array.isArray(field.options) && field.options.length > 0
        ? (typeof field.options[0] === 'string' ? field.options[0] : field.options[0].label)
        : null;
      return firstOpt || field.label;
    }
    case 'url':
      return (
        <span className="inline-flex items-center gap-1">
          <svg className="w-2.5 h-2.5 opacity-60" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.504a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.243 8.88" />
          </svg>
          Link
        </span>
      );
    default:
      return field.label;
  }
}

/**
 * CardPreview - Shows how request cards will look with selected visible fields.
 * Mirrors the actual RequestCard design exactly, including mobile dot behavior.
 */
export function CardPreview({ fields, maxCardFields = 5 }) {
  // Only card-eligible fields count toward the badge limit and render
  const cardFields = fields.filter((f) => f.showOnCard && f.enabled !== false && isCardEligible(f));
  const MAX_CARD_FIELDS = maxCardFields;

  // Separate built-in badge fields from custom fields
  const builtInBadges = cardFields.filter((f) => !f.isCustom);
  const customBadges = cardFields.filter((f) => f.isCustom);

  return (
    <div className="bg-white dark:bg-[#0D1117] border border-neutral-200 dark:border-[#30363D]/60 rounded-xl p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-1">
        <svg className="w-4 h-4 text-neutral-400 dark:text-[#6E7681]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-[#E6EDF3]">Request Card</h3>
      </div>
      <p className="text-[11px] text-neutral-500 dark:text-[#6E7681] mb-4">
        How requests appear in the dashboard list. Fields with the eye icon show as badges.
      </p>

      {/* Simulated RequestCard — mirrors the real RequestCard layout */}
      <article className="bg-white dark:bg-[#161B22] border border-neutral-100 dark:border-[#30363D]/40 rounded-xl p-4 sm:p-5 card-lift">
        {/* Header: badges + status */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap flex-1 min-w-0">
            {builtInBadges.map((field) => {
              if (field.key === 'category') return <span key={field.key} className="animate-in badge-pop duration-200"><CategoryBadge category="new_feature" /></span>;
              if (field.key === 'priority') return (
                <span key={field.key} className="hidden sm:inline-flex animate-in badge-pop duration-200">
                  <PriorityBadge priority="high" />
                </span>
              );
              if (field.key === 'team') return <span key={field.key} className="animate-in badge-pop duration-200"><TeamBadge team="Engineering" /></span>;
              if (field.key === 'region') return <span key={field.key} className="animate-in badge-pop duration-200"><RegionBadge region="EMEA" /></span>;
              return null;
            })}
            {customBadges.map((field) => (
              <span
                key={field.key || field.id || field.label}
                className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-medium px-1.5 sm:px-2 py-0.5 rounded animate-in badge-pop duration-200"
                style={
                  field.color
                    ? { backgroundColor: `${field.color}18`, color: field.color, border: `1px solid ${field.color}30` }
                    : undefined
                }
              >
                {getBadgeContent(field)}
              </span>
            ))}
          </div>
          {/* Status: dot on mobile, badge on desktop */}
          <div className="sm:hidden flex-shrink-0">
            <span className={`w-2.5 h-2.5 rounded-full inline-block ${STATUS_DOT_COLORS.pending}`} />
          </div>
          <div className="hidden sm:block">
            <StatusBadge status="pending" />
          </div>
        </div>

        {/* Title */}
        <h3 className="text-sm sm:text-base font-medium text-neutral-900 dark:text-[#E6EDF3] mb-1.5 line-clamp-2">
          Improve search performance for large datasets
        </h3>

        {/* Description preview — desktop only */}
        <p className="hidden sm:block text-xs text-neutral-500 dark:text-[#8B949E] mb-4 line-clamp-2">
          Multiple users have reported slow search results when querying datasets with over 10,000 records...
        </p>

        {/* Footer: Author, Date, Engagement */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-neutral-100 dark:border-[#30363D]/40">
          <div className="text-xs text-neutral-400 dark:text-[#6E7681] truncate">
            <span className="text-neutral-600 dark:text-[#8B949E]">Alex Kim</span>
            <span className="mx-1.5">&middot;</span>
            <span>2d ago</span>
          </div>

          {/* Engagement buttons — matching RequestCard mobile sizes */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Upvote */}
            <span className="flex items-center gap-1.5 min-w-[44px] sm:min-w-0 justify-center px-2.5 sm:px-2 py-1.5 sm:py-1 rounded-lg sm:rounded text-xs font-medium bg-[#4F46E5] dark:bg-[#6366F1] text-white">
              <svg className="w-4 h-4 sm:w-3.5 sm:h-3.5" fill="currentColor" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
              </svg>
              24
            </span>

            {/* Like */}
            <span className="flex items-center gap-1.5 min-w-[44px] sm:min-w-0 justify-center px-2.5 sm:px-2 py-1.5 sm:py-1 rounded-lg sm:rounded text-xs font-medium bg-neutral-100 dark:bg-[#21262D] text-neutral-500 dark:text-[#8B949E]">
              <svg className="w-4 h-4 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              8
            </span>

            {/* Comments */}
            <span className="flex items-center gap-1.5 min-w-[44px] sm:min-w-0 justify-center px-2.5 sm:px-2 py-1.5 sm:py-1 text-xs text-neutral-400 dark:text-[#6E7681]">
              <svg className="w-4 h-4 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              5
            </span>
          </div>
        </div>
      </article>

      {/* Badge summary */}
      <div className="mt-4 p-3 bg-neutral-50 dark:bg-[#161B22]/50 rounded-lg border border-neutral-100 dark:border-[#30363D]/30">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] text-neutral-500 dark:text-[#6E7681] font-medium">
            Card badges
          </p>
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
            cardFields.length >= MAX_CARD_FIELDS
              ? 'bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20'
              : 'bg-neutral-100 dark:bg-[#21262D] text-neutral-500 dark:text-[#8B949E]'
          }`}>
            {cardFields.length}/{MAX_CARD_FIELDS} used
          </span>
        </div>
        {/* Progress bar */}
        <div className="h-1.5 bg-neutral-200 dark:bg-[#21262D] rounded-full mb-2.5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              cardFields.length >= MAX_CARD_FIELDS
                ? 'bg-amber-500 dark:bg-amber-400'
                : 'bg-[#6366F1]'
            }`}
            style={{ width: `${Math.min((cardFields.length / MAX_CARD_FIELDS) * 100, 100)}%` }}
          />
        </div>
        {cardFields.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {cardFields.map((field) => (
              <span
                key={field.key || field.id || field.label}
                className="text-[10px] px-2 py-0.5 rounded animate-in badge-pop duration-150"
                style={
                  field.color
                    ? { backgroundColor: `${field.color}12`, color: field.color, border: `1px solid ${field.color}20` }
                    : undefined
                }
              >
                {field.label}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[10px] text-neutral-400 dark:text-[#484F58] italic">
            No badges selected. Use the eye icon on fields to add card badges.
          </p>
        )}
        {cardFields.length >= MAX_CARD_FIELDS && (
          <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1">
            <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Badge limit reached. Remove a badge before adding more.
          </p>
        )}
      </div>

      <p className="text-[10px] text-neutral-400 dark:text-[#484F58] mt-3 flex items-center gap-1.5">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Use the eye icon on each field to toggle card badge visibility
      </p>
    </div>
  );
}
