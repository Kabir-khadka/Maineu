'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useOrder } from '../context/OrderContext';
import {Order, OrderItem} from '@/types/order';
import BackButton from '@/components/ReusableComponents/BackButton';
import socket from '@/lib/socket';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

const MyOrderPage: React.FC = () => {
    console.log('MyOrderPage RENDERING');
    const router = useRouter();
    const {
        orderEntries, // Use orderEntries instead of orderItems
        activeOrders,
        increaseEntryQuantity, // Use specific entry functions
        decreaseEntryQuantity,
        getNewlyAddedItems,
        setInitialActiveOrders,
        resetOrder,
        hasPendingChanges, // Added this line
    } = useOrder();

    // ADD THESE DEBUG LOGS
    console.log("=== MyOrderPage Debug ===");
    console.log("orderEntries:", orderEntries);
    console.log("activeOrders:", activeOrders);
    console.log("orderEntries.length:", orderEntries.length);
    console.log("========================");

    const [isLoading, setIsLoading] = useState(true);
    // const [isHovered, setIsHovered] = useState(false); // This state is not used. Can be removed if not needed.
    const [isConfirming, setIsConfirming] = useState(false); // Added to prevent double clicks

    // Helper to calculate total price for a given set of items
    // This function can also be imported if it's a shared utility
    const calculateTotalPrice = (items: (OrderItem | { price: number; quantity: number })[]): number => {
        return items.reduce((total, item) => total + item.quantity * item.price, 0);
    };

    // Calculate total bill from current orderEntries
    const totalBill = calculateTotalPrice(orderEntries); // Using the helper

    // useEffect: Load all active orders for this table when the page mounts
    useEffect(() => {
        console.log('MyOrderPage useEffect triggered');
        const storedTableNumber = localStorage.getItem('tableNumber');
        console.log('Stored Table Number:', storedTableNumber);
        if (!storedTableNumber) {
            // Using a custom message box instead of alert()
            const messageBox = document.createElement('div');
            messageBox.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50';
            messageBox.innerHTML = `
                <div class="bg-white p-6 rounded-lg shadow-xl text-center">
                    <p class="text-lg font-semibold mb-4">Table number not found in session. Please select a table first.</p>
                    <button id="closeMessageBox" class="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600">OK</button>
                </div>
            `;
            document.body.appendChild(messageBox);

            document.getElementById('closeMessageBox')?.addEventListener('click', () => {
                document.body.removeChild(messageBox);
                router.push('/');
            });
            return;
        }

        const fetchActiveOrders = async () => {
            console.log('fetchActiveOrders starting');
            setIsLoading(true);
            try {
                const response = await fetch(`${BACKEND_URL}/api/orders/table/${storedTableNumber}/active`);
                console.log('Fetch response object:', response);
                console.log('Fetch response OK status:', response.ok);

                if (response.ok) {
                    const fetchedOrders: Order[] = await response.json();
                    console.log('Fetched orders (raw data):', fetchedOrders);

                    setInitialActiveOrders(fetchedOrders);
                    console.log("Loaded existing active orders and updated context:", fetchedOrders);

                } else {
                    console.error('Failed to fetch active orders:', response.status, response.statusText);
                    // Using a custom message box instead of alert()
                    const messageBox = document.createElement('div');
                    messageBox.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50';
                    messageBox.innerHTML = `
                        <div class="bg-white p-6 rounded-lg shadow-xl text-center">
                            <p class="text-lg font-semibold mb-4">Error loading existing orders for your table.</p>
                            <button id="closeMessageBox" class="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600">OK</button>
                        </div>
                    `;
                    document.body.appendChild(messageBox);

                    document.getElementById('closeMessageBox')?.addEventListener('click', () => {
                        document.body.removeChild(messageBox);
                    });
                    resetOrder();
                }
            } catch (error) {
                console.error('Network error fetching active orders:', error);
                // Using a custom message box instead of alert()
                const messageBox = document.createElement('div');
                messageBox.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50';
                messageBox.innerHTML = `
                    <div class="bg-white p-6 rounded-lg shadow-xl text-center">
                        <p class="text-lg font-semibold mb-4">Could not connect to server to load orders.</p>
                        <button id="closeMessageBox" class="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600">OK</button>
                    </div>
                `;
                document.body.appendChild(messageBox);

                document.getElementById('closeMessageBox')?.addEventListener('click', () => {
                    document.body.removeChild(messageBox);
                });
                resetOrder();
            } finally {
                setIsLoading(false);
            }
        };

        fetchActiveOrders();
    }, [router, setInitialActiveOrders, resetOrder]);

    const handleConfirmOrder = useCallback(async () => {
        setIsConfirming(true); // Disable button
        const storedTableNumber = localStorage.getItem('tableNumber');

        if (!storedTableNumber) {
            console.error('Table number not found. Cannot confirm order.');
            // Display an error message to the user
            const messageBox = document.createElement('div');
            messageBox.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50';
            messageBox.innerHTML = `
                <div class="bg-white p-6 rounded-lg shadow-xl text-center">
                    <p class="text-lg font-semibold mb-4">Table number not found! Please go back to the menu.</p>
                    <button id="closeMessageBox" class="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600">OK</button>
                </div>
            `;
            document.body.appendChild(messageBox);
            document.getElementById('closeMessageBox')?.addEventListener('click', () => {
                document.body.removeChild(messageBox);
            });
            setIsConfirming(false);
            return;
        }

        try {
            // --- PART 1: Handle Additions/Increases (always POST as new order) ---
            // getNewlyAddedItems now returns individual unconfirmed entries
            const newlyAddedItems = getNewlyAddedItems();
            const newOrderTotal = calculateTotalPrice(newlyAddedItems);

            if (newlyAddedItems.length > 0) {
                console.log("MyOrderPage: Sending newly added items to backend:", newlyAddedItems);
                const newOrderData = {
                    tableNumber: storedTableNumber,
                    orderItems: newlyAddedItems,
                    totalPrice: newOrderTotal,
                };

                const response = await fetch(`${BACKEND_URL}/api/orders`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newOrderData)
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(`Failed to create new order: ${errorData.message || response.statusText}`);
                }
                const createdOrder: Order = await response.json();
                console.log("MyOrderPage: Newly added items confirmed successfully.", createdOrder);
                socket.emit('newOrder', createdOrder); // Emit socket event for new order
            } else {
                console.log("MyOrderPage: No newly added items to send.");
            }

            // --- PART 2: Handle Decreases/Removals/Modifications to EXISTING orders (PATCH) ---
            const patchPromises = activeOrders.map(async (originalActiveOrder) => {
                // Filter `orderEntries` to find all items that are part of this specific `originalActiveOrder`.
                // An `OrderEntry` is "part of" an `activeOrder` if its `id` (which is the backend `_id` for confirmed items)
                // is found within the `originalActiveOrder.orderItems`.
                const relevantEntriesForThisOrder = orderEntries.filter(entry =>
                    entry.isConfirmed && originalActiveOrder.orderItems.some(originalItem => originalItem._id === entry.id)
                );

                // Convert these relevant `OrderEntry` objects back to `OrderItem` structure for the backend.
                const newOrderItemsForBackend: OrderItem[] = relevantEntriesForThisOrder.map(entry => ({
                    _id: entry.id, // Crucial: Send the backend _id back for patching
                    name: entry.name,
                    quantity: entry.quantity,
                    price: entry.price,
                }));

                // Calculate the new total price for this specific order
                const newTotalPriceForThisOrder = calculateTotalPrice(newOrderItemsForBackend);

                // Deep comparison to check if items or total price have truly changed for this order
                // Sort items by name and quantity for consistent comparison, and exclude _id for comparison if you only care about content
                const originalItemsForComparison = originalActiveOrder.orderItems.map(item => ({ name: item.name, quantity: item.quantity, price: item.price })).sort((a, b) => a.name.localeCompare(b.name) || a.quantity - b.quantity);
                const newItemsForComparison = newOrderItemsForBackend.map(item => ({ name: item.name, quantity: item.quantity, price: item.price })).sort((a, b) => a.name.localeCompare(b.name) || a.quantity - b.quantity);

                const hasItemsChanged = JSON.stringify(originalItemsForComparison) !== JSON.stringify(newItemsForComparison);
                const hasTotalPriceChanged = originalActiveOrder.totalPrice !== newTotalPriceForThisOrder;

                // Only send PATCH if there's a change or if all items from this order have been removed
                if (hasItemsChanged || hasTotalPriceChanged) {
                    console.log(`MyOrderPage: Preparing to PATCH order ${originalActiveOrder._id}.`);
                    const patchData = {
                        orderItems: newOrderItemsForBackend,
                        totalPrice: newTotalPriceForThisOrder,
                        status: newOrderItemsForBackend.length === 0 ? 'Cancelled' : originalActiveOrder.status // Optionally auto-cancel if all items removed
                    };

                    const response = await fetch(`${BACKEND_URL}/api/orders/${originalActiveOrder._id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(patchData)
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(`Failed to update order ${originalActiveOrder._id}: ${errorData.message || response.statusText}`);
                    }
                    const updatedOrder = await response.json();
                    console.log(`MyOrderPage: Order ${originalActiveOrder._id} patched successfully.`, updatedOrder);
                    socket.emit('orderStatusUpdated', [updatedOrder]); // Emit socket event for updated order
                    return updatedOrder; // Return updated order from backend
                }
                return null; // No change for this order
            });

            // Execute all PATCH promises
            const patchedResults = await Promise.all(patchPromises);
            console.log("MyOrderPage: All PATCH operations completed. Results:", patchedResults.filter(r => r !== null));

            // --- FINAL STEP: Refresh frontend state from backend ---
            // After all POSTs and PATCHes, re-fetch all active orders to synchronize the state
            const updatedResponse = await fetch(`${BACKEND_URL}/api/orders/table/${storedTableNumber}/active`);
            if (!updatedResponse.ok) {
                throw new Error(`HTTP error! status: ${updatedResponse.status} during final refresh`);
            }
            const updatedData: Order[] = await updatedResponse.json();
            setInitialActiveOrders(updatedData); // This will update orderEntries based on confirmed backend state
            console.log("MyOrderPage: Frontend state refreshed after confirmation/updates.");

            // Display success message and navigate
            const messageBox = document.createElement('div');
            messageBox.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50';
            messageBox.innerHTML = `
                <div class="bg-white p-6 rounded-lg shadow-xl text-center">
                    <p class="text-lg font-semibold mb-4">Order changes confirmed successfully!</p>
                    <button id="closeMessageBox" class="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600">OK</button>
                </div>
            `;
            document.body.appendChild(messageBox);

            document.getElementById('closeMessageBox')?.addEventListener('click', () => {
                document.body.removeChild(messageBox);
                router.push('/addeditcustomerside'); // Always navigate to this page after confirmation
            });

        } catch (err: any) {
            console.error("MyOrderPage: Error during order confirmation:", err);
            // Display error message
            const messageBox = document.createElement('div');
            messageBox.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50';
            messageBox.innerHTML = `
                <div class="bg-white p-6 rounded-lg shadow-xl text-center">
                    <p class="text-lg font-semibold mb-4">Failed to confirm order: ${err.message || 'Unknown error'}. Please try again.</p>
                    <button id="closeMessageBox" class="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600">OK</button>
                </div>
            `;
            document.body.appendChild(messageBox);

            document.getElementById('closeMessageBox')?.addEventListener('click', () => {
                document.body.removeChild(messageBox);
            });
        } finally {
            setIsConfirming(false); // Re-enable button
        }
    }, [orderEntries, activeOrders, getNewlyAddedItems, setInitialActiveOrders, router]);


    if (isLoading) {
        return (
            <div className="min-h-screen flex flex-col justify-start items-center bg-[#fdd7a2] p-5">
                <p className="text-gray-700 text-lg mt-20">Loading your current order...</p>
            </div>
        );
    }

    return (
        <div className="w-full min-h-screen flex flex-col items-center bg-[#fdd7a2] p-4">
            <BackButton onClick={() => router.push('/')}/>

            <h1 className="mt-16 text-2xl md:text-3xl font-bold text-gray-800 text-center mb-6">My Orders</h1>

            <div className="bg-white rounded-lg p-5 w-[90%] max-w-[500px] shadow-md border border-gray-200 h-[68vh] flex flex-col justify-between">
                <div className="border-b-2 border-dashed border-gray-300 pb-2.5 mb-1 text-xl text-gray-800 text-center font-semibold">
                    Order Details
                </div>

                {/* Scrollable Area for Order Items */}
                <div className="order-items-scrollable flex flex-col gap-2.5 flex-1 overflow-y-scroll pr-2">
                    {orderEntries.length === 0 && !isLoading ? (
                        <p className="text-center py-5 text-gray-700 text-base">Your order is empty.</p>
                    ) : (
                        // Map directly over orderEntries to render each individual entry as a separate row
                        orderEntries.map((entry, index) => (
                            <div
                                key={entry.id} // Use unique entry.id as key
                                className="flex justify-between items-center bg-blue-50 rounded-lg p-4 shadow-md w-full border border-blue-200 mb-2"
                            >
                                <div className="flex flex-col">
                                    {/* Display item name with entry indicator */}
                                    <span className="text-gray-800 text-base font-medium">
                                        {entry.name}
                                    </span>
                                    <span className="text-gray-500 text-xs">
                                        Entry #{index + 1} • ${entry.price.toFixed(2)} each
                                    </span>
                                </div>
                                
                                <div className="flex items-center gap-3">
                                    {/* Quantity Controls */}
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => decreaseEntryQuantity(entry.id)}
                                            // Disable button only if quantity is 0 or confirmation is in progress
                                            disabled={entry.quantity === 0 || isConfirming}
                                            className={`
                                                bg-red-400 text-white px-2 py-1 rounded-md text-sm font-bold shadow-sm transition-colors
                                                ${entry.quantity === 0 || isConfirming ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-500 cursor-pointer'}
                                            `}
                                        >
                                            -
                                        </button>
                                        <span className="text-gray-800 text-base font-bold min-w-[20px] text-center">
                                            {entry.quantity}
                                        </span>
                                        <button
                                            onClick={() => increaseEntryQuantity(entry.id)}
                                            // Disable button only if confirmation is in progress
                                            disabled={isConfirming}
                                            className={`
                                                bg-green-500 text-white px-2 py-1 rounded-md text-sm font-bold shadow-sm transition-colors
                                                ${isConfirming ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-600 cursor-pointer'}
                                            `}
                                        >
                                            +
                                        </button>
                                    </div>
                                    
                                    {/* Total price for this entry */}
                                    <span className="text-gray-700 font-medium min-w-[60px] text-right">
                                        ${(entry.price * entry.quantity).toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Total Bill Section */}
                <div className="flex justify-between py-4 mt-2.5 border-t-2 border-dashed border-gray-300 font-bold">
                    <span className="text-lg text-gray-800">Total Amount</span>
                    <span className="text-lg text-[#F5BB49]">${totalBill.toFixed(2)}</span>
                </div>

                {/* Confirm Order Button */}
                <button
                    onClick={handleConfirmOrder}
                    disabled={isConfirming || !hasPendingChanges()} // MODIFIED THIS LINE
                    className={`py-3 px-8 bg-[#2ecc71] text-white font-bold rounded-lg shadow-md
                    transition-all duration-200 ease-in-out mt-4
                    ${isConfirming || !hasPendingChanges() ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#27ae60] hover:-translate-y-0.5 hover:shadow-lg active:bg-[#2ecc71] active:translate-y-0 active:shadow-md'}
                    `}
                >
                    {isConfirming ? 'Confirming...' : 'Confirm Order'}
                </button>
                {/* Add a Clear Order button here if you want to allow resetting the entire order */}
                   <button
                    onClick={resetOrder}
                    disabled={isConfirming}
                    className={`py-3 px-8 bg-gray-500 text-white font-bold rounded-lg shadow-md
                    transition-all duration-200 ease-in-out mt-2
                    ${isConfirming ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-600 hover:-translate-y-0.5 hover:shadow-lg active:bg-gray-500 active:translate-y-0 active:shadow-md'}
                    `}
                >
                    Clear Order
                </button>
            </div>
        </div>
    );
};

export default MyOrderPage;