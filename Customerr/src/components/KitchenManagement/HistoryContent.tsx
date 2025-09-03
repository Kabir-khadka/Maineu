"use client";
import React, { useState, useEffect, Dispatch, SetStateAction } from "react";
import { Order, OrderItem } from "@/types/order";
import { io } from "socket.io-client";
import KitchenReusableButton from "../ReusableComponents/KitchenReusableButton";

interface HistoryContentProps {
    orders: Order[] | undefined;
    page: number;
    pageSize: number;
    setTotalOrders: Dispatch<SetStateAction<number>>;
    setPage: Dispatch<React.SetStateAction<number>>;
    pageCount: number;
}

export default function HistoryContent({ orders, page, pageSize, setTotalOrders, setPage, pageCount }: HistoryContentProps) {
    const [error, setError] = useState<string | null>(null);

    // Ensure orders is always an array
    const safeOrders = orders || [];

    // Adding a guard clause here
    if (!Array.isArray(safeOrders) || safeOrders.length === 0) {
        return <div className="flex justify-center items-center h-full text-white">No delivered orders in history.</div>;
    }

    const paginatedOrders = safeOrders.slice(page * pageSize, (page + 1) * pageSize);

    if (error) {
        return <div className="flex justify-center items-center h-full text-red-500">{error}</div>;
    }

    return (
        <div className="flex flex-col h-full sm:p-4 md:p-2">
            <div className="flex-1 flex items-center justify-center mb-[-5rem] p-1 sm:p-4 min-h-0">
                {paginatedOrders.length > 0 ? (
                    <div className={`grid gap-1 sm:gap-4 w-full max-w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4`}>
                        {paginatedOrders.map((order: Order, orderIndex: number) => (
                            <div key={order._id || `order-${orderIndex}`} className="bg-white rounded-lg shadow-md flex flex-col justify-between w-full min-h-[400px] sm:min-h-[500px]">
                                <div className="bg-green-300 rounded-t-lg p-2 text-black flex justify-between items-center flex-shrink-0">
                                    {/* Now correctly displaying the table number from the full Order object */}
                                    <span className="font-bold text-sm md:text-base lg:text-lg">Table {order.tableNumber}</span>
                                    {/* Now correctly displaying the creation time from the full Order object */}
                                    <span className="text-xs md:text-sm">{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <div className="p-3 md:p-4 flex-grow overflow-y-auto min-h-0">
                                    {!order.orderItems || order.orderItems.length === 0 ? (
                                        <div className="text-center text-gray-400 italic text-sm">No items found.</div>
                                    ) : (
                                        <div className="space-y-2">
                                            {order.orderItems.map((item, index) => (
                                                <div key={item._id || `item-${index}`} className="flex justify-between items-center">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-bold text-sm md:text-lg lg:text-xl text-black truncate">{item.name || 'Unknown Item'}</p>
                                                        {item.notes && <p className="text-xs md:text-sm text-gray-500 break-words">{item.notes}</p>}
                                                    </div>
                                                    <div className="flex items-center space-x-1 md:space-x-2 text-black flex-shrink-0 ml-2">
                                                        <span className="text-sm md:text-xl font-bold">X</span>
                                                        <span className="text-lg md:text-2xl lg:text-3xl font-bold">{item.quantity || 0}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="p-2 md:p-3 flex-shrink-0">
                                    <span className="w-full text-center text-gray-500 text-sm">
                                        {/* Now correctly displaying the updated at time from the full Order object */}
                                        Delivered at: {order.updatedAt ? new Date(order.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Unknown time'}
                                    </span>
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