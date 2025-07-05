'use client';

import React from 'react';

interface SearchBarProps  {
    searchQuery: string;
    onSearchChange: (query: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ searchQuery, onSearchChange }) => {
    return (
    <div className="mb-6 flex justify-end items-center w-full">
      <input
        type="text"
        placeholder="Search by name..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-full max-w-xs py-3 px-4 border border-gray-300 rounded-md text-base
                   transition duration-200 ease-in-out
                   focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
      />
    </div>
  );
};

export default SearchBar;