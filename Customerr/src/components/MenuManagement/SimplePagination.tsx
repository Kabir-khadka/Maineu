import React from 'react';

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
    // Replaced styles.wrapper with Tailwind classes
    <div className="flex justify-center mt-6">
      {/* Replaced styles.paginationContainer with Tailwind classes */}
      <div className="flex items-center justify-center gap-3 p-2 px-4 border border-gray-300 rounded-lg w-fit bg-gray-50 font-sans">
        <button
          onClick={handlePrev}
          disabled={currentPage === 1}
          // Replaced styles.navButton with Tailwind classes
          className="bg-transparent border-none text-lg cursor-pointer py-1.5 px-3 rounded
                     transition-colors duration-200 focus:outline-none
                     hover:bg-gray-200
                     disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          &lt;
        </button>

        {/* Replaced styles.pageIndicator with Tailwind classes */}
        <span className="font-medium text-base text-gray-700">
          {String(currentPage).padStart(2, '0')}/{String(totalPages).padStart(2, '0')}
        </span>

        <button
          onClick={handleNext}
          disabled={currentPage === totalPages}
          // Replaced styles.navButton with Tailwind classes
          className="bg-transparent border-none text-lg cursor-pointer py-1.5 px-3 rounded
                     transition-colors duration-200 focus:outline-none
                     hover:bg-gray-200
                     disabled:text-gray-400 disabled:cursor-not-allowed"
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