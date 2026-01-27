/**
 * Skeleton - Loading placeholder components
 * Provides visual feedback while content loads
 */

export function Skeleton({ className = '', ...props }) {
  return (
    <div
      className={`animate-pulse bg-neutral-200 dark:bg-[#21262D] rounded ${className}`}
      {...props}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-[#161B22] border border-neutral-100 dark:border-[#30363D] rounded-lg p-4 sm:p-5 space-y-4">
      {/* Header badges */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-6 w-16 rounded-md" />
        <Skeleton className="h-5 w-12 rounded" />
        <div className="sm:ml-auto">
          <Skeleton className="h-6 w-20 rounded-md" />
        </div>
      </div>

      {/* Title */}
      <Skeleton className="h-5 w-3/4" />

      {/* Description preview */}
      <div className="hidden sm:block space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-neutral-100 dark:border-[#30363D]">
        <Skeleton className="h-4 w-32" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-14 rounded-lg" />
          <Skeleton className="h-8 w-14 rounded-lg" />
          <Skeleton className="h-8 w-10 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonList({ count = 3 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

/**
 * Skeleton for request detail page
 */
export function RequestDetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Back button placeholder */}
      <Skeleton className="h-4 w-32" />

      {/* Main card */}
      <div className="bg-white dark:bg-[#161B22] rounded-xl border border-neutral-200 dark:border-[#30363D] shadow-sm p-6 space-y-6">
        {/* Title */}
        <Skeleton className="h-7 w-3/4" />

        {/* Header: Author, Date, Badges */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-28" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-20 rounded-md" />
            <Skeleton className="h-6 w-16 rounded-md" />
            <Skeleton className="h-6 w-24 rounded-md" />
          </div>
        </div>

        {/* Status bar */}
        <div className="p-4 bg-neutral-50 dark:bg-[#0D1117] rounded-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-9 w-32 rounded-lg" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-16 rounded-lg" />
              <Skeleton className="h-8 w-16 rounded-lg" />
            </div>
          </div>
        </div>

        {/* Content sections */}
        <div className="space-y-4">
          <div>
            <Skeleton className="h-3 w-28 mb-2" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
          <div>
            <Skeleton className="h-3 w-24 mb-2" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        </div>

        {/* Comments section */}
        <div className="pt-4 border-t border-neutral-100 dark:border-[#30363D]">
          <Skeleton className="h-3 w-20 mb-4" />
          <Skeleton className="h-20 w-full rounded-lg mb-4" />
          <div className="space-y-3">
            <div className="flex gap-3">
              <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
