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

// We no longer need MenuItemWithQuantity for the main menuItems state,
// as the "quantity to add" will be managed locally per item in the rendering loop.

const FoodMenu = () => {
    // We only need addOrderEntry for the main action
    const { addOrderEntry, getTotalQuantityByName } = useOrder(); 
    const [activeButton, setActiveButton] = useState<string | null>(null);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]); // Changed to MenuItem[]
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [categories, setCategories] = useState<string[]>([]);

    // State to hold the quantity chosen for each item *before* adding to order.
    // Key: MenuItem._id, Value: quantity
    const [quantitiesToAdd, setQuantitiesToAdd] = useState<{ [itemId: string]: number }>({});

    // Initialize quantitiesToAdd when menuItems are fetched
    useEffect(() => {
        const initialQuantities: { [itemId: string]: number } = {};
        menuItems.forEach(item => {
            initialQuantities[item._id] = 1; // Default quantity to add is 1
        });
        setQuantitiesToAdd(initialQuantities);
    }, [menuItems]);


    // Function to handle changing the quantity for a specific item on the menu card
    const handleQuantityChangeOnCard = useCallback((itemId: string, delta: number) => {
        setQuantitiesToAdd(prevQuantities => {
            const currentQuantity = prevQuantities[itemId] || 1; // Default to 1 if not set
            const newQuantity = Math.max(1, currentQuantity + delta); // Ensure quantity is at least 1
            return {
                ...prevQuantities,
                [itemId]: newQuantity
            };
        });
    }, []);

    // Function to handle adding the item to the order based on the chosen quantity
    const handleAddItemToOrder = useCallback((item: MenuItem) => {
        const quantity = quantitiesToAdd[item._id] || 1; // Get the chosen quantity, default to 1
        if (quantity > 0) {
            addOrderEntry(item.name, item.price, quantity); // Use the specified quantity
            // Optionally reset the quantity on the card after adding
            setQuantitiesToAdd(prevQuantities => ({
                ...prevQuantities,
                [item._id]: 1 // Reset to 1 after adding to cart
            }));
        }
    }, [addOrderEntry, quantitiesToAdd]);


    // Fetch categories from the server
    const fetchCategories = useCallback(async () => {
        try {
            const res = await fetch(`${BACKEND_URL}/api/categories`);
            if (!res.ok) throw new Error('Failed to fetch categories');
            const categoryObjects: { name: string, position: number }[] = await res.json();
            const categoryNames: string[] = categoryObjects.map(cat => cat.name);
            setCategories(categoryNames);
        } catch (err) {
            console.error('Error fetching categories:', err);
            setError('Failed to load categories');
        }
    }, []);

    // Fetch menu items for the active category
    const fetchMenuItems = useCallback(async (category: string | null) => {
        if (!category) {
            setMenuItems([]);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch(`${BACKEND_URL}/api/menu?category=${category}`);
            if (!res.ok) throw new Error('Failed to fetch');
            const data: MenuItem[] = await res.json(); // Data is now MenuItem[]
            setMenuItems(data); // Set directly
        } catch (err) {
            setError('Failed to fetch items');
        } finally {
            setIsLoading(false);
        }
    }, []);

    // 1. Initial Data Fetch and Socket.IO Listeners
    useEffect(() => {
        fetchCategories();

        const handleMenuChange = () => {
            console.log('Socket: Menu/Category change detected. Re-fetching categories and menu items.');
            fetchCategories();
            if (activeButton) { // Also re-fetch menu items for current category
                fetchMenuItems(activeButton);
            }
        };

        // All menu item related events
        socket.on('newMenuItem', handleMenuChange);
        socket.on('menuItemUpdated', handleMenuChange);
        socket.on('menuItemToggled', handleMenuChange);
        socket.on('menuItemDeleted', handleMenuChange);
        socket.on('menuItemBulkDeleted', handleMenuChange);
        socket.on('menuItemBulkToggled', handleMenuChange);
        socket.on('menuItemBulkCategoryChanged', handleMenuChange);
        
        // All category related events
        socket.on('newCategoryAdded', handleMenuChange);
        socket.on('categoryRemoved', handleMenuChange);
        socket.on('categoryUpdated', handleMenuChange);
        socket.on('categoriesReordered', handleMenuChange);

        return () => {
            socket.off('newMenuItem', handleMenuChange);
            socket.off('menuItemUpdated', handleMenuChange);
            socket.off('menuItemToggled', handleMenuChange);
            socket.off('menuItemDeleted', handleMenuChange);
            socket.off('menuItemBulkDeleted', handleMenuChange);
            socket.off('menuItemBulkToggled', handleMenuChange);
            socket.off('menuItemBulkCategoryChanged', handleMenuChange);
            
            socket.off('newCategoryAdded', handleMenuChange);
            socket.off('categoryRemoved', handleMenuChange);
            socket.off('categoryUpdated', handleMenuChange);
            socket.off('categoriesReordered', handleMenuChange);
        };
    }, [fetchCategories, fetchMenuItems, activeButton]); // Added fetchMenuItems, activeButton

    // 2. Effect to set initial active button
    useEffect(() => {
        if (categories.length > 0) {
            if (!activeButton || !categories.includes(activeButton)) {
                setActiveButton(categories[0]);
            }
        } else {
            setActiveButton(null);
        }
    }, [categories, activeButton]);

    // 3. Effect to fetch menu items when the active button changes
    useEffect(() => {
        if (activeButton) {
            fetchMenuItems(activeButton);
        } else {
            setMenuItems([]);
        }
    }, [activeButton, fetchMenuItems]);

    // Removed the updateMenuItemQuantities effect as the menu no longer displays
    // the total quantity from the order context in the same way.
    // Instead, it will display the "quantity to add".


    const handleButtonClick = (category: string) => {
        setActiveButton(category);
    };

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
                            ${activeButton === cat ? '!bg-gray-800 text-white shadow-md scale-105 hover:bg-gray-900' : 'hover:bg-gray-100 hover:scale-105'}
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
                                <div className="flex items-center gap-2.5 mt-2">
                                    {/* Quantity controls for how many to ADD AT ONCE */}
                                    <button 
                                        onClick={() => handleQuantityChangeOnCard(item._id, -1)}
                                        disabled={(quantitiesToAdd[item._id] || 1) <= 1} // Disable if quantity is 1
                                        className={`
                                            py-1.5 px-2.5 border border-gray-300 rounded bg-gray-100 text-base
                                            transition-colors duration-300 hover:bg-gray-200
                                            ${(quantitiesToAdd[item._id] || 1) <= 1 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                                        `}
                                    >
                                        -
                                    </button>
                                    <span className="text-base font-medium min-w-[20px] text-center">
                                        {quantitiesToAdd[item._id] || 1} {/* Display current quantity to add */}
                                    </span>
                                    <button 
                                        onClick={() => handleQuantityChangeOnCard(item._id, 1)}
                                        className="py-1.5 px-2.5 border border-gray-300 rounded bg-gray-100 text-base
                                                    transition-colors duration-300 hover:bg-gray-200 cursor-pointer"
                                    >
                                        +
                                    </button>
                                    {/* New "Add to Cart" button */}
                                    <button 
                                        onClick={() => handleAddItemToOrder(item)}
                                        className="py-1.5 px-3 ml-2 bg-blue-500 text-white rounded-md text-sm font-semibold hover:bg-blue-600 transition-colors cursor-pointer"
                                    >
                                        Add
                                    </button>
                                </div>
                                {/* Optionally show total quantity already in cart (from context) */}
                                <p className="text-xs text-gray-500 mt-1">
                                    In Cart: {getTotalQuantityByName(item.name)}
                                </p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default FoodMenu;