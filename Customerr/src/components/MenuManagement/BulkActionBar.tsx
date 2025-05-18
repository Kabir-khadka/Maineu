import React from "react";

interface BulkActionBarProps {
    selectedIds: string[];
    onDeleteSelected: () => void;
    onToggleAvailabilitySelected: () => void;
    onChangeCategory: (newCategory: string) => void;
    categories: string[];
}

const BulkActionBar: React.FC<BulkActionBarProps> = ({
    selectedIds,
    onDeleteSelected,
    onToggleAvailabilitySelected,
    onChangeCategory,
    categories
}) => {
    if (selectedIds.length === 0) return null;


return (
    <div className="flex items-center gap-4 p-4 bg-gray-100 rounded-md mb-4 shadow">
        <span className="font-medium">{selectedIds.length} selected</span>
        <button 
            className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
            onClick={onDeleteSelected}
        >
            Delete
        </button>

        <button
            className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
            onClick={onToggleAvailabilitySelected}
        >
            Toggle Availability
        </button>
        <select
            className="border px-2 py-1 rounded"
            onChange={(e) => onChangeCategory(e.target.value)}
        >
            <option value="">Assign to category...</option>
            {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
            ))}
        </select>
    </div>
  );
};

export default BulkActionBar;