import React, { createContext, useState, useContext, useCallback } from "react";
import { Order, OrderItem, OrderEntry } from '@/types/order';

interface OrderContextType {
    orderEntries: OrderEntry[];
    activeOrders: Order[];
    addOrderEntry: (name: string, price: number, quantity: number) => void;
    increaseItemQuantity: (name: string, price?: number) => void;
    decreaseItemQuantity: (name: string) => void;
    increaseEntryQuantity: (entryId: string) => void;
    decreaseEntryQuantity: (entryId: string) => void;
    getNewlyAddedItems: () => OrderItem[];
    getDecreasedOrRemovedItems: () => { name: string; quantityChange: number; price: number; }[];
    getIncreasedConfirmedItems: () => { name: string; quantityChange: number; price: number }[]; // <-- Added this!
    setInitialActiveOrders: (orders: Order[]) => void;
    setActiveOrders: (orders: Order[]) => void;
    resetOrder: () => void;
    getTotalQuantityByName: (name: string) => number;
    hasPendingChanges: () => boolean;
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
    getIncreasedConfirmedItems: () => [], // <-- default
    setInitialActiveOrders: () => {},
    setActiveOrders: () => {},
    resetOrder: () => {},
    getTotalQuantityByName: () => 0,
    hasPendingChanges: () => false
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
                    name: entry.name,
                    price: entry.price,
                    quantity: entry.quantity
                };
            }
        });
        return Object.values(aggregated);
    }, [orderEntries]);

    // Aggregates confirmed items from activeOrders (for getting total confirmed state for diffing)
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

    // addOrderEntry - Always creates a NEW entry (batch)
    const addOrderEntry = useCallback((name: string, price: number, quantity: number) => {
        console.log("OrderContext: addOrderEntry called with:", { name, price, quantity });
        if (quantity <= 0) return;

        const newEntry: OrderEntry = {
            id: generateEntryId(), // Always a new unique ID for each batch
            name,
            price,
            quantity,
            timestamp: Date.now(),
            isConfirmed: false // New items are initially unconfirmed
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

    // getNewlyAddedItems - Returns individual UNCONFIRMED OrderEntry objects
    const getNewlyAddedItems = useCallback((): OrderItem[] => {
        const newlyAddedItems: OrderItem[] = orderEntries
            .filter(entry => !entry.isConfirmed)
            .map(entry => ({
                name: entry.name,
                price: entry.price,
                quantity: entry.quantity
            }));
        console.log("OrderContext: getNewlyAddedItems called. Result (individual entries):", newlyAddedItems);
        return newlyAddedItems;
    }, [orderEntries]);

    // getDecreasedOrRemovedItems - Compares current aggregated state vs confirmed aggregated state
    const getDecreasedOrRemovedItems = useCallback((): { name: string; quantityChange: number; price: number; }[] => {
        const currentAggregatedItems = getOrderItemsFromEntries();
        const currentConfirmedState = getAggregatedConfirmedItems();

        const changedItems: { name: string; quantityChange: number; price: number; }[] = [];

        currentConfirmedState.forEach(confirmedItem => {
            const currentItem = currentAggregatedItems.find(c => c.name === confirmedItem.name);
            if (!currentItem) {
                changedItems.push({ name: confirmedItem.name, quantityChange: -confirmedItem.quantity, price: confirmedItem.price });
            } else if (currentItem.quantity < confirmedItem.quantity) {
                changedItems.push({ name: confirmedItem.name, quantityChange: currentItem.quantity - confirmedItem.quantity, price: currentItem.price });
            }
        });
        console.log("OrderContext: getDecreasedOrRemovedItems called. Result:", changedItems);
        return changedItems;
    }, [getOrderItemsFromEntries, getAggregatedConfirmedItems]);

    // --- NEW FUNCTION: getIncreasedConfirmedItems ---
    const getIncreasedConfirmedItems = useCallback((): { name: string; quantityChange: number; price: number }[] => {
        const currentAggregatedItems = getOrderItemsFromEntries();
        const currentConfirmedState = getAggregatedConfirmedItems();

        const changedItems: { name: string; quantityChange: number; price: number }[] = [];

        currentAggregatedItems.forEach(item => {
            const confirmed = currentConfirmedState.find(c => c.name === item.name);
            // If the item exists in the confirmed state and its current quantity is greater
            // OR if the item is entirely new (not in confirmed state)
            if (!confirmed || item.quantity > confirmed.quantity) {
                const quantityChange = item.quantity - (confirmed?.quantity || 0);
                // Only add if there's an actual increase
                if (quantityChange > 0) {
                    changedItems.push({
                        name: item.name,
                        quantityChange: quantityChange,
                        price: item.price
                    });
                }
            }
        });
        console.log("OrderContext: getIncreasedConfirmedItems called. Result:", changedItems);
        return changedItems;
    }, [getOrderItemsFromEntries, getAggregatedConfirmedItems]);


    // setInitialActiveOrders - Initializes activeOrders and reconciles orderEntries
    const setInitialActiveOrders = useCallback((fetchedOrders: Order[]) => {
        console.log("OrderContext: setInitialActiveOrders called with fetchedOrders:", fetchedOrders);
        const sortedFetchedOrders = sortOrdersByCreatedAt(fetchedOrders);
        setActiveOrders(sortedFetchedOrders);
        console.log("OrderContext: setInitialActiveOrders - ActiveOrders after sorting:", sortedFetchedOrders);

        setOrderEntries(prevOrderEntries => {
            const confirmedEntries: OrderEntry[] = [];
            const confirmedItemNames: Set<string> = new Set(); // To track names of items that are now confirmed

            // Process fetched (confirmed) orders first
            fetchedOrders.forEach(order => {
                order.orderItems.forEach(item => {
                    const newConfirmedEntry: OrderEntry = {
                        id: item._id || generateEntryId(), // Use backend _id if available, fallback to new ID
                        name: item.name,
                        price: item.price,
                        quantity: item.quantity,
                        timestamp: new Date(order.createdAt).getTime(), // Use order's creation time
                        isConfirmed: true
                    };
                    confirmedEntries.push(newConfirmedEntry);
                    confirmedItemNames.add(item.name); // Mark this item name as confirmed
                });
            });

            // Filter out unconfirmed items that now have a confirmed counterpart
            // Only keep unconfirmed items whose name is NOT in the confirmedItemNames set.
            const remainingUnconfirmedItems = prevOrderEntries.filter(entry =>
                !entry.isConfirmed && !confirmedItemNames.has(entry.name)
            );
            console.log("OrderContext: setInitialActiveOrders - Retaining *remaining* unconfirmed items:", remainingUnconfirmedItems);

            // Combine confirmed entries from backend with remaining unconfirmed entries
            const finalReconciledEntries = [...confirmedEntries, ...remainingUnconfirmedItems];
            console.log("OrderContext: setInitialActiveOrders - Final reconciled orderEntries (after sync):", finalReconciledEntries);
            return finalReconciledEntries;
        });
    }, [sortOrdersByCreatedAt, generateEntryId]);


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

    // New useCallback function for checking pending changes
    const hasPendingChanges = useCallback((): boolean => {
    // Aggregate current orderEntries for an overall view of desired state.
    const currentAggregated: { [name: string]: { quantity: number; price: number; } } = {};
    orderEntries.forEach(entry => {
        if (currentAggregated[entry.name]) {
            currentAggregated[entry.name].quantity += entry.quantity;
        } else {
            currentAggregated[entry.name] = { quantity: entry.quantity, price: entry.price };
        }
    });

    // Aggregate activeOrders (confirmed state) for comparison.
    const confirmedAggregated: { [name: string]: { quantity: number; price: number; } } = {};
    activeOrders.forEach(order => {
        order.orderItems.forEach(item => {
            if (confirmedAggregated[item.name]) {
                confirmedAggregated[item.name].quantity += item.quantity;
            } else {
                confirmedAggregated[item.name] = { quantity: item.quantity, price: item.price };
            }
        });
    });

    // Check for *any* discrepancy in quantities between current and confirmed states
    // This covers both increases AND decreases on existing confirmed items.
    const allItemNames = new Set([...Object.keys(currentAggregated), ...Object.keys(confirmedAggregated)]);

    for (const name of allItemNames) {
        const currentQty = currentAggregated[name]?.quantity || 0;
        const confirmedQty = confirmedAggregated[name]?.quantity || 0;

        if (currentQty !== confirmedQty) {
            console.log(`OrderContext: hasPendingChanges - Detected quantity mismatch for ${name}: Current=${currentQty}, Confirmed=${confirmedQty}`);
            return true; // Found a difference, so there are pending changes
        }
    }

    console.log("OrderContext: hasPendingChanges - No quantity mismatches detected between current and confirmed states.");
    return false; // If no discrepancies found after this comprehensive check.
}, [orderEntries, activeOrders]);

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
            getIncreasedConfirmedItems, // <-- Exported here!
            setInitialActiveOrders,
            setActiveOrders: setActiveOrdersOnly,
            resetOrder,
            getTotalQuantityByName,
            hasPendingChanges,
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
                acc.push({
                    name: entry.name,
                    price: entry.price,
                    quantity: entry.quantity
                });
            }
            return acc;
        }, [])
    };
};