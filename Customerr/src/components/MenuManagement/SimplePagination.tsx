import React from 'react';
import styles from './SimplePagination.module.css';

interface SimplePaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const SimplePagination: React.FC<SimplePaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
  const handlePrev = () => {
    if (currentPage > 1) onPageChange(currentPage - 1);
  };

  const handleNext = () => {
    if (currentPage < totalPages) onPageChange(currentPage + 1);
  };

  return (
    <div className={styles.wrapper}>
    <div className={styles.paginationContainer}>
      <button
        onClick={handlePrev}
        disabled={currentPage === 1}
        className={styles.navButton}
      >
        &lt;
      </button>

      <span className={styles.pageIndicator}>
        {String(currentPage).padStart(2, '0')}/{String(totalPages).padStart(2, '0')}
      </span>

      <button
        onClick={handleNext}
        disabled={currentPage === totalPages}
        className={styles.navButton}
      >
        &gt;
      </button>
    </div>
    </div>
  );
};

export default SimplePagination;
// SimplePagination component for rendering a simple pagination control
// It receives current page, total pages, and a change handler as props