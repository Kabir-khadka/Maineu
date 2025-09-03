"use client";
import React, { useState, useEffect, Dispatch, SetStateAction } from "react";
import io from 'socket.io-client';
import { Order, OrderItem } from "@/types/order";


interface KitchenContentProps {
    orders: Order[];
    handleDone: (orderId: string) => void
    page: number;
    pageSize: number;
    setTotalOrders: Dispatch<SetStateAction<number>>;
    setPage: React.Dispatch<React.SetStateAction<number>>;
    pageCount: number;
}

export default function KitchenContent({ orders, handleDone, page, pageSize, setTotalOrders, setPage, pageCount }: KitchenContentProps) {
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

    return (
        <div className="flex flex-col h-full sm:p-4 md:p-2">
            

             {/* Updated Floating Message  */}
            {successMessage && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-xs sm:max-w-md md:max-w-lg bg-green-500 text-white px-4 py-3 rounded shadow-lg text-center" role="alert">
                    <strong className='font-bold'>Success!</strong>
                    <span className='block sm:inline ml-2'>{successMessage}</span>
                </div>
            )}
            {error && (
                <div className='fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-xs sm:max-w-md md:max-w-lg bg-red-500 text-white px-4 py-3 rounded shadow-lg text-center' role="alert">
                    <strong className='font-bold'>Error!</strong>
                    <span className='block sm:inline ml-2'>{error}</span>
                </div>
            )}

            <div className="flex-1 flex items-center justify-center mb-[-5rem] p-1 sm:p-4 min-h-0">
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
                                        className="w-full py-2 bg-green-500 text-white rounded-lg font-bold text-sm md:text-lg hover:bg-green-600 transition-colors"    
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