'use client';

import React from 'react';
import { MenuItem } from '@/types/menu';
import styles from './MenuManagement.module.css';
import ToggleSwitch from './ToggleSwitch';

interface Props {
  items: MenuItem[];
  onEdit: (item: MenuItem) => void;
  onDelete: (id: string) => void;
  onToggleAvailability: ( id: string ) => void;
  onSelectItem: (id: string, selected: boolean) => void;
  onSelectAll: (selected: boolean, visibleItemIds: string[]) => void;
  selectedItems: string[];
}

const MenuItemTable: React.FC<Props> = ({ items, onEdit, onDelete, onToggleAvailability, onSelectItem, onSelectAll, selectedItems  }) => {
  if (items.length === 0) {
    return <p>No items found.</p>;
  }

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>
            <input
              type="checkbox"
              checked={items.length > 0 && items.every(item => selectedItems.includes(item._id))}
              onChange={(e) => onSelectAll(e.target.checked, items.map(item => item._id))}
              />
          </th>
          <th>Image</th>
          <th>Name</th>
          <th>Price</th>
          <th>Category</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item._id}>
            <td>
              <input
                type="checkbox"
                checked={selectedItems.includes(item._id)}
                onChange={(e) => onSelectItem(item._id, e.target.checked)}
                />
                </td>
            <td>
              {/* Display image if available, otherwise show a placeholder */}
              {item.image ? (
                <img 
                  src={`http://localhost:5000${item.image}`} 
                  alt={item.name} 
                  width="50" 
                  className={styles.itemImage}
                />
              ) : (
                <span className={styles.noImage}>No image</span>
              )}
            </td>
            <td>{item.name}</td>
            <td>${item.price.toFixed(2)}</td>
            <td>{typeof item.category === 'object' ? item.category.name : item.category}</td>
            <td>
              <ToggleSwitch
                checked={item.available}
                onChange={() => onToggleAvailability(item._id)}
              />
            </td>
            <td>
              <button 
                onClick={() => onEdit(item)} 
                className={styles.editButton}
              >
                Edit
              </button>
              <button 
                onClick={() => onDelete(item._id)} 
                className={styles.deleteButton}
              >
                Delete
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}


export default MenuItemTable;