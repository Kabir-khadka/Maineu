//This file is responsible for connecting backend of Menu Management interface with the frontend of FoodItems.
//It displays the menu items, allows adding, editing, and deleting items, and handles image uploads.

'use client'

import React, { useEffect, useState } from "react";
import styles from './menu.module.css';
import { MenuItem, Category } from '@/types/menu';
import ToggleSwitch from '@/components/MenuManagement/ToggleSwitch';
import MenuItemTable from '@/components/MenuManagement/MenuItemTable'; // Adjust the path if needed
import SearchBar from '@/components/MenuManagement/SearchBar';
import FilterBar from '@/components/MenuManagement/FilterBar'; // Adjust the path if needed
import tooglestyles from '@/components/MenuManagement/MenuManagement.module.css';
import SimplePagination from '@/components/MenuManagement/SimplePagination';//Import the simple pagination component
import BulkActionBar from  "@/components/MenuManagement/BulkActionBar";



const API_URL = 'http://localhost:5000/api/menu'; 

export default function AdminMenuPage() {
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedAvailability, setSelectedAvailability] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 12; // Number of items to display per page
    const [selectedItems, setSelectedItems] = useState<string[]>([]); // For bulk actions

    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState({
        name: '',
        price: '',
        category: '',
        available: true
    });

    //Filter items based on search query
    const filteredItems = menuItems.filter(item => {
        const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory ? (
            typeof item.category === 'object' ? item.category.name === selectedCategory : item.category === selectedCategory
        ): true;
        const matchesAvailability = selectedAvailability ? (selectedAvailability === 'available' ? item.available : !item.available) : true;

        return matchSearch && matchesCategory && matchesAvailability;

    }
        
    );

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredItems.slice(indexOfFirstItem, indexOfLastItem);

    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

    //Function to handle page changes from SimplePagination component
    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    }

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

    useEffect(() => {
    setCurrentPage(1); // reset to first page when filters/search changes
}, [searchQuery, selectedCategory, selectedAvailability]);

    // Add new item with image
    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            
            // Create FormData object for multipart/form-data submission
            const formData = new FormData();
            formData.append('name', form.name);
            formData.append('price', form.price);
            formData.append('category', form.category);
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
           
            // Create FormData object for multipart/form-data submission
            const formData = new FormData();
            formData.append('name', form.name);
            formData.append('price', form.price);
            formData.append('category', form.category);
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
            setImageFile(null);
            setImagePreview(null);

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

    //Toogle item availability
    const handleToggleAvailability = async (id: string) => {
        try {
            //Update UI optimistically
            const updatedItems = menuItems.map(item => 
                item._id === id ? { 

                    ...item,
                    available : !item.available } : item
                
            );
            setMenuItems(updatedItems);

            //Make API call to persist change
            const res = await fetch(`${API_URL}/${id}/toggle`, {
                method: 'PATCH',
            });

            if (!res.ok) {
                throw new Error('Failed to update availability');
                //If API call fails, revert UI change by re-fetching data
                fetchMenuItems();
            }
        } catch (err) {
            setError('Error updating availability');
            console.error('Error updating availability:', err);
            //Revert UI change by re-fetching data
            fetchMenuItems();
        }
    }

    //Bulk action handlers
    const handleSelectItem = (id: string, selected: boolean) => {
        setSelectedItems((prev) => selected
            ? [...prev, id]
            : prev.filter(itemId => itemId !== id)
        );
    };

    const handleSelectAll = (selected: boolean, visibleItemIds: string[]) => {
        if (selected) {
            setSelectedItems(prev => [...new Set([...prev, ...visibleItemIds])]);

        } else {
            setSelectedItems(prev => prev.filter(id => !visibleItemIds.includes(id)));
        }
    };

    const handleDeleteSelected = async () => {
        if (!confirm('Are you sure you want to delete selected items?')) return;

        try {
            // Use bulk delete endpoint instead of individual deletes
            
                const res = await fetch(`${API_URL}`, { 
                method: 'DELETE ',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: selectedItems})
            });

            if (!res.ok) throw new Error('Failed to delete selected items');
            
            setMenuItems((prev) => prev.filter(item => !selectedItems.includes(item._id)));
            setSelectedItems([]);
        } catch (error) {
            setError('Error deleting selected items');
            console.error('Error deleting selected items:', error);
            fetchMenuItems(); // Re-fetch items to ensure UI is in sync
        }
    };

    const handleToggleAvailabilitySelected = async () => {
        try {
            
            const res = await fetch(`${API_URL}/toggle`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids : selectedItems })
            });
            if (!res.ok) throw new Error('Failed to toggle availability');
            
            fetchMenuItems(); // Re-fetch data after bulk update
            setSelectedItems([]);
        } catch (err) {
            setError('Error updating availability for selected items');
            console.error('Error updating availability for selected items:', err);
            fetchMenuItems(); // Re-fetch items to ensure UI is in sync
        }
    };

    const handleChangeCategory = async (newCategory: string) => {
        try {
            //Use the bulk update endpoint to change category
            const res = await fetch(`${API_URL}/change-category`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ids: selectedItems,
                    category: newCategory
                })
            });

            if(!res.ok) throw new Error('Failed to update category');

            fetchMenuItems(); // Re-fetch data after bulk update
            setSelectedItems([]);
        } catch (err) {
            setError('Error updating category for selected items');
            console.error('Error changing category for selected items:', err);
            fetchMenuItems(); // Re-fetch items to ensure UI is in sync
        }
    }

    //Start editing an item
    const handleEdit = (item: MenuItem) => {
        setEditingId(item._id);
        setForm({
            name: item.name,
            price: item.price.toString(),
             category: typeof item.category === 'object' ? item.category.name : item.category,  // Ensure category is always a string
            available: item.available
        });
        
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
                        onChange={updateForm}
                        required
                    >
                        <option value="">Select Category</option>
                        {categories.map((category) => (
                            <option key={category._id} value={category.name}>
                                {category.name}
                            </option>
                        ))}
                    </select>                 
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
                
                <div className={tooglestyles.formGroup}>
                    <ToggleSwitch
                         checked={form.available}
                         onChange={(checked) => setForm({ ...form, available: checked })}
                         label="Available"
                    />
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

                <div className={styles.searchContainer}>
                    <SearchBar
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                    />
                </div>
                <FilterBar
                        categories={categories}
                        selectedCategory={selectedCategory}
                        onCategoryChange={setSelectedCategory}
                        selectedAvailability={selectedAvailability}
                        onAvailabilityChange={setSelectedAvailability}
                    />

                    {/* Bulk Action Bar */}
                    <BulkActionBar
                       selectedIds={selectedItems}
                        onDeleteSelected={handleDeleteSelected}
                        onToggleAvailabilitySelected={handleToggleAvailabilitySelected}
                        onChangeCategory={handleChangeCategory}
                        categories={categories.map(c => c.name)}
                    />
                
                {isLoading ? (
                    <p>Loading menu items...</p>
                ) : (
                    <MenuItemTable 
                        items={currentItems} 
                        onEdit={handleEdit} 
                        onDelete={handleDelete} 
                        onToggleAvailability={handleToggleAvailability}
                        onSelectItem={handleSelectItem}
                        onSelectAll={handleSelectAll}
                        selectedItems={selectedItems}
                    />
                  )}

                  {totalPages > 0 && (
                    <div className={styles.paginationWrapper}>
                        <SimplePagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={handlePageChange}
                        />

                    </div>

                  )}
                </div>
        </div>
    );
}