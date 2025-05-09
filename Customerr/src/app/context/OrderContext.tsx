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
}


const OrderContext = createContext<OrderContextType>({
    orderItems: [],
    addOrderItem: () => {},
    increaseItemQuantity: () => {},
    decreaseItemQuantity: () => {}
});

export const OrderProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
    const [orderItems, setOrderItems] = useState<OrderItem[]>([]);

    const addOrderItem = (item: OrderItem) => {
        setOrderItems(prevItems => {
            const existingIndex = prevItems.findIndex(i => i.name === item.name);
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

    return (
        <OrderContext.Provider value={{ 
            orderItems, 
            addOrderItem,
            increaseItemQuantity,
            decreaseItemQuantity
            }}>
            {children}
        </OrderContext.Provider>
    );
};

export const useOrder = () => useContext(OrderContext);