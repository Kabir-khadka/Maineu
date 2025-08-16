import React from "react";

export default function KitchenSidebar() {
    return (
        <div className="p-4 h-full flex flex-col">
            <h2 className="text-lg font-semibold mb-4">Kitchen Management</h2>
            <ul className="space-y-2">
                <li className="hover:bg-gray-700 p-2 rounded">Orders</li>
                <li className="hover:bg-gray-700 p-2 rounded">Inventory</li>
                <li className="hover:bg-gray-700 p-2 rounded">Staff Management</li>
                <li className="hover:bg-gray-700 p-2 rounded">Settings</li>
            </ul>
        </div>
    );
}