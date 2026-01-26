import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook for pull-to-refresh functionality on mobile
 * @param {Function} onRefresh - Callback to execute on refresh
 * @param {Object} options - Configuration options
 * @param {number} options.threshold - Pull distance to trigger refresh (default: 80px)
 * @param {number} options.maxPull - Maximum pull distance (default: 120px)
 */
export function usePullToRefresh(onRefresh, options = {}) {
  const { threshold = 80, maxPull = 120 } = options;

  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);

  const startYRef = useRef(0);
  const currentYRef = useRef(0);
  const containerRef = useRef(null);

  // Check if we're at the top of the page
  const isAtTop = useCallback(() => {
    if (containerRef.current) {
      return containerRef.current.scrollTop === 0;
    }
    return window.scrollY === 0;
  }, []);

  // Handle touch start
  const handleTouchStart = useCallback((e) => {
    if (isRefreshing) return;
    if (!isAtTop()) return;

    startYRef.current = e.touches[0].clientY;
    currentYRef.current = startYRef.current;
    setIsPulling(true);
  }, [isRefreshing, isAtTop]);

  // Handle touch move
  const handleTouchMove = useCallback((e) => {
    if (!isPulling || isRefreshing) return;
    if (!isAtTop()) {
      setIsPulling(false);
      setPullDistance(0);
      return;
    }

    currentYRef.current = e.touches[0].clientY;
    const delta = currentYRef.current - startYRef.current;

    if (delta > 0) {
      // Apply resistance as pull distance increases
      const resistance = Math.min(1, 1 - delta / (maxPull * 3));
      const distance = Math.min(maxPull, delta * resistance);
      setPullDistance(distance);

      // Prevent default scroll when pulling
      if (delta > 10) {
        e.preventDefault();
      }
    }
  }, [isPulling, isRefreshing, isAtTop, maxPull]);

  // Handle touch end
  const handleTouchEnd = useCallback(async () => {
    if (!isPulling) return;

    setIsPulling(false);

    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(threshold); // Keep at threshold during refresh

      try {
        await onRefresh?.();
      } catch (error) {
        console.error('Refresh failed:', error);
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [isPulling, pullDistance, threshold, isRefreshing, onRefresh]);

  // Set up event listeners
  useEffect(() => {
    const element = containerRef.current || window;
    const target = containerRef.current || document;

    target.addEventListener('touchstart', handleTouchStart, { passive: true });
    target.addEventListener('touchmove', handleTouchMove, { passive: false });
    target.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      target.removeEventListener('touchstart', handleTouchStart);
      target.removeEventListener('touchmove', handleTouchMove);
      target.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Calculate progress (0 to 1)
  const progress = Math.min(1, pullDistance / threshold);

  return {
    containerRef,
    isPulling,
    isRefreshing,
    pullDistance,
    progress,
    // Component to render the pull indicator
    PullIndicator: () => (
      pullDistance > 0 || isRefreshing ? (
        <div
          className="flex items-center justify-center transition-transform duration-200 ease-out"
          style={{
            height: pullDistance,
            transform: `translateY(${pullDistance > 0 ? 0 : -pullDistance}px)`,
          }}
        >
          <div
            className={`
              w-8 h-8 rounded-full border-2 border-neutral-300 dark:border-neutral-600
              flex items-center justify-center
              ${isRefreshing ? 'animate-spin border-t-indigo-500 dark:border-t-indigo-400' : ''}
            `}
            style={{
              transform: `rotate(${progress * 180}deg)`,
              opacity: Math.min(1, progress * 1.5),
            }}
          >
            {!isRefreshing && (
              <svg
                className="w-4 h-4 text-neutral-500 dark:text-neutral-400"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            )}
          </div>
        </div>
      ) : null
    ),
  };
}

export default usePullToRefresh;
