import { useState, useEffect, useRef, useCallback } from 'react';
import { requests as requestsApi } from '../../lib/api';

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
        <mark key={i} className="bg-amber-100 text-amber-900 rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  // Status badge styles
  const statusStyles = {
    pending: 'bg-neutral-100 text-neutral-600',
    backlog: 'bg-neutral-100 text-neutral-500',
    in_progress: 'bg-amber-50 text-amber-700',
    completed: 'bg-green-50 text-green-700',
    rejected: 'bg-red-50 text-red-600',
    duplicate: 'bg-neutral-100 text-neutral-400',
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
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400"
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
            w-full pl-10 pr-10 py-2.5 bg-white border border-neutral-200 rounded-lg
            text-sm text-neutral-900 placeholder-neutral-400
            transition-all duration-200
            hover:border-neutral-300
            focus:outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10
          "
        />

        {/* Clear button / Loading spinner */}
        {inputValue && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-neutral-400 hover:text-neutral-600 transition-colors"
            type="button"
          >
            {loading ? (
              <svg
                className="w-4 h-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
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
            absolute z-50 w-full mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg
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
                ${highlightedIndex === index ? 'bg-neutral-50' : ''}
                ${index !== suggestions.length - 1 ? 'border-b border-neutral-100' : ''}
              `}
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-neutral-900 truncate">
                  {highlightMatch(suggestion.title, inputValue)}
                </div>
                <div className="text-xs text-neutral-500 mt-0.5">
                  by {highlightMatch(suggestion.author_name, inputValue)}
                </div>
              </div>
              <span
                className={`
                  text-xs px-2 py-0.5 rounded font-medium shrink-0
                  ${statusStyles[suggestion.status] || 'bg-neutral-100 text-neutral-600'}
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
