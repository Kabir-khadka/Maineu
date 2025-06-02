import React, { createContext, useState, useContext, useCallback} from "react";
import {Order, OrderItem} from '@/types/order';


interface OrderContextType {
    orderItems: OrderItem[]; // Current state of the customer's cart
    activeOrders: Order[]; // All active orders loaded from the backend for this table
    addOrderItem: (item: OrderItem) => void;
    increaseItemQuantity: (name: string) => void;
    decreaseItemQuantity: (name: string) => void;
    getNewlyAddedItems: () => OrderItem[];
    getDecreasedOrRemovedItems: () => { name: string; quantityChange: number; price: number; }[];
    setInitialActiveOrders: (orders: Order[]) => void;
    setActiveOrders: (orders: Order[]) => void;
    resetOrder: () => void;
}

const OrderContext = createContext<OrderContextType>({
    orderItems: [],
    activeOrders: [],
    addOrderItem: () => {},
    increaseItemQuantity: () => {},
    decreaseItemQuantity: () => {},
    getNewlyAddedItems: () => [],
    getDecreasedOrRemovedItems: () => [],
    setInitialActiveOrders: () => {},
    setActiveOrders: () => {},
    resetOrder: () => {}
});

export const OrderProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
    const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
    const [activeOrders, setActiveOrders] = useState<Order[]>([]);

    console.log("OrderContext: Rendered. Current orderItems:", orderItems);
    console.log("OrderContext: Rendered. Current activeOrders:", activeOrders);

    // --- NEW HELPER FUNCTION FOR SORTING ---
    const sortOrdersByCreatedAt = useCallback((orders: Order[]): Order[] => {
        console.log("sortOrdersByCreatedAt: Incoming orders (before sort):", orders.map(o => o.createdAt));
        // Create a shallow copy to avoid mutating the original array
        return [...orders].sort((a, b) => {
            // Convert createdAt strings to Date objects for accurate comparison
            const dateA = new Date(a.createdAt);
            const dateB = new Date(b.createdAt);
            const comparisonResult = dateA.getTime() - dateB.getTime(); // Oldest first
            // Sort in ascending order (oldest first)
            return comparisonResult;
        });
    }, []);
    // --- END NEW HELPER FUNCTION ---

    const getAggregatedConfirmedItems = useCallback((): OrderItem[] => {
        const aggregated: {[name: string]: OrderItem} = {};
        activeOrders.forEach(order => {
            order.orderItems.forEach(item => {
                if (aggregated[item.name]) {
                    aggregated[item.name].quantity += item.quantity;
                } else {
                    aggregated[item.name] = {...item};
                }
            });
        });
        console.log("OrderContext: getAggregatedConfirmedItems called. Result:", Object.values(aggregated));
        return Object.values(aggregated);
    }, [activeOrders]);

    const addOrderItem = useCallback((item: OrderItem) => {
        console.log("OrderContext: addOrderItem called with item:", item);
        setOrderItems(prevItems => {
            console.log("OrderContext: addOrderItem - prevItems before update:", prevItems);
            const existingIndex = prevItems.findIndex(i => i.name === item.name);
            let updatedItems;

            if (item.quantity === 0) {
                updatedItems = prevItems.filter(i => i.name !== item.name);
                console.log(`OrderContext: addOrderItem - Removing item ${item.name}. New state:`, updatedItems);
            } else if (existingIndex > -1) {
                updatedItems = [...prevItems];
                updatedItems[existingIndex] = item; // Update the whole item
                console.log(`OrderContext: addOrderItem - Updating item ${item.name}. New state:`, updatedItems);
            } else {
                updatedItems = [...prevItems, item];
                console.log(`OrderContext: addOrderItem - Adding new item ${item.name}. New state:`, updatedItems);
            }
            return updatedItems;
        });
    }, []);

    const increaseItemQuantity = useCallback((name: string) => {
        console.log("OrderContext: increaseItemQuantity called for:", name);
        setOrderItems(prevItems => {
            const updatedItems = prevItems.map(item =>
                item.name === name
                ? {...item, quantity: item.quantity + 1}
                : item
            );
            console.log("OrderContext: increaseItemQuantity - New state:", updatedItems);
            return updatedItems;
        });
    }, []);

    const decreaseItemQuantity = useCallback((name: string) => {
        console.log("OrderContext: decreaseItemQuantity called for:", name);
        setOrderItems(prevItems => {
            const updatedItems = prevItems.map(item =>
                item.name === name && item.quantity > 0
                ? {...item, quantity: item.quantity - 1}
                : item
            ).filter(item => item.quantity > 0); // Filter out items with quantity 0
            console.log("OrderContext: decreaseItemQuantity - New state:", updatedItems);
            return updatedItems;
        });
    }, []);

    const getNewlyAddedItems = useCallback((): OrderItem[] => {
        const currentConfirmedState = getAggregatedConfirmedItems();
        const newlyAdded: OrderItem[] = [];
        orderItems.forEach(currentItem => {
            const confirmedItem = currentConfirmedState.find(c => c.name === currentItem.name);
            if (!confirmedItem) {
                newlyAdded.push(currentItem);
            } else if (currentItem.quantity > confirmedItem.quantity) {
                newlyAdded.push({
                    ...currentItem,
                    quantity: currentItem.quantity - confirmedItem.quantity
                });
            }
        });
        console.log("OrderContext: getNewlyAddedItems called. Result:", newlyAdded);
        return newlyAdded;
    }, [orderItems, activeOrders, getAggregatedConfirmedItems]);

    const getDecreasedOrRemovedItems = useCallback((): { name: string; quantityChange: number; price: number; }[] => {
        const currentConfirmedState = getAggregatedConfirmedItems();
        const changedItems: { name: string; quantityChange: number; price: number; }[] = [];

        currentConfirmedState.forEach(confirmedItem => {
            const currentItem = orderItems.find(c => c.name === confirmedItem.name);
            if (!currentItem) {
                changedItems.push({ name: confirmedItem.name, quantityChange: -confirmedItem.quantity, price: confirmedItem.price });
            } else if (currentItem.quantity < confirmedItem.quantity) {
                changedItems.push({ name: confirmedItem.name, quantityChange: currentItem.quantity - confirmedItem.quantity, price: currentItem.price });
            }
        });
        console.log("OrderContext: getDecreasedOrRemovedItems called. Result:", changedItems);
        return changedItems;
    }, [orderItems, activeOrders, getAggregatedConfirmedItems]);

    const setInitialActiveOrders = useCallback((fetchedOrders: Order[]) => {
        console.log("OrderContext: setInitialActiveOrders called with fetchedOrders:", fetchedOrders);
        // --- APPLY SORTING HERE ---
        const sortedFetchedOrders = sortOrdersByCreatedAt(fetchedOrders);
        setActiveOrders(sortedFetchedOrders); // This correctly sets the confirmed orders state.
        console.log("OrderContext: setInitialActiveOrders - ActiveOrders after sorting:", sortedFetchedOrders);
        // --- END APPLY SORTING ---

        setOrderItems(prevOrderItems => { // prevOrderItems is the cart BEFORE this sync
            console.log("OrderContext: setInitialActiveOrders - prevOrderItems (local cart before sync):", prevOrderItems);

            const aggregatedConfirmedItems: {[name: string]: OrderItem} = {};
            fetchedOrders.forEach(order => { // Use original fetchedOrders for aggregation logic, not the sorted one
                order.orderItems.forEach(item => {
                    if (aggregatedConfirmedItems[item.name]) {
                        aggregatedConfirmedItems[item.name].quantity += item.quantity;
                    } else {
                        aggregatedConfirmedItems[item.name] = { ...item };
                    }
                });
            });
            console.log("OrderContext: setInitialActiveOrders - Aggregated items from fetchedOrders (baseline):", aggregatedConfirmedItems);

            const finalOrderItemsMap: {[name: string]: OrderItem} = { ...aggregatedConfirmedItems };

            prevOrderItems.forEach(prevItem => {
                const confirmedQuantity = aggregatedConfirmedItems[prevItem.name]?.quantity || 0;
                const additionalQuantity = prevItem.quantity - confirmedQuantity;

                if (additionalQuantity > 0) {
                    if (finalOrderItemsMap[prevItem.name]) {
                        finalOrderItemsMap[prevItem.name].quantity += additionalQuantity;
                    } else {
                        finalOrderItemsMap[prevItem.name] = { ...prevItem, quantity: additionalQuantity };
                    }
                }
            });

            const newOrderItems = Object.values(finalOrderItemsMap).filter(item => item.quantity > 0);
            console.log("OrderContext: setInitialActiveOrders - Final merged orderItems for display:", newOrderItems);
            return newOrderItems;
        });
    }, [sortOrdersByCreatedAt]); // Added sortOrdersByCreatedAt to dependency array

    // <--- NEW FUNCTION ADDED HERE
    const setActiveOrdersOnly = useCallback((orders: Order[]) => {
        console.log("OrderContext: setActiveOrdersOnly called with orders:", orders);
        // --- APPLY SORTING HERE ---
        const sortedOrders = sortOrdersByCreatedAt(orders);
        setActiveOrders(sortedOrders);
        console.log("OrderContext: setActiveOrdersOnly - ActiveOrders after sorting:", sortedOrders);
        // --- END APPLY SORTING ---
    }, [sortOrdersByCreatedAt]); // Added sortOrdersByCreatedAt to dependency array

    const resetOrder = useCallback(() => {
        console.log("OrderContext: resetOrder called.");
        setOrderItems([]);
        setActiveOrders([]);
    }, []);

    return (
        <OrderContext.Provider value={{
            orderItems,
            activeOrders,
            addOrderItem,
            increaseItemQuantity,
            decreaseItemQuantity,
            getNewlyAddedItems,
            getDecreasedOrRemovedItems,
            setInitialActiveOrders,
            setActiveOrders: setActiveOrdersOnly,
            resetOrder
            }}>
            {children}
        </OrderContext.Provider>
    );
};

export const useOrder = () => useContext(OrderContext);