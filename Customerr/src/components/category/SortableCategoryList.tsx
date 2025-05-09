'use client';

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState, useEffect } from 'react';
import styles from '@/app/category-management/category.module.css';

interface Category {
  _id: string;
  name: string;
  position?: number;
}

interface Props {
  categories: Category[];
  onReorder: (updated: Category[]) => void;
  onEdit: (id: string, name: string) => void;
  onDelete: (id: string, name: string) => void;
  editId: string | null;
  editName: string;
  setEditName: (name: string) => void;
  onUpdate: () => void;
  onCancelEdit: () => void;
}

export default function SortableCategoryList({ 
    categories, 
    onReorder,
    onEdit,
    onDelete,
    editId,
    editName,
    setEditName,
    onUpdate,
    onCancelEdit
}: Props) {
  const [items, setItems] = useState(categories);

  useEffect(() => {
    setItems(categories);
  }, [categories]);

  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex(i => i._id === active.id);
    const newIndex = items.findIndex(i => i._id === over.id);

    const newList = arrayMove(items, oldIndex, newIndex);
    setItems(newList);
    onReorder(newList);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map(i => i._id)} strategy={verticalListSortingStrategy}>
        <ul className={styles.categoryList}>
          {items.map(cat => (
            <SortableItem 
              key={cat._id} 
              id={cat._id} 
              name={cat.name}
              isEditing={editId === cat._id}
              editName={editName}
              setEditName={setEditName}
              onEdit={() => onEdit(cat._id, cat.name)}
              onDelete={() => onDelete(cat._id, cat.name)}
              onUpdate={onUpdate}
              onCancelEdit={onCancelEdit}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortableItem({ 
    id, 
    name,
    isEditing,
    editName,
    setEditName,
    onEdit,
    onDelete,
    onUpdate,
    onCancelEdit
}: { 
    id: string; 
    name: string;
    isEditing: boolean;
    editName: string;
    setEditName: (name: string) => void;
    onEdit: () => void;
    onDelete: () => void;
    onUpdate: () => void; 
    onCancelEdit: () => void;
}) {
  const { 
    attributes, 
    listeners, 
    setNodeRef, 
    transform, 
    transition 
} = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li ref={setNodeRef} style={style} className={styles.categoryItem}>
    {/* Draggable Area */}
    <div
    {...attributes}
    {...(!isEditing && listeners)}
    style={{ display: 'flex', alignItems: 'center', flex: 1, cursor: 'grab' }}
    >
      <span style={{ marginRight: '0.75rem' }}>⠿</span>
      {isEditing ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className={styles.input}
            style={{ flex: 1 }}
          />
      ) : (
        <span className={styles.categoryName}>{name}</span>
      )}
    </div>

    {/* Non -draggable Area */}
    <div style={{ marginLeft: '1rem', display: 'flex', gap: '0.5rem' }}>
        {isEditing ? (
            <>
            <button onClick={onUpdate} className={styles.saveButton}>💾 Save</button>
            <button onClick={onCancelEdit} className={styles.cancelButton}>❌ Cancel</button>
            </>
        ) : (
            <>
            <button onClick={onEdit} className={styles.editButton}>✏️ Edit</button>
            <button onClick={onDelete} className={styles.deleteButton}>🗑️ Delete</button>
            </>
        )}
            
     </div>
    </li>
  );
}