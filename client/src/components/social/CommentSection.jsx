import { useState, useEffect, useRef } from 'react';
import { CommentItem } from './CommentItem';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { MentionDropdown } from '../ui/MentionDropdown';
import { comments as commentsApi } from '../../lib/api';
import { useMention } from '../../hooks/useMention';
import { useToast } from '../ui/Toast';

/**
 * CommentSection - Displays comments with add/edit/delete functionality
 * Clean monochrome styling with smooth transitions
 */
export function CommentSection({ requestId }) {
  const [commentsList, setCommentsList] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const textareaRef = useRef(null);
  const {
    showDropdown,
    searchResults,
    selectedIndex,
    dropdownPosition,
    handleInputChange,
    handleKeyDown: mentionKeyDown,
    selectUser,
    closeDropdown,
  } = useMention(textareaRef);

  // Load comments on mount
  useEffect(() => {
    loadComments();
  }, [requestId]);

  const loadComments = async () => {
    setLoading(true);
    try {
      const data = await commentsApi.getAll(requestId);
      setCommentsList(data);
    } catch (err) {
      console.error('Failed to load comments:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle new comment submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;

    setSubmitting(true);
    try {
      const comment = await commentsApi.add(requestId, newComment.trim());
      setCommentsList((prev) => [...prev, comment]);
      setNewComment('');
      toast.success('Comment posted');
    } catch (err) {
      console.error('Failed to add comment:', err);
      toast.error('Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle input change with mention detection
  const handleCommentChange = (e) => {
    const value = e.target.value;
    setNewComment(value);
    handleInputChange(value, e.target.selectionStart);
  };

  // Handle keyboard submit and mention navigation
  const handleKeyDown = (e) => {
    // Let mention hook handle dropdown navigation first
    const handled = mentionKeyDown(e, newComment, setNewComment);
    if (handled) return;

    // Handle submit with Cmd/Ctrl + Enter
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit(e);
    }
  };

  // Handle mention selection from dropdown
  const handleSelectMention = (user) => {
    selectUser(user, newComment, setNewComment);
  };

  const handleEdit = async (commentId, content) => {
    try {
      const updated = await commentsApi.update(commentId, content);
      setCommentsList((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, content: updated.content, mentions: updated.mentions } : c))
      );
      toast.success('Comment updated');
    } catch (err) {
      console.error('Failed to edit comment:', err);
      toast.error('Failed to update comment');
      throw err; // Re-throw so CommentItem can handle it
    }
  };

  const handleDelete = async (commentId) => {
    try {
      await commentsApi.delete(commentId);
      setCommentsList((prev) => prev.filter((c) => c.id !== commentId));
      toast.success('Comment deleted');
    } catch (err) {
      console.error('Failed to delete comment:', err);
      toast.error('Failed to delete comment');
      throw err;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <h4 className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
        Comments ({commentsList.length})
      </h4>

      {/* Comment Form */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={newComment}
            onChange={handleCommentChange}
            onKeyDown={handleKeyDown}
            onBlur={() => setTimeout(closeDropdown, 150)}
            placeholder="Add a comment... Use @ to mention someone"
            className="w-full px-3 py-2.5 text-sm bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg
                       placeholder-neutral-400 dark:placeholder-neutral-500 text-neutral-900 dark:text-neutral-100
                       hover:border-neutral-300 dark:hover:border-neutral-600
                       focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-400 focus:ring-2 focus:ring-neutral-900/10 dark:focus:ring-neutral-100/10
                       transition-all duration-200 resize-none"
            rows={2}
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
            {newComment.trim() ? 'Cmd/Ctrl + Enter to submit' : ''}
          </span>
          <Button
            type="submit"
            size="sm"
            disabled={!newComment.trim() || submitting}
          >
            {submitting ? 'Posting...' : 'Post'}
          </Button>
        </div>
      </form>

      {/* Comments List */}
      {loading ? (
        <div className="py-6 flex items-center justify-center gap-2">
          <Spinner size="sm" />
          <span className="text-sm text-neutral-400 dark:text-neutral-500">Loading comments...</span>
        </div>
      ) : commentsList.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 mx-auto mb-2 bg-neutral-100 dark:bg-neutral-700 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-neutral-400 dark:text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">No comments yet</p>
          <p className="text-xs text-neutral-400 dark:text-neutral-500">Be the first to share your thoughts</p>
        </div>
      ) : (
        <div className="space-y-4">
          {commentsList.map((comment, index) => (
            <div
              key={comment.id}
              className="animate-in fade-in duration-300"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <CommentItem
                comment={comment}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
