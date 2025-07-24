import React, { createContext, useState, useContext, useCallback } from "react";
import { Order, OrderItem, OrderEntry } from '@/types/order';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

interface OrderContextType {
    orderEntries: OrderEntry[];
    activeOrders: Order[];
    addOrderEntry: (name: string, price: number, quantity: number) => void;
    increaseItemQuantity: (name: string, price?: number) => void;
    decreaseItemQuantity: (name: string) => void;
    increaseEntryQuantity: (entryId: string) => void;
    decreaseEntryQuantity: (entryId: string) => void;
    getNewlyAddedItems: () => OrderItem[];
    // --- FIX START: ADD 'orderId: string;' to these return types ---
    getDecreasedOrRemovedItems: () => { name: string; quantityChange: number; price: number; orderId: string; }[];
    getIncreasedConfirmedItems: () => { name: string; quantityChange: number; price: number; orderId: string; }[];
    // --- FIX END ---
    setInitialActiveOrders: (orders: Order[], shouldClearUnconfirmed?: boolean) => void;
    setActiveOrders: (orders: Order[]) => void;
    resetOrder: () => void;
    getTotalQuantityByName: (name: string) => number;
    hasPendingChanges: () => boolean;
    cancelOrderEntry: (entryId: string) => Promise<void>; //New function to cancel an entry
}

const OrderContext = createContext<OrderContextType>({
    orderEntries: [],
    activeOrders: [],
    addOrderEntry: () => {},
    increaseItemQuantity: () => {},
    decreaseItemQuantity: () => {},
    increaseEntryQuantity: () => {},
    decreaseEntryQuantity: () => {},
    getNewlyAddedItems: () => [],
    getDecreasedOrRemovedItems: () => [],
    getIncreasedConfirmedItems: () => [],
    setInitialActiveOrders: () => {},
    setActiveOrders: () => {},
    resetOrder: () => {},
    getTotalQuantityByName: () => 0,
    hasPendingChanges: () => false,
    cancelOrderEntry: async () => {}
});

