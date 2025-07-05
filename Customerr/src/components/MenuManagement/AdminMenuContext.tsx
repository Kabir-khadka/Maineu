//This file is responsible for connecting backend of Menu Management interface with the frontend of FoodItems.
//It displays the menu items, allows adding, editing, and deleting items, and handles image uploads.

'use client'

import React, { useEffect, useState, useCallback } from "react";
import { MenuItem, Category } from '@/types/menu';
import ToggleSwitch from '@/components/MenuManagement/ToggleSwitch';
import MenuItemTable from '@/components/MenuManagement/MenuItemTable'; // Adjust the path if needed
import SearchBar from '@/components/MenuManagement/SearchBar';
import FilterBar from '@/components/MenuManagement/FilterBar'; // Adjust the path if needed
import SimplePagination from '@/components/MenuManagement/SimplePagination';//Import the simple pagination component
import BulkActionBar from  "@/components/MenuManagement/BulkActionBar";
import socket from "@/lib/socket";


const API_URL = 'http://localhost:5000/api/menu'; 

export default function AdminMenuContent() {
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
    const fetchMenuItems = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await fetch(API_URL);
            if (!res.ok) throw new Error('Failed to fetch menu items');
            const data = await res.json();
            setMenuItems(data);
            setError(null);
        } catch (err) {
            setError('Error fetching menu items. Please ensure your backend server is running.');
            console.error('Error fetching items:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Fetch categories - Wrapped in useCallback for useEffect dependency
    const fetchCategories = useCallback(async () => {
        try {
            const res = await fetch('http://localhost:5000/api/categories');
            if (!res.ok) throw new Error('Failed to fetch categories');
            const data: Category[] = await res.json();
            setCategories(data);
        } catch (error) {
            console.error('Failed to fetch categories:', error);
        }
    }, []);

    useEffect(() => {
        fetchMenuItems();
        fetchCategories();

        //Socket.IO integration using shared instance i.e lib/socket.js
        // Event listener for a new menu item
        socket.on('newMenuItem', (newItem: MenuItem) => {
            console.log('Socket: New menu item received:', newItem);
            setMenuItems((prevItems) => [...prevItems, newItem]);
        });

        // Event listener for a menu item update
        socket.on('menuItemUpdated', (updatedItem: MenuItem) => {
            console.log('Socket: Menu item updated:', updatedItem);
            setMenuItems((prevItems) =>
                prevItems.map((item) =>
                    item._id === updatedItem._id ? updatedItem : item
                )
            );
        });

        // Event listener for menu item availability toggle
        socket.on('menuItemToggled', (toggledItem: MenuItem) => {
            console.log('Socket: Menu item availability toggled:', toggledItem);
            setMenuItems((prevItems) =>
                prevItems.map((item) =>
                    item._id === toggledItem._id ? toggledItem : item
                )
            );
        });

        // Event listener for a single menu item deletion
        socket.on('menuItemDeleted', (data: { _id: string }) => {
            console.log('Socket: Menu item deleted:', data._id);
            setMenuItems((prevItems) => prevItems.filter((item) => item._id !== data._id));
        });

        // Event listener for bulk menu item deletion
        socket.on('menuItemBulkDeleted', (data: { deletedIds: string[] }) => {
            console.log('Socket: Bulk menu items deleted:', data.deletedIds);
            setMenuItems((prevItems) =>
                prevItems.filter((item) => !data.deletedIds.includes(item._id))
            );
            setSelectedItems([]); // Clear selected items after bulk delete
        });

        // Event listener for bulk menu item availability toggle
        socket.on('menuItemBulkToggled', (updatedItems: MenuItem[]) => {
            console.log('Socket: Bulk menu items toggled:', updatedItems);
            // Convert updatedItems to a map for efficient lookup
            const updatedItemsMap = new Map(updatedItems.map(item => [item._id, item]));
            setMenuItems(prevItems =>
                prevItems.map(item =>
                    updatedItemsMap.has(item._id) ? updatedItemsMap.get(item._id)! : item
                )
            );
            setSelectedItems([]); // Clear selected items after bulk toggle
        });

        // Event listener for bulk category change
        socket.on('menuItemBulkCategoryChanged', (updatedItems: MenuItem[]) => {
            console.log('Socket: Bulk menu items category changed:', updatedItems);
            const updatedItemsMap = new Map(updatedItems.map(item => [item._id, item]));
            setMenuItems(prevItems =>
                prevItems.map(item =>
                    updatedItemsMap.has(item._id) ? updatedItemsMap.get(item._id)! : item
                )
            );
            setSelectedItems([]); // Clear selected items after bulk category change
        });


        // Clean up on component unmount - remove listeners specifically
        return () => {
            socket.off('newMenuItem');
            socket.off('menuItemUpdated');
            socket.off('menuItemToggled');
            socket.off('menuItemDeleted');
            socket.off('menuItemBulkDeleted');
            socket.off('menuItemBulkToggled');
            socket.off('menuItemBulkCategoryChanged');
            // Do NOT call socket.disconnect() here, as it's a shared instance.
            // Disconnect should only happen when the entire app decides to shut down the connection.
        };
    }, [fetchMenuItems, fetchCategories]);

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

        } catch (err) {
            setError('Error deleting item');
            console.error('Error deleting items:', err);
        }
    };

    //Toogle item availability
    const handleToggleAvailability = async (id: string) => {
        try {
            //Make API call to persist change
            const res = await fetch(`${API_URL}/${id}/toggle`, {
                method: 'PATCH',
            });

            if (!res.ok) {
                throw new Error('Failed to update availability');
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
        // Replaced styles.adminContainer with Tailwind classes
        <div className="p-5 max-w-6xl mx-auto my-5 bg-white rounded-xl shadow-lg">
            {/* Replaced styles.title with Tailwind classes */}
            <h1 className="text-center text-gray-800 mb-8 text-4xl font-bold">Menu Management</h1>
            
            {/* Replaced styles.error with Tailwind classes */}
            {error && <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-5 border border-red-200">{error}</div>}
            
            {/* Replaced styles.form with Tailwind classes */}
            <form className="bg-gray-50 p-6 rounded-xl mb-8 shadow-md" onSubmit={editingId ? handleUpdate : handleAdd}>
                {/* Applied Tailwind classes directly to h2 */}
                <h2 className="text-2xl text-gray-800 mb-5 text-center">{editingId ? 'Edit Menu Item' : 'Add New Menu Item'}</h2>
                
                {/* Replaced styles.formGroup with Tailwind classes for all form groups */}
                <div className="mb-4">
                    {/* Applied Tailwind classes directly to label and input */}
                    <label htmlFor="name" className="block mb-2 font-medium text-gray-600">Item Name:</label>
                    <input 
                        id="name"
                        name="name" 
                        placeholder="Item Name" 
                        value={form.name} 
                        onChange={updateForm}
                        required
                        className="w-full py-2.5 px-3 border border-gray-300 rounded-md text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                </div>
                
                <div className="mb-4">
                    <label htmlFor="price" className="block mb-2 font-medium text-gray-600">Price ($):</label>
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
                        className="w-full py-2.5 px-3 border border-gray-300 rounded-md text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                </div>
                
                <div className="mb-4">
                    <label htmlFor="category" className="block mb-2 font-medium text-gray-600">Category:</label>
                    <select
                        id="category"
                        name="category"
                        value={form.category}
                        onChange={updateForm}
                        required
                        className="w-full py-2.5 px-3 border border-gray-300 rounded-md text-base focus:border-blue-500 focus:outline-none
                        focus:ring-2 focus:ring-blue-200]"
                    >
                        <option value="">Select Category</option>
                        {categories.map((category) => (
                            <option key={category._id} value={category.name}>
                                {category.name}
                            </option>
                        ))}
                    </select>                
                </div>
                
                <div className="mb-4">
                    <label htmlFor="image" className="block mb-2 font-medium text-gray-600">Item Image:</label>
                    <input 
                        id="image"
                        name="image"
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="w-full py-2.5 px-3 border border-gray-300 rounded-md text-base file:mr-4 file:py-2 file:px-4
                                   file:rounded-md file:border-0 file:text-sm file:font-semibold
                                   file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" // Tailwind for file input styling
                    />
                    {imagePreview && (
                        // Replaced styles.imagePreview and styles.previewImage with Tailwind classes
                        <div className="mt-2.5 text-center">
                            <img 
                                src={imagePreview} 
                                alt="Preview" 
                                width="100"
                                className="max-w-[100px] h-auto rounded border border-gray-200 inline-block" // Added inline-block to center
                            />
                        </div>
                    )}
                </div>
                
                {/* Replaced tooglestyles.formGroup with common form group class */}
                <div className="mb-4">
                    <ToggleSwitch
                        checked={form.available}
                        onChange={(checked) => setForm({ ...form, available: checked })}
                        label="Available"
                    />
                </div>
                
                {/* Replaced styles.formActions with Tailwind classes */}
                <div className="flex justify-end gap-4 mt-5">
                    {/* Replaced styles.primaryButton with Tailwind classes */}
                    <button type="submit" className="py-2.5 px-5 bg-green-600 text-white rounded-md cursor-pointer text-base transition-colors duration-200 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-300 focus:ring-opacity-50">
                        {editingId ? 'Update Item' : 'Add Item'}
                    </button>
                    
                    {editingId && (
                        // Replaced styles.secondaryButton with Tailwind classes
                        <button 
                            type="button" 
                            className="py-2.5 px-5 bg-gray-500 text-white rounded-md cursor-pointer text-base transition-colors duration-200 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-opacity-50" 
                            onClick={handleCancel}
                        >
                            Cancel
                        </button>
                    )}
                </div>
            </form>

            {/* Replaced styles.menuList with Tailwind classes */}
            <div className="mt-10">
                {/* Applied Tailwind classes directly to h2 */}
                <h2 className="text-3xl text-gray-800 mb-6 text-center">Menu Items</h2>

                {/* The SearchBar component already handles its own container styling */}
                <SearchBar
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                />
                <FilterBar
                    categories={categories}
                    selectedCategory={selectedCategory}
                    onCategoryChange={setSelectedCategory}
                    selectedAvailability={selectedAvailability}
                    onAvailabilityChange={setSelectedAvailability}
                />

                {/* Bulk Action Bar - This component has not been converted yet. */}
                <BulkActionBar
                    selectedIds={selectedItems}
                    onDeleteSelected={handleDeleteSelected}
                    onToggleAvailabilitySelected={handleToggleAvailabilitySelected}
                    onChangeCategory={handleChangeCategory}
                    categories={categories.map(c => c.name)}
                />
                
                {isLoading ? (
                    <p className="text-center py-4 text-gray-600">Loading menu items...</p>
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
                    // Replaced styles.paginationWrapper with Tailwind classes
                    <div className="flex justify-center mt-6">
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