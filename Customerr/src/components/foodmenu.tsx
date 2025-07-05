'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useOrder } from '@/app/context/OrderContext';
import socket from '@/lib/socket';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

interface MenuItem {
  _id: string;
  name: string;
  price: number;
  category: string;
  available: boolean;
  image: string;
}

interface MenuItemWithQuantity extends MenuItem {
  // This quantity is now solely for tracking new additions made *within this FoodMenu session*.
  // It resets to 0 whenever the FoodMenu loads/reloads or a category changes.
  quantity: number;
}

const FoodMenu = () => {
  const { increaseItemQuantity, decreaseItemQuantity } = useOrder();
  const [activeButton, setActiveButton] = useState<string | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItemWithQuantity[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);

 // Fetch categories from the server - Wrapped in useCallback for useEffect dependency
  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/menu/categories/all`);
      if (!res.ok) throw new Error('Failed to fetch categories');
      const categoryNames: string[] = await res.json();
      setCategories(categoryNames);
      //Setting active button to the first category if none is active yet
      if (categoryNames.length > 0) {
        setActiveButton(prev => prev || categoryNames[0]);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load categories');
    }
  }, [activeButton]);

  // Fetch menu items for the active category - Wrapped in useCallback for useEffect dependency
  const fetchMenuItems = useCallback(async (category: string | null) => {
    if (!category) return; // Don't fetch if no category is selected
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/menu?category=${category}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data: MenuItem[] = await res.json();
      // Crucially, always initialize quantities to 0 for the FoodMenu display
      const itemsWithQuantity: MenuItemWithQuantity[] = data.map(item => ({
        ...item,
        quantity: 0, // This is exactly what you want: always start at 0 here
      }));
      setMenuItems(itemsWithQuantity);
    } catch (err) {
      setError('Failed to fetch items');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial data fetch and Socket.IO listeners
  useEffect(() => {
    fetchCategories();

    // ---------------- Socket.IO Integration ----------------
    const handleMenuChange = () => {
      console.log('Socket: Menu change detected. Re-fetching categories and menu items.');
      fetchCategories(); // Re-fetch all categories to ensure buttons are up-to-date
      if (activeButton) {
        fetchMenuItems(activeButton); // Re-fetch items for the current active category
      }
    };

    // Listen for all relevant menu item events from the admin panel
    socket.on('newMenuItem', handleMenuChange);
    socket.on('menuItemUpdated', handleMenuChange);
    socket.on('menuItemToggled', handleMenuChange);
    socket.on('menuItemDeleted', handleMenuChange);
    socket.on('menuItemBulkDeleted', handleMenuChange);
    socket.on('menuItemBulkToggled', handleMenuChange);
    socket.on('menuItemBulkCategoryChanged', handleMenuChange);
    // Category-specific events
        socket.on('newCategoryAdded', handleMenuChange);
        socket.on('categoryRemoved', handleMenuChange);
        socket.on('categoryUpdated', handleMenuChange); // Ensure this is also listened for if category names can be edited
        socket.on('categoriesReordered', handleMenuChange);

    // Clean up on component unmount
    return () => {
      socket.off('newMenuItem', handleMenuChange);
      socket.off('menuItemUpdated', handleMenuChange);
      socket.off('menuItemToggled', handleMenuChange);
      socket.off('menuItemDeleted', handleMenuChange);
      socket.off('menuItemBulkDeleted', handleMenuChange);
      socket.off('menuItemBulkToggled', handleMenuChange);
      socket.off('menuItemBulkCategoryChanged', handleMenuChange);
      // Category-specific events cleanup
      socket.off('newCategoryAdded', handleMenuChange);
      socket.off('categoryRemoved', handleMenuChange);
      socket.off('categoryUpdated', handleMenuChange);
      socket.off('categoriesReordered', handleMenuChange);
    };
  }, [fetchCategories, fetchMenuItems, activeButton]); // Dependencies for useEffect

  // Fetch items whenever the active category button changes
  useEffect(() => {
    if (activeButton) {
      fetchMenuItems(activeButton);
    }
  }, [activeButton, fetchMenuItems]);

  const handleButtonClick = (category: string) => {
    setActiveButton(category);
  };

  // --- FIXED QUANTITY HANDLERS WITH useCallback ---
  const handleIncreaseQuantity = useCallback((item: MenuItemWithQuantity) => {
    console.log('handleIncreaseQuantity called for:', item.name);
    
    // Update local state first
    setMenuItems(prevItems => {
      return prevItems.map(menuItem => {
        if (menuItem._id === item._id) {
          const newLocalQuantity = menuItem.quantity + 1;
          return { ...menuItem, quantity: newLocalQuantity };
        }
        return menuItem;
      });
    });

    // Then update the OrderContext
    increaseItemQuantity(item.name, item.price);
  }, [increaseItemQuantity]);

  const handleDecreaseQuantity = useCallback((item: MenuItemWithQuantity) => {
    console.log('handleDecreaseQuantity called for:', item.name);
    
    // Update local state first
    setMenuItems(prevItems => {
      return prevItems.map(menuItem => {
        if (menuItem._id === item._id && menuItem.quantity > 0) {
          const newLocalQuantity = menuItem.quantity - 1;
          return { ...menuItem, quantity: newLocalQuantity };
        }
        return menuItem;
      });
    });

    // Then update the OrderContext
    decreaseItemQuantity(item.name);
  }, [decreaseItemQuantity]);
  // --- END FIXED QUANTITY HANDLERS ---

  return (
   <div className="flex flex-col items-center p-2.5 w-full bg-[#fdd7a2]">
      {/* Category Buttons */}
      <div className="grid grid-cols-4 gap-2.5 w-full max-w-2xl justify-center -ml-4">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => handleButtonClick(cat)}
            className={`
              p-2.5 text-sm font-bold cursor-pointer border border-gray-300 rounded-md
              bg-transparent text-gray-800 text-center transition-colors duration-300 transform
              ${activeButton === cat ? 'bg-gray-800 text-white shadow-md scale-105' : 'hover:bg-gray-100 hover:scale-105'}
            `}
          >
            <span>{cat}</span>
          </button>
        ))}
      </div>

      {/* Available items (optional button) */}
      <div className="mt-4">
        <button 
          className="py-3 px-1.5 text-sm font-semibold cursor-pointer
                     bg-transparent text-[#FF4500] rounded-lg border-none
                     transition-all duration-300 ml-52"
          >
            Available items
        </button>
      </div>

      {/* Render menu items */}
       <div className="mt-5 w-full max-w-2xl flex flex-col gap-4">
        <h2 className="text-xl font-semibold mb-4">{activeButton} Items</h2>
        {isLoading ? (
          <p className="text-center text-gray-600">Loading...</p>
        ) : error ? (
          <p className="text-red-600 text-center">{error}</p>
        ) : menuItems.length === 0 ? (
          <p className="text-center text-gray-500">No items in this category.</p>
        ) : (
          menuItems.map((item) => (
            <div key={item._id} 
            className="flex items-center gap-3 border border-gray-200 rounded-lg p-2.5 bg-gray-50 shadow-sm"
            >
              <img
                src={`${BACKEND_URL}${item.image}`}
                alt={item.name}
                className="w-20 h-20 rounded-lg object-cover"
              />
              <div className="flex-1">
                <h3 className="m-0 text-lg font-semibold">{item.name}</h3>
                <p className="my-1 text-base text-gray-700">${item.price.toFixed(2)}</p>
                <p className="text-xs text-gray-600">
                  {item.available ? 'Available' : 'Unavailable'}
                </p>
                <div  className="flex items-center gap-2.5 mt-2">
                  <button 
                    onClick={() => handleDecreaseQuantity(item)}
                    disabled={item.quantity === 0}
                    className={`
                      py-1.5 px-2.5 border border-gray-300 rounded bg-gray-100 text-base
                      transition-colors duration-300 hover:bg-gray-200
                      ${item.quantity === 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    -
                  </button>
                  {/* This quantity is now purely the local count for this FoodMenu session */}
                  <span  className="text-base font-medium">{item.quantity}</span>
                  <button 
                    onClick={() => handleIncreaseQuantity(item)}
                    className="py-1.5 px-2.5 border border-gray-300 rounded bg-gray-100 text-base
                               transition-colors duration-300 hover:bg-gray-200 cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default FoodMenu;