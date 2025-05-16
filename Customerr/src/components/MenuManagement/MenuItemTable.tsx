'use client';

import React from 'react';
import { MenuItem } from '@/types/menu';
import styles from './MenuManagement.module.css';

interface Props {
  items: MenuItem[];
  onEdit: (item: MenuItem) => void;
  onDelete: (id: string) => void;
}

const MenuItemTable: React.FC<Props> = ({ items, onEdit, onDelete }) => {
  if (items.length === 0) {
    return <p>No items found.</p>;
  }

  return (
    <table className={styles.table}>
      <thead>
        <tr>
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
              <span className={item.available ? styles.available : styles.unavailable}>
                {item.available ? 'Available' : 'Unavailable'}
              </span>
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