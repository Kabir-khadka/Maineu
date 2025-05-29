import React, { createContext, useState, useContext} from "react";

interface OrderItem {
    name: string;
    quantity: number;
    price: number;
}

interface OrderContextType {
    orderItems: OrderItem[];
    addOrderItem: (item: OrderItem) => void;
    increaseItemQuantity: (name: string) => void;
    decreaseItemQuantity: (name: string) => void;
    getNewlyAddedItems: () => OrderItem[]; // New function to get only incremental items
    confirmCurrentOrder: () => void;
}


const OrderContext = createContext<OrderContextType>({
    orderItems: [],
    addOrderItem: () => {},
    increaseItemQuantity: () => {},
    decreaseItemQuantity: () => {},
    getNewlyAddedItems: () => [],
    confirmCurrentOrder: () => {},
});

export const OrderProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
    const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
    const [confirmedItems, setConfirmedItems] = useState<OrderItem[]>([]); // Track what's been ordered

    const addOrderItem = (item: OrderItem) => {
        setOrderItems(prevItems => {
            const existingIndex = prevItems.findIndex(i => i.name === item.name);

            //Remove the item if quantity is 0
            if (item.quantity === 0) {
                return prevItems.filter(i => i.name !== item.name);
            }

            if (existingIndex > -1) {
                const newItems = [...prevItems];
                newItems[existingIndex] = item;
                return newItems;
            }
            return [...prevItems, item]
        });
    };

    const increaseItemQuantity = (name: string) => {
        setOrderItems(prevItems =>
            prevItems.map(item =>
                item.name === name
                ?{...item, quantity: item.quantity + 1}
                :item
            )
        );
    };

    const decreaseItemQuantity = (name: string) => {
        setOrderItems(prevItems =>
            prevItems.map(item =>
                item.name === name && item.quantity > 0
                ? {...item, quantity: item.quantity - 1}
                : item
            ).filter(item => item.quantity > 0)
        );
    };

    // Get only the newly added items (difference between current and confirmed)
    const getNewlyAddedItems = (): OrderItem[] => {
        const newlyAdded: OrderItem[] = [];
        orderItems.forEach(currentItem => {
            const confirmedItem = confirmedItems.find(c => c.name === currentItem.name);
            const confirmedQty = confirmedItem ? confirmedItem.quantity : 0;
            const newlyAddedQty = currentItem.quantity - confirmedQty;
            
            if (newlyAddedQty > 0) {
                newlyAdded.push({
                    ...currentItem,
                    quantity: newlyAddedQty
                });
            }
            // If quantity decreased for an item, it won't be in newlyAdded, which is correct.
            // If an item was removed, it won't be in orderItems, so it's not considered here.
        });
        return newlyAdded;
    };

    //  NEW: Call this after a successful order submission
    const confirmCurrentOrder = () => {
        setConfirmedItems([...orderItems]);
    };


    return (
        <OrderContext.Provider value={{ 
            orderItems, 
            addOrderItem,
            increaseItemQuantity,
            decreaseItemQuantity,
            getNewlyAddedItems,
            confirmCurrentOrder, // <--- ADD THIS
            }}>
            {children}
        </OrderContext.Provider>
    );
};

export const useOrder = () => useContext(OrderContext);