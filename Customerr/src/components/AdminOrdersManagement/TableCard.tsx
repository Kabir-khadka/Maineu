import React from 'react';
import { FaChair } from 'react-icons/fa';
import { Order, OrderItem } from '@/types/order';

interface TableCardProps {
    tableNumber: string;
    status: 'In progress' | 'Delivered' | 'Paid';
    onClick: () => void;
}

export default function TableCard({ tableNumber, status, onClick }: TableCardProps) {
    const bgColor =
        status === 'Paid'
        ? 'bg-green-100'
        : status === 'Delivered'
        ? 'bg-yellow-100'
        : 'bg-red-100';

    return (
        <div
            onClick={onClick}
            className={`rounded-xl shadow p-4 cusrsor-pointer hover:shadow-lg transition-all border border-gray-200 ${bgColor}`}
            >
                <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-lg">T{tableNumber}</span>
                </div>

                <p className="text-sm mt-2">
                    Status:{' '}
                    <span className="text-xs px-2 py-1 rounded bg-white text-gray-800">
                        {status}
                    </span>
                </p>
            </div>
    );
}