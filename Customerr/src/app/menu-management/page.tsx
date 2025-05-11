//This file is responsible for connecting backend of Menu Management interface with the frontend of FoodItems.
//It displays the menu items, allows adding, editing, and deleting items, and handles image uploads.

'use client'

import React, { useEffect, useState } from "react";
import styles from './menu.module.css';

interface MenuItem {
    _id: string;
    name: string;
    price: number;
    category: Category | string;  // It could be a Category object or just a string
    available: boolean;
    image?: string;
}

type Category = {
  _id: string;
  name: string;
};

const API_URL = 'http://localhost:5000/api/menu'; 

export default function AdminMenuPage() {
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState({
        name: '',
        price: '',
        category: '',
        available: true
    });

    // Handle image file selection
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        setImageFile(file);
        
        // Create preview URL for the selected image
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        } else {
            setImagePreview(null);
        }
    };

    //Fetch menu items
    const fetchMenuItems = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(API_URL);
            if (!res.ok) throw new Error('Failed to fetch menu items');
            const data = await res.json();
            setMenuItems(data);
            setError(null);

        } catch (err) {
            setError('Error fetching menu items. PLease ensure your backend server is running.');
            console.error('Error fetching items:', err);
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch categories
    const fetchCategories = async () => {
  try {
    const res = await fetch('http://localhost:5000/api/categories');
    if (!res.ok) throw new Error('Failed to fetch categories');
    const data: Category[] = await res.json(); // Ensure proper typing
    setCategories(data); // Use Category[] instead of string[]
  } catch (error) {
    console.error('Failed to fetch categories:', error);
  }
};

    useEffect(() => {
        fetchMenuItems();
        fetchCategories();
    }, []);

    // Add new item with image
    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const categoryToSubmit = isAddingNewCategory ? newCategoryName : form.category;
            
            // Create FormData object for multipart/form-data submission
            const formData = new FormData();
            formData.append('name', form.name);
            formData.append('price', form.price);
            formData.append('category', categoryToSubmit);
            formData.append('available', String(form.available));
            if (imageFile) {
                formData.append('image', imageFile);
            }

            const res = await fetch(API_URL, {
                method: 'POST',
                body: formData
                // No Content-Type header - browser sets it automatically with boundary for FormData
            });

            if (!res.ok) throw new Error('Failed to add item');

            const newItem = await res.json();
            setMenuItems([...menuItems, newItem]);
            setForm({ name: '', price: '', category: '', available: true});
            setImageFile(null);
            setImagePreview(null);
            
            // Refresh categories if a new category was added
            if (!categories.some((cat) => cat.name === categoryToSubmit)) {
                fetchCategories();
            }
        } catch (err){
            setError('Error adding item');
            console.error('Error adding item:', err);       
         }
    };

    //Update item with image
    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!editingId) return;

        try {
            const categoryToSubmit = isAddingNewCategory ? newCategoryName : form.category;
            
            // Create FormData object for multipart/form-data submission
            const formData = new FormData();
            formData.append('name', form.name);
            formData.append('price', form.price);
            formData.append('category', categoryToSubmit);
            formData.append('available', String(form.available));
            if (imageFile) {
                formData.append('image', imageFile);
            }
            
            const res = await fetch(`${API_URL}/${editingId}`, {
                method: 'PUT',
                body: formData
                // No Content-Type header - browser sets it automatically with boundary for FormData
            });

            if (!res.ok) throw new Error('Failed to update item');

            const updatedItem = await res.json();

            setMenuItems(menuItems.map(item => 
                item._id === editingId ? updatedItem : item 
            ));

            setEditingId(null);
            setForm({ name: '', price: '', category: '', available: true });    
            setIsAddingNewCategory(false);
            setNewCategoryName('');
            setImageFile(null);
            setImagePreview(null);
            
            // Refresh categories if a new category was added
            if (!categories.some((cat) => cat.name === categoryToSubmit)) {
                fetchCategories();
            }
        } catch(err){
            setError('Error updating item');
            console.error('Error updating item:', err);
        }
    };

    //Delete item
    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this item?')) return;

        try {
            const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });

            if (!res.ok) throw new Error('Failed to delete item');

            setMenuItems(menuItems.filter(item => item._id !== id));
        } catch (err) {
            setError('Error deleting item');
            console.error('Error deleting items:', err);
        }
    };

    //Start editing an item
    const handleEdit = (item: MenuItem) => {
        setEditingId(item._id);
        setForm({
            name: item.name,
            price: item.price.toString(),
             category: typeof item.category === 'object' ? item.category.name : item.category,  // Ensure category is always a string
            available: item.available
        });
        setIsAddingNewCategory(false);
        setNewCategoryName('');
        
        // Set image preview if the item has an image
        if (item.image) {
            setImagePreview(`http://localhost:5000${item.image}`);
        } else {
            setImagePreview(null);
        }
        setImageFile(null); // Reset file input
    };

    //Cancel editing
    const handleCancel = () => {
        setEditingId(null);
        setForm({ name: '', price: '', category: '', available: true });
        setIsAddingNewCategory(false);
        setNewCategoryName('');
        setImageFile(null);
        setImagePreview(null);
    };

    // Update form state
    const updateForm = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;
        
        setForm({
            ...form,
            [name]: type === 'checkbox' ? checked : value
        });
    };

    return (
        <div className={styles.adminContainer}>
            <h1 className={styles.title}>Menu Management</h1>
            
            {error && <div className={styles.error}>{error}</div>}
            
            <form className={styles.form} onSubmit={editingId ? handleUpdate : handleAdd}>
                <h2>{editingId ? 'Edit Menu Item' : 'Add New Menu Item'}</h2>
                
                <div className={styles.formGroup}>
                    <label htmlFor="name">Item Name:</label>
                    <input 
                        id="name"
                        name="name" 
                        placeholder="Item Name" 
                        value={form.name} 
                        onChange={updateForm}
                        required
                    />
                </div>
                
                <div className={styles.formGroup}>
                    <label htmlFor="price">Price ($):</label>
                    <input 
                        id="price"
                        name="price" 
                        type="number" 
                        step="0.01"
                        min="0"
                        placeholder="Price" 
                        value={form.price} 
                        onChange={updateForm}
                        required
                    />
                </div>
                
                <div className={styles.formGroup}>
                    <label htmlFor="category">Category:</label>
                    <select
                        id="category"
                        name="category"
                        value={form.category}
                        onChange= { (e) => {
                            const selected = e.target.value;
                            if (selected === "new") {
                                setIsAddingNewCategory(true);
                                setForm({ ...form, category: '' }); // Clear existing category
                            } else {
                                setIsAddingNewCategory(false);
                                setForm({ ...form, category: selected });
                            }
                        }}
                        required = {!isAddingNewCategory}
                    >
                        <option value="">Select Category</option>
                        {categories.map((category) => (
                            <option key={category._id} value={category.name}>
                                {category.name}
                            </option>
                        ))}
                        <option value="new">+ Add New Category</option>
                    </select>
                    
                    {isAddingNewCategory && (
                        <input
                            //name="category"
                            placeholder="Enter new category"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            className={styles.newCategoryInput}
                            required
                        />
                    )}
                </div>
                
                <div className={styles.formGroup}>
                    <label htmlFor="image">Item Image:</label>
                    <input 
                        id="image"
                        name="image"
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                    />
                    {imagePreview && (
                        <div className={styles.imagePreview}>
                            <img 
                                src={imagePreview} 
                                alt="Preview" 
                                width="100"
                                className={styles.previewImage} 
                            />
                        </div>
                    )}
                </div>
                
                <div className={styles.formGroup}>
                    <label className={styles.checkboxLabel}>
                        <input 
                            name="available" 
                            type="checkbox" 
                            checked={form.available} 
                            onChange={updateForm} 
                        />
                        Available
                    </label>
                </div>
                
                <div className={styles.formActions}>
                    <button type="submit" className={styles.primaryButton}>
                        {editingId ? 'Update Item' : 'Add Item'}
                    </button>
                    
                    {editingId && (
                        <button 
                            type="button" 
                            className={styles.secondaryButton} 
                            onClick={handleCancel}
                        >
                            Cancel
                        </button>
                    )}
                </div>
            </form>

            <div className={styles.menuList}>
                <h2>Menu Items</h2>
                
                {isLoading ? (
                    <p>Loading menu items...</p>
                ) : menuItems.length === 0 ? (
                    <p>No menu items found. Add some items to get started.</p>
                ) : (
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
                            {menuItems.map((item) => (
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
                                            onClick={() => handleEdit(item)} 
                                            className={styles.editButton}
                                        >
                                            Edit
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(item._id)} 
                                            className={styles.deleteButton}
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}