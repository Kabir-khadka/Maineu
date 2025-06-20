'use client';

import React, { useEffect } from "react";
import { Order, OrderItem } from '@/types/order';

interface OrderDetailSidebarProps {
    orders: Order[] | null;
    isOpen: boolean;
    onClose: () => void;
    onOrderUpdate: (updatedOrder: Order) => void;
}

export default function OrderDetailSidebar({ orders, isOpen, onClose, onOrderUpdate }: OrderDetailSidebarProps) {
  //prevent background scroll when sidebar is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

    if (!orders || orders.length === 0) return null;

    // Calculate total for all orders on this table
    const tableTotal = orders.reduce((sum, order) => sum + order.totalPrice, 0);

    // Function to update individual order status (for orders #2 and beyond)
    const updateIndividualOrderStatus = async (orderId: string) => {
        try {
            const res = await fetch(`http://localhost:5000/api/orders/${orderId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'Delivered' }),
            });
            if (res.ok) {
                const updatedOrder = await res.json();
                onOrderUpdate(updatedOrder);
            } else {
                console.error('Failed to update order status');
            }
        } catch (err) {
            console.error('Error updating order status:', err);
        }
    };

     return (
      <>
      {/* Backdrop */}
      {isOpen && (
        <div 
           className="fixed inset-0 bg-black bg-opacity-30 z-40"
           onClick={onClose}
          />
      )}
      
    <div
      className={`fixed top-0 right-0 h-full w-full sm:w-[400px] bg-white shadow-lg z-50 transform transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <div className="p-4 border-b flex justify-between items-center">
        <h2 className="text-xl font-semibold">Table {orders[0].tableNumber} Orders</h2>
        <button
          onClick={onClose}
          className="text-gray-600 hover:text-gray-800 transition text-xl"
        >
          ✕
        </button>
      </div>

      <div className="p-4 overflow-y-auto h-[calc(100%-120px)]">
        {orders.map((order, orderIndex) => (
          <div key={order._id} className="border-b pb-4 mb-4 last:border-b-0">
            {/* Order Header */}
            <div className="flex justify-between items-center mb-2">
              <div className="text-sm font-medium text-gray-700">
                Order #{orderIndex + 1}
              </div>
              
              {/* Status Display/Button Logic */}
              {/* This logic now applies to ALL orders (not just #2 and beyond) */}
              {order.status === 'In progress' ? (
                <button
                   onClick={() => updateIndividualOrderStatus(order._id)}
                   className="text-xs px-3 py-1 bg-orange-200 text-orange-800 rounded-full hover:bg-orange-300 transition cursor-pointer border border-orange-300"
                >
                  In progress → Deliver
                </button>
              ) : (
                // Show Regular status badge if already delivered or paid 
                <div className={`text-xs px-2 py-1 rounded-full ${
                   order.status === 'Delivered' 
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-green-100 text-green-800'
                }`}>
                  {order.status}
                </div>
              )}
              </div>

            {/* Order Time */}
            <div className="text-sm text-gray-500 mb-3">
              Placed at: {new Date(order.createdAt).toLocaleString()}
            </div>

            {/* Order Items */}
            <div className="space-y-1 mb-3">
              {order.orderItems.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span>{item.name} × {item.quantity}</span>
                  <span>Rs{item.quantity * item.price}</span>
                </div>
              ))}
            </div>

            {/* Order Total */}
            <div className="text-right text-sm font-medium text-gray-800">
              Order Total: Rs{order.totalPrice}
            </div>
          </div>
        ))}
      </div>

      {/* Table Summary Footer */}
      <div className="absolute bottom-5 left-0 right-0 p-4 bg-gray-50 border-t">
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {orders.length} order{orders.length !== 1 ? 's' : ''} total
          </div>
          <div className="text-lg font-bold text-gray-800">
            Table Total: Rs{tableTotal}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}