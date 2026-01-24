/**
 * Badge components for status, category, and priority
 * Uses monochrome design with subtle icons for clarity
 */

// Status styles - semantic colors for clarity
const statusStyles = {
  pending: 'bg-neutral-100 text-neutral-600',
  backlog: 'bg-neutral-100 text-neutral-500',
  in_progress: 'bg-amber-50 text-amber-700 border border-amber-200',
  completed: 'bg-green-50 text-green-700 border border-green-200',
  rejected: 'bg-red-50 text-red-600 border border-red-200 line-through',
  duplicate: 'bg-neutral-100 text-neutral-400',
};

// Human-readable labels
const statusLabels = {
  pending: 'Pending',
  backlog: 'Backlog',
  in_progress: 'In Progress',
  completed: 'Completed',
  rejected: 'Rejected',
  duplicate: 'Duplicate',
};

const categoryLabels = {
  bug: 'Bug',
  new_feature: 'Feature',
  optimization: 'Optimize',
};

const priorityLabels = {
  low: 'Low',
  medium: 'Med',
  high: 'High',
};

// Category icons as SVG components
const CategoryIcons = {
  bug: () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  new_feature: () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  ),
  optimization: () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
};

export function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${statusStyles[status] || 'bg-neutral-100 text-neutral-600'}`}>
      {statusLabels[status] || status}
    </span>
  );
}

export function CategoryBadge({ category }) {
  const Icon = CategoryIcons[category];

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-700 bg-neutral-100 px-2.5 py-1 rounded-md">
      {Icon && <Icon />}
      {categoryLabels[category] || category}
    </span>
  );
}

export function PriorityBadge({ priority }) {
  // Priority shown with color-coded background
  const priorityStyles = {
    low: 'bg-neutral-100 text-neutral-500',
    medium: 'bg-amber-50 text-amber-700 border border-amber-200',
    high: 'bg-red-50 text-red-700 border border-red-200',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${priorityStyles[priority] || priorityStyles.low}`}>
      {priorityLabels[priority] || priority}
    </span>
  );
}

// Team badge with building icon
export function TeamBadge({ team }) {
  const teamLabels = {
    Manufacturing: 'Manufacturing',
    Sales: 'Sales',
    Service: 'Service',
    Energy: 'Energy',
  };

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
      {teamLabels[team] || team}
    </span>
  );
}

// Region badge with globe icon
export function RegionBadge({ region }) {
  const regionLabels = {
    'EMEA': 'EMEA',
    'North America': 'NA',
    'APAC': 'APAC',
    'Global': 'Global',
  };

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded">
      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {regionLabels[region] || region}
    </span>
  );
}
