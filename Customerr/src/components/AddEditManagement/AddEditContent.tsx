'use client';
import React, { useCallback, useEffect, useState } from 'react';
import BackButton from '../ReusableComponents/BackButton';
import { useRouter } from 'next/navigation';
import { useOrder } from '@/app/context/OrderContext';
import FoodMenu from '../foodmenu';
import BottomSheetLayout from '../Layout/BottomSheetLayout';
import { Order, OrderItem, OrderEntry } from '@/types/order';
import socket from '@/lib/socket';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

export default function AddEditContent () {
    const router = useRouter();

    const {
        orderEntries,
        orderItems,
        activeOrders,
        increaseEntryQuantity,
        decreaseEntryQuantity,
        getNewlyAddedItems,
        setInitialActiveOrders,
        resetOrder,
        hasPendingChanges,
        cancelOrderEntry,
    } = useOrder();

    const [isFoodMenuOpen, setIsFoodMenuOpen] = useState(false);
    const [tableNumberDisplay, setTableNumberDisplay] = useState<string | null>(null);
    const [isConfirming, setIsConfirming] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshActiveOrdersTrigger, setRefreshActiveOrdersTrigger] = useState(0);

    const confirmedItems = orderEntries.filter(entry => entry.isConfirmed);
    const unconfirmedItems = orderEntries.filter(entry => !entry.isConfirmed);

    // Custom message box
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

    useEffect(() => {
        const storedTableNumber = localStorage.getItem('tableNumber');
        setTableNumberDisplay(storedTableNumber);

        if (!storedTableNumber) {
            showMessageBox("Table number not found in local storage. Please select a table first.", () => {
                router.push('/');
            });
            return;
        }
        
        const fetchOrderData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await fetch(`${BACKEND_URL}/api/orders/table/${storedTableNumber}/active`);
                if(response.ok) {
                    const fetchedOrders: Order[] = await response.json();
                    // When re-fetching due to archive, we do NOT want to clear unconfirmed items
                    // unless explicitly told to (e.g., after a successful confirm order).
                    // So, shouldClearUnconfirmed is false here.
                    setInitialActiveOrders(fetchedOrders, false);
                } else {
                    if (response.status === 404) {
                        setInitialActiveOrders([]);
                    } else {
                        showMessageBox('Error loading existing orders for your table.');
                        resetOrder();
                    }
                }
            } catch (error) {
                showMessageBox('Could not connect to server to load orders.');
                resetOrder();
            }finally {
                setIsLoading(false);
            }
        };
        fetchOrderData();

        //Socket.IO Listener for archived orders
        const handleOrderArchived = ({ _id, tableNumber }: {_id: string; tableNumber: string }) => {
            console.log('Socket: Received orderArchived for ID:', _id, 'Table:', tableNumber);
            //Only refresh if the archived belong to the current table
            if(tableNumber === storedTableNumber) {
                setRefreshActiveOrdersTrigger(prev => prev + 1); // Trigger re-fetch
            }
        };

        socket.on('orderArchived', handleOrderArchived);

        //Cleaning up socket listener on component unmount
        return () => {
            socket.off('orderArchived', handleOrderArchived);
        };
    }, [router, setInitialActiveOrders, resetOrder, showMessageBox, refreshActiveOrdersTrigger]);

    // Helper to calculate total price
    const calculateTotalPrice = useCallback((items: (OrderItem | { price: number; quantity: number })[]): number => {
        return items.reduce((total, item) => total + item.quantity * item.price, 0);
    }, []);

    // --- BEGIN: MyOrderPage's PATCH/POST logic ---
    const handleConfirmOrder = useCallback(async () => {
        setIsConfirming(true);
        setError(null);

        const storedTableNumber = localStorage.getItem('tableNumber');

        if (!storedTableNumber) {
            console.error('Table number not found. Cannot confirm order.');
             showMessageBox("Table number not found! Please go back to the menu.");
            setIsConfirming(false);
            return;
        }

        try {
            // PART 1: POST new items
            const newlyAddedItems = getNewlyAddedItems();
            const newOrderTotal = calculateTotalPrice(newlyAddedItems);

            if (newlyAddedItems.length > 0) {
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
                console.log("AddEditContent: Newly added items confirmed successfully:", createdOrder);
                socket.emit('newOrder', createdOrder);
            } else {
                console.log("AddEditContent: No new items to confirm.");
            }

            // PART 2: PATCH decreases/increases on existing orders
            if (activeOrders.length > 0 ) {
            const patchPromises = activeOrders.map(async (originalActiveOrder) => {
                // Find all entries for this order
                const relevantEntriesForThisOrder = orderEntries.filter(entry =>
                    entry.isConfirmed && originalActiveOrder.orderItems.some(originalItem => originalItem._id === entry.id)
                );

                // Converting these relevant `OrderEntry` objects back to `OrderItem` structure for the backend.
                const newOrderItemsForBackend: OrderItem[] = relevantEntriesForThisOrder.map(entry => ({
                    _id: entry.id, // Use OrderEntry.id which is OrderItem._id for confirmed items
                    name: entry.name,
                    quantity: entry.quantity,
                    price: entry.price,
                }));

                const newTotalPriceForThisOrder = calculateTotalPrice(newOrderItemsForBackend);

                // Deep compare content (ignore _id)
                const originalItemsForComparison = originalActiveOrder.orderItems.map(item => ({ name: item.name, quantity: item.quantity, price: item.price })).sort((a, b) => a.name.localeCompare(b.name) || a.quantity - b.quantity);
                const newItemsForComparison = newOrderItemsForBackend.map(item => ({ name: item.name, quantity: item.quantity, price: item.price })).sort((a, b) => a.name.localeCompare(b.name) || a.quantity - b.quantity);

                const hasItemsChanged = JSON.stringify(originalItemsForComparison) !== JSON.stringify(newItemsForComparison);
                const hasTotalPriceChanged = originalActiveOrder.totalPrice !== newTotalPriceForThisOrder;

                if (hasItemsChanged || hasTotalPriceChanged) {
                    const patchData = {
                        orderItems: newOrderItemsForBackend,
                        totalPrice: newTotalPriceForThisOrder,
                        status: newOrderItemsForBackend.length === 0 ? 'Cancelled' : originalActiveOrder.status
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
                        console.log(`AddEditContent: Order ${originalActiveOrder._id} patched successfully.`, updatedOrder);
                        // FIX: Emit socket event for updated order as a single object, not an array
                        socket.emit('orderStatusUpdated', updatedOrder); 
                        return updatedOrder; // Return updated order from backend
                }
                return null;
            });

            // Execute all PATCH promises, filter out nulls (no changes)
                const patchedResults = (await Promise.all(patchPromises)).filter(r => r !== null);
                console.log("AddEditContent: All PATCH operations completed. Results:", patchedResults);
            } else {
                console.log("AddEditContent: No active orders to patch.");
            }

            // --- FINAL STEP: Refresh frontend state from backend ---
            // After all POSTs and PATCHes, re-fetch all active orders to synchronize the state
            const updatedResponse = await fetch(`${BACKEND_URL}/api/orders/table/${storedTableNumber}/active`);
            if (!updatedResponse.ok) {
                throw new Error(`HTTP error! status: ${updatedResponse.status} during final refresh`);
            }
            const updatedData: Order[] = await updatedResponse.json();

            // **** CRITICAL CHANGE: Pass 'true' to clear unconfirmed entries after successful sync ****
            setInitialActiveOrders(updatedData, true);
            console.log("AddEditContent: Frontend state refreshed after confirmation/updates, all unconfirmed cleared.");

            // Display success message and navigate
            showMessageBox('Order changes confirmed successfully!', () => {
                router.push('/addeditcustomerside'); // Always navigate to this page after confirmation
            });

        } catch (err: any) {
            console.error("AddEditContent: Error during order confirmation:", err);
            showMessageBox(`Failed to confirm order: ${err.message || 'Unknown error'}. Please try again.`);
        } finally {
            setIsConfirming(false); // Re-enable button regardless of success or failure
        }
    }, [orderEntries, activeOrders, getNewlyAddedItems, setInitialActiveOrders, router, calculateTotalPrice, showMessageBox]);
    // --- END: MyOrderPage's handleConfirmOrder logic integrated ---

    const handleCancelButtonClick = useCallback(async (entryId: string) => {
        setIsConfirming(true); // Disable button to prevent multiple clicks
        try {
            await cancelOrderEntry(entryId);

            showMessageBox("Item cancelled successfully.");
            //Triggering a re-fetch to ensure the UI is fully synchronized after a cancellation
            setRefreshActiveOrdersTrigger(prev => prev + 1);
        } catch (error: any) {
            console.error("Error cancelling item:", error);
            showMessageBox(`Failed to cancel item: ${error.message || 'Unknown error'}`);
        } finally {
            setIsConfirming(false); // Re-enable button regardless of success or failure
        }
    }, [cancelOrderEntry, showMessageBox]);

    const totalBill = orderItems.reduce(
        (total, item) => total + item.quantity * item.price,
        0
    );

    const handleBackClick = () => {
        router.back();
    };

    const handleAddEditClick = () => {
        setIsFoodMenuOpen(true);
    };

    const handleCloseFoodMenu = () => {
        setIsFoodMenuOpen(false);
    };

    const handleMoveTowardsPayment = () => {
        router.push('/payment');
    }

    if(isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#fdd7a2] p-4">
                <p className="text-xl text-gray-800">Loading order items...</p>
            </div>
        );
    }

    const backgroundContent = (
        <div className = "w-full min-h-screen flex flex-col items-center bg-[#fdd7a2] p-4">
            <BackButton onClick={handleBackClick}/>
            <h1 className="text-gray-800 text-xl md:text-2xl font-bold rounded-lg p-3 pt-16 text-center">
                Add/Edit your Items.
            </h1>

            <div className="bg-white rounded-lg p-5 w-[90%] max-w-[500px] shadow-md border border-gray-200 h-[465px] flex flex-col justify-between">
                <div className="border-b-2 border-dashed border-gray-300 pb-2.5 mb-1">
                    <h2 className='text-xl text-gray-800 m-0 text-center'>Order Details</h2>
                    <div className='text-sm text-gray-600 text-center'>{new Date().toLocaleDateString()}</div>
                </div>
                <div className="order-items-scrollable flex flex-col gap-2.5 flex-1 overflow-y-scroll pr-2">
                    {orderEntries.length === 0 && !isLoading ? (
                        <p className="text-center py-5 text-gray-700 text-base">Your order is empty.</p>
                    ) : (
                        <>
                            {confirmedItems.length > 0 && (
                                <div className="mb-4">
                                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Confirmed Items</h3>
                                    <div className="space-y-2">
                                        {confirmedItems.map((entry: OrderEntry, index) => (
                                            <div
                                                key={entry.id}
                                                className="flex justify-between items-center bg-blue-50 rounded-lg p-4 shadow-md w-full border border-blue-200 mb-2"
                                            >
                                                <div className="flex flex-col">
                                                    <span className="text-gray-800 text-base font-medium">
                                                        {entry.name}
                                                    </span>
                                                    <span className="text-gray-500 text-xs">
                                                        Entry #{index + 1} • ${entry.price.toFixed(2)} each
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => decreaseEntryQuantity(entry.id)}
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
                                                            disabled={isConfirming}
                                                            className={`
                                                                bg-green-500 text-white px-2 py-1 rounded-md text-sm font-bold shadow-sm transition-colors
                                                                ${isConfirming ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-600 cursor-pointer'}
                                                            `}
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                    <span className="text-gray-700 font-medium min-w-[60px] text-right">
                                                        ${(entry.price * entry.quantity).toFixed(2)}
                                                    </span>
                                                    {/* Cancel button for confirmed items */}
                                                    <button
                                                        onClick={() => handleCancelButtonClick(entry.id)}
                                                        disabled={isConfirming}
                                                        className={`
                                                            bg-gray-500 text-white px-2 py-1 rounded-md text-xs font-bold shadow-sm transition-colors ml-2
                                                            ${isConfirming ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-600 cursor-pointer'}
                                                        `}
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {unconfirmedItems.length > 0 && (
                                <div className="mb-4">
                                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Pending Additions</h3>
                                    <div className="space-y-2">
                                        {unconfirmedItems.map((entry: OrderEntry, index) => (
                                            <div
                                                key={entry.id}
                                                className="flex justify-between items-center bg-yellow-50 rounded-lg p-4 shadow-md w-full border border-yellow-200 mb-2"
                                            >
                                                <div className="flex flex-col">
                                                    <span className="text-gray-800 text-base font-medium">
                                                        {entry.name}
                                                    </span>
                                                    <span className="text-gray-500 text-xs">
                                                        Entry #{index + 1} • ${entry.price.toFixed(2)} each
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => decreaseEntryQuantity(entry.id)}
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
                                                            disabled={isConfirming}
                                                            className={`
                                                                bg-green-500 text-white px-2 py-1 rounded-md text-sm font-bold shadow-sm transition-colors
                                                                ${isConfirming ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-600 cursor-pointer'}
                                                            `}
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                    <span className="text-gray-700 font-medium min-w-[60px] text-right">
                                                        ${(entry.price * entry.quantity).toFixed(2)}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="flex justify-between py-4 mt-2.5 border-t-2 border-dashed border-gray-300 font-bold">
                    <span className='text-lg text-gray-800'>Total Amount</span>
                    <span className='text-lg text-[#F5BB49]'>${totalBill.toFixed(2)}</span>
                </div>      
            </div>

            <div className="flex flex-col items-center mt-4 w-full gap-4">
                {error && (
                    <p className="text-red-500 text-center font-bold mb-2">{error}</p>
                )}

                <button
                    onClick={handleConfirmOrder}
                    disabled={isConfirming || !hasPendingChanges()}
                    className={`py-3 px-8 text-white font-bold rounded-lg shadow-md w-[90%] max-w-[500px]
                        ${isConfirming || !hasPendingChanges() ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600 active:bg-blue-700'}
                        transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:shadow-lg
                        active:translate-y-0 active:shadow-md`}
                >
                    {isConfirming ? 'Confirming...' : 'Confirm Order'}
                </button>

                <button
                onClick={handleAddEditClick}
                className="py-3 px-8 bg-[#2ecc71] text-white font-bold rounded-lg shadow-md
                transition-all duration-200 ease-in-out
                hover:bg-[#2ecc71] hover:-translate-y-0.5 hover:shadow-lg
                active:bg-[#2ecc71] active:translate-y-0 active:shadow-md"
                >
                    Add/Edit
                </button>

                <button
                    onClick={handleMoveTowardsPayment}
                    className="py-3 px-8 bg-[#2ecc71] text-white font-bold rounded-lg shadow-md
                    transition-all duration-200 ease-in-out
                    hover:bg-[#2ecc71] hover:-translate-y-0.5 hover:shadow-lg
                    active:bg-[#2ecc71] active:translate-y-0 active:shadow-md"
                >
                    Move to Payment
                </button>
            </div>
        </div>
    );

    return (
        <BottomSheetLayout
            isOpen = {isFoodMenuOpen}
            onClose={handleCloseFoodMenu}
            bottomSheetContent={<FoodMenu />}
        >
            {backgroundContent}
        </BottomSheetLayout>
    )
}