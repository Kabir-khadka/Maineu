'use client';

import React, { useEffect, useState } from 'react';
import TableCard from './TableCard';
import {Order, OrderItem} from '@/types/order';
import OrderDetailSidebar from './OrderDetailSidebar';
import socket from '@/lib/socket'; // Correctly import the socket client instance


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
                setOrders(data); // `data` will now be an array of single-item orders
            } catch (err) {
                console.error('Error fetching orders:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();

        //Adding Socket.IO Listeners
        socket.on('newOrder', (newOrder: Order) => {
            console.log('Socket: Received newOrder', newOrder);
            setOrders(prevOrders => [...prevOrders, newOrder]); // Add new order to state
            // If the sidebar is open and the new order belongs to the currently viewed table,
            // update selectedOrders as well
            if (showSidebar && selectedOrders && newOrder.tableNumber === selectedOrders[0]?.tableNumber) {
                setSelectedOrder(prevSelected => [...(prevSelected || []), newOrder]);
            }
        });

        socket.on('orderUpdated', (updatedOrder: Order) => {
            console.log('Socket: Received orderUpdated', updatedOrder);
            setOrders(prevOrders =>
                prevOrders.map(order =>
                    order._id === updatedOrder._id ? updatedOrder : order
                )
            );
            // Also update selectedOrders if the sidebar is open and this order is part of it
            if (showSidebar && selectedOrders?.some(o => o._id === updatedOrder._id)) {
                setSelectedOrder(prevSelected =>
                    prevSelected!.map(order =>
                        order._id === updatedOrder._id ? updatedOrder : order
                    )
                );
            }
        });

        socket.on('orderStatusUpdated', (updatedOrder: Order) => {
            console.log('Socket: Received orderStatusUpdated', updatedOrder);
            setOrders(prevOrders => 
                prevOrders.map(order => 
                    order._id === updatedOrder._id ? updatedOrder : order
                )
            );

            // Also update selectedOrders if the sidebar is open and this order is part of it
            if (showSidebar && selectedOrders?.some(o => o._id ===updatedOrder._id)) {
                setSelectedOrder(prevSelected => 
                    prevSelected!.map(order =>
                        order._id === updatedOrder._id ? updatedOrder : order
                    )
                );
            }
        });

        // This listener expects an array of updated orders
        socket.on('ordersBulkToggled', (updatedOrders: Order[]) => {
            console.log('Socket: Received ordersBulkToggled', updatedOrders);
            setOrders(prevOrders => {
                const updatedOrdersMap = new Map(updatedOrders.map(order => [order._id, order]));
                return prevOrders.map(order => updatedOrdersMap.get(order._id) || order);
            });

            if (showSidebar && selectedOrders && updatedOrders.some(uo => selectedOrders.some(so => so._id === uo._id))) {
                setSelectedOrder(prevSelected => {
                    const updatedSelectedMap = new Map(updatedOrders.map(order => [order._id, order]));
                    return prevSelected!.map(order => updatedSelectedMap.get(order._id) || order);
                });
            }
        });

        socket.on('orderArchived', ({ _id }: { _id: string }) => {
            console.log('Socket: Received orderArchived for ID:', _id);
            setOrders(prevOrders => prevOrders.filter(order => order._id !== _id));
            // If the archived order was selected in the sidebar, close the sidebar
            if (selectedOrders?.some(o => o._id === _id)) {
                handleCloseSidebar();
            }
        });

        // This listener expects an array of archived IDs
        socket.on('ordersBulkArchived', ({ archivedIds }: { archivedIds: string[] }) => {
            console.log('Socket: Received ordersBulkArchived for IDs:', archivedIds);
            setOrders(prevOrders => prevOrders.filter(order => !archivedIds.includes(order._id)));
            // If any of the archived orders were selected in the sidebar, close the sidebar
            if (selectedOrders && archivedIds.some(id => selectedOrders.some(so => so._id === id))) {
                handleCloseSidebar();
            }
        });

        // Clean up socket listeners on component unmount
        return () => {
            socket.off('newOrder');
            socket.off('orderUpdated');
            socket.off('orderStatusUpdated');
            socket.off('ordersBulkToggled');
            socket.off('orderArchived');
            socket.off('ordersBulkArchived');
        };
    }, [showSidebar, selectedOrders]); 

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
        const anyAreDelivered = tableOrders.some(order => order.status === 'Delivered');
        const allOthersAreFinalOrDelivered = tableOrders.every(order => 
            order.status === 'Delivered' || order.status === 'Paid' || order.status === 'Cancelled'
        );

        if (anyAreDelivered && allOthersAreFinalOrDelivered) {
            return 'Delivered';
        }

        //3. Check for 'Paid' (next priority)
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

    // Function to update order status - now always updates individual orders
    const updateStatus = async (orderId: string, newStatus: 'Delivered' | 'Paid', tableOrders?: Order[]) => {
        // If updating multiple orders for a table (e.g., all to 'Paid')
        if (tableOrders && newStatus === 'Paid') {
            const nonCancelledTableOrders = tableOrders.filter(order => order.status !== 'Cancelled');

            const allDelivered = nonCancelledTableOrders.every(order => order.status === 'Delivered');
            
            if (allDelivered && nonCancelledTableOrders.length > 0) {
                try {
                    const updatePromises = nonCancelledTableOrders.map(order => 
                        fetch(`${BACKEND_URL}/api/orders/${order._id}/status`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ status: newStatus }),
                        })
                    );

                    const responses = await Promise.all(updatePromises);
                    const updatedOrders: Order[] = [];
                    for (const res of responses) {
                        if (res.ok) {
                            updatedOrders.push(await res.json());
                        } else {
                            console.error('Failed to update status for one order:', res.status, res.statusText);
                        }
                    }

                    // --- FIX START ---
                    // Use the client-side 'socket' instance, not 'io'
                    if (updatedOrders.length > 0) {
                        socket.emit('ordersBulkToggled', updatedOrders); 
                    }
                    // --- FIX END ---
                } catch (err) {
                    console.error('Error updating multiple orders:', err);
                }
                return;
            }
        }

        // Single order update (or if bulk conditions not met)
        const orderToUpdate = orders.find(order => order._id === orderId);
        if (orderToUpdate && orderToUpdate.status === 'Cancelled') {
            console.warn(`Attempted to update a cancelled order (${orderId}). Action blocked.`);
            return;
        }

        try {
            const res = await fetch(`${BACKEND_URL}/api/orders/${orderId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });
            if (res.ok) {
                await res.json();
            } else {
                console.error('Failed to update order status');
            }
        } catch (err) {
            console.error(err);
        }
    };

    // Function to revert order statuses - now always reverts individual orders
    const revertStatus = async (orderId: string, tableOrders?: Order[]) => {
        // If tableOrders are provided, it means we're trying to revert ALL orders for a table
        if (tableOrders) {
            const nonCancelledTableOrders = tableOrders.filter(order => order.status !== 'Cancelled');
            const allDelivered = nonCancelledTableOrders.every(order => order.status === 'Delivered');
            const allPaid = nonCancelledTableOrders.every(order => order.status === 'Paid');

            if ((allDelivered || allPaid) && nonCancelledTableOrders.length > 0) {
                try {
                    const revertPromises = nonCancelledTableOrders.map(order => 
                        fetch(`${BACKEND_URL}/api/orders/${order._id}/revert-status`, {
                            method: 'PATCH',
                        })
                    );

                    const responses = await Promise.all(revertPromises);
                    const updatedOrders: Order[] = [];
                    for (const res of responses) {
                        if (res.ok) {
                            updatedOrders.push(await res.json());
                        } else {
                            console.error('Failed to revert status for one order:', res.status, res.statusText);
                        }
                    }

                    // --- FIX START ---
                    // Use the client-side 'socket' instance, not 'io'
                    if (updatedOrders.length > 0) {
                        socket.emit('ordersBulkToggled', updatedOrders); 
                    }
                    // --- FIX END ---
                } catch (err) {
                    console.error('Error reverting multiple orders:', err);
                }
                return;
            }
        }

        // Single order revert (or if bulk conditions not met)
        const orderToRevert = orders.find(order => order._id === orderId);
        if (orderToRevert && orderToRevert.status === 'Cancelled') {
            console.warn(`Attempted to revert a cancelled order (${orderId}). Action blocked.`);
            return;
        }

        try {
            const res = await fetch(`${BACKEND_URL}/api/orders/${orderId}/revert-status`, {
                method: 'PATCH',
            });
            if (res.ok) {
                await res.json();
            } else {
                console.error('Failed to revert status');
            }
        } catch (err) { 
            console.error('Error reverting status:', err);
        }
    };

    const archiveOrder = async (orderId: string, tableOrders?: Order[]) => {
        // Using a custom message box instead of confirm()
        const confirmArchive = await new Promise<boolean>((resolve) => {
            const messageBox = document.createElement('div');
            messageBox.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50';
            messageBox.innerHTML = `
                <div class="bg-white p-6 rounded-lg shadow-xl text-center">
                    <p class="text-lg font-semibold mb-4">Are you sure you want to archive this order?</p>
                    <div class="flex justify-center gap-4">
                        <button id="cancelArchive" class="bg-gray-300 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-400">Cancel</button>
                        <button id="confirmArchive" class="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600">Archive</button>
                    </div>
                </div>
            `;
            document.body.appendChild(messageBox);

            document.getElementById('confirmArchive')?.addEventListener('click', () => {
                document.body.removeChild(messageBox);
                resolve(true);
            });
            document.getElementById('cancelArchive')?.addEventListener('click', () => {
                document.body.removeChild(messageBox);
                resolve(false);
            });
        });

        if (!confirmArchive) return;

        // If all orders for the table are 'Paid' or 'Cancelled', archive all of them
        if (tableOrders) {
            const allPaidOrCancelled = tableOrders.every(order => order.status === 'Paid' || order.status === 'Cancelled');
            
            if (allPaidOrCancelled && tableOrders.length > 0) {
                try {
                    const deletePromises = tableOrders.map(order => 
                        fetch(`${BACKEND_URL}/api/orders/${order._id}/archive`, {
                            method: 'DELETE',
                        })
                    );

                    const responses = await Promise.all(deletePromises);
                    const archivedIds: string[] = [];
                    for (const res of responses) {
                        if (res.ok) {
                            // --- FIX START ---
                            // Correctly get the _id from the original order in tableOrders
                            // This assumes the DELETE request was for this specific order._id
                            const originalOrder = tableOrders.find(o => o._id === res.url.split('/').pop()); // Extract ID from URL for robustness
                            if (originalOrder) {
                                archivedIds.push(originalOrder._id);
                            }
                            // --- FIX END ---
                        } else {
                            console.error('Failed to archive one order:', res.status, res.statusText);
                        }
                    }

                    // --- FIX START ---
                    // Use the client-side 'socket' instance, not 'io'
                    if (archivedIds.length > 0) {
                        socket.emit('ordersBulkArchived', { archivedIds: archivedIds.filter(id => id !== '') });
                    }
                    // --- FIX END ---
                } catch (err) {
                    console.error('Error archiving multiple orders:', err);
                }
                return;
            }
        }

        // Single order archive (or if bulk conditions not met)
        try {
            const res = await fetch(`${BACKEND_URL}/api/orders/${orderId}/archive`, {
                method: 'DELETE',
            });

            if (res.ok) {
                // The socket.on('orderArchived') listener will handle state update
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

        socket.emit('orderStatusUpdated', updatedOrder); // Emit the updated order status
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
                                    {/* Only show 'Delete' (Archive) button if the aggregated displayStatus is 'Paid' or 'Cancelled' */}
                                    {(displayStatus === 'Paid' || displayStatus === 'Cancelled') && (
                                        <button
                                            onClick={() => archiveOrder(oldestOrder._id, tableOrders)}
                                            className="text-sm px-3 py-1 bg-red-300 rounded hover:bg-red-400 transition"
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
