'use client';

import React, { useState, useEffect } from "react";
import io from 'socket.io-client';
import { Order, OrderItem } from "@/types/order";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

export default function KitchenContent() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Helper function to display temporary success or error messages
    const showMessage = (message: string, isError = false) => {
        if (isError) {
            setError(message);
            setSuccessMessage(null); // Clear success if there's an error
        } else {
            setSuccessMessage(message);
            setError(null); // Clear error if there's success
        }
        // Messages disappear after 3 seconds
        setTimeout(() => {
            setSuccessMessage(null);
            setError(null);
        }, 3000);
    };

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${BACKEND_URL}/api/orders`);
            if (!response.ok) {
                throw new Error('Failed to fetch orders');
            }
            const data: Order[] = await response.json();
            // Filter to show only 'In progress' or 'Delivered' orders
            const filteredOrders = data.filter(order =>
                order.status === 'In progress' || order.status === 'Delivered'
            );
            setOrders(filteredOrders);
        } catch (err) {
            console.error("Error fetching orders:", err);
            showMessage("Failed to load orders. Please try again.", true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();

        const socket = io(BACKEND_URL);

        socket.on('newOrder', (newOrder: Order) => {
            console.log("Socket.IO: New order received", newOrder);
            setOrders(prevOrders => [newOrder, ...prevOrders]);
            showMessage(`New Order for Table ${newOrder.tableNumber}!`, false);
        });

        // This listener is for when an existing item's quantity is updated.
        // FIX: Add this listener to handle item quantity changes and other general updates
        socket.on('orderUpdated', (updatedOrder: Order) => {
            console.log("Socket.IO: Received orderUpdated", updatedOrder);
            setOrders(prevOrders =>
                prevOrders.map(order =>
                    order._id === updatedOrder._id ? updatedOrder : order
                )
            );
        });

        socket.on('orderStatusUpdated', (updatedOrder: Order) => {
            console.log("Socket.IO: Order status updated", updatedOrder);
            setOrders(prevOrders =>
                prevOrders.map(order =>
                    order._id === updatedOrder._id ? updatedOrder : order
                )
            );
        });

        // Cleanup on unmount
        return () => {
            socket.disconnect();
        };

    }, []);

    const handleDone = async (orderId: string) => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/orders/${orderId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'Delivered' }),
            });

            if (!response.ok) {
                throw new Error('Failed to update order status');
            }

            // The Socket.IO event 'orderStatusUpdated' will now handle the UI update.
            showMessage("Order marked as delivered!", false);
        } catch (err) {
            console.error("Error updating order status:", err);
            showMessage("Failed to update order status. Please try again.", true);
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-full text-white">Loading orders...</div>;
    }

    return (
        <div className="flex flex-col h-full bg-slate-800 p-4 sm:p-6 md:p-8">
            <div className="p-2 sm:p-6 md:p-8 flex justify-between items-center mb-4">
                <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4">
                    <div className="text-left">
                        <p className="text-xs sm:text-sm font-medium text-gray-50">Chef Name</p>
                        <p className="text-[10px] sm:text-xs text-gray-50">Kitchen Staff</p>
                    </div>
                    <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-orange-400 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        CN
                    </div>
                </div>
            </div>

            {/* Success and Error Message Display */}
            {(successMessage || error) && (
                <div className={`p-3 rounded-lg text-white font-semibold text-center mb-4 ${error ? 'bg-red-500' : 'bg-green-500'}`}>
                    {successMessage || error}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto">
                {orders.length > 0 ? (
                    orders.map((order: Order) => (
                        <div key={order._id} className="bg-white rounded-lg shadow-md p-4 flex flex-col justify-between" style={{ minWidth: '250px' }}>
                            {/* Header Section */}
                            <div className="bg-yellow-100 rounded-t-lg p-2 text-black flex justify-between items-center">
                                <span className="font-bold text-lg">Table {order.tableNumber}</span>
                                <span className="text-sm">{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>

                            {/* Order Item Section */}
                            <div className="p-4 flex-grow">
                                {order.orderItems.length === 0 ? (
                                    <div className="text-center text-gray-400 italic">No items found.</div>
                                ) : (
                                    order.orderItems.map((item: OrderItem, index) => {
                                        return (
                                            <div key={item._id || index} className="flex justify-between items-center">
                                                <div>
                                                    <p className="font-bold text-xl text-black">{item.name}</p>
                                                    {item.notes && <p className="text-sm text-cyan-500">{item.notes}</p>}
                                                </div>
                                                <div className="flex items-center space-x-2 text-black">
                                                    <span className="text-xl font-bold">X</span>
                                                    <span className="text-3xl font-bold">{item.quantity}</span>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Action Button Section */}
                            <div className="p-2">
                                <button
                                    onClick={() => handleDone(order._id)}
                                    className="w-full py-2 bg-green-500 text-white rounded-lg font-bold text-lg hover:bg-green-600 transition-colors"
                                    disabled={order.status === 'Delivered'}
                                >
                                    DONE
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full text-center text-white text-lg">No new orders at the moment.</div>
                )}
            </div>
        </div>
    );
}