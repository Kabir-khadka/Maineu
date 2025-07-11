// /src/types/order.ts

export interface OrderItem {
  // Crucial: Mongoose adds this _id to subdocuments once saved.
    // This _id will be the unique identifier for each *batch* once it's confirmed.
  _id?: string; // Optional ID for the item, if needed
    name: string;
    quantity: number;
    price: number;
}

export interface Order {
    _id: string;
    tableNumber: string;
    orderItems: OrderItem[];
    totalPrice: number;
    status: 'In progress' | 'Delivered' | 'Paid' | 'Cancelled' | string;
    statusHistory?: string[];
    createdAt: string;
    updatedAt: string;
}

export interface OrderEntry {
    id: string; // Unique identifier for this entry (e.g., UUID or timestamp)
    name: string;
    price: number;
    quantity: number;
    timestamp: number; // When this entry was created
    isConfirmed: boolean; // NEW: To distinguish between confirmed items and newly added ones
}