'use client';

import React, { useEffect, useState } from 'react';
import TableCard from './TableCard';
import {Order, OrderItem} from '@/types/order';
import OrderDetailSidebar from './OrderDetailSidebar';


const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

export default function AdminOrdersContent() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrders, setSelectedOrder] = useState<Order[] | null>(null); //For order detail sidebar
    const [showSidebar, setShowSidebar] = useState(false); //Toggle sidebar


    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const res = await fetch(`${BACKEND_URL}/api/orders`);
                const data = await res.json();
                setOrders(data);
            } catch (err) {
                console.error('Error fetching orders:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, []);

    //Helper function to determine the aggregated display status for a given table based on its orders.
    //Prioritzes 'In progress', then 'Delivered', then 'Paid', and finally 'Cancelled'.
    const getTableDisplayStatus = (tableOrders: Order[]): 'In progress' | 'Delivered' | 'Paid' | 'Cancelled' => {
        if (tableOrders.length === 0) {
            return 'Cancelled';
        }

        //1. Check for 'In progress' (highest priority)
        if (tableOrders.some(order => order.status === 'In progress')) {
            return 'In progress';
        }

        //2. Check for 'Delivered' (next priority)
        //Ensure no 'In progress' orders, at least one 'Delivered' order, and all others are 'Delivered', 'Paid', or 'Cancelled'.
        const anyAreDelivered = tableOrders.some(order => order.status === 'Delivered');
        const allOthersAreFinalOrDelivered = tableOrders.every(order => 
            order.status === 'Delivered' || order.status === 'Paid' || order.status === 'Cancelled'
        );

        if (anyAreDelivered && allOthersAreFinalOrDelivered) {
            return 'Delivered';
        }

        //3. Check for 'Paid' (next priority)
        //Ensure no 'In progress' or 'Delivered' orders, at least one 'Paid' order, and all others are 'Paid' or 'Cancelled'.
        const anyArePaid = tableOrders.some(order => order.status === 'Paid'); 
        const allOthersArePaidOrCancelled = tableOrders.every(order =>
            order.status === 'Paid' || order.status === 'Cancelled'
        );

        if (anyArePaid && allOthersArePaidOrCancelled) {
            return 'Paid';
        }

        //Fallback to 'Cancelled' if none of the above
        return 'Cancelled';
    };

    // Group orders by table number
    const groupedOrders = orders.reduce((acc, order) => {
        const table = order.tableNumber;
        if (!acc[table]) acc[table] = [];
        acc[table].push(order);
        return acc;
    }, {} as Record<string, Order[]>)

    //Converting groupedOrders object to an array of [tableNumber, orders] pairs
    //And then sort them by the latest order's createdAt timestamp
    const sortedTableGroups = Object.entries(groupedOrders).sort(([tableNumA, ordersA], [tableNumB, ordersB]) => {
        //Find the latest order for Table A
        const latestOrderA = ordersA.reduce((latest, current) => {
            return (new Date(current.createdAt || '').getTime() > new Date(latest.createdAt || '').getTime()) ? current : latest;
        });

        // Find the latest order for Table B
        const latestOrderB = ordersB.reduce((latest, current) => {
            return (new Date(current.createdAt || '').getTime() > new Date(latest.createdAt || '').getTime()) ? current : latest;
        });

        //Sort in descending order (newest first)
        return new Date(latestOrderB.createdAt || '').getTime() - new Date(latestOrderA.createdAt || '').getTime();
    });

    // Function to handle card click - now handles all orders for a table
    const handleCardClick = (tableOrders: Order[]) => {
        //Sort the orders for this specific table by createdAt (oldest first)
        const sortedTableOrders = [...tableOrders].sort((a, b) => {
            const dateA = new Date(a.createdAt);
            const dateB = new Date(b.createdAt);
            return dateA.getTime() - dateB.getTime(); //Sort from oldest to newest
        });
        setSelectedOrder(sortedTableOrders);
        setShowSidebar(true);
    }

    // Function to close sidebar
    const handleCloseSidebar = () => {
        setSelectedOrder(null);
        setShowSidebar(false);
    }

    // ✅ Function to update order status - handles single order or all table orders
    const updateStatus = async (orderId: string, newStatus: 'Delivered' | 'Paid', tableOrders?: Order[]) => {
        // If updating multiple orders for a table (e.g., all to 'Paid')
        if (tableOrders && newStatus === 'Paid') {
            // Filter out 'Cancelled' orders from the tableOrders array before checking conditions
            const nonCancelledTableOrders = tableOrders.filter(order => order.status !== 'Cancelled');

            const allDelivered = nonCancelledTableOrders.every(order => order.status === 'Delivered');
            
            if (allDelivered && nonCancelledTableOrders.length > 0) { // Ensure there are non-cancelled orders to update
                // Update all NON-CANCELLED orders for this table
                try {
                    const updatePromises = nonCancelledTableOrders.map(order => 
                        fetch(`${BACKEND_URL}/api/orders/${order._id}/status`, { // Use BACKEND_URL
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ status: newStatus }),
                        })
                    );

                    const responses = await Promise.all(updatePromises);
                    const updatedOrders = await Promise.all(
                        responses.map(res => res.ok ? res.json() : null)
                    );

                    // Update state with all updated orders
                    setOrders((prev) =>
                        prev.map((order) => {
                            const updatedOrder = updatedOrders.find(updated => 
                                updated && updated._id === order._id
                            );
                            return updatedOrder || order;
                        })
                    );

                } catch (err) {
                    console.error('Error updating multiple orders:', err);
                }
                return;
            }
        }

        // Single order update (original logic)
        // Ensure the single order is not 'Cancelled' before attempting to update
        const orderToUpdate = orders.find(order => order._id === orderId);
        if (orderToUpdate && orderToUpdate.status === 'Cancelled') {
            console.warn(`Attempted to update a cancelled order (${orderId}). Action blocked.`);
            return; // Block update if the specific order is cancelled
        }

        try {
            const res = await fetch(`${BACKEND_URL}/api/orders/${orderId}/status`, { // Use BACKEND_URL
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });
            if (res.ok) {
                const updatedOrder = await res.json();
                setOrders((prev) =>
                    prev.map((order) => (order._id === orderId ? updatedOrder : order))
                );
            } else {
                console.error('Failed to update order status');
            }
        } catch (err) {
            console.error(err);
        }
    };

    // Function to revert order statuses
    const revertStatus = async (orderId: string, tableOrders?: Order[]) => {
        // If reverting multiple orders for a table
        if (tableOrders) {
            // Filter out 'Cancelled' orders from the tableOrders array before checking conditions
            const nonCancelledTableOrders = tableOrders.filter(order => order.status !== 'Cancelled');

            const allDelivered = nonCancelledTableOrders.every(order => order.status === 'Delivered');
            const allPaid = nonCancelledTableOrders.every(order => order.status === 'Paid');

            if ((allDelivered || allPaid) && nonCancelledTableOrders.length > 0) { // Ensure there are non-cancelled orders to revert
                // Revert all NON-CANCELLED orders for this table
                try {
                    const revertPromises = nonCancelledTableOrders.map(order => 
                        fetch(`${BACKEND_URL}/api/orders/${order._id}/revert-status`, { // Use BACKEND_URL
                            method: 'PATCH',
                        })
                    );

                    const responses = await Promise.all(revertPromises);
                    const updatedOrders = await Promise.all(
                        responses.map(res => res.ok ? res.json() : null)
                    );

                    // Update state with all reverted orders
                    setOrders((prev) =>
                        prev.map((order) => {
                            const updatedOrder = updatedOrders.find(updated => 
                                updated && updated._id === order._id
                            );
                            return updatedOrder || order;
                        })
                    );

                } catch (err) {
                    console.error('Error reverting multiple orders:', err);
                }
                return;
            }
        }

        // Single order revert (original logic)
        // Ensure the single order is not 'Cancelled' before attempting to revert
        const orderToRevert = orders.find(order => order._id === orderId);
        if (orderToRevert && orderToRevert.status === 'Cancelled') {
            console.warn(`Attempted to revert a cancelled order (${orderId}). Action blocked.`);
            return; // Block revert if the specific order is cancelled
        }

        try {
            const res = await fetch(`${BACKEND_URL}/api/orders/${orderId}/revert-status`, { // Use BACKEND_URL
                method: 'PATCH',
            });
            if (res.ok) {
                const updatedOrder = await res.json();
                setOrders((prev) => 
                    prev.map((order) => (order._id === orderId ? updatedOrder : order))
                );
            } else {
                console.error('Failed to revert status');
            }
        } catch (err) { 
            console.error('Error reverting status:', err);
        }
    };

    const archiveOrder = async (orderId: string, tableOrders?: Order[]) => {
        if (!confirm('Are you sure you want to archive this order?')) return;

        // If all orders are "Paid", archive all orders for this table
        // We generally wouldn't archive if there are cancelled orders mixed in,
        // unless the intent is to clear ALL orders for a table regardless of their state once all *paid* ones are paid.
        // For now, let's keep the logic to only archive if all are paid.
        if (tableOrders) {
            const allPaid = tableOrders.every(order => order.status === 'Paid');
            
            if (allPaid) { // Only proceed if ALL orders for the table are Paid
                try {
                    const deletePromises = tableOrders.map(order => 
                        fetch(`${BACKEND_URL}/api/orders/${order._id}/archive`, { // Use BACKEND_URL
                            method: 'DELETE',
                        })
                    );

                    const responses = await Promise.all(deletePromises);
                    const allSuccess = responses.every(res => res.ok);

                    if (allSuccess) {
                        // Remove all orders for this table from state
                        const orderIds = tableOrders.map(order => order._id);
                        setOrders(prev => prev.filter(order => !orderIds.includes(order._id)));
                    } else {
                        console.error('Failed to archive some orders');
                    }
                } catch (err) {
                    console.error('Error archiving multiple orders:', err);
                }
                return;
            }
        }

        // Single order archive (fallback)
        try {
            const res = await fetch(`${BACKEND_URL}/api/orders/${orderId}/archive`, { // Use BACKEND_URL
                method: 'DELETE',
            });

            if (res.ok) {
                setOrders(prev => prev.filter(order => order._id !== orderId));
            } else {
                console.error('Failed to archive order');
            }
        } catch (err) {
            console.error('Error archiving order:', err);
        }
    };

    // Callback function to handle order updates from sidebar
    const handleOrderUpdate = (updatedOrder: Order) => {
        setOrders((prev) =>
            prev.map((order) => (order._id === updatedOrder._id ? updatedOrder : order))
        );
        
        // Update selectedOrders if sidebar is open
        if (selectedOrders) {
            setSelectedOrder((prev) =>
                prev?.map((order) => (order._id === updatedOrder._id ? updatedOrder : order)) || null
            );
        }
    };

    if (loading) return <div className="p-4 text-gray-500">Loading orders...</div>;

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-2xl font-bold">🧾 Orders Overview</h1>

            {orders.length === 0 ? (
                <p className="text-gray-500">No orders found.</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sortedTableGroups.map(([tableNumber, tableOrders]) => {
                        // Getting the latest order or most relevant status for the table
                        // IMPORTANT: The 'oldestOrder' here is used for button logic, not for the TableCard's overall status.
                        // It's primarily used for passing an orderId to the update/revert functions,
                        // and its status for initial button display checks.
                        const oldestOrder = tableOrders.reduce((oldest, current) => {
                           return (new Date(current.createdAt || '').getTime() < new Date(oldest.createdAt || '').getTime()) ? current : oldest;
                        });

                        const displayStatus = getTableDisplayStatus(tableOrders); 

                        return (
                            <div 
                                key={tableNumber} 
                                className="bg-white shadow-md rounded-xl p-4 border border-gray-200"
                            >
                                <TableCard
                                    tableNumber={tableNumber}
                                    status={displayStatus} 
                                    onClick={() => handleCardClick(tableOrders)} // Trigger sidebar
                                />

                                {/* Show order count for this table */}
                                <div className="mt-2 text-sm text-gray-600 text-center">
                                    {tableOrders.length} order{tableOrders.length !== 1 ? 's' : ''}
                                </div>

                                {/* Admin status buttons */}
                                <div className="space-x-2 mt-3">
                                    {/* Only show 'Paid' button if the aggregated displayStatus is 'Delivered' */}
                                    {displayStatus === 'Delivered' && (
                                        <button
                                            onClick={() => updateStatus(oldestOrder._id, 'Paid', tableOrders)}
                                            className="text-sm px-3 py-1 bg-green-300 rounded hover:bg-green-400 transition"
                                        >
                                            Paid
                                        </button>
                                    )}
                                    {/* Only show 'Delete' (Archive) button if the aggregated displayStatus is 'Paid' */}
                                    {displayStatus === 'Paid' && (
                                        <button
                                            onClick={() => archiveOrder(oldestOrder._id, tableOrders)}
                                            className="text-sm px-3 py-1 bg-red-300 rounded hover:bg-green-400 transition"
                                        >
                                            Delete
                                        </button>
                                    )}

                                    {/* Revert status button - only show if there's history and the current displayStatus is NOT 'Cancelled' */}
                                    {displayStatus !== 'Cancelled' && oldestOrder.statusHistory && oldestOrder.statusHistory.length > 0 && (
                                        <button
                                            onClick={() => revertStatus(oldestOrder._id, tableOrders)}
                                            className="text-sm px-3 py-1 bg-blue-300 rounded hover:bg-blue-400 transition"
                                        >
                                            Revert
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/*Sidebar Integration with callback*/}
            <OrderDetailSidebar
                orders={selectedOrders}
                isOpen={showSidebar}
                onClose={handleCloseSidebar}
                onOrderUpdate={handleOrderUpdate}
            />
        </div>
    );
}