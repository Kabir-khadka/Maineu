"use client";
import React, { useState, useEffect, Dispatch, SetStateAction } from "react";
import io from 'socket.io-client';
import { Order, OrderItem } from "@/types/order";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

interface KitchenContentProps {
    page: number;
    pageSize: number;
    setTotalOrders: Dispatch<SetStateAction<number>>;
    setPage: React.Dispatch<React.SetStateAction<number>>;
    pageCount: number;
}

export default function KitchenContent({ page, pageSize, setTotalOrders, setPage, pageCount }: KitchenContentProps) {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Update total orders count whenever the orders list changes
    useEffect(() => {
        setTotalOrders(orders.length);
    }, [orders, setTotalOrders]);

    const paginatedOrders = orders.slice(page * pageSize, (page + 1) * pageSize);

    const showMessage = (message: string, isError = false) => {
        if (isError) {
            setError(message);
            setSuccessMessage(null);
        } else {
            setSuccessMessage(message);
            setError(null);
        }
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
        <div className="flex flex-col h-full sm:p-4 md:p-2">
            <div className="p-1 sm:p-6 md:p-2 flex justify-between items-center mb-[-150px] sm:mb-[-150px]">
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

            {(successMessage || error) && (
                <div className={`p-3 rounded-lg text-white font-semibold text-center mb-4 ${error ? 'bg-red-500' : 'bg-green-500'}`}>
                    {successMessage || error}
                </div>
            )}

            <div className="flex-1 flex items-center justify-center p-1 sm:p-4 min-h-0">
                {paginatedOrders.length > 0 ? (
                    <div className={`
                        grid gap-1 sm:gap-4 w-full max-w-full
                        grid-cols-2 md:grid-cols-3
                        lg:grid-cols-4 xl:grid-cols-4
                    `}>
                        {paginatedOrders.map((order: Order) => (
                            <div
                                key={order._id}
                                className="bg-white rounded-lg shadow-md flex flex-col justify-between w-full min-h-[400px] sm:min-h-[500px] "
                            >
                                <div className="bg-yellow-100 rounded-t-lg p-2 text-black flex justify-between items-center flex-shrink-0">
                                    <span className="font-bold text-sm md:text-base lg:text-lg">Table {order.tableNumber}</span>
                                    <span className="text-xs md:text-sm">{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <div className="p-3 md:p-4 flex-grow overflow-y-auto min-h-0">
                                    {order.orderItems.length === 0 ? (
                                        <div className="text-center text-gray-400 italic text-sm">No items found.</div>
                                    ) : (
                                        <div className="space-y-2">
                                            {order.orderItems.map((item: OrderItem, index) => (
                                                <div key={item._id || index} className="flex justify-between items-center">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-bold text-sm md:text-lg lg:text-xl text-black truncate">{item.name}</p>
                                                        {item.notes && (
                                                            <p className="text-xs md:text-sm text-cyan-500 break-words">{item.notes}</p>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center space-x-1 md:space-x-2 text-black flex-shrink-0 ml-2">
                                                        <span className="text-sm md:text-xl font-bold">X</span>
                                                        <span className="text-lg md:text-2xl lg:text-3xl font-bold">{item.quantity}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="p-2 md:p-3 flex-shrink-0">
                                    <button
                                        onClick={() => handleDone(order._id)}
                                        className="w-full py-2 bg-green-500 text-white rounded-lg font-bold text-sm md:text-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                                        disabled={order.status === 'Delivered'}
                                    >
                                        DONE
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center text-white text-lg">No new orders at the moment.</div>
                )}
            </div>

            {/* Pagination Controls moved here */}
            <div className="w-full flex justify-center items-center py-4 bg-transparent mb-2 absolute left-0 bottom-0 sm:static sm:mb-0" style={{ zIndex: 10 }}>
                <div className="flex items-center space-x-3 text-white text-lg sm:text-xl select-none">
                    {/* Page numbers showing max 5 pages */}
                    {Array.from({ length: Math.min(pageCount, 5) }).map((_, idx) => {
                        let pageNumber;
                        if (pageCount <= 5) {
                            pageNumber = idx + 1;
                        } else {
                            if (page <= 2) {
                                pageNumber = idx + 1;
                            } else if (page >= pageCount - 3) {
                                pageNumber = pageCount - 4 + idx;
                            } else {
                                pageNumber = page - 1 + idx + 1;
                            }
                        }

                        return (
                            <button
                                key={pageNumber}
                                onClick={() => setPage(pageNumber - 1)}
                                className={`px-3 py-1 rounded focus:outline-none ${pageNumber === page + 1 ? "bg-gray-300 text-black font-bold cursor-default" : "hover:bg-gray-700 cursor-pointer"}`}
                                disabled={pageNumber === page + 1}
                                aria-current={pageNumber === page + 1 ? "page" : undefined}
                            >
                                {pageNumber}
                            </button>
                        );
                    })}
                    <span className="ml-1 text-white select-none text-lg">{">"}</span>
                </div>
            </div>
        </div>
    );
}