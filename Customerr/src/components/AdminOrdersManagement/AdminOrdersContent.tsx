'use client';

import React, { useEffect, useState } from 'react';
import TableCard from './TableCard';

interface OrderItem {
    name: string;
    quantity: number;
    price: number;
}

interface Order {
    _id: string;
    tableNumber: string;
    orderItems: OrderItem[];
    totalPrice: number;
    status: 'In progress' | 'Delivered' | 'Paid' | string;
    statusHistory?: string[];
    createdAt: string;
}

export default function AdminOrdersContent() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

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

    // ✅ Function to update order status
    const updateStatus = async (orderId: string, newStatus: 'Delivered' | 'Paid') => {
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
    const revertStatus = async (orderId: string) => {
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

    const archiveOrder = async (orderId: string) => {
        if (!confirm('Are you sure you want to archive this order?')) return;

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

    if (loading) return <div className="p-4 text-gray-500">Loading orders...</div>;

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-2xl font-bold">🧾 Orders Overview</h1>

            {orders.length === 0 ? (
                <p className="text-gray-500">No orders found.</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {orders.map((order) => (
                        <div key={order._id} className="bg-white shadow-md rounded-xl p-4 border border-gray-200">
                            <TableCard
                                tableNumber={order.tableNumber}
                                status={order.status as 'In progress' | 'Delivered' | 'Paid'}
                                onClick={() => console.log('Order details:', order)}
                            />

                            {/* Admin status buttons */}
                            <div className="space-x-2 mt-3">
                                {order.status === 'In progress' && (
                                    <button
                                        onClick={() => updateStatus(order._id, 'Delivered')}
                                        className="text-sm px-3 py-1 bg-yellow-300 rounded hover:bg-yellow-400 transition"
                                    >
                                        Delivered
                                    </button>
                                )}
                                {order.status === 'Delivered' && (
                                    <button
                                        onClick={() => updateStatus(order._id, 'Paid')}
                                        className="text-sm px-3 py-1 bg-green-300 rounded hover:bg-green-400 transition"
                                    >
                                        Paid
                                    </button>
                                )}
                                {order.status === 'Paid' && (
                                    <button
                                        onClick={() => archiveOrder(order._id)}
                                        className="text-sm px-3 py-1 bg-red-300 rounded hover:bg-green-400 transition"
                                    >
                                        Delete
                                    </button>
                                )}

                                {/* Revert status button */}
                                {order.statusHistory && order.statusHistory.length > 0 && (
                                    <button
                                        onClick={() => revertStatus(order._id)}
                                        className="text-sm px-3 py-1 bg-blue-300 rounded hover:bg-blue-400 transition"
                                    >
                                        Revert
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
// ✅ This code is a React component that fetches and displays orders from an API.