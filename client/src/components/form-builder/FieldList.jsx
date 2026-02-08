import { FieldCard } from './FieldCard';

export function FieldList({ fields, onToggle, onToggleCardVisibility, onEdit, onReorder, cardLimitReached, analyticsFields, onToggleAnalytics }) {
  const handleDrop = (fromIndex, toIndex) => {
    if (fromIndex === toIndex) return;
    const reordered = [...fields];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    onReorder(reordered);
  };

  return (
    <div className="space-y-1">
      {fields.map((field) => {
        const index = fields.indexOf(field);
        return (
          <FieldCard
            key={field.key || field.id || field.name}
            field={field}
            index={index}
            isCustom={field.isCustom}
            onToggle={onToggle}
            onToggleCardVisibility={onToggleCardVisibility}
            onEdit={onEdit}
            onDragStart={() => {}}
            onDragOver={() => {}}
            onDrop={handleDrop}
            cardLimitReached={cardLimitReached}
            analyticsFields={analyticsFields}
            onToggleAnalytics={onToggleAnalytics}
          />
        );
      })}
    </div>
  );
}
