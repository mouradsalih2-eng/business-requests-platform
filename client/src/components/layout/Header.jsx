import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../ui/Avatar';
import { ProjectSwitcher } from './ProjectSwitcher';

export function Header({ onMenuClick }) {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogoClick = (e) => {
    if (location.pathname === '/dashboard') {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const profilePictureUrl = user?.profile_picture || null;

  return (
    <header className="h-14 bg-white dark:bg-[#0D1117] border-b border-neutral-100 dark:border-[#30363D] px-4 lg:px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left: Menu button (mobile) + Logo */}
      <div className="flex items-center gap-3">
        {/* Hamburger menu - mobile only */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-2 text-neutral-600 dark:text-[#8B949E] hover:text-neutral-900 dark:hover:text-[#E6EDF3] hover:bg-neutral-100 dark:hover:bg-[#21262D] rounded-lg transition-colors"
          aria-label="Toggle menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Logo and app name - clickable to go home, scrolls to top if already on dashboard */}
        <Link to="/dashboard" onClick={handleLogoClick} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <div className="w-7 h-7 bg-[#4F46E5] dark:bg-[#6366F1] rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <span className="text-base font-semibold tracking-tight text-neutral-900 dark:text-[#E6EDF3] hidden sm:block">
            User Voice
          </span>
        </Link>

        {/* Project Switcher */}
        <ProjectSwitcher />
      </div>

      {/* Right: User menu */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-[#21262D] transition-colors"
        >
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-neutral-900 dark:text-[#E6EDF3]">{user?.name}</p>
            <p className="text-xs text-neutral-500 dark:text-[#8B949E] capitalize">{user?.role}</p>
          </div>
          <Avatar
            src={profilePictureUrl}
            name={user?.name}
            size="sm"
          />
          <svg
            className={`w-4 h-4 text-neutral-500 dark:text-[#8B949E] transition-transform hidden sm:block ${dropdownOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown menu */}
        {dropdownOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#161B22] rounded-xl border border-neutral-200 dark:border-[#30363D] shadow-lg py-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
            {/* User info (mobile) */}
            <div className="px-4 py-3 border-b border-neutral-100 dark:border-[#30363D] sm:hidden">
              <p className="text-sm font-medium text-neutral-900 dark:text-[#E6EDF3]">{user?.name}</p>
              <p className="text-xs text-neutral-500 dark:text-[#8B949E]">{user?.email}</p>
            </div>

            {/* Menu items */}
            <div className="py-1">
              <Link
                to="/settings"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-700 dark:text-[#E6EDF3] hover:bg-neutral-100 dark:hover:bg-[#21262D] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Settings
              </Link>
            </div>

            <div className="border-t border-neutral-100 dark:border-[#30363D] pt-1">
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  logout();
                }}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