export const OrderProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
    const [orderEntries, setOrderEntries] = useState<OrderEntry[]>([]);
    const [activeOrders, setActiveOrders] = useState<Order[]>([]);

    console.log("OrderContext: Rendered. Current orderEntries:", orderEntries);
    console.log("OrderContext: Rendered. Current activeOrders:", activeOrders);

    // Helper function to generate unique IDs
    const generateEntryId = useCallback(() => {
        return Date.now().toString() + Math.random().toString(36).substr(2, 9);
    }, []);

    // Helper function for sorting orders by createdAt
    const sortOrdersByCreatedAt = useCallback((orders: Order[]): Order[] => {
        return [...orders].sort((a, b) => {
            const dateA = new Date(a.createdAt);
            const dateB = new Date(b.createdAt);
            return dateA.getTime() - dateB.getTime();
        });
    }, []);

    // This function aggregates orderEntries by name for backward compatibility (e.g., total cart value)
    const getOrderItemsFromEntries = useCallback((): OrderItem[] => {
        const aggregated: {[name: string]: OrderItem} = {};
        orderEntries.forEach(entry => {
            if (aggregated[entry.name]) {
                aggregated[entry.name].quantity += entry.quantity;
            } else {
                aggregated[entry.name] = {
                    _id: entry.isConfirmed ? (activeOrders.find(ao => ao._id === entry.id)?.orderItems[0]?._id || '') : '',
                    name: entry.name,
                    price: entry.price,
                    quantity: entry.quantity
                };
            }
        });
        return Object.values(aggregated);
    }, [orderEntries, activeOrders]);

    // Aggregates confirmed items from activeOrders (for getting total confirmed state for diffing)
    const getAggregatedConfirmedItems = useCallback((): OrderItem[] => {
        const aggregated: {[name: string]: OrderItem} = {};
        activeOrders.forEach(order => {
            const item = order.orderItems[0];
            if (item) {
                if (aggregated[item.name]) {
                    aggregated[item.name].quantity += item.quantity;
                } else {
                    aggregated[item.name] = {...item};
                }
            }
        });
        console.log("OrderContext: getAggregatedConfirmedItems called. Result:", Object.values(aggregated));
        return Object.values(aggregated);
    }, [activeOrders]);

    // addOrderEntry - Always creates a NEW entry (batch)
    const addOrderEntry = useCallback((name: string, price: number, quantity: number) => {
        console.log("OrderContext: addOrderEntry called with:", { name, price, quantity });
        if (quantity <= 0) return;

        const newEntry: OrderEntry = {
            id: generateEntryId(),
            name,
            price,
            quantity,
            timestamp: Date.now(),
            isConfirmed: false
        };
        setOrderEntries(prevEntries => [...prevEntries, newEntry]);
        console.log("OrderContext: addOrderEntry - New entry added:", newEntry);
    }, [generateEntryId]);

    // increaseItemQuantity - Calls addOrderEntry with quantity 1
    const increaseItemQuantity = useCallback((name: string, price?: number) => {
        console.log("OrderContext: increaseItemQuantity called for:", name, "with price:", price);
        if (!price) {
            console.error("Price is required when adding new item via increaseItemQuantity");
            return;
        }
        addOrderEntry(name, price, 1);
    }, [addOrderEntry]);

    // decreaseItemQuantity - Decreases quantity of the LATEST unconfirmed entry, or removes it
    const decreaseItemQuantity = useCallback((name: string) => {
        console.log("OrderContext: decreaseItemQuantity called for:", name);
        setOrderEntries(prevEntries => {
            const lastUnconfirmedIndex = prevEntries.slice().reverse().findIndex(entry => entry.name === name && !entry.isConfirmed);

            if (lastUnconfirmedIndex > -1) {
                const originalIndex = prevEntries.length - 1 - lastUnconfirmedIndex;
                const entryToUpdate = prevEntries[originalIndex];

                if (entryToUpdate.quantity > 1) {
                    const updatedEntries = [...prevEntries];
                    updatedEntries[originalIndex] = {
                        ...entryToUpdate,
                        quantity: entryToUpdate.quantity - 1,
                        timestamp: Date.now()
                    };
                    console.log("OrderContext: decreaseItemQuantity - Decreased quantity of unconfirmed entry:", updatedEntries[originalIndex]);
                    return updatedEntries;
                } else {
                    const updatedEntries = prevEntries.filter((_, index) => index !== originalIndex);
                    console.log("OrderContext: decreaseItemQuantity - Removed unconfirmed entry.");
                    return updatedEntries;
                }
            }
            console.warn(`OrderContext: No unconfirmed entry found to decrease for ${name}.`);
            return prevEntries;
        });
    }, []);

    // increaseEntryQuantity & decreaseEntryQuantity - For specific batch entries
    const increaseEntryQuantity = useCallback((entryId: string) => {
        console.log("OrderContext: increaseEntryQuantity called for:", entryId);
        setOrderEntries(prevEntries => {
            const updatedEntries = prevEntries.map(entry =>
                entry.id === entryId
                    ? {...entry, quantity: entry.quantity + 1, timestamp: Date.now()}
                    : entry
            );
            console.log("OrderContext: increaseEntryQuantity - Updated entries:", updatedEntries);
            return updatedEntries;
        });
    }, []);

    const decreaseEntryQuantity = useCallback((entryId: string) => {
        console.log("OrderContext: decreaseEntryQuantity called for:", entryId);
        setOrderEntries(prevEntries => {
            const updatedEntries = prevEntries.map(entry =>
                entry.id === entryId && entry.quantity > 0
                    ? {...entry, quantity: entry.quantity - 1, timestamp: Date.now()}
                    : entry
            ).filter(entry => entry.quantity > 0);
            console.log("OrderContext: decreaseEntryQuantity - Updated entries:", updatedEntries);
            return updatedEntries;
        });
    }, []);

    // getTotalQuantityByName - Used for overall item count on menu page
    const getTotalQuantityByName = useCallback((name: string): number => {
        return orderEntries
            .filter(entry => entry.name === name)
            .reduce((total, entry) => total + entry.quantity, 0);
    }, [orderEntries]);

    // getNewlyAddedItems - Returns individual UNCONFIRMED OrderEntry objects as OrderItem format for backend POST
    const getNewlyAddedItems = useCallback((): OrderItem[] => {
        const newlyAddedItems: OrderItem[] = orderEntries
            .filter(entry => !entry.isConfirmed)
            .map(entry => ({
                name: entry.name,
                price: entry.price,
                quantity: entry.quantity
            } as OrderItem));
        console.log("OrderContext: getNewlyAddedItems called. Result (individual entries for POST):", newlyAddedItems);
        return newlyAddedItems;
    }, [orderEntries]);

    // getDecreasedOrRemovedItems - Compares current aggregated state vs confirmed aggregated state
    const getDecreasedOrRemovedItems = useCallback((): { name: string; quantityChange: number; price: number; orderId: string; }[] => {
        const confirmedItemsMap = new Map<string, { quantity: number; price: number; orderId: string }>();
        activeOrders.forEach(order => {
            const item = order.orderItems[0];
            if (item) {
                confirmedItemsMap.set(order._id, { quantity: item.quantity, price: item.price, orderId: order._id });
            }
        });

        const changedItems: { name: string; quantityChange: number; price: number; orderId: string; }[] = [];

        confirmedItemsMap.forEach((confirmedItem, orderId) => {
            const currentEntry = orderEntries.find(entry => entry.id === orderId && entry.isConfirmed);

            if (!currentEntry) {
                const originalOrder = activeOrders.find(o => o._id === orderId);
                if (originalOrder && originalOrder.orderItems[0]) {
                    changedItems.push({
                        name: originalOrder.orderItems[0].name,
                        quantityChange: -originalOrder.orderItems[0].quantity,
                        price: originalOrder.orderItems[0].price,
                        orderId: orderId
                    });
                }
            } else if (currentEntry.quantity < confirmedItem.quantity) {
                changedItems.push({
                    name: currentEntry.name,
                    quantityChange: currentEntry.quantity - confirmedItem.quantity,
                    price: currentEntry.price,
                    orderId: orderId
                });
            }
        });
        console.log("OrderContext: getDecreasedOrRemovedItems called. Result:", changedItems);
        return changedItems;
    }, [orderEntries, activeOrders]);

    // getIncreasedConfirmedItems - For patching existing confirmed orders (increases in quantity)
    const getIncreasedConfirmedItems = useCallback((): { name: string; quantityChange: number; price: number; orderId: string; }[] => {
        const confirmedItemsMap = new Map<string, { quantity: number; price: number; }>();
        activeOrders.forEach(order => {
            const item = order.orderItems[0];
            if (item) {
                confirmedItemsMap.set(order._id, { quantity: item.quantity, price: item.price });
            }
        });

        const changedItems: { name: string; quantityChange: number; price: number; orderId: string }[] = [];

        orderEntries.forEach(entry => {
            if (entry.isConfirmed) {
                const confirmed = confirmedItemsMap.get(entry.id);
                if (confirmed && entry.quantity > confirmed.quantity) {
                    const quantityChange = entry.quantity - confirmed.quantity;
                    changedItems.push({
                        name: entry.name,
                        quantityChange: quantityChange,
                        price: entry.price,
                        orderId: entry.id
                    });
                }
            }
        });
        console.log("OrderContext: getIncreasedConfirmedItems called. Result:", changedItems);
        return changedItems;
    }, [orderEntries, activeOrders]);


    // setInitialActiveOrders to handle full synchronization
    const setInitialActiveOrders = useCallback((fetchedOrders: Order[], shouldClearUnconfirmed: boolean = false) => {
        console.log("OrderContext: setInitialActiveOrders called with fetchedOrders:", fetchedOrders, "shouldClearUnconfirmed:", shouldClearUnconfirmed);

        const sortedFetchedOrders = sortOrdersByCreatedAt(fetchedOrders);
        setActiveOrders(sortedFetchedOrders);
        console.log("OrderContext: setInitialActiveOrders - ActiveOrders after sorting:", sortedFetchedOrders);

        setOrderEntries(prevOrderEntries => {
            const confirmedEntriesFromBackend: OrderEntry[] = [];
            const backendConfirmedOrderItemIds = new Set<string>();

            fetchedOrders.forEach(order => {
                // Re-introduced: Access the single item in the order as per your confirmed model
                const item = order.orderItems[0]; 
                if (item && item._id) { // Ensure item and item._id exist
                    confirmedEntriesFromBackend.push({
                        id: item._id, // CRITICAL FIX: Use item._id for the OrderEntry's ID
                        name: item.name,
                        price: item.price,
                        quantity: item.quantity,
                        timestamp: new Date(order.createdAt).getTime(), // Use order's createdAt for consistency
                        isConfirmed: true
                    });
                    backendConfirmedOrderItemIds.add(item._id); // Add item's _id to the set
                }
            });
            console.log("OrderContext: setInitialActiveOrders - Confirmed entries from backend (flattened):", confirmedEntriesFromBackend);

            if (shouldClearUnconfirmed) {
                console.log("OrderContext: setInitialActiveOrders - Performing full clear of unconfirmed entries due to `shouldClearUnconfirmed` flag.");
                return confirmedEntriesFromBackend;
            }

            const unconfirmedEntriesToRetain = prevOrderEntries.filter(entry =>
                !entry.isConfirmed && !backendConfirmedOrderItemIds.has(entry.id)
            );
            console.log("OrderContext: setInitialActiveOrders - Retaining unconfirmed entries:", unconfirmedEntriesToRetain);

            const finalReconciledEntries = [
                ...confirmedEntriesFromBackend,
                ...unconfirmedEntriesToRetain
            ];
            console.log("OrderContext: setInitialActiveOrders - Final reconciled orderEntries (after sync):", finalReconciledEntries);
            return finalReconciledEntries;
        });
    }, [sortOrdersByCreatedAt]);

    const setActiveOrdersOnly = useCallback((orders: Order[]) => {
        console.log("OrderContext: setActiveOrdersOnly called with orders:", orders);
        const sortedOrders = sortOrdersByCreatedAt(orders);
        setActiveOrders(sortedOrders);
        console.log("OrderContext: setActiveOrdersOnly - ActiveOrders after sorting:", sortedOrders);
    }, [sortOrdersByCreatedAt]);

    const resetOrder = useCallback(() => {
        console.log("OrderContext: resetOrder called.");
        setOrderEntries([]);
        setActiveOrders([]);
    }, []);

    // hasPendingChanges - Compares aggregated quantities of current vs confirmed states.
    const hasPendingChanges = useCallback((): boolean => {
        const currentAggregated: { [name: string]: { quantity: number; price: number; } } = {};
        orderEntries.forEach(entry => {
            if (currentAggregated[entry.name]) {
                currentAggregated[entry.name].quantity += entry.quantity;
            } else {
                currentAggregated[entry.name] = { quantity: entry.quantity, price: entry.price };
            }
        });

        const confirmedAggregated: { [name: string]: { quantity: number; price: number; } } = {};
        activeOrders.forEach(order => {
            const item = order.orderItems[0];
            if (item) {
                if (confirmedAggregated[item.name]) {
                    confirmedAggregated[item.name].quantity += item.quantity;
                } else {
                    confirmedAggregated[item.name] = { quantity: item.quantity, price: item.price };
                }
            }
        });

        const allItemNames = new Set([...Object.keys(currentAggregated), ...Object.keys(confirmedAggregated)]);

        for (const name of allItemNames) {
            const currentQty = currentAggregated[name]?.quantity || 0;
            const confirmedQty = confirmedAggregated[name]?.quantity || 0;

            if (currentQty !== confirmedQty) {
                console.log(`OrderContext: hasPendingChanges - Detected quantity mismatch for ${name}: Current=${currentQty}, Confirmed=${confirmedQty}`);
                return true;
            }
        }

        console.log("OrderContext: hasPendingChanges - No quantity mismatches detected between current and confirmed states.");
        return false;
    }, [orderEntries, activeOrders]);

    const cancelOrderEntry = useCallback(async (entryId: string) => {
        console.log("OrderContext: cancelOrderEntry called for entryId:", entryId);

        const entryToCancel = orderEntries.find(entry => entry.id === entryId);

        if (!entryToCancel) {
            console.warn("OrderContext: Attempted to cancel non-existent entry:", entryId);
            return;
        }

        if (!entryToCancel.isConfirmed) {
            // If it's an unconfirmed entry, just remove it from the local state
            setOrderEntries(prevEntries => prevEntries.filter(entry => entry.id !== entryId));
            console.log("OrderContext: Unconfirmed entry removed locally:", entryToCancel.name);
            return;
        }

        // If it's a confirmed entry, send a PATCH request to the backend to cancel it
        try {
            const storedTableNumber = localStorage.getItem('tableNumber');
            if (!storedTableNumber) {
                console.error("OrderContext: Table number not found for cancelling confirmed order.");
                throw new Error("Table number not found.");
            }

            // Find the actual Order._id associated with this item._id (entryId)
            const orderToPatch = activeOrders.find(order => order.orderItems[0]?._id === entryId);

            if (!orderToPatch) {
                console.error("OrderContext: Could not find parent order for item to cancel:", entryId);
                throw new Error("Parent order not found for cancellation.");
            }

            // The backend expects orderItems to be an array containing the single item
            // with quantity 0, or an empty array to signal cancellation.
            // Sending an empty array here will trigger the backend logic to set quantity to 0 and status to 'Cancelled'.
            const patchData = {
                orderItems: [], // Signal to backend to set quantity to 0 and status to 'Cancelled'
                totalPrice: 0, // Set total price to 0
                status: 'Cancelled' // Explicitly set status to Cancelled (backend will handle history)
            };

            // CRITICAL FIX: Use orderToPatch._id for the PATCH request URL
            const response = await fetch(`${BACKEND_URL}/api/orders/${orderToPatch._id}`, { 
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(patchData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Failed to cancel order ${orderToPatch._id}: ${errorData.message || response.statusText}`);
            }

            const updatedOrder = await response.json();
            console.log("OrderContext: Confirmed order cancelled via backend PATCH:", updatedOrder);

            // After successful cancellation on backend, remove it from local state immediately.
            // The AddEditContent component's useEffect that fetches active orders will also
            // re-sync, but this provides immediate UI feedback.
            setOrderEntries(prevEntries => prevEntries.filter(entry => entry.id !== entryId));
            console.log("OrderContext: Confirmed entry removed locally after backend cancellation.");

        } catch (error) {
            console.error("OrderContext: Error cancelling confirmed order:", error);
            // Re-throw to be caught by the calling component (AddEditContent)
            throw error; 
        }
    }, [orderEntries, activeOrders]); // Added activeOrders to dependencies

    return (
        <OrderContext.Provider value={{
            orderEntries,
            activeOrders,
            addOrderEntry,
            increaseItemQuantity,
            decreaseItemQuantity,
            increaseEntryQuantity,
            decreaseEntryQuantity,
            getNewlyAddedItems,
            getDecreasedOrRemovedItems,
            getIncreasedConfirmedItems,
            setInitialActiveOrders,
            setActiveOrders: setActiveOrdersOnly,
            resetOrder,
            getTotalQuantityByName,
            hasPendingChanges,
            cancelOrderEntry
        }}>
            {children}
        </OrderContext.Provider>
    );
};

export const useOrder = () => {
    const context = useContext(OrderContext);
    return {
        ...context,
        orderItems: context.orderEntries.reduce((acc: OrderItem[], entry) => {
            const existingItem = acc.find(item => item.name === entry.name);
            if (existingItem) {
                existingItem.quantity += entry.quantity;
            } else {
                const confirmedOrder = context.activeOrders.find(order => order._id === entry.id);
                acc.push({
                    _id: confirmedOrder ? confirmedOrder._id : '',
                    name: entry.name,
                    price: entry.price,
                    quantity: entry.quantity
                });
            }
            return acc;
        }, [])
    };
};
