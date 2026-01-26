import { KanbanCard } from './KanbanCard';

const columnColors = {
  neutral: {
    bg: 'bg-neutral-50 dark:bg-[#161B22]',
    border: 'border-neutral-200 dark:border-[#30363D]',
    header: 'text-neutral-700 dark:text-[#E6EDF3]',
    headerBg: 'bg-neutral-100 dark:bg-[#21262D]',
    dragOver: 'bg-neutral-100 dark:bg-[#1C2128] border-neutral-300 dark:border-[#484F58]',
    dot: 'bg-neutral-400 dark:bg-neutral-500',
  },
  amber: {
    bg: 'bg-amber-50/50 dark:bg-[#161B22]',
    border: 'border-amber-200 dark:border-[#D29922]/30',
    header: 'text-amber-700 dark:text-[#E3B341]',
    headerBg: 'bg-amber-100/50 dark:bg-[#D29922]/10',
    dragOver: 'bg-amber-100 dark:bg-[#D29922]/20 border-amber-300 dark:border-[#D29922]/50',
    dot: 'bg-amber-500 dark:bg-[#E3B341]',
  },
  green: {
    bg: 'bg-green-50/50 dark:bg-[#161B22]',
    border: 'border-green-200 dark:border-[#238636]/30',
    header: 'text-green-700 dark:text-[#3FB950]',
    headerBg: 'bg-green-100/50 dark:bg-[#238636]/10',
    dragOver: 'bg-green-100 dark:bg-[#238636]/20 border-green-300 dark:border-[#238636]/50',
    dot: 'bg-green-500 dark:bg-[#3FB950]',
  },
};

export function KanbanColumn({ column, items, provided, isDraggingOver, onAddItem, isAdmin }) {
  const colors = columnColors[column.color] || columnColors.neutral;

  return (
    <div
      ref={provided.innerRef}
      {...provided.droppableProps}
      className={`
        flex flex-col rounded-xl border-2 transition-all duration-200 overflow-hidden
        max-h-[400px] md:max-h-none
        ${isDraggingOver ? colors.dragOver : `${colors.bg} ${colors.border}`}
      `}
    >
      {/* Column Header - Sticky */}
      <div className={`sticky top-0 z-10 px-4 py-3 border-b ${colors.border} ${colors.headerBg}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
            <h3 className={`font-semibold text-sm ${colors.header}`}>
              {column.title}
            </h3>
            <span className="text-xs font-medium text-neutral-500 dark:text-[#8B949E] bg-neutral-200/80 dark:bg-[#30363D] px-2 py-0.5 rounded-full">
              {items.length}
            </span>
          </div>
          {isAdmin && (
            <button
              onClick={onAddItem}
              className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-600 dark:text-[#8B949E] dark:hover:text-[#E6EDF3] hover:bg-neutral-200/50 dark:hover:bg-[#30363D] transition-colors"
              title="Add item"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Cards Container - Scrollable with hidden scrollbar until hover */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 kanban-scroll">
        {items.map((item, index) => (
          <KanbanCard key={item.id} item={item} index={index} isAdmin={isAdmin} />
        ))}
        {provided.placeholder}

        {/* Empty state */}
        {items.length === 0 && !isDraggingOver && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-neutral-100 dark:bg-[#21262D] flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-neutral-400 dark:text-[#8B949E]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <p className="text-sm text-neutral-500 dark:text-[#8B949E]">No items yet</p>
            {isAdmin && (
              <button
                onClick={onAddItem}
                className="mt-2 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Add first item
              </button>
            )}
          </div>
        )}

        {/* Drag over indicator */}
        {isDraggingOver && items.length === 0 && (
          <div className="flex items-center justify-center py-12 text-center">
            <div className="px-4 py-2 rounded-lg border-2 border-dashed border-indigo-300 dark:border-indigo-500/50 bg-indigo-50 dark:bg-indigo-500/10">
              <p className="text-sm text-indigo-600 dark:text-indigo-400">Drop here</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default KanbanColumn;
