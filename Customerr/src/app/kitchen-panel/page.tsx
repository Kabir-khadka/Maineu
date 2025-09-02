"use client";
import { useState, useEffect, useRef } from "react";
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
    const [activeView, setActiveView] = useState('Orders');
    const [allOrders, setAllOrders] = useState<Order[]>([]);
    const [doneOrders, setDoneOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Just track the order IDs that were marked as done (for undo)
    const [doneOrderIds, setDoneOrderIds] = useState<string[]>([]);

    const inProgressOrders = allOrders.filter(order => !order.kitchenDone);
    
    const isInitialLoad = useRef(true);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const ordersResponse = await fetch(`${BACKEND_URL}/api/orders`);
            if (!ordersResponse.ok) {
                throw new Error('Failed to fetch orders');
            }
            const ordersData: Order[] = await ordersResponse.json();
            const inProgress = ordersData.filter(order => !order.kitchenDone);
            const done = ordersData.filter(order => order.kitchenDone);
            
            setAllOrders(inProgress);
            setDoneOrders(done);
            // Clear the done tracking when fetching fresh data
            setDoneOrderIds([]);
            
        } catch (err) {
            console.error("Error fetching orders:", err);
            setError("Failed to load orders. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleKitchenDone = async (orderId: string) => {
        const completedOrder = allOrders.find(order => order._id === orderId);

        if (completedOrder) {
            // Track this order ID for undo
            setDoneOrderIds(prev => [...prev, orderId]);
            
            // Move order from allOrders to doneOrders
            setAllOrders(prev => prev.filter(order => order._id !== orderId));
            setDoneOrders(prev => [...prev, { ...completedOrder, kitchenDone: true }]);

            try {
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

                await fetch(`${BACKEND_URL}/api/orders/${orderId}/kitchen-done`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ kitchenDone: true }),
                });

                console.log("Order status updated successfully in the database.");
            } catch (error) {
                console.error("Error processing order as done:", error);
                // Rollback on error
                setAllOrders(prev => [...prev, completedOrder]);
                setDoneOrders(prev => prev.filter(order => order._id !== orderId));
                setDoneOrderIds(prev => prev.filter(id => id !== orderId));
            }
        }
    };

    const handleUndo = () => {
        if (doneOrderIds.length > 0) {
            // Get the last order ID that was marked as done
            const lastDoneOrderId = doneOrderIds[doneOrderIds.length - 1];
            
            // Find that order in doneOrders
            const orderToUndo = doneOrders.find(order => order._id === lastDoneOrderId);
            
            if (orderToUndo) {
                // Move it back to allOrders and remove from doneOrders
                setDoneOrders(prev => prev.filter(order => order._id !== lastDoneOrderId));
                setAllOrders(prev => [{ ...orderToUndo, kitchenDone: false }, ...prev]);
                
                // Remove this ID from our tracking
                setDoneOrderIds(prev => prev.slice(0, -1));
            }
        }
    };

    useEffect(() => {
        if (isInitialLoad.current) {
            fetchOrders();
            isInitialLoad.current = false;
        }

        const socket = io(BACKEND_URL);
        
        socket.on('newOrder', (newOrder) => {
            // Clear undo tracking when new orders arrive
            setDoneOrderIds([]);

            setAllOrders(prevOrders => [{ ...newOrder, kitchenDone: false }, ...prevOrders]);
        });
        
        socket.on('kitchenOrderUpdated', (updatedOrder) => {
            setAllOrders(prevAll => prevAll.filter(order => order._id !== updatedOrder._id));
            setDoneOrders(prevDone => {
                const isAlreadyDone = prevDone.some(order => order._id === updatedOrder._id);
                if (!isAlreadyDone) {
                    return [...prevDone, updatedOrder];
                }
                return prevDone;
            });
        });

        socket.on('orderUpdated', (updatedOrder) => {
            setAllOrders(prevOrders => prevOrders.map(order =>
                order._id === updatedOrder._id ? { ...order, ...updatedOrder } : order
            ));
        });

        socket.on('orderStatusUpdated', (updatedOrder) => {
            setAllOrders(prevOrders => prevOrders.map(order =>
                order._id === updatedOrder._id ? { ...order, ...updatedOrder } : order
            ));
        });

        return () => {
            socket.disconnect();
        };
    }, []);

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
                    handleUndo={handleUndo}
                    canUndo={doneOrderIds.length > 0}
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