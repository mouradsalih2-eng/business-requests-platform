import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../../context/ProjectContext';
import { useAuth } from '../../context/AuthContext';

export function ProjectSwitcher() {
  const { projects, currentProject, switchProject, loading } = useProject();
  const { isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (loading) return null;

  // Admin with no projects: show "Create Project" button
  if (!currentProject && isAdmin) {
    return (
      <button
        onClick={() => navigate('/onboarding')}
        className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border border-dashed border-[#4F46E5]/40 dark:border-[#6366F1]/40 bg-[#4F46E5]/5 dark:bg-[#6366F1]/10 text-[#4F46E5] dark:text-[#818CF8] hover:bg-[#4F46E5]/10 dark:hover:bg-[#6366F1]/20 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Create Project
      </button>
    );
  }

  // Non-admin with no project: show nothing
  if (!currentProject) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border border-neutral-200 dark:border-[#30363D] bg-white dark:bg-[#161B22] text-neutral-700 dark:text-[#E6EDF3] hover:bg-neutral-50 dark:hover:bg-[#21262D] transition-colors max-w-[200px]"
      >
        <svg className="w-4 h-4 flex-shrink-0 text-neutral-500 dark:text-[#8B949E]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
        </svg>
        <span className="truncate">{currentProject?.name || 'Select project'}</span>
        <svg className={`w-3.5 h-3.5 flex-shrink-0 text-neutral-400 dark:text-[#8B949E] transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 mt-1 w-56 bg-white dark:bg-[#161B22] border border-neutral-200 dark:border-[#30363D] rounded-xl shadow-lg py-1 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
          {projects.map((project) => (
            <button
              key={project.id}
              onClick={() => {
                switchProject(project);
                setOpen(false);
              }}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                currentProject?.id === project.id
                  ? 'bg-[#4F46E5]/10 dark:bg-[#6366F1]/15 text-[#4F46E5] dark:text-[#818CF8] font-medium'
                  : 'text-neutral-700 dark:text-[#E6EDF3] hover:bg-neutral-100 dark:hover:bg-[#21262D]'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="truncate">{project.name}</span>
                {project.slug === 'default' && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-neutral-100 dark:bg-[#30363D] text-neutral-500 dark:text-[#8B949E] rounded-full">default</span>
                )}
              </div>
            </button>
          ))}
          <div className="border-t border-neutral-100 dark:border-[#30363D] mt-1 pt-1">
            <button
              onClick={() => {
                setOpen(false);
                navigate('/onboarding');
              }}
              className="w-full text-left px-4 py-2.5 text-sm text-neutral-500 dark:text-[#8B949E] hover:bg-neutral-100 dark:hover:bg-[#21262D] hover:text-neutral-700 dark:hover:text-[#E6EDF3] transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              New Project
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
