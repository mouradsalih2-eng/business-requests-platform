import { useTheme } from '../../context/ThemeContext';

const themes = [
  {
    id: 'light',
    name: 'Light',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    id: 'dark',
    name: 'Dark',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
      </svg>
    ),
  },
  {
    id: 'system',
    name: 'System',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
];

export default function ThemeSection() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  return (
    <div className="bg-white dark:bg-[#161B22] rounded-xl border border-neutral-200 dark:border-[#30363D] p-6">
      <h2 className="text-lg font-semibold text-neutral-900 dark:text-[#E6EDF3] mb-2">
        Appearance
      </h2>
      <p className="text-sm text-neutral-500 dark:text-[#8B949E] mb-4">
        Choose how the app looks. Current: {resolvedTheme === 'dark' ? 'Dark' : 'Light'}
      </p>

      <div className="grid grid-cols-3 gap-3">
        {themes.map((t) => (
          <button
            key={t.id}
            onClick={() => setTheme(t.id)}
            className={`
              flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all
              ${theme === t.id
                ? 'border-[#4F46E5] dark:border-[#6366F1] bg-[#4F46E5]/5 dark:bg-[#6366F1]/10'
                : 'border-neutral-200 dark:border-[#30363D] hover:border-neutral-300 dark:hover:border-[#484F58]'
              }
            `}
          >
            <div className={`
              ${theme === t.id
                ? 'text-[#4F46E5] dark:text-[#818CF8]'
                : 'text-neutral-500 dark:text-[#8B949E]'
              }
            `}>
              {t.icon}
            </div>
            <span className={`text-sm font-medium ${
              theme === t.id
                ? 'text-[#4F46E5] dark:text-[#818CF8]'
                : 'text-neutral-600 dark:text-[#8B949E]'
            }`}>
              {t.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
