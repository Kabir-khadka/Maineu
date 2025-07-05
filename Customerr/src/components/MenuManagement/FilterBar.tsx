'use client';

import React from 'react';
import { Category } from '@/types/menu';

interface FilterBarProps {
  selectedCategory: string;
  selectedAvailability: string;
  categories: Category[];
  onCategoryChange: (value: string) => void;
  onAvailabilityChange: (value: string) => void;
}

const FilterBar: React.FC<FilterBarProps> = ({
  selectedCategory,
  selectedAvailability,
  categories,
  onCategoryChange,
  onAvailabilityChange
}) => {
  return (
    // Replaced styles.filterContainer with Tailwind classes
    <div className="flex gap-4 mb-6 items-center flex-wrap">
      <select
        value={selectedCategory}
        onChange={(e) => onCategoryChange(e.target.value)}
        // Replaced styles.filterSelect with Tailwind classes
        className="p-3 border border-gray-300 rounded text-base min-w-[150px]
                   focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none
                   ]"
      >
        <option value="">All Categories</option>
        {categories.map((cat) => (
          <option key={cat._id} value={cat.name}>
            {cat.name}
          </option>
        ))}
      </select>

      <select
        value={selectedAvailability}
        onChange={(e) => onAvailabilityChange(e.target.value)}
        // Replaced styles.filterSelect with Tailwind classes
        className="p-3 border border-gray-300 rounded text-base min-w-[150px]
                   focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none
                   ]"
      >
        <option value="">All Statuses</option>
        <option value="available">Available</option>
        <option value="unavailable">Unavailable</option>
      </select>
    </div>
  );
};

export default FilterBar;
// FilterBar component for filtering menu items by category and availability
// It receives selected category and availability as props and triggers the respective change handlers