import { useState, useRef } from 'react';
import { Button } from '../ui/Button';
import { MentionText } from '../ui/MentionText';
import { MentionDropdown } from '../ui/MentionDropdown';
import Avatar from '../ui/Avatar';
import { useAuth } from '../../context/AuthContext';
import { useMention } from '../../hooks/useMention';

/**
 * CommentItem - Individual comment with edit/delete functionality
 * Clean monochrome design with hover states
 */
export function CommentItem({ comment, onEdit, onDelete }) {
  const { user, isAdmin } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [loading, setLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const editTextareaRef = useRef(null);
  const {
    showDropdown,
    searchResults,
    selectedIndex,
    dropdownPosition,
    handleInputChange,
    handleKeyDown: mentionKeyDown,
    selectUser,
    closeDropdown,
  } = useMention(editTextareaRef);

  const isOwner = user?.id === comment.user_id;
  const canEdit = isOwner;
  const canDelete = isOwner || isAdmin;

  // Format date relative to now
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  // Get initials from name
  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    return parts.length > 1
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : name[0].toUpperCase();
  };

  const handleSave = async () => {
    if (!editContent.trim() || loading) return;
    setLoading(true);
    try {
      await onEdit(comment.id, editContent.trim());
      setIsEditing(false);
    } catch (err) {
      console.error('Edit error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await onDelete(comment.id);
    } catch (err) {
      console.error('Delete error:', err);
      setLoading(false);
    }
  };

  // Handle edit content change with mention detection
  const handleEditChange = (e) => {
    const value = e.target.value;
    setEditContent(value);
    handleInputChange(value, e.target.selectionStart);
  };

  // Handle keyboard submit for edit and mention navigation
  const handleKeyDown = (e) => {
    // Let mention hook handle dropdown navigation first
    const handled = mentionKeyDown(e, editContent, setEditContent);
    if (handled) return;

    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSave();
    }
    if (e.key === 'Escape') {
      setIsEditing(false);
      setEditContent(comment.content);
      closeDropdown();
    }
  };

  // Handle mention selection from dropdown
  const handleSelectMention = (user) => {
    selectUser(user, editContent, setEditContent);
  };

  return (
    <div
      className={`
        flex gap-3 p-3 -mx-3 rounded-lg transition-colors duration-200
        ${isHovered ? 'bg-neutral-50 dark:bg-neutral-800' : 'bg-transparent'}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Avatar */}
      <Avatar name={comment.author_name} size="sm" />

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
            {comment.author_name}
          </span>
          <span className="text-xs text-neutral-400 dark:text-neutral-500">
            {formatDate(comment.created_at)}
          </span>
        </div>

        {/* Edit mode or display mode */}
        {isEditing ? (
          <div className="mt-2 space-y-2">
            <div className="relative">
              <textarea
                ref={editTextareaRef}
                value={editContent}
                onChange={handleEditChange}
                onKeyDown={handleKeyDown}
                onBlur={() => setTimeout(closeDropdown, 150)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg
                           text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-500
                           transition-colors duration-200 resize-none"
                rows={2}
                autoFocus
              />
              <MentionDropdown
                users={searchResults}
                selectedIndex={selectedIndex}
                onSelect={handleSelectMention}
                position={dropdownPosition}
                visible={showDropdown}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-400 dark:text-neutral-500">
                Esc to cancel
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsEditing(false);
                    setEditContent(comment.content);
                    closeDropdown();
                  }}
                >
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave} disabled={loading}>
                  {loading ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Comment text with highlighted mentions */}
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300 whitespace-pre-wrap">
              <MentionText content={comment.content} mentions={comment.mentions} />
            </p>

            {/* Actions - show on hover */}
            {(canEdit || canDelete) && (
              <div
                className={`
                  flex gap-3 mt-2 transition-opacity duration-200
                  ${isHovered ? 'opacity-100' : 'opacity-0'}
                `}
              >
                {canEdit && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-xs text-neutral-400 dark:text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
                  >
                    Edit
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={handleDelete}
                    className="text-xs text-neutral-400 dark:text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
                    disabled={loading}
                  >
                    Delete
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
