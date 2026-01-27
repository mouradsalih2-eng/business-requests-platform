import { useState, useEffect, useRef, useCallback } from 'react';
import { requests as requestsApi } from '../../lib/api';
import { Spinner } from './Spinner';

/**
 * SearchInput - Search with autocomplete dropdown
 * Shows suggestions after 2+ characters, supports keyboard navigation
 */
export function SearchInput({
  value,
  onChange,
  onSelect,
  placeholder = 'Search requests...',
  className = '',
}) {
  const [inputValue, setInputValue] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const debounceRef = useRef(null);

  // Sync external value
  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  // Debounced search
  const searchRequests = useCallback(async (query) => {
    if (query.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setLoading(true);
    try {
      const results = await requestsApi.search(query, 8);
      setSuggestions(results);
      setIsOpen(results.length > 0);
      setHighlightedIndex(-1);
    } catch (err) {
      console.error('Search error:', err);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle input change with debounce
  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange?.(newValue);

    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Debounce search (150ms)
    debounceRef.current = setTimeout(() => {
      searchRequests(newValue);
    }, 150);
  };

  // Handle suggestion click
  const handleSelect = (suggestion) => {
    setInputValue('');
    onChange?.('');
    setSuggestions([]);
    setIsOpen(false);
    onSelect?.(suggestion);
  };

  // Handle clear
  const handleClear = () => {
    setInputValue('');
    onChange?.('');
    setSuggestions([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'Enter' && inputValue.trim()) {
        // Submit search without selecting suggestion
        onChange?.(inputValue);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
          handleSelect(suggestions[highlightedIndex]);
        } else if (inputValue.trim()) {
          onChange?.(inputValue);
          setIsOpen(false);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        inputRef.current &&
        !inputRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Highlight matching text
  const highlightMatch = (text, query) => {
    if (!query || query.length < 2) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-amber-100 dark:bg-amber-500/20 text-amber-900 dark:text-amber-300 rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  // Status badge styles
  const statusStyles = {
    pending: 'bg-neutral-100 dark:bg-[#21262D] text-neutral-600 dark:text-[#8B949E]',
    backlog: 'bg-neutral-100 dark:bg-[#21262D] text-neutral-500 dark:text-[#6E7681]',
    in_progress: 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400',
    completed: 'bg-green-50 dark:bg-green-500/15 text-green-700 dark:text-green-400',
    rejected: 'bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-red-400',
    duplicate: 'bg-neutral-100 dark:bg-[#21262D] text-neutral-400 dark:text-[#6E7681]',
  };

  const statusLabels = {
    pending: 'Pending',
    backlog: 'Backlog',
    in_progress: 'In Progress',
    completed: 'Completed',
    rejected: 'Rejected',
    duplicate: 'Duplicate',
  };

  return (
    <div className={`relative ${className}`}>
      {/* Search input */}
      <div className="relative">
        {/* Search icon */}
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 dark:text-[#6E7681]"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>

        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          className="
            w-full pl-10 pr-10 py-2.5 bg-white dark:bg-[#0D1117] border border-neutral-200 dark:border-[#30363D] rounded-lg
            text-sm text-neutral-900 dark:text-[#E6EDF3] placeholder-neutral-400 dark:placeholder-[#6E7681]
            transition-all duration-200
            hover:border-neutral-300 dark:hover:border-[#484F58]
            focus:outline-none focus:border-[#4F46E5] dark:focus:border-[#6366F1] focus:ring-2 focus:ring-[#4F46E5]/20 dark:focus:ring-[#6366F1]/20
          "
        />

        {/* Clear button / Loading spinner */}
        {inputValue && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-neutral-400 dark:text-[#6E7681] hover:text-neutral-600 dark:hover:text-[#8B949E] transition-colors"
            type="button"
          >
            {loading ? (
              <Spinner size="sm" />
            ) : (
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            )}
          </button>
        )}
      </div>

      {/* Autocomplete dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="
            absolute z-50 w-full mt-1 bg-white dark:bg-[#161B22] border border-neutral-200 dark:border-[#30363D] rounded-lg shadow-lg
            max-h-80 overflow-y-auto
          "
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.id}
              onClick={() => handleSelect(suggestion)}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={`
                w-full px-4 py-3 text-left flex items-start gap-3
                transition-colors duration-100
                ${highlightedIndex === index ? 'bg-neutral-50 dark:bg-[#21262D]' : ''}
                ${index !== suggestions.length - 1 ? 'border-b border-neutral-100 dark:border-[#30363D]' : ''}
              `}
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-neutral-900 dark:text-[#E6EDF3] truncate">
                  {highlightMatch(suggestion.title, inputValue)}
                </div>
                <div className="text-xs text-neutral-500 dark:text-[#8B949E] mt-0.5">
                  by {highlightMatch(suggestion.author_name, inputValue)}
                </div>
              </div>
              <span
                className={`
                  text-xs px-2 py-0.5 rounded font-medium shrink-0
                  ${statusStyles[suggestion.status] || 'bg-neutral-100 dark:bg-[#21262D] text-neutral-600 dark:text-[#8B949E]'}
                `}
              >
                {statusLabels[suggestion.status] || suggestion.status}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
