'use client';

import React, { useEffect, useState } from 'react';
import TableCard from './TableCard';
import {Order, OrderItem} from '@/types/order';
import OrderDetailSidebar from './OrderDetailSidebar';


export default function AdminOrdersContent() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrders, setSelectedOrder] = useState<Order[] | null>(null); //For order detail sidebar
    const [showSidebar, setShowSidebar] = useState(false); //Toggle sidebar


    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const res = await fetch('http://localhost:5000/api/orders');
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
        // If all orders for this table are "Delivered" and we're moving to "Paid", update all
        if (tableOrders && newStatus === 'Paid') {
            const allDelivered = tableOrders.every(order => order.status === 'Delivered');
            
            if (allDelivered) {
                // Update all orders for this table
                try {
                    const updatePromises = tableOrders.map(order => 
                        fetch(`http://localhost:5000/api/orders/${order._id}/status`, {
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
        try {
            const res = await fetch(`http://localhost:5000/api/orders/${orderId}/status`, {
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
        // If all orders for this table are "Delivered", revert all
        if (tableOrders) {
            const allDelivered = tableOrders.every(order => order.status === 'Delivered');
            const allPaid = tableOrders.every(order => order.status === 'Paid');

            if (allDelivered || allPaid) {
                // Revert all orders for this table
                try {
                    const revertPromises = tableOrders.map(order => 
                        fetch(`http://localhost:5000/api/orders/${order._id}/revert-status`, {
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
        try {
            const res = await fetch(`http://localhost:5000/api/orders/${orderId}/revert-status`, {
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
        if (tableOrders) {
            const allPaid = tableOrders.every(order => order.status === 'Paid');
            
            if (allPaid) {
                try {
                    const deletePromises = tableOrders.map(order => 
                        fetch(`http://localhost:5000/api/orders/${order._id}/archive`, {
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
            const res = await fetch(`http://localhost:5000/api/orders/${orderId}/archive`, {
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

    // ✅ Callback function to handle order updates from sidebar
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
                        //Getting the latest order or most relevant status for the table
                        const oldestOrder  = tableOrders.reduce((oldest, current) => {
                         return (new Date(current.createdAt || '').getTime() < new Date(oldest.createdAt || '').getTime()) ? current : oldest;
                    });
                    return (
                        <div 
                             key={tableNumber} 
                             className="bg-white shadow-md rounded-xl p-4 border border-gray-200"
                             >
                            <TableCard
                                tableNumber={tableNumber}
                                status={oldestOrder.status as 'In progress' | 'Delivered' | 'Paid'}
                                onClick={() => handleCardClick(tableOrders)} // Trigger sidebar
                            />

                            {/* Show order count for this table */}
                                <div className="mt-2 text-sm text-gray-600 text-center">
                                    {tableOrders.length} order{tableOrders.length !== 1 ? 's' : ''}
                                </div>

                            {/* Admin status buttons */}
                            <div className="space-x-2 mt-3">
                                {oldestOrder.status === 'In progress' && (
                                    <button
                                        onClick={() => updateStatus(oldestOrder._id, 'Delivered', tableOrders)}
                                        className="text-sm px-3 py-1 bg-yellow-300 rounded hover:bg-yellow-400 transition"
                                    >
                                        Delivered
                                    </button>
                                )}
                                {oldestOrder.status === 'Delivered' && (
                                    <button
                                        onClick={() => updateStatus(oldestOrder._id, 'Paid', tableOrders)}
                                        className="text-sm px-3 py-1 bg-green-300 rounded hover:bg-green-400 transition"
                                    >
                                        Paid
                                    </button>
                                )}
                                {oldestOrder.status === 'Paid' && (
                                    <button
                                        onClick={() => archiveOrder(oldestOrder._id, tableOrders)}
                                        className="text-sm px-3 py-1 bg-red-300 rounded hover:bg-green-400 transition"
                                    >
                                        Delete
                                    </button>
                                )}

                                {/* Revert status button */}
                                {oldestOrder.statusHistory && oldestOrder.statusHistory.length > 0 && (
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