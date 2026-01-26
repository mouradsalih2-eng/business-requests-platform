/**
 * Filter chips component - shows active filters with remove buttons
 */
export function FilterChips({ filters, onRemove, onClearAll }) {
  // Build list of active filter chips
  const activeFilters = [];

  if (filters.status) {
    activeFilters.push({
      key: 'status',
      label: 'Status',
      value: filters.status.replace('_', ' '),
    });
  }

  if (filters.category) {
    activeFilters.push({
      key: 'category',
      label: 'Category',
      value: filters.category.replace('_', ' '),
    });
  }

  if (filters.priority) {
    activeFilters.push({
      key: 'priority',
      label: 'Priority',
      value: filters.priority,
    });
  }

  if (filters.team) {
    activeFilters.push({
      key: 'team',
      label: 'Team',
      value: filters.team,
    });
  }

  if (filters.region) {
    activeFilters.push({
      key: 'region',
      label: 'Region',
      value: filters.region,
    });
  }

  if (filters.period) {
    activeFilters.push({
      key: 'period',
      label: 'Period',
      value: filters.period,
    });
  }

  if (activeFilters.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 flex-wrap mb-4">
      {activeFilters.map((filter) => (
        <button
          key={filter.key}
          onClick={() => onRemove(filter.key)}
          className="
            inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
            bg-indigo-50 dark:bg-indigo-900/30
            text-indigo-700 dark:text-indigo-300
            text-xs font-medium
            hover:bg-indigo-100 dark:hover:bg-indigo-900/50
            transition-colors
            group
          "
        >
          <span className="text-indigo-500 dark:text-indigo-400">{filter.label}:</span>
          <span className="capitalize">{filter.value}</span>
          <svg
            className="w-3.5 h-3.5 text-indigo-400 dark:text-indigo-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-300"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      ))}

      {activeFilters.length > 1 && (
        <button
          onClick={onClearAll}
          className="
            text-xs text-neutral-500 dark:text-neutral-400
            hover:text-neutral-700 dark:hover:text-neutral-200
            underline underline-offset-2
          "
        >
          Clear all
        </button>
      )}
    </div>
  );
}

export default FilterChips;
