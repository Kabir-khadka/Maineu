'use client';

import React, { useEffect, useState, useCallback } from 'react';
import styles from '@/app/category-management/category.module.css';
import axios from 'axios';
import SortableCategoryList from '@/components/CategorySort/SortableCategoryList';
import socket from '@/lib/socket';

interface Category {
  _id: string;
  name: string;
  position?: number;
}

export default function CategoryManagementContent() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [isLoading, setIsLoading] = useState(false);


  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      const dbRes = await axios.get<Category[]>('http://localhost:5000/api/categories');
      setCategories(dbRes.data);
    } catch (err) {
      console.error('Error fetching categories:', err);
    } finally {
      setIsLoading(false);
    }
  },[]);

  // useEffect for initial fetch and Socket.IO listeners
  useEffect(() => {
    fetchCategories(); // Initial fetch

    // ---------------- Socket.IO Integration ----------------
    // Handler for any category change event
    const handleCategoryChange = () => {
      console.log('Socket: Category change detected. Re-fetching categories.');
      fetchCategories(); // Re-fetch all categories to update the list
    };

    // Listen for category-specific events from the backend
    socket.on('newCategoryAdded', handleCategoryChange);
    socket.on('categoryUpdated', handleCategoryChange);
    socket.on('categoryRemoved', handleCategoryChange);
    socket.on('categoriesReordered', handleCategoryChange); // Listen for reorder events as well

    // Clean up on component unmount
    return () => {
      socket.off('newCategoryAdded', handleCategoryChange);
      socket.off('categoryUpdated', handleCategoryChange);
      socket.off('categoryRemoved', handleCategoryChange);
      socket.off('categoriesReordered', handleCategoryChange);
      // Do NOT call socket.disconnect() here, as it's a shared instance.
    };
  }, [fetchCategories]); // Dependency on fetchCategories ensures the effect re-runs if fetchCategories itself changes (though it's useCallback, so it won't)

  const handleAdd = async () => {
    if (!newCategory.trim()) return;
    try {
      await axios.post('http://localhost:5000/api/categories', { name: newCategory });
      setNewCategory('');
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
      // The backend will emit 'categoryUpdated' after successful update
      await axios.put(`http://localhost:5000/api/categories/${editId}`, { name: editName.trim() });
      setEditId(null);
      setEditName('');
    } catch (err) {
      alert('Failed to update category: ' + (err as any).response?.data?.message);
    }
  };

  const handleDelete = async (id: string | null, name: string) => {
    if (!id) return;

    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      await axios.delete(`http://localhost:5000/api/categories/${id}`);
     
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
      fetchCategories(); //Reverting to backend state on error
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAdd();
    }
  };

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