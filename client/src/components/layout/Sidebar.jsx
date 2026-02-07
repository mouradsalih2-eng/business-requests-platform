import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useProject } from '../../context/ProjectContext';

/**
 * Sidebar navigation - responsive with slide-out on mobile
 */

// Navigation items with icons
const navItems = [
  {
    to: '/dashboard',
    label: 'All Requests',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  {
    to: '/my-requests',
    label: 'My Requests',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    to: '/roadmap',
    label: 'Roadmap',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
      </svg>
    ),
  },
  {
    to: '/settings',
    label: 'Settings',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

const adminItems = [
  {
    to: '/admin',
    label: 'Admin',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
  },
  {
    to: '/project-settings',
    label: 'Project Settings',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.1-3.26m0 0l-.563-.152A1.125 1.125 0 013.67 10.6v-.01c0-.45.267-.862.68-1.044l9.764-4.303a1.125 1.125 0 01.922 0l9.764 4.303c.413.182.68.594.68 1.044v.01c0 .449-.267.86-.68 1.043l-.563.152m-6.588 3.263l6.588-3.263m-6.588 3.263L12 21.019l-5.58-2.586m11.16-5.173l.563-.152a1.125 1.125 0 00.68-1.043V10.6a1.125 1.125 0 00-.68-1.044L12.922 5.253a1.125 1.125 0 00-.922 0L2.236 9.556a1.125 1.125 0 00-.68 1.044v.01c0 .449.267.86.68 1.043l.563.152" />
      </svg>
    ),
  },
];

const superAdminItems = [
  {
    to: '/super-admin',
    label: 'Super Admin',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 003 12c0-1.605.42-3.113 1.157-4.418" />
      </svg>
    ),
  },
];

export function Sidebar({ isOpen, onClose }) {
  const { isAdmin, isSuperAdmin } = useAuth();
  const { currentProject } = useProject();

  // Show admin items if global admin/super_admin OR project admin
  const isProjectAdmin = currentProject?.memberRole === 'admin';
  const showAdmin = isAdmin || isProjectAdmin;

  let allItems = [...navItems];
  if (showAdmin) allItems = [...allItems, ...adminItems];
  if (isSuperAdmin) allItems = [...allItems, ...superAdminItems];

  return (
    <>
      {/* Desktop sidebar - always visible */}
      <aside className="hidden lg:block w-56 bg-white dark:bg-[#0D1117] border-r border-neutral-100 dark:border-[#30363D] min-h-[calc(100vh-3.5rem)] flex-shrink-0">
        <nav className="p-3 space-y-1">
          {allItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-[#4F46E5]/10 dark:bg-[#6366F1]/15 text-[#4F46E5] dark:text-[#818CF8] font-medium border-l-2 border-[#4F46E5] dark:border-[#6366F1] -ml-[2px]'
                    : 'text-neutral-600 dark:text-[#8B949E] hover:text-neutral-900 dark:hover:text-[#E6EDF3] hover:bg-neutral-100 dark:hover:bg-[#21262D]'
                }`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Mobile sidebar - slide in from left */}
      <aside
        className={`
          fixed top-14 left-0 bottom-0 w-64 bg-white dark:bg-[#0D1117] border-r border-neutral-100 dark:border-[#30363D]
          z-50 lg:hidden transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Close button */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 dark:border-[#30363D]">
          <span className="text-sm font-medium text-neutral-900 dark:text-[#E6EDF3]">Menu</span>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-500 dark:text-[#8B949E] hover:text-neutral-900 dark:hover:text-[#E6EDF3] hover:bg-neutral-100 dark:hover:bg-[#21262D] rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="p-3 space-y-1">
          {allItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-3 text-sm rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-[#4F46E5]/10 dark:bg-[#6366F1]/15 text-[#4F46E5] dark:text-[#818CF8] font-medium border-l-2 border-[#4F46E5] dark:border-[#6366F1] -ml-[2px]'
                    : 'text-neutral-600 dark:text-[#8B949E] hover:text-neutral-900 dark:hover:text-[#E6EDF3] hover:bg-neutral-100 dark:hover:bg-[#21262D]'
                }`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
