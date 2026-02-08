import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useProject } from '../../context/ProjectContext';

/**
 * Sidebar navigation - responsive with slide-out on mobile.
 * Shows platform nav on /super-admin routes, project nav elsewhere.
 */

// Project-level navigation
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
];

// Platform-level navigation for super admin
const platformItems = [
  {
    to: '/super-admin',
    label: 'Overview',
    exact: true,
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
  },
  {
    to: '/super-admin?view=projects',
    label: 'Projects',
    viewKey: 'projects',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
      </svg>
    ),
  },
  {
    to: '/super-admin?view=users',
    label: 'Users',
    viewKey: 'users',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
  },
  {
    to: '/super-admin?view=activity',
    label: 'Activity',
    viewKey: 'activity',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

function SidebarNav({ items, onClose, label, isPlatform = false }) {
  const location = useLocation();
  const currentView = new URLSearchParams(location.search).get('view');

  return (
    <nav className="p-3 space-y-0.5">
      {label && (
        <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-[#484F58]">
          {label}
        </p>
      )}
      {items.map((item) => {
        // For platform items, match on viewKey or exact path
        let isActive = false;
        if (isPlatform) {
          if (item.exact) {
            isActive = location.pathname === '/super-admin' && !currentView;
          } else if (item.viewKey) {
            isActive = currentView === item.viewKey;
          }
        }

        return (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onClose}
            className={({ isActive: routeActive }) => {
              const active = isPlatform ? isActive : routeActive;
              return `flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all duration-200 ${
                active
                  ? 'bg-[#4F46E5]/10 dark:bg-[#6366F1]/15 text-[#4F46E5] dark:text-[#818CF8] font-medium border-l-2 border-[#4F46E5] dark:border-[#6366F1] -ml-[2px]'
                  : 'text-neutral-600 dark:text-[#8B949E] hover:text-neutral-900 dark:hover:text-[#E6EDF3] hover:bg-neutral-100 dark:hover:bg-[#21262D]'
              }`;
            }}
          >
            {item.icon}
            {item.label}
          </NavLink>
        );
      })}
    </nav>
  );
}

export function Sidebar({ isOpen, onClose }) {
  const { isAdmin, isSuperAdmin } = useAuth();
  const { currentProject } = useProject();
  const location = useLocation();
  const navigate = useNavigate();

  const isPlatformMode = location.pathname.startsWith('/super-admin');

  // Show admin items if global admin/super_admin OR project admin
  const isProjectAdmin = currentProject?.memberRole === 'admin';
  const showAdmin = isAdmin || isProjectAdmin;

  const renderProjectNav = (onItemClose) => {
    let items = [...navItems];
    if (showAdmin) items = [...items, ...adminItems];
    return <SidebarNav items={items} onClose={onItemClose} />;
  };

  const renderPlatformNav = (onItemClose) => (
    <>
      <SidebarNav items={platformItems} onClose={onItemClose} label="Platform" isPlatform />
      <div className="mx-3 border-t border-neutral-100 dark:border-[#30363D]" />
      <nav className="p-3 space-y-0.5">
        <NavLink
          to="/settings"
          onClick={onItemClose}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all duration-200 ${
              isActive
                ? 'bg-[#4F46E5]/10 dark:bg-[#6366F1]/15 text-[#4F46E5] dark:text-[#818CF8] font-medium border-l-2 border-[#4F46E5] dark:border-[#6366F1] -ml-[2px]'
                : 'text-neutral-600 dark:text-[#8B949E] hover:text-neutral-900 dark:hover:text-[#E6EDF3] hover:bg-neutral-100 dark:hover:bg-[#21262D]'
            }`
          }
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Settings
        </NavLink>
      </nav>
    </>
  );

  const renderBackToPlatform = (onItemClose) => (
    <div className="px-3 pt-3 pb-1">
      <button
        onClick={() => { onItemClose?.(); navigate('/super-admin'); }}
        className="flex items-center gap-2 w-full px-3 py-2 text-xs font-medium text-[#4F46E5] dark:text-[#818CF8] bg-[#4F46E5]/5 dark:bg-[#6366F1]/10 rounded-lg hover:bg-[#4F46E5]/10 dark:hover:bg-[#6366F1]/20 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Back to Platform
      </button>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-56 bg-white dark:bg-[#0D1117] border-r border-neutral-100 dark:border-[#30363D] min-h-[calc(100vh-3.5rem)] flex-shrink-0">
        {isPlatformMode ? (
          renderPlatformNav()
        ) : (
          <>
            {isSuperAdmin && renderBackToPlatform()}
            {renderProjectNav()}
          </>
        )}
      </aside>

      {/* Mobile sidebar */}
      <aside
        className={`
          fixed top-14 left-0 bottom-0 w-64 bg-white dark:bg-[#0D1117] border-r border-neutral-100 dark:border-[#30363D]
          z-50 lg:hidden transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 dark:border-[#30363D]">
          <span className="text-sm font-medium text-neutral-900 dark:text-[#E6EDF3]">
            {isPlatformMode ? 'Platform' : 'Menu'}
          </span>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-500 dark:text-[#8B949E] hover:text-neutral-900 dark:hover:text-[#E6EDF3] hover:bg-neutral-100 dark:hover:bg-[#21262D] rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {isPlatformMode ? (
          renderPlatformNav(onClose)
        ) : (
          <>
            {isSuperAdmin && renderBackToPlatform(onClose)}
            {renderProjectNav(onClose)}
          </>
        )}
      </aside>
    </>
  );
}
