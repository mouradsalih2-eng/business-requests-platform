import { useState } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Link } from 'react-router-dom';
import { CategoryBadge, PriorityBadge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useDeleteRoadmapItem } from '../../hooks/useRoadmap';
import { useToast } from '../ui/Toast';

export function KanbanCard({ item, index, isAdmin }) {
  const [showDetail, setShowDetail] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const deleteItem = useDeleteRoadmapItem();
  const toast = useToast();

  const handleDelete = async () => {
    try {
      await deleteItem.mutateAsync(item.id);
      toast.success('Item deleted');
      setShowDetail(false);
    } catch (err) {
      toast.error('Failed to delete item');
    }
  };

  return (
    <>
      <Draggable
        draggableId={item.is_synced ? `synced-${item.request_id}` : `item-${item.id}`}
        index={index}
        isDragDisabled={!isAdmin}
      >
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            onClick={() => setShowDetail(true)}
            className={`
              bg-white dark:bg-[#21262D] rounded-xl p-4 border border-neutral-200 dark:border-[#30363D]
              cursor-pointer transition-all duration-200
              hover:border-neutral-300 dark:hover:border-[#484F58] hover:shadow-md
              ${snapshot.isDragging ? 'shadow-xl ring-2 ring-indigo-500/50 dark:ring-indigo-400/50 rotate-1 scale-[1.02]' : ''}
              ${isAdmin ? 'cursor-grab active:cursor-grabbing' : ''}
            `}
          >
            {/* Title */}
            <h4 className="text-sm font-semibold text-neutral-900 dark:text-[#E6EDF3] mb-3 line-clamp-2 leading-relaxed">
              {item.title}
            </h4>

            {/* Metadata section - aligned vertically */}
            {(item.category || item.priority || item.team || item.region) && (
              <div className="space-y-1.5 text-xs">
                {/* Category & Priority row */}
                {(item.category || item.priority) && (
                  <div className="flex items-center gap-3 text-neutral-600 dark:text-[#C9D1D9]">
                    {item.category && (
                      <span className="flex items-center gap-1.5">
                        {item.category === 'bug' && (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        )}
                        {item.category === 'new_feature' && (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                        )}
                        {item.category === 'optimization' && (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        )}
                        {item.category === 'bug' ? 'Bug' : item.category === 'new_feature' ? 'Feature' : 'Optimize'}
                      </span>
                    )}
                    {item.priority && <PriorityBadge priority={item.priority} size="sm" />}
                  </div>
                )}

                {/* Team & Region row */}
                {(item.team || item.region) && (
                  <div className="flex items-center gap-3 text-neutral-500 dark:text-[#8B949E]">
                    {item.team && (
                      <span className="flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                        </svg>
                        {item.team}
                      </span>
                    )}
                    {item.region && (
                      <span className="flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                        </svg>
                        {item.region}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Synced from request indicator */}
            {item.is_synced && (
              <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-[#30363D] flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                </svg>
                <span>Synced from request</span>
              </div>
            )}
            {/* Linked request indicator (for manually added items) */}
            {item.request_id && !item.is_synced && (
              <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-[#30363D] flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                </svg>
                <span>Linked to request</span>
              </div>
            )}
          </div>
        )}
      </Draggable>

      {/* Detail Modal */}
      <Modal
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
        title={item.title}
      >
        <div className="space-y-5">
          {/* Badges */}
          {(item.category || item.priority) && (
            <div className="flex items-center gap-2 flex-wrap">
              {item.category && <CategoryBadge category={item.category} />}
              {item.priority && <PriorityBadge priority={item.priority} />}
            </div>
          )}

          {/* Description */}
          {item.description && (
            <div>
              <h4 className="text-xs font-medium text-neutral-500 dark:text-[#8B949E] uppercase tracking-wide mb-2">
                Description
              </h4>
              <p className="text-sm text-neutral-700 dark:text-[#C9D1D9] whitespace-pre-wrap leading-relaxed">
                {item.description}
              </p>
            </div>
          )}

          {/* Metadata */}
          {(item.team || item.region) && (
            <div className="grid grid-cols-2 gap-4 p-3 bg-neutral-50 dark:bg-[#161B22] rounded-lg">
              {item.team && (
                <div>
                  <span className="text-xs text-neutral-500 dark:text-[#8B949E]">Team</span>
                  <p className="text-sm font-medium text-neutral-900 dark:text-[#E6EDF3] mt-0.5">{item.team}</p>
                </div>
              )}
              {item.region && (
                <div>
                  <span className="text-xs text-neutral-500 dark:text-[#8B949E]">Region</span>
                  <p className="text-sm font-medium text-neutral-900 dark:text-[#E6EDF3] mt-0.5">{item.region}</p>
                </div>
              )}
            </div>
          )}

          {/* Linked request */}
          {item.request_id && (
            <div className="pt-4 border-t border-neutral-100 dark:border-[#30363D]">
              <Link
                to={`/requests/${item.request_id}`}
                className="inline-flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                onClick={() => setShowDetail(false)}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                </svg>
                View linked request #{item.request_id}
              </Link>
            </div>
          )}

          {/* Admin actions */}
          {isAdmin && (
            <div className="pt-4 border-t border-neutral-100 dark:border-[#30363D]">
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-sm text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                >
                  Delete item
                </button>
              ) : (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg">
                  <p className="text-sm text-red-800 dark:text-red-200 mb-3">
                    Delete this roadmap item?
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={handleDelete}
                      disabled={deleteItem.isPending}
                    >
                      {deleteItem.isPending ? 'Deleting...' : 'Delete'}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setShowDeleteConfirm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}

export default KanbanCard;
