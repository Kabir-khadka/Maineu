'use client';

import React from 'react';
import styles from './MenuManagement.module.css';

interface SearchBarProps  {
    searchQuery: string;
    onSearchChange: (query: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ searchQuery, onSearchChange }) => {
    return (
        <div className={styles.searchContainer}>
            <input
            type="text"
            placeholder='Search by name...'
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className={styles.searchInput}
            /> 
        </div>
    );
}

export default SearchBar;