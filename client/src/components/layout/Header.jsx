import { useAuth } from '../../context/AuthContext';

/**
 * Header component - minimal design with mobile hamburger menu
 */
export function Header({ onMenuClick }) {
  const { user, logout } = useAuth();

  return (
    <header className="h-14 bg-white border-b border-neutral-100 px-4 lg:px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left: Menu button (mobile) + Logo */}
      <div className="flex items-center gap-3">
        {/* Hamburger menu - mobile only */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
          aria-label="Toggle menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Logo and app name */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-neutral-900 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <span className="text-base font-semibold tracking-tight text-neutral-900 hidden sm:block">
            User Voice
          </span>
        </div>
      </div>

      {/* Right: User info and logout */}
      <div className="flex items-center gap-2 sm:gap-4">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-neutral-900">{user?.name}</p>
          <p className="text-xs text-neutral-500 capitalize">{user?.role}</p>
        </div>
        {/* Mobile: Just show initial */}
        <div className="sm:hidden w-8 h-8 bg-neutral-100 rounded-full flex items-center justify-center text-sm font-medium text-neutral-700">
          {user?.name?.charAt(0) || '?'}
        </div>
        <div className="w-px h-8 bg-neutral-200 hidden sm:block" />
        <button
          onClick={logout}
          className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors duration-200 p-2 sm:p-0"
          title="Sign out"
        >
          <span className="hidden sm:inline">Sign out</span>
          <svg className="w-5 h-5 sm:hidden" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </header>
  );
}
