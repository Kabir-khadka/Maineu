"use client";
import React, { useState, useEffect, Dispatch, SetStateAction } from "react";
import { Order, OrderItem } from "@/types/order";
import { io } from "socket.io-client";
import KitchenReusableButton from "../ReusableComponents/KitchenReusableButton";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

interface HistoryContentProps {
    page: number;
    pageSize: number;
    setTotalOrders: Dispatch<SetStateAction<number>>;
    setPage: Dispatch<React.SetStateAction<number>>;
    pageCount: number;
}

export default function HistoryContent({ page, pageSize, setTotalOrders, setPage, pageCount }: HistoryContentProps) {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    //Update total orders count whenever orders change
    useEffect(() => {
        setTotalOrders(orders.length);
    }, [orders, setTotalOrders]);

    const paginatedOrders = orders.slice(page * pageSize, (page + 1) * pageSize);

    const fetchHistoryOrders = async () => {
        setLoading(true);
        try {
            // Fetch only 'Delivered orders from the backend
            const response = await fetch(`${BACKEND_URL}/api/orders`);
            if (!response.ok) {
               throw new Error('Failed to fetch history orders');
            }
            const data: Order[] = await response.json();
            const deliveredOrders = data.filter(order => order.status === 'Delivered');
            setOrders(deliveredOrders);
        } catch (err) {
            console.error("Error fetching history orders:", err);
            setError("Failed to load history orders.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistoryOrders();
        const socket = io(BACKEND_URL);

        //Listening for order updates
        socket.on('orderStatusUpdated', (updatedOrder: Order) => {
            console.log("Socket.IO: Recieved order status updated in HistoryContent", updatedOrder);
            //If the updated order is delivered, add it to the list
            if (updatedOrder.status === 'Delivered') {
                setOrders(prevOrders => {
                    ////Avoid duplicates
                    if(!prevOrders.some(order => order._id === updatedOrder._id)) {
                        return [updatedOrder, ...prevOrders];
                    }
                    return prevOrders.map(order => order._id === updatedOrder._id
                        ? updatedOrder : order
                    );
                });
            }
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    if (loading) {
        return <div className="flex justify-center items-center h-full text-white">Loading history...</div>;
    }

    if (error) {
        return <div className="flex justify-center items-center h-full text-red-500">{error}</div>;
    }

    return (
        <div className="flex flex-col h-full sm:p-4 md:p-2">
            {/* The rest of the layout will be similar to KitchenContent, but without the Done button */}
            <div className="flex-1 flex items-center justify-center mb-[-5rem] p-1 sm:p-4 min-h-0">
                {paginatedOrders.length > 0 ? (
                    <div className={`grid gap-1 sm:gap-4 w-full max-w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4`}>
                        {paginatedOrders.map((order: Order) => (
                            <div key={order._id} className="bg-white rounded-lg shadow-md flex flex-col justify-between w-full min-h-[400px] sm:min-h-[500px]">
                                <div className="bg-green-300 rounded-t-lg p-2 text-black flex justify-between items-center flex-shrink-0">
                                    <span className="font-bold text-sm md:text-base lg:text-lg">Table {order.tableNumber}</span>
                                    <span className="text-xs md:text-sm">{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <div className="p-3 md:p-4 flex-grow overflow-y-auto min-h-0">
                                    {order.orderItems.length === 0 ? (
                                        <div className="text-center text-gray-400 italic text-sm">No items found.</div>
                                    ) : (
                                        <div className="space-y-2">
                                            {order.orderItems.map((item, index) => (
                                                <div key={item._id || index} className="flex justify-between items-center">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-bold text-sm md:text-lg lg:text-xl text-black truncate">{item.name}</p>
                                                        {item.notes && <p className="text-xs md:text-sm text-gray-500 break-words">{item.notes}</p>}
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
                                    {/* No button needed here as orders are complete */}
                                    <span className="w-full text-center text-gray-500 text-sm">Delivered at: {new Date(order.updatedAt).toLocaleTimeString()}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center text-white text-lg">No delivered orders in history.</div>
                )}
            </div>
            {/* Pagination Controls */}
            <div className="w-full flex justify-center items-center py-4 bg-transparent mb-2 absolute left-0 bottom-0 sm:static sm:mb-0" style={{ zIndex: 10 }}>
                <div className="flex items-center space-x-3 text-white text-lg sm:text-xl select-none">
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
