// src/app/myorderpage/page.tsx

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
        hasPendingChanges,
        cancelOrderEntry,
    } = useOrder();

    // ADD THESE DEBUG LOGS
    console.log("=== MyOrderPage Debug ===");
    console.log("orderEntries:", orderEntries);
    console.log("activeOrders:", activeOrders);
    console.log("orderEntries.length:", orderEntries.length);
    console.log("hasPendingChanges():", hasPendingChanges()); // Add this for real-time check
    console.log("========================");

    const [isLoading, setIsLoading] = useState(true);
    const [isConfirming, setIsConfirming] = useState(false); // Added to prevent double clicks
    const [refreshActiveOrdersTrigger, setRefreshActiveOrdersTrigger] =useState(0);

    const showMessageBox = useCallback((message: string, onConfirm?: () => void) => {
        const messageBox = document.createElement('div');
        messageBox.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50';
        messageBox.innerHTML = `
            <div class="bg-white p-6 rounded-lg shadow-xl text-center">
                <p class="text-lg font-semibold mb-4">${message}</p>
                <button id="closeMessageBox" class="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600">OK</button>
            </div>
        `;
        document.body.appendChild(messageBox);

        document.getElementById('closeMessageBox')?.addEventListener('click', () => {
            document.body.removeChild(messageBox);
            if (onConfirm) {
                onConfirm();
            }
        });
    }, []);

    // Helper to calculate total price for a given set of items
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
            showMessageBox("Table number not found in session. Please select a table first.", () => {
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

                    // Initial load reconciles, does NOT clear unconfirmed
                    setInitialActiveOrders(fetchedOrders);
                    console.log("Loaded existing active orders and updated context:", fetchedOrders);

                } else {
                    console.error('Failed to fetch active orders:', response.status, response.statusText);
                    showMessageBox('Error loading existing orders for your table.');
                    resetOrder();
                }
            } catch (error) {
                console.error('Network error fetching active orders:', error);
                showMessageBox('Could not connect to server to load orders.');
                resetOrder();
            } finally {
                setIsLoading(false);
            }
        };

        fetchActiveOrders();

         // --- NEW: Socket.IO Listener for order updates (including cancellation) ---
        const handleOrderUpdated = (updatedOrder: Order) => {
            console.log('Socket: Received orderUpdated for ID:', updatedOrder._id, 'Status:', updatedOrder.status);
            const storedTableNumber = localStorage.getItem('tableNumber');
            // Trigger re-fetch only if the updated order belongs to the current table
            if (updatedOrder.tableNumber === storedTableNumber) {
                setRefreshActiveOrdersTrigger(prev => prev + 1); // Trigger a re-fetch
            }
        };

        socket.on('orderUpdated', handleOrderUpdated);
        socket.on('orderStatusUpdated', handleOrderUpdated); // Also listen for status specific updates

        // Clean up socket listener on component unmount
        return () => {
            socket.off('orderUpdated', handleOrderUpdated);
            socket.off('orderStatusUpdated', handleOrderUpdated);
        };
    }, [router, setInitialActiveOrders, resetOrder, showMessageBox, refreshActiveOrdersTrigger]);

    const handleConfirmOrder = useCallback(async () => {
        setIsConfirming(true); // Disable button immediately to prevent multiple clicks
        const storedTableNumber = localStorage.getItem('tableNumber');

        if (!storedTableNumber) {
            console.error('Table number not found. Cannot confirm order.');
            showMessageBox("Table number not found! Please go back to the menu.");
            setIsConfirming(false); // Re-enable if an immediate error
            return;
        }

        try {
            const promises: Promise<any>[] = [];

            // --- PART 1: Handle Newly Added Items (POST as new individual orders) ---
            const newlyAddedItems = getNewlyAddedItems(); // These are OrderItem[]
            if (newlyAddedItems.length > 0) {
                console.log("MyOrderPage: Sending newly added items to backend (as individual orders):", newlyAddedItems);
                // For each newly added item, send a separate POST request
                newlyAddedItems.forEach(item => {
                    const newOrderData = {
                        tableNumber: storedTableNumber,
                        orderItems: [{ // Wrap the single item in an array as per backend model
                            name: item.name,
                            quantity: item.quantity,
                            price: item.price,
                        }],
                        totalPrice: item.quantity * item.price, // Total price for this single item
                    };
                    promises.push(
                        fetch(`${BACKEND_URL}/api/orders`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(newOrderData)
                        }).then(response => {
                            if (!response.ok) {
                                return response.json().then(errorData => {
                                    throw new Error(`Failed to create new order for ${item.name}: ${errorData.message || response.statusText}`);
                                });
                            }
                            return response.json();
                        }).then(result => {
                            // Backend now returns { message: ..., orders: [newOrder] }
                            // We need to emit each new order from the backend's response
                            if (result.orders && Array.isArray(result.orders)) {
                                result.orders.forEach((createdOrder: Order) => {
                                    console.log(`MyOrderPage: New item ${createdOrder.orderItems[0].name} confirmed successfully.`, createdOrder);
                                    socket.emit('newOrder', createdOrder); // Emit socket event for each new order
                                });
                            }
                            return result; // Return the full result for Promise.all
                        })
                    );
                });
            } else {
                console.log("MyOrderPage: No newly added items to send.");
            }

            // --- PART 2: Handle Decreases/Removals/Increases to EXISTING confirmed orders (PATCH) ---
            // Refactored logic to iterate through activeOrders and compare with orderEntries
            const patchPromises = activeOrders.map(async (originalOrder) => {
                const originalItem = originalOrder.orderItems[0]; // Assuming one item per order as per your model

                // Find the corresponding OrderEntry in the current frontend state (orderEntries)
                // OrderEntry.id for a confirmed item is its OrderItem._id (from the OrderContext fix)
                const currentEntryForThisOrder = orderEntries.find(entry => 
                    entry.isConfirmed && originalItem && entry.id === originalItem._id
                );

                let shouldPatch = false;
                let patchData: { orderItems: OrderItem[]; totalPrice: number; status?: string; } | null = null;

                if (!currentEntryForThisOrder) {
                    // This means the item was in activeOrders but is no longer in orderEntries (it was removed/quantity became 0)
                    // Only patch if the order is not already cancelled on the backend
                    if (originalItem && originalOrder.status !== 'Cancelled') { 
                        shouldPatch = true;
                        patchData = {
                            orderItems: [], // Send empty array to signal removal/cancellation of this item
                            totalPrice: 0,
                            status: 'Cancelled' // Explicitly set status to Cancelled
                        };
                        console.log(`MyOrderPage: Item ${originalItem.name} (Order ${originalOrder._id}) was removed or quantity became 0. Preparing to cancel.`);
                    }
                } else {
                    // Item still exists in orderEntries, check for quantity or price changes
                    if (currentEntryForThisOrder.quantity !== originalItem.quantity || currentEntryForThisOrder.price !== originalItem.price) {
                        shouldPatch = true;
                        patchData = {
                            orderItems: [{ // Send the updated single item
                                _id: currentEntryForThisOrder.id, // This is the OrderItem._id
                                name: currentEntryForThisOrder.name,
                                quantity: currentEntryForThisOrder.quantity,
                                price: currentEntryForThisOrder.price,
                            }],
                            totalPrice: currentEntryForThisOrder.quantity * currentEntryForThisOrder.price,
                            // If quantity becomes 0, explicitly set status to Cancelled. Otherwise, keep original status.
                            status: currentEntryForThisOrder.quantity === 0 ? 'Cancelled' : originalOrder.status 
                        };
                        console.log(`MyOrderPage: Item ${originalItem.name} (Order ${originalOrder._id}) quantity/price changed. Preparing to update.`);
                    }
                }

                if (shouldPatch && patchData) {
                    console.log(`MyOrderPage: Sending PATCH to /api/orders/${originalOrder._id} with data:`, patchData);
                    return fetch(`${BACKEND_URL}/api/orders/${originalOrder._id}`, { // Use the Order._id for the URL
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(patchData)
                    }).then(response => {
                        if (!response.ok) {
                            return response.json().then(errorData => {
                                throw new Error(`Failed to update order ${originalOrder._id}: ${errorData.message || response.statusText}`);
                            });
                        }
                        return response.json();
                    }).then(updatedOrder => {
                        console.log(`MyOrderPage: Order ${originalOrder._id} patched successfully.`, updatedOrder);
                        socket.emit('orderUpdated', updatedOrder); // Emit socket event for updated order
                        return updatedOrder;
                    });
                }
                return Promise.resolve(null); // No patch needed for this specific order
            });

            // Execute all patch promises, filtering out nulls (orders that didn't need patching)
            const patchResults = await Promise.all(patchPromises);
            console.log("MyOrderPage: All PATCH operations completed. Results:", patchResults.filter(r => r !== null));

            // --- FINAL STEP: Refresh frontend state from backend ---
            // After all POSTs and PATCHes, re-fetch all active orders to synchronize the state
            const updatedResponse = await fetch(`${BACKEND_URL}/api/orders/table/${storedTableNumber}/active`);
            if (!updatedResponse.ok) {
                throw new Error(`HTTP error! status: ${updatedResponse.status} during final refresh`);
            }
            const updatedData: Order[] = await updatedResponse.json();
            
            // CRITICAL CHANGE: Pass 'true' to clear unconfirmed entries after successful sync
            setInitialActiveOrders(updatedData, true);
            console.log("MyOrderPage: Frontend state refreshed after confirmation/updates, all unconfirmed cleared.");

            // Display success message and navigate
            showMessageBox('Order changes confirmed successfully!', () => {
                router.push('/addeditcustomerside'); // Always navigate to this page after confirmation
            });

        } catch (err: any) {
            console.error("MyOrderPage: Error during order confirmation:", err);
            // Display error message
            showMessageBox(`Failed to confirm order: ${err.message || 'Unknown error'}. Please try again.`);
        } finally {
            setIsConfirming(false); // Re-enable button regardless of success or failure
        }
    }, [orderEntries, activeOrders, getNewlyAddedItems, setInitialActiveOrders, router, showMessageBox]);


    // Function to handle entry cancellation
    const handleCancelButtonClick = useCallback(async (entryId: string) => {
        setIsConfirming(true); // Disable button immediately to prevent multiple clicks
        try {
            await cancelOrderEntry(entryId);
            showMessageBox("Item cancelled successfully!");
            //Triggering a re-fetch to ensure the UI is fully synchronized after a cancellation
            setRefreshActiveOrdersTrigger(prev => prev + 1);
        } catch (error: any) {
            console.error("Error cancelling item:", error);
            showMessageBox(`Failed to cancel item: ${error.message || 'Unknown error'}.`);
        } finally {
            setIsConfirming(false); // Re-enable button regardless of success or failure
        }
    },[cancelOrderEntry, showMessageBox]);


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

            {/* Main white container for order details */}
            <div className="bg-white rounded-lg p-5 w-[90%] max-w-[500px] shadow-md border border-gray-200 h-[68vh] flex flex-col">
                <div className="border-b-2 border-dashed border-gray-300 pb-2.5 mb-4 text-xl text-gray-800 text-center font-semibold">
                    Order Details
                </div>

                {/* Scrollable Area for Order Items - Takes remaining space */}
                <div className="flex-1 overflow-y-auto mb-4">
                    <div className="space-y-3">
                        {orderEntries.length === 0 && !isLoading ? (
                            <p className="text-center py-8 text-gray-700 text-base">Your order is empty.</p>
                        ) : (
                            orderEntries.map((entry, index) => (
                                <div
                                    key={entry.id}
                                    className="bg-blue-50 rounded-lg shadow-md w-full border border-blue-200 overflow-hidden"
                                >
                                    {/* Main content area with fixed minimum height */}
                                    <div className="flex justify-between items-center px-2 py-2 min-h-[80px]">
                                        <div className="flex flex-col justify-center flex-1">
                                            <span className="text-gray-800 text-base font-medium leading-tight">
                                                {entry.name}
                                            </span>
                                            <span className="text-gray-500 text-sm mt-1">
                                                Entry #{index + 1} • ${entry.price} each
                                            </span>
                                        </div>
                                        
                                        <div className="flex items-center gap-3 ml-4">
                                            {/* Quantity Controls */}
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => decreaseEntryQuantity(entry.id)}
                                                    disabled={entry.quantity === 0 || isConfirming}
                                                    className={`
                                                        bg-red-400 text-white px-3 py-2 rounded-md text-sm font-bold shadow-sm transition-colors min-w-[36px] h-[36px] flex items-center justify-center
                                                        ${entry.quantity === 0 || isConfirming ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-500 cursor-pointer'}
                                                    `}
                                                >
                                                    -
                                                </button>
                                                <span className="text-gray-800 text-base font-bold min-w-[30px] text-center">
                                                    {entry.quantity}
                                                </span>
                                                <button
                                                    onClick={() => increaseEntryQuantity(entry.id)}
                                                    disabled={isConfirming}
                                                    className={`
                                                        bg-green-500 text-white px-3 py-2 rounded-md text-sm font-bold shadow-sm transition-colors min-w-[36px] h-[36px] flex items-center justify-center
                                                        ${isConfirming ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-600 cursor-pointer'}
                                                    `}
                                                >
                                                    +
                                                </button>
                                            </div>
                                            
                                            {/* Total price for this entry */}
                                            <div className="text-right min-w-[70px]">
                                                <span className="text-gray-700 font-medium text-base">
                                                    ${(entry.price * entry.quantity).toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Cancel Button - Fixed height */}
                                    <button
                                        onClick={() => handleCancelButtonClick(entry.id)}
                                        disabled={isConfirming}
                                        className={`
                                            w-full bg-gray-500 text-white py-2.5 text-sm font-bold transition-colors h-[40px] flex items-center justify-center
                                            ${isConfirming ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-600 cursor-pointer'}
                                            rounded-b-lg
                                        `}
                                        style={{ borderTop: '1px solid #ccc' }}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Fixed Footer Section - Always stays at bottom */}
                <div className="border-t-2 border-dashed border-gray-300 pt-4">
                    {/* Total Bill Section */}
                    <div className="flex justify-between py-2 font-bold">
                        <span className="text-lg text-gray-800">Total Amount</span>
                        <span className="text-lg text-[#F5BB49]">${totalBill.toFixed(2)}</span>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2 mt-4">
                        <button
                            onClick={handleConfirmOrder}
                            disabled={isConfirming || !hasPendingChanges()} 
                            className={`w-full py-3 px-8 bg-[#2ecc71] text-white font-bold rounded-lg shadow-md
                            transition-all duration-200 ease-in-out
                            ${isConfirming || !hasPendingChanges() ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#27ae60] hover:-translate-y-0.5 hover:shadow-lg active:bg-[#2ecc71] active:translate-y-0 active:shadow-md'}
                            `}
                        >
                            {isConfirming ? 'Confirming...' : 'Confirm Order'}
                        </button>
                        
                        <button
                            onClick={resetOrder}
                            disabled={isConfirming}
                            className={`w-full py-3 px-8 bg-gray-500 text-white font-bold rounded-lg shadow-md
                            transition-all duration-200 ease-in-out
                            ${isConfirming ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-600 hover:-translate-y-0.5 hover:shadow-lg active:bg-gray-500 active:translate-y-0 active:shadow-md'}
                            `}
                        >
                            Clear Order
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MyOrderPage;
