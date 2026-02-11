import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { FieldCard } from './FieldCard';

export function FieldList({ fields, onToggle, onToggleCardVisibility, onEdit, onReorder, cardLimitReached, analyticsFields, onToggleAnalytics, onCardLimitReachedClick, onCardIneligibleClick }) {
  const handleDragEnd = (result) => {
    const { source, destination } = result;
    if (!destination) return;
    if (source.index === destination.index) return;

    // Prevent dropping into index 0 if Title is locked there
    if (destination.index === 0 && fields[0]?.locked) return;

    const reordered = [...fields];
    const [moved] = reordered.splice(source.index, 1);
    reordered.splice(destination.index, 0, moved);
    onReorder(reordered);
  };

  // Split fields into built-in and custom groups (preserving overall order)
  const builtInFields = [];
  const customFields = [];
  fields.forEach((field, index) => {
    if (field.isCustom) {
      customFields.push({ field, index });
    } else {
      builtInFields.push({ field, index });
    }
  });

  const hasCustomFields = customFields.length > 0;

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="form-fields">
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="space-y-0"
          >
            {/* Built-in Fields section header */}
            {builtInFields.length > 0 && (
              <div className="px-3 pt-1 pb-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-[#484F58]">
                  Built-in Fields
                </span>
              </div>
            )}

            {/* Built-in fields */}
            {builtInFields.map(({ field, index }) => (
              <Draggable
                key={field.key || field.id || field.name}
                draggableId={field.key || `field-${field.id || field.name}`}
                index={index}
                isDragDisabled={!!field.locked}
              >
                {(dragProvided, snapshot) => (
                  <div
                    ref={dragProvided.innerRef}
                    {...dragProvided.draggableProps}
                  >
                    <FieldCard
                      field={field}
                      index={index}
                      isCustom={false}
                      onToggle={onToggle}
                      onToggleCardVisibility={onToggleCardVisibility}
                      onEdit={onEdit}
                      cardLimitReached={cardLimitReached}
                      analyticsFields={analyticsFields}
                      onToggleAnalytics={onToggleAnalytics}
                      dragHandleProps={dragProvided.dragHandleProps}
                      isDragging={snapshot.isDragging}
                      onCardLimitReachedClick={onCardLimitReachedClick}
                      onCardIneligibleClick={onCardIneligibleClick}
                    />
                  </div>
                )}
              </Draggable>
            ))}

            {/* Custom Fields section header */}
            {hasCustomFields && (
              <div className="px-3 pt-3 pb-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-[#484F58]">
                  Custom Fields
                </span>
              </div>
            )}

            {/* Custom fields */}
            {customFields.map(({ field, index }) => (
              <Draggable
                key={field.key || `custom-${field.id}`}
                draggableId={field.key || `custom-${field.id}`}
                index={index}
                isDragDisabled={!!field.locked}
              >
                {(dragProvided, snapshot) => (
                  <div
                    ref={dragProvided.innerRef}
                    {...dragProvided.draggableProps}
                  >
                    <FieldCard
                      field={field}
                      index={index}
                      isCustom={true}
                      onToggle={onToggle}
                      onToggleCardVisibility={onToggleCardVisibility}
                      onEdit={onEdit}
                      cardLimitReached={cardLimitReached}
                      analyticsFields={analyticsFields}
                      onToggleAnalytics={onToggleAnalytics}
                      dragHandleProps={dragProvided.dragHandleProps}
                      isDragging={snapshot.isDragging}
                      onCardLimitReachedClick={onCardLimitReachedClick}
                      onCardIneligibleClick={onCardIneligibleClick}
                    />
                  </div>
                )}
              </Draggable>
            ))}

            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
