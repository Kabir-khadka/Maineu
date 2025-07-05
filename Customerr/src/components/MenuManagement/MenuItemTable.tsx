'use client';

import React from 'react';
import { MenuItem } from '@/types/menu';
import ToggleSwitch from './ToggleSwitch';

interface Props {
  items: MenuItem[];
  onEdit: (item: MenuItem) => void;
  onDelete: (id: string) => void;
  onToggleAvailability: ( id: string ) => void;
  onSelectItem: (id: string, selected: boolean) => void;
  onSelectAll: (selected: boolean, visibleItemIds: string[]) => void;
  selectedItems: string[];
}

const MenuItemTable: React.FC<Props> = ({ items, onEdit, onDelete, onToggleAvailability, onSelectItem, onSelectAll, selectedItems  }) => {
  if (items.length === 0) {
    return <p className="text-center py-4 text-gray-600">No items found.</p>;
  }

  // Define common button styles using a variable or a helper function if repeated often
  // For simplicity, applying directly here
  const baseButtonClasses = `
    py-2 px-4 border border-transparent rounded cursor-pointer text-sm font-medium
    transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-opacity-50
  `;

  return (
    // Replaced styles.table with Tailwind classes
    <table className="w-full border-collapse shadow-md overflow-hidden rounded-lg">
      <thead>
        <tr>
          {/* Replaced styles.table th with Tailwind classes */}
          <th className="p-4 text-left border-b border-gray-200 bg-gray-100 font-semibold text-gray-800">
            <input
              type="checkbox"
              checked={items.length > 0 && items.every((item) => selectedItems.includes(item._id))}
              onChange={(e) => onSelectAll(e.target.checked, items.map((item) => item._id))}
              className="form-checkbox h-4 w-4 text-blue-600 rounded" // Basic checkbox styling
            />
          </th>
          <th className="p-4 text-left border-b border-gray-200 bg-gray-100 font-semibold text-gray-800">Image</th>
          <th className="p-4 text-left border-b border-gray-200 bg-gray-100 font-semibold text-gray-800">Name</th>
          <th className="p-4 text-left border-b border-gray-200 bg-gray-100 font-semibold text-gray-800">Price</th>
          <th className="p-4 text-left border-b border-gray-200 bg-gray-100 font-semibold text-gray-800">Category</th>
          <th className="p-4 text-left border-b border-gray-200 bg-gray-100 font-semibold text-gray-800">Status</th>
          <th className="p-4 text-left border-b border-gray-200 bg-gray-100 font-semibold text-gray-800">Actions</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          // Replaced styles.table tr:hover with Tailwind hover class
          <tr key={item._id} className="hover:bg-gray-50">
            {/* Replaced styles.table td with Tailwind classes */}
            <td className="p-4 text-left border-b border-gray-200">
              <input
                type="checkbox"
                checked={selectedItems.includes(item._id)}
                onChange={(e) => onSelectItem(item._id, e.target.checked)}
                className="form-checkbox h-4 w-4 text-blue-600 rounded" // Basic checkbox styling
              />
            </td>
            <td className="p-4 text-left border-b border-gray-200">
              {item.image ? (
                // Replaced styles.itemImage with Tailwind classes
                <img
                  src={`http://localhost:5000${item.image}`}
                  alt={item.name}
                  width="50"
                  className="w-[50px] h-auto rounded"
                />
              ) : (
                // Replaced styles.noImage with Tailwind classes
                <span className="text-gray-500 italic">No image</span>
              )}
            </td>
            <td className="p-4 text-left border-b border-gray-200">{item.name}</td>
            <td className="p-4 text-left border-b border-gray-200">${item.price.toFixed(2)}</td>
            <td className="p-4 text-left border-b border-gray-200">
              {typeof item.category === 'object' ? item.category.name : item.category}
            </td>
            <td className="p-4 text-left border-b border-gray-200">
              <ToggleSwitch
                checked={item.available}
                onChange={() => onToggleAvailability(item._id)}
              />
            </td>
            <td className="p-4 text-left border-b border-gray-200">
              <button
                onClick={() => onEdit(item)}
                // Replaced styles.editButton with Tailwind classes
                className={`${baseButtonClasses} bg-amber-400 text-gray-800 mr-2
                           hover:bg-amber-500 focus:ring-amber-300`}
              >
                Edit
              </button>
              <button
                onClick={() => onDelete(item._id)}
                // Replaced styles.deleteButton with Tailwind classes
                className={`${baseButtonClasses} bg-red-500 text-white mr-2
                           hover:bg-red-600 focus:ring-red-300`}
              >
                Delete
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default MenuItemTable;