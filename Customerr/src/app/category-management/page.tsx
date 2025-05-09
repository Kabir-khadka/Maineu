'use client';

import React, { useEffect, useState } from 'react';
import styles from './category.module.css';
import axios from 'axios';
import SortableCategoryList from '@/components/category/SortableCategoryList';

interface Category {
  _id: string;
  name: string;
  position?: number;
}

export default function CategoryManagementPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const predefinedCategories = [
    'Food', 'Momos', 'Noodles', 'Pizza', 'Drinks',
    'Snacks', 'Thali', 'Desserts', 'Ice Cream', 'Sea'
  ];

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const dbRes = await axios.get<Category[]>('http://localhost:5000/api/categories');
      setCategories(dbRes.data);
    } catch (err) {
      console.error('Error fetching categories:', err);
    } finally {
      setIsLoading(false);
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

  const handleCancelEdit = () => {
  setEditId(null);
  setEditName('');
};

  const handleUpdate = async () => {
    if (!editName.trim() || !editId) return;
    
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

    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      await axios.delete(`http://localhost:5000/api/categories/${id}`);
      fetchCategories();
    } catch (err) {
      alert('Failed to delete category: ' + (err as any).response?.data?.message);
    }
  };

  const handleReorder = async (updatedList: Category[]) => {
    try {
      await axios.put('http://localhost:5000/api/categories/reorder', {
        categories: updatedList
      });
      setCategories(updatedList);
    } catch (err) {
      console.error('Failed to reorder categories:', err);
      alert('Failed to reorder categories');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAdd();
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
          onKeyPress={handleKeyPress}
          className={styles.input}
        />
        <button 
          onClick={handleAdd} 
          className={styles.addButton}
          disabled={!newCategory.trim()}
        >
          ➕ Add Category
        </button>
      </div>

      {isLoading ? (
        <p>Loading categories...</p>
      ) : categories.length === 0 ? (
        <p>No categories found. Add one to get started.</p>
      ) : (
        <SortableCategoryList
          categories={categories}
          onReorder={handleReorder}
          onEdit={handleEdit}
          onDelete={handleDelete}
          editId={editId}
          editName={editName}
          setEditName={setEditName}
          onUpdate={handleUpdate}
          onCancelEdit={handleCancelEdit}
        />
      )}
    </div>
  );
}