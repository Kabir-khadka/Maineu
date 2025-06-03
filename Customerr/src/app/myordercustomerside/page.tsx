"use client"

import React, { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { useOrder } from '../context/OrderContext';
import {Order, OrderItem} from '@/types/order';

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
        const storedTableNumber = sessionStorage.getItem('tableNumber');
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

                // --- MODIFIED LOGIC HERE ---
                // Always call setInitialActiveOrders with the fetched data.
                // It will correctly handle empty arrays and merge.
                
                setInitialActiveOrders(fetchedOrders);
                console.log("Loaded existing active orders and updated context:", fetchedOrders);
                // --- END MODIFIED LOGIC ---

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

        const storedTableNumber = sessionStorage.getItem('tableNumber');
        if (!storedTableNumber) {
            alert("Table number not found!");
            return;
        }

        if (newlyAddedItems.length === 0 && decreasedOrRemovedItems.length === 0) {
            alert("No changes to confirm!");
            return;
        }

        let changesSuccessful = false;
        let finalNavigationPath = '/payment'; // Default navigation path

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
                    console.log('New items confirmed successfully (POST).');
                    changesSuccessful = true;
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
            //Sort activeOrders from newest to oldest before processing decreases
            let mutableActiveOrdersState: Order[] = JSON.parse(JSON.stringify(activeOrders));
            mutableActiveOrdersState.sort((a,b) => {
                const dateA = new Date(a.createdAt);
                const dateB = new Date(b.createdAt);
                return dateB.getTime() - dateA.getTime(); //Sort from newest to oldest
            })


            decreasedOrRemovedItems.forEach(async (change) => {
                let quantityToProcess = -change.quantityChange; // This is the positive amount to reduce

                // Iterate through active orders from newest to oldest
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
                    updateOrderData.status = 'cancelled'; // Set status to cancelled
                    updateOrderData.totalPrice = 0; // Set total price to 0 for a cancelled order
                    console.log(`Order ${orderId} is now empty. Setting status to 'cancelled'.`);
                }

                    patchPromises.push(
                        fetch(`${BACKEND_URL}/api/orders/${orderId}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(updateOrderData)
                        })
                    );
                }
            try {
                const results = await Promise.all(patchPromises);
                const allPatchesSuccessful = results.every(res => res.ok);

                if (allPatchesSuccessful) {
                    console.log('Decreases/removals confirmed successfully (PATCH).');
                    changesSuccessful = true;
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
            <div style={pageStyle}>
                <p>Loading your current order...</p>
            </div>
        );
    }

    return (
        <div style={pageStyle}>
            {/* Back Button */}
            <button
                style={backButtonStyle}
                onClick={() => router.push('/')}
            >
                ← Back
            </button>

            {/* Page Content */}
            <h1 style={headingStyle}>My Orders</h1>

            {/* Display order items or "empty" message */}
            { orderItems.length === 0 && !isLoading ? (
                <p style={{ color: '#666', marginTop: '20px' }}>Your order is empty.</p>
            ) : (
                orderItems.map((item, index) => (
                    <div
                        key={item.name}
                        style={orderItemStyle}>
                        <span>
                        {item.name} - Quantity: {item.quantity} - Price: ${item.price * item.quantity}
                        </span>
                        <div style={quantityControlStyle}>
                            <button
                                onClick={() => decreaseItemQuantity(item.name)}
                                style={quantityButtonStyle}
                            >
                                -
                            </button>
                            <span style={quantityTextStyle}>{item.quantity}</span>
                            <button
                                onClick={() => increaseItemQuantity(item.name)}
                                style={quantityButtonStyle}
                            >
                                +
                            </button>
                        </div>
                    </div>
                ))
            )}

            {/* Total Bill Section */}
            <div
              style={{
                marginTop: "20px",
                padding: "15px",
                backgroundColor: "white",
                borderRadius: "5px",
                width: "90%",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
              >
                <span
                  style={{
                    fontSize: "18px",
                    fontWeight: "bold",
                  }}
                  >
                    Total Bill
                  </span>
                  <span
                  style={{
                    fontSize: "18px",
                    color: "#F5B849",
                  }}
                  >
                    ${totalBill.toFixed(2)}
                  </span>
              </div>
              {/* Confirm Order Button */}
              <button
                    style={{
                    ...confirmOrderButtonStyle,
                    ...(isHovered ? hoverStyle : {}),
                    }}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    onClick={handleConfirmOrder}
                    // Disable if no additions AND no decreases/removals
                    disabled={getNewlyAddedItems().length === 0 && getDecreasedOrRemovedItems().length === 0}
                    >
                        Confirm Order
                    </button>
        </div>
    );
};


// Styles (remain the same)
const pageStyle: React.CSSProperties = {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'center',
    backgroundColor: '#fdd7a2',
    padding: '20px',
};

const backButtonStyle: React.CSSProperties = {
    position: 'absolute',
    top: '20px',
    left: '20px',
    padding: '10px 15px',
    fontSize: '14px',
    fontFamily: "'Montserrat', sans-serif",
    fontWeight: 'bold',
    color: '#ffffff',
    backgroundColor: '#F5B849',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.2)',
};

const headingStyle: React.CSSProperties = {
    marginTop: '60px',
    fontSize: '24px',
    color: '#333',
    textAlign: 'center',
};

const orderItemStyle: React.CSSProperties ={
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: "10px",
    padding: "15px",
    margin: "10px 0",
    boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.2)",
    width: "90%",
    maxWidth: "500px",
};

const quantityControlStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginTop: "10px",
};

const quantityButtonStyle: React.CSSProperties = {
    padding: "5px 10px",
    backgroundColor: "#F5B849",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
  };

  const quantityTextStyle: React.CSSProperties = {
    fontSize: "16px",
    fontWeight: "bold",
  };

  const confirmOrderButtonStyle: React.CSSProperties = {
    marginTop: "20px",
    padding: "12px 24px",
    fontSize: "16px",
    fontFamily: "'Montserrat', sans-serif",
    fontWeight: 'bold',
    color: 'white',
    backgroundColor: '#2ecc71',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    boxShadow: '0px 4px 6px rgba(0, 0, 0, 0.1)',
};

const hoverStyle: React.CSSProperties = {
    backgroundColor: '#27ae60',
    transform: 'translateY(-2px)',
    boxShadow: '0px 6px 8px rgba(0, 0, 0, 0.2)',
};

export default MyOrderPage;