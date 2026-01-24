import { useState, useCallback, useRef, useEffect } from 'react';
import { users as usersApi } from '../lib/api';

/**
 * useMention - Hook for handling @mention functionality in text inputs
 * Manages search, selection, and insertion of mentions
 */
export function useMention(textareaRef) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const [loading, setLoading] = useState(false);

  const searchTimeoutRef = useRef(null);

  // Search users when query changes
  useEffect(() => {
    if (!searchQuery || searchQuery.length === 0) {
      setSearchResults([]);
      return;
    }

    // Debounce search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await usersApi.search(searchQuery);
        setSearchResults(results);
        setSelectedIndex(0);
      } catch (err) {
        console.error('User search error:', err);
        setSearchResults([]);
      } finally {
        setLoading(false);
      }
    }, 150);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // Calculate dropdown position based on caret position
  const updateDropdownPosition = useCallback(() => {
    if (!textareaRef?.current) return;

    const textarea = textareaRef.current;
    const { offsetTop, offsetHeight } = textarea;

    // Position dropdown below textarea
    setDropdownPosition({
      top: offsetTop + offsetHeight + 4,
      left: 0,
    });
  }, [textareaRef]);

  // Handle input changes to detect @ triggers
  const handleInputChange = useCallback((value, cursorPosition) => {
    // Find the last @ before cursor
    const textBeforeCursor = value.slice(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex === -1) {
      setShowDropdown(false);
      setSearchQuery('');
      setMentionStartIndex(-1);
      return;
    }

    // Check if there's a space or newline between @ and cursor
    const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
    if (textAfterAt.includes(' ') || textAfterAt.includes('\n')) {
      setShowDropdown(false);
      setSearchQuery('');
      setMentionStartIndex(-1);
      return;
    }

    // @ is at start of input or preceded by whitespace
    const charBeforeAt = lastAtIndex > 0 ? value[lastAtIndex - 1] : ' ';
    if (!/\s/.test(charBeforeAt) && lastAtIndex !== 0) {
      setShowDropdown(false);
      setSearchQuery('');
      setMentionStartIndex(-1);
      return;
    }

    // We have a valid mention trigger
    setMentionStartIndex(lastAtIndex);
    setSearchQuery(textAfterAt);
    setShowDropdown(true);
    updateDropdownPosition();
  }, [updateDropdownPosition]);

  // Handle keyboard navigation in dropdown
  const handleKeyDown = useCallback((e, currentValue, setValue) => {
    if (!showDropdown || searchResults.length === 0) return false;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < searchResults.length - 1 ? prev + 1 : 0
        );
        return true;

      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : searchResults.length - 1
        );
        return true;

      case 'Tab':
      case 'Enter':
        if (searchResults[selectedIndex]) {
          e.preventDefault();
          insertMention(searchResults[selectedIndex], currentValue, setValue);
          return true;
        }
        return false;

      case 'Escape':
        e.preventDefault();
        setShowDropdown(false);
        setSearchQuery('');
        return true;

      default:
        return false;
    }
  }, [showDropdown, searchResults, selectedIndex]);

  // Insert selected mention into text
  const insertMention = useCallback((user, currentValue, setValue) => {
    if (mentionStartIndex === -1) return;

    const firstName = user.name.split(' ')[0];
    const beforeMention = currentValue.slice(0, mentionStartIndex);
    const afterMention = currentValue.slice(
      mentionStartIndex + 1 + searchQuery.length
    );

    const newValue = `${beforeMention}@${firstName} ${afterMention}`;
    setValue(newValue);

    // Close dropdown
    setShowDropdown(false);
    setSearchQuery('');
    setMentionStartIndex(-1);
    setSearchResults([]);

    // Focus back to textarea and move cursor after mention
    setTimeout(() => {
      if (textareaRef?.current) {
        const newCursorPos = mentionStartIndex + firstName.length + 2; // +2 for @ and space
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  }, [mentionStartIndex, searchQuery, textareaRef]);

  // Select user from dropdown click
  const selectUser = useCallback((user, currentValue, setValue) => {
    insertMention(user, currentValue, setValue);
  }, [insertMention]);

  // Close dropdown
  const closeDropdown = useCallback(() => {
    setShowDropdown(false);
    setSearchQuery('');
    setMentionStartIndex(-1);
  }, []);

  return {
    showDropdown,
    searchResults,
    selectedIndex,
    dropdownPosition,
    loading,
    handleInputChange,
    handleKeyDown,
    selectUser,
    closeDropdown,
  };
}
