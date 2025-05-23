'use client';

import React from "react";
import { Order, OrderItem } from '@/types/order';

interface OrderDetailSidebarProps {
    order: Order | null;
    show: boolean;
    onClose: () => void;
}

export default function OrderDetailSidebar({ order, show, onClose }: OrderDetailSidebarProps) {
    if (!order) return null;

     return (
    <div
      className={`fixed top-0 right-0 h-full w-full sm:w-[350px] bg-white shadow-lg z-50 transform transition-transform duration-300 ease-in-out ${
        show ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <div className="p-4 border-b flex justify-between items-center">
        <h2 className="text-xl font-semibold">Order Details</h2>
        <button
          onClick={onClose}
          className="text-gray-600 hover:text-gray-800 transition"
        >
          Close
        </button>
      </div>

      <div className="p-4 space-y-3 overflow-y-auto h-[calc(100%-64px)]">
        <div>
          <strong>Table:</strong> {order.tableNumber}
        </div>
        <div>
          <strong>Status:</strong> {order.status}
        </div>
        <div>
          <strong>Placed at:</strong>{' '}
          {new Date(order.createdAt).toLocaleString()}
        </div>
        <div>
          <strong>Items:</strong>
          <ul className="ml-4 mt-2 list-disc">
            {order.orderItems.map((item, idx) => (
              <li key={idx}>
                {item.name} × {item.quantity} = Rs{item.quantity * item.price}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <strong>Total Price:</strong> Rs{order.totalPrice}
        </div>
      </div>
    </div>
  );
}