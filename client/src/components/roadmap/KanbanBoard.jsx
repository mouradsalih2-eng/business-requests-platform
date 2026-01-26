import { useState } from 'react';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import { KanbanColumn } from './KanbanColumn';
import { AddRoadmapItemModal } from './AddRoadmapItemModal';
import { useRoadmap, useMoveRoadmapItem, usePromoteToRoadmapItem } from '../../hooks/useRoadmap';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../ui/Toast';
import { Skeleton } from '../ui/Skeleton';

const columns = [
  { id: 'backlog', title: 'Backlog', color: 'neutral', icon: '📋' },
  { id: 'in_progress', title: 'In Progress', color: 'amber', icon: '🚧' },
  { id: 'released', title: 'Released', color: 'green', icon: '✅' },
];

export function KanbanBoard() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const { data: roadmapData, isLoading, error } = useRoadmap();
  const moveItem = useMoveRoadmapItem();
  const promoteItem = usePromoteToRoadmapItem();

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addToColumn, setAddToColumn] = useState('backlog');

  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;

    // Dropped outside a droppable area
    if (!destination) return;

    // Dropped in the same position
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    // Only admins can drag
    if (!isAdmin) {
      toast.error('Only admins can move items');
      return;
    }

    // Check if this is a synced item (from request) being dragged
    if (draggableId.startsWith('synced-')) {
      const requestId = parseInt(draggableId.replace('synced-', ''), 10);
      try {
        await promoteItem.mutateAsync({
          request_id: requestId,
          column_status: destination.droppableId,
          position: destination.index,
        });
        toast.success('Request added to roadmap');
      } catch (err) {
        toast.error('Failed to add request to roadmap');
      }
      return;
    }

    const itemId = parseInt(draggableId.replace('item-', ''), 10);

    try {
      await moveItem.mutateAsync({
        id: itemId,
        column_status: destination.droppableId,
        position: destination.index,
      });
      toast.success('Item moved');
    } catch (err) {
      toast.error('Failed to move item');
    }
  };

  const handleAddItem = (columnId) => {
    setAddToColumn(columnId);
    setAddModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8 md:h-[calc(100vh-220px)] md:min-h-[500px]">
        {columns.map((col) => (
          <div key={col.id} className="bg-neutral-50 dark:bg-[#161B22] border border-neutral-200 dark:border-[#30363D] rounded-xl p-4 flex flex-col min-w-0">
            <Skeleton className="h-6 w-24 mb-4" />
            <div className="space-y-4 flex-1">
              <Skeleton className="h-36 w-full rounded-lg" />
              <Skeleton className="h-36 w-full rounded-lg" />
              <Skeleton className="h-36 w-full rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500 dark:text-red-400">Failed to load roadmap</p>
      </div>
    );
  }

  return (
    <>
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8 md:h-[calc(100vh-220px)] md:min-h-[500px]">
          {columns.map((column) => (
            <Droppable key={column.id} droppableId={column.id}>
              {(provided, snapshot) => (
                <KanbanColumn
                  column={column}
                  items={roadmapData?.[column.id] || []}
                  provided={provided}
                  isDraggingOver={snapshot.isDraggingOver}
                  onAddItem={() => handleAddItem(column.id)}
                  isAdmin={isAdmin}
                />
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>

      <AddRoadmapItemModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        defaultColumn={addToColumn}
      />
    </>
  );
}

export default KanbanBoard;
