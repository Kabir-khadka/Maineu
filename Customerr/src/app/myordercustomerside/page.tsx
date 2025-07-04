'use client';

import React, { useState, useEffect } from 'react';
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
        orderItems,
        activeOrders, // All active orders for this table
        addOrderItem,
        increaseItemQuantity,
        decreaseItemQuantity,
        getNewlyAddedItems,
        getDecreasedOrRemovedItems,
        setInitialActiveOrders,
        setActiveOrders, // <--- This was added
        resetOrder,
    } = useOrder();

    // ADD THESE DEBUG LOGS
    console.log("=== MyOrderPage Debug ===");
    console.log("orderItems:", orderItems);
    console.log("activeOrders:", activeOrders);
    console.log("orderItems.length:", orderItems.length);
    console.log("========================");

    const [isLoading, setIsLoading] = useState(true);
    const [isHovered, setIsHovered] = useState(false);

    // Calculate total bill from current orderItems
    const totalBill = orderItems.reduce(
        (total, item) => total + item.quantity * item.price,
        0
    );

    // Helper to calculate total price for a given set of items
    const calculateTotalPrice = (items: OrderItem[]): number => {
        return items.reduce((total, item) => total + item.quantity * item.price, 0);
    };

    // useEffect: Load all active orders for this table when the page mounts
    useEffect(() => {
        console.log('MyOrderPage useEffect triggered');
        const storedTableNumber = localStorage.getItem('tableNumber');
        console.log('Stored Table Number:', storedTableNumber);
        if (!storedTableNumber) {
            alert("Table number not found in session. Please select a table first.");
            router.push('/');
            return;
        }

        const fetchActiveOrders = async () => {
        console.log('fetchActiveOrders starting');
        setIsLoading(true);
        try {
            const response = await fetch(`${BACKEND_URL}/api/orders/table/${storedTableNumber}/active`);
            console.log('Fetch response object:', response); // <--- ADD THIS
            console.log('Fetch response OK status:', response.ok);

            if (response.ok) {
                const fetchedOrders: Order[] = await response.json();
                console.log('Fetched orders (raw data):', fetchedOrders);

                // Always call setInitialActiveOrders with the fetched data.
                // It will correctly handle empty arrays and merge.
                
                setInitialActiveOrders(fetchedOrders);
                console.log("Loaded existing active orders and updated context:", fetchedOrders);

            } else {
                console.error('Failed to fetch active orders:', response.status, response.statusText);
                alert('Error loading existing orders for your table.');
                resetOrder(); // Keep this reset for fetch errors (clears both states)
            }
        } catch (error) {
            console.error('Network error fetching active orders:', error);
            alert('Could not connect to server to load orders.');
            resetOrder(); // Keep this reset for network errors (clears both states)
        } finally {
            setIsLoading(false);
        }
    };

    fetchActiveOrders();
}, [router, setInitialActiveOrders, resetOrder]); // <--- Dependency array updated


    const handleConfirmOrder = async () => {
        // Get the current changes relative to the aggregated confirmed state from `activeOrders`
        const newlyAddedItems = getNewlyAddedItems(); // Items to be POSTed
        const decreasedOrRemovedItems = getDecreasedOrRemovedItems(); // Items needing PATCH

        console.log("Newly Added Items for POST:", newlyAddedItems);
        console.log("Decreased or Removed Items for PATCH:", decreasedOrRemovedItems);

        const storedTableNumber = localStorage.getItem('tableNumber');
        if (!storedTableNumber) {
            alert("Table number not found!");
            return;
        }

        if (newlyAddedItems.length === 0 && decreasedOrRemovedItems.length === 0) {
            console.log("No changes detected. Nvaigating to next page.");
            router.push('/addeditcustomerside');
            return;
        }

        let changesSuccessful = false;
        let finalNavigationPath = '/addeditcustomerside'; // Default navigation path

        // --- PART 1: Handle Additions/Increases (always POST as new order) ---
        if (newlyAddedItems.length > 0) {
            const newOrderData = {
                tableNumber: storedTableNumber,
                orderItems: newlyAddedItems,
                totalPrice: calculateTotalPrice(newlyAddedItems),
            };

            try {
                const response = await fetch(`${BACKEND_URL}/api/orders`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newOrderData)
                });

                if (response.ok) {
                    const createdOrder: Order = await response.json(); //Capturing the created order
                    console.log('New items confirmed successfully (POST).');
                    changesSuccessful = true;
                    //Emitting Socket.IO event for new order
                    socket.emit('newOrder', createdOrder);
                    console.log('Socket: Emitted newOrder event:', createdOrder);
                } else {
                    const errorData = await response.json();
                    console.error('Failed to confirm new items:', errorData);
                    alert(`Failed to confirm new items: ${errorData.message || 'Unknown error'}.`);
                    return; // Stop if additions failed
                }
            } catch (error) {
                console.error('Error confirming new items:', error);
                alert('Something went wrong while confirming new items.');
                return; // Stop if additions failed
            }
        }

        // --- PART 2: Handle Decreases/Removals (PATCH existing orders) ---
        if (decreasedOrRemovedItems.length > 0) {
            if (activeOrders.length === 0) {
                // This shouldn't happen if getDecreasedOrRemovedItems is accurate, but good fallback
                console.warn("Decreases detected but no active orders to modify.");
                alert("Cannot process decreases as no existing orders were found.");
                return;
            }

            //Create a map to store the modified state of each order that needs patching
            //This map will hold the full order object including its potentially updated orderItems, totalPrice, and status
            const ordersToPatchMap: { [orderId: string]: Order } = {};

            // Create a mutable copy of activeOrders for processing decreases
            // ✅ CHANGE HERE: Sort activeOrders from OLDEST to NEWEST before processing decreases
            let mutableActiveOrdersState: Order[] = JSON.parse(JSON.stringify(activeOrders));
            mutableActiveOrdersState.sort((a,b) => {
                const dateA = new Date(a.createdAt);
                const dateB = new Date(b.createdAt);
                return dateB.getTime() - dateA.getTime(); // Sort from OLDEST to NEWEST
            })


            decreasedOrRemovedItems.forEach(async (change) => {
                let quantityToProcess = -change.quantityChange; // This is the positive amount to reduce

                // Iterate through active orders from OLDEST to NEWEST
                for (let i = 0; i < mutableActiveOrdersState.length && quantityToProcess > 0; i++) {
                    const order = mutableActiveOrdersState[i];
                    const itemInOrderIndex = order.orderItems.findIndex(oi => oi.name === change.name);

                    if (itemInOrderIndex !== -1) {
                        const itemInOrder = order.orderItems[itemInOrderIndex];

                        // Calculate how much can be reduced from this specific order
                        const reducibleQuantity = Math.min(itemInOrder.quantity, quantityToProcess);

                        if (reducibleQuantity > 0) {
                            // Apply the reduction
                            itemInOrder.quantity -= reducibleQuantity;
                            quantityToProcess -= reducibleQuantity;

                            // If item quantity becomes 0, remove it from the orderItems array
                            if (itemInOrder.quantity === 0) {
                                order.orderItems.splice(itemInOrderIndex, 1);
                            }

                            // Update total price for this specific order
                            order.totalPrice = calculateTotalPrice(order.orderItems);

                            // Mark this order for patching
                            ordersToPatchMap[order._id] = order;
                        }
                    }
                }
            });

            let patchPromises: Promise<Response>[] = [];
            const patchedOrderIds: string[] = []; //Tracking successful patches for emission

            // Now, send PATCH requests for all identified orders
            for (const orderId in ordersToPatchMap) {
                const orderToUpdate = ordersToPatchMap[orderId];

                // Prepare the data to send for the PATCH request
                const updateOrderData: Partial<Order> = { // Using Partial<Order> as we might not send all fields
                    tableNumber: storedTableNumber, // For backend verification
                    orderItems: orderToUpdate.orderItems,
                    totalPrice: orderToUpdate.totalPrice,
                };

                // NEW LOGIC: Check if the order is now empty and should be cancelled
                if (orderToUpdate.orderItems.length === 0) {
                    updateOrderData.status = 'Cancelled'; // Set status to cancelled
                    updateOrderData.totalPrice = 0; // Set total price to 0 for a cancelled order
                    console.log(`Order ${orderId} is now empty. Setting status to 'cancelled'.`);
                }

                patchPromises.push(
                    fetch(`${BACKEND_URL}/api/orders/${orderId}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(updateOrderData)
                    }).then (res => {
                        if (res.ok) {
                            patchedOrderIds.push(orderId); //Adding ID to successful patches
                        }
                        return res; //Passing the response along
                    })
                );
            }
            try {
                const results = await Promise.all(patchPromises);
                const allPatchesSuccessful = results.every(res => res.ok);

                if (allPatchesSuccessful) {
                    console.log('Decreases/removals confirmed successfully (PATCH).');
                    changesSuccessful = true;

                    //Emitting Socket.IO event for updated orders
                    const updatedOrdersToEmit: Order[] = [];
                    for (const orderId of patchedOrderIds) {
                        // Find the fully updated order from ordersToPatchMap to emit
                        updatedOrdersToEmit.push(ordersToPatchMap[orderId]);
                    }
                    if (updatedOrdersToEmit.length > 0) {
                        socket.emit('orderStatusUpdated', updatedOrdersToEmit); // Backend expects array of orders
                        console.log('Socket: Emitted orderStatusUpdated event for:', updatedOrdersToEmit);
                    }
                    
                    // If after patching, all items are removed from all active orders,
                    // and there were no new items added, then the order is cleared.
                    if (orderItems.length === 0 && newlyAddedItems.length === 0) {
                        finalNavigationPath = '/'; // Go back to table selection or menu
                    }
                } else {
                    // Handle partial or full failure of PATCH requests
                    const failedResults = results.filter(res => !res.ok);
                    console.error('Failed to confirm some decreases/removals:', failedResults);
                    alert(`Failed to confirm some decreases/removals. Please check console.`);
                    return;
                }
            } catch (error) {
                console.error('Error confirming decreases/removals:', error);
                alert('Something went wrong while confirming decreases/removals.');
                return;
            }
        }

        // --- Final Steps ---
        if (changesSuccessful) {
            alert('Order changes confirmed successfully!');
            // Re-fetch active orders to ensure context is fully synchronized with backend
            // This is crucial because multiple orders might have been updated.
            const response = await fetch(`${BACKEND_URL}/api/orders/table/${storedTableNumber}/active`);
            if (response.ok) {
                const updatedOrders: Order[] = await response.json();
                setInitialActiveOrders(updatedOrders); // Re-sync context with the new backend state
            } else {
                console.error("Failed to re-fetch active orders after confirmation.");
                alert("Order confirmed, but failed to re-sync. Please refresh.");
            }

            router.push(finalNavigationPath); // Navigate after successful operation
        } else {
            alert("No changes were successfully confirmed!");
        }
    };

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

            {/* Page Content */}
            <h1 className="mt-16 text-2xl md:text-3xl font-bold text-gray-800 text-center mb-6">My Orders</h1>

            {/* Main White Content Box(Fixed Height, Flex Column for internal layout)*/}
            <div className="bg-white rounded-lg p-5 w-[90%] max-w-[500px] shadow-md border border-gray-200 h-[68vh] flex flex-col justify-between">
                <div className="border-b-2 border-dashed border-gray-300 pb-2.5 mb-1 text-xl text-gray-800 text-center font-semibold">
                    Current Order Details
                </div>
            
            { /* Scrollable Area */}
            {/* Display order items or "empty" message */}
            <div className="order-items-scrollable flex flex-col gap-2.5 flex-1 overflow-y-scroll pr-2">
            { orderItems.length === 0 && !isLoading ? (
                <p className="text-center py-5 text-gray-700 text-base">Your order is empty.</p>
            ) : (
                orderItems.map((item) => (
                    <div
                        key={item.name}
                        className="flex flex-col items-center bh-white rounded-lg p-4 shadow-md w-full"
                    >
                        {/* Items details line: Name - Quantity: X - Price: $Y */}
                        <span className="text-gray-800 text-base font-medium text-center">
                        {item.name} - Quantity: {item.quantity} - Price: ${item.price * item.quantity}
                        </span>
                        {/* Quantity Controls */}
                        <div className="flex items-center gap-2.5 mt-2.5">
                            <button
                                onClick={() => decreaseItemQuantity(item.name)}
                                className="bg-red-400 text-white px-2.5 py-1.5 rounded-md text-base font-bold shadow-sm hover:bg-red-500 transition-colors"
                            >
                                -
                            </button>
                            <span className="text-gray-800 text-base font-bold">{item.quantity}</span>
                            <button
                                onClick={() => increaseItemQuantity(item.name)}
                                className="bg-green-500 text-white px-2.5 py-1.5 rounded-md text-base font-bold shadow-sm hover:bg-green-600 transition-colors"
                            >
                                +
                            </button>
                        </div>
                    </div>
                ))
            )}
        </div>

            {/* Total Bill Section -Fixed */}
            <div className="flex justify-between py-4 mt-2.5 border-t-2 border-dashed border-gray-300 font-bold">
                <span className="text-lg text-gray-800">Total Amount</span>
                <span className="text-lg text-[#F5BB49]">${totalBill}</span>
              </div>

              {/* Confirm Order Button - Fixed */}
              <button
                    onClick={handleConfirmOrder}
                    className="py-3 px-8 bg-[#2ecc71] text-white font-bold rounded-lg shadow-md
                    transition-all duration-200 ease-in-out mt-4
                    hover:bg-[#27ae60] hover:-translate-y-0.5 hover:shadow-lg
                    active:bg-[#2ecc71] active:translate-y-0 active:shadow-md"
                    >
                    Confirm Order
                    </button>
        </div>
     </div>
    );
};

export default MyOrderPage;