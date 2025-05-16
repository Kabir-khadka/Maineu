'use client';

import React from 'react';
import { Category } from '@/types/menu';
import styles from './MenuManagement.module.css';

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
    <div className={styles.filterContainer}>
      <select
        value={selectedCategory}
        onChange={(e) => onCategoryChange(e.target.value)}
        className={styles.filterSelect}
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
        className={styles.filterSelect}
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