'use client';

import React, { useEffect, useState } from 'react';
import styles from './category.module.css';
import axios from 'axios';

interface Category {
  _id?: string;
  name: string;
}

export default function CategoryManagementPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const predefinedCategories = [
    'Food', 'Momos', 'Noodles', 'Pizza', 'Drinks',
    'Snacks', 'Thali', 'Desserts', 'Ice Cream', 'Sea'
  ];

  const fetchCategories = async () => {
    try {
      const dbRes = await axios.get<Category[]>('http://localhost:5000/api/categories');
  
      // Filter and sort by predefined order
      const filteredAndSorted = predefinedCategories
        .map(name => dbRes.data.find(cat => cat.name === name))
        .filter(Boolean) as Category[];
  
      setCategories(dbRes.data);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const handleAdd = async () => {
    if (!newCategory.trim()) return;
    try {
      await axios.post('http://localhost:5000/api/categories', { name: newCategory });
      setNewCategory('');
      fetchCategories();
    } catch (err) {
      alert('Failed to add category: ' + (err as any).response?.data?.message);
    }
  };

  const handleEdit = (id: string | null, name: string) => {
    setEditId(id);
    setEditName(name);
  };

  const handleUpdate = async () => {
    if (!editName.trim() || !editId) return;
  
    // Prevent invalid renames
    if (!predefinedCategories.includes(editName.trim())) {
      alert('Category name must be one of the predefined categories.');
      return;
    }
  
    try {
      await axios.put(`http://localhost:5000/api/categories/${editId}`, { name: editName.trim() });
      setEditId(null);
      setEditName('');
      fetchCategories();
    } catch (err) {
      alert('Failed to update category: ' + (err as any).response?.data?.message);
    }
  };
  

  const handleDelete = async (id: string | null, name: string) => {
    if (!id) return;

    if (!window.confirm('Are you sure you want to delete this category?')) return;

    try {
      await axios.delete(`http://localhost:5000/api/categories/${id}`);
      fetchCategories();
    } catch (err) {
      alert('Failed to delete category: ' + (err as any).response?.data?.message);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>📂 Category Management</h1>

      <div className={styles.formGroup}>
        <input
          type="text"
          placeholder="Enter new category name"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          className={styles.input}
        />
        <button onClick={handleAdd} className={styles.addButton}>
          ➕ Add Category
        </button>
      </div>

      <ul className={styles.categoryList}>
        {categories.map((cat) => (
          <li key={cat._id} className={styles.categoryItem}>
            {editId === cat._id ? (
              <>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className={styles.input}
                />
                <button onClick={handleUpdate} className={styles.saveButton}>
                  💾 Save
                </button>
                <button onClick={() => setEditId(null)} className={styles.cancelButton}>
                  ❌ Cancel
                </button>
              </>
            ) : (
              <>
                <span className={styles.categoryName}>{cat.name}</span>
                <button onClick={() => handleEdit(cat._id || null, cat.name)} className={styles.editButton}>
                  ✏️ Edit
                </button>
                <button onClick={() => handleDelete(cat._id || null, cat.name)} className={styles.deleteButton}>
                  🗑️ Delete
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
