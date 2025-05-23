// /src/types/order.ts

export interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

export interface Order {
  _id: string;
  tableNumber: string;
  orderItems: OrderItem[];
  totalPrice: number;
  status: 'In progress' | 'Delivered' | 'Paid' | string;
  statusHistory?: string[];
  createdAt: string;
}
