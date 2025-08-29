"use client";
import { useState, useEffect } from "react";
import KitchenContent from "@/components/KitchenManagement/KitchenContent";
import KitchenSidebar from "@/components/KitchenManagement/KitchenSidebar";
import KitchenLayout from "@/components/Layout/KitchenLayout";
import HistoryContent from "@/components/KitchenManagement/HistoryContent";
import { Order, OrderItem } from "@/types/order";
import { io } from "socket.io-client";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

export default function KitchenPage() {
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(4);
    const [totalOrders, setTotalOrders] = useState(0);
    //New state for managing active view
    const [activeView, setActiveView] = useState('Orders');
    const [allOrders, setAllOrders] = useState<Order[]>([]);
    const [doneOrders, setDoneOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filter orders based on the new 'kitchenDone' property
    const inProgressOrders = allOrders.filter(order => !order.kitchenDone);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            // Fetch all orders, regardless of kitchenDone status
            const ordersResponse = await fetch(`${BACKEND_URL}/api/orders`);
            if (!ordersResponse.ok) {
                throw new Error('Failed to fetch orders');
            }
            const ordersData: Order[] = await ordersResponse.json();

            // Separate orders based on the 'kitchenDone' flag
            const inProgress = ordersData.filter(order => !order.kitchenDone);
            const done = ordersData.filter(order => order.kitchenDone);

            // Update states
            setAllOrders(inProgress);
            setDoneOrders(done);

        } catch (err) {
            console.error("Error fetching orders:", err);
            setError("Failed to load orders. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleKitchenDone = async (orderId: string) => {
        // Find the order that was completed
        const completedOrder = allOrders.find(order => order._id === orderId);

        if (completedOrder) {
            try {
                // 1. Make the API call to log the data for analytics
                await fetch(`${BACKEND_URL}/api/analytics/log-completed-items`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        items: completedOrder.orderItems.map(item => ({
                            name: item.name,
                            quantity: item.quantity,
                        })),
                    }),
                });

                // 2. Make the API call to update the kitchenDone status in the database
                await fetch(`${BACKEND_URL}/api/orders/${orderId}/kitchen-done`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ kitchenDone: true }),
                });

                // The local state will now be updated by the socket event
                console.log("Order status updated successfully in the database.");
            } catch (error) {
                console.error("Error processing order as done:", error);
            }
        }
    };

    useEffect(() => {
        fetchOrders();
        const socket = io(BACKEND_URL);

        // Listening for new orders
        socket.on('newOrder', (newOrder: Order) => {
            // Add new order to the list of active orders
            setAllOrders(prevOrders => [{ ...newOrder, kitchenDone: false }, ...prevOrders]);
        });
        
        // Listen for kitchen-specific status updates
        socket.on('kitchenOrderUpdated', (updatedOrder: Order) => {
            // Check if the update is for the kitchen done status
            if (updatedOrder.kitchenDone) {
                // Move the order from the in-progress list to the done list
                setAllOrders(prevOrders => prevOrders.filter(order => order._id !== updatedOrder._id));
                setDoneOrders(prevDone => [...prevDone, updatedOrder]);
            }
        });

        // Other socket listeners (like orderUpdated, orderStatusUpdated) can remain
        // to handle other types of changes, but the new `kitchenOrderUpdated` is key.
        socket.on('orderUpdated', (updatedOrder: Order) => {
            setAllOrders(prevOrders =>
                prevOrders.map(order =>
                    order._id === updatedOrder._id ? { ...order, ...updatedOrder } : order
                )
            );
        });

        socket.on('orderStatusUpdated', (updatedOrder: Order) => {
            setAllOrders(prevOrders =>
                prevOrders.map(order =>
                    order._id === updatedOrder._id ? { ...order, ...updatedOrder } : order
                )
            );
        });


        return () => {
            socket.disconnect();
        };
    }, []);

    // Calculate the total number of pages based on the total orders and page size
    const pageCount = Math.ceil((activeView === 'Orders' ? inProgressOrders.length : doneOrders.length) / pageSize);

    const getPageSize = () => {
        if (typeof window !== 'undefined') {
            const width = window.innerWidth;
            if (width <= 768) return 2;
            if (width <= 1024) return 3;
            return 4;
        }
        return 4;
    };

    useEffect(() => {
        const handleResize = () => {
            const newPageSize = getPageSize();
            setPageSize(newPageSize);
            const newPageCount = Math.ceil(totalOrders / newPageSize);
            if (page >= newPageCount && newPageCount > 0) {
                setPage(newPageCount - 1);
            }
        };

        setPageSize(getPageSize());

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [totalOrders, page]);

    // Update total orders for pagination
    useEffect(() => {
        if (activeView === 'Orders') {
            setTotalOrders(inProgressOrders.length);
        } else {
            setTotalOrders(doneOrders.length);
        }
    }, [activeView, inProgressOrders, doneOrders]);

    const goToPreviousPage = () => {
        setPage(prevPage => Math.max(0, prevPage - 1));
    };

    return (
        <KitchenLayout
            sidebar={
                <KitchenSidebar
                    page={page}
                    pageCount={pageCount}
                    setPage={setPage}
                    goToPreviousPage={goToPreviousPage}
                />
            }
            activeView={activeView}
            setActiveView={setActiveView}
        >
             {loading ? (
                <div className="flex justify-center items-center h-full text-white">Loading orders...</div>
            ) : error ? (
                <div className="flex justify-center items-center h-full text-red-500">{error}</div>
            ) : activeView === 'Orders' ? (
            <KitchenContent
                orders={inProgressOrders}
                handleDone={handleKitchenDone}
                page={page}
                pageSize={pageSize}
                setPage={setPage}
                pageCount={pageCount}
                setTotalOrders={setTotalOrders}
            />
            ) : (
                <HistoryContent
                    orders={doneOrders}
                    page={page}
                    pageSize={pageSize}
                    setPage={setPage}
                    pageCount={pageCount}
                    setTotalOrders={setTotalOrders}
                />
            )}
        </KitchenLayout>
    );
}