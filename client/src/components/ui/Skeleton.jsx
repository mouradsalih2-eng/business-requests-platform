/**
 * Skeleton - Loading placeholder components
 * Provides visual feedback while content loads
 */

export function Skeleton({ className = '', ...props }) {
  return (
    <div
      className={`animate-pulse bg-neutral-200 rounded ${className}`}
      {...props}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-white border border-neutral-100 rounded-lg p-4 sm:p-5 space-y-4">
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
      <div className="flex items-center justify-between pt-3 border-t border-neutral-100">
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
