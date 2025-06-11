// src/types.table.ts
export interface Table {
    _id: string; //MongoDB ObjectId (e.g from mongoose)
    tableNumber: string; // e.g 'T1', 'Bar 1T1', 'Dining 5' etc
    qrCodeIdentifier: string; // A unique string that identifies the table for QR code generation
    status: 'available' | 'occupied' | 'needs_cleaning' | 'out-of-service'; // Current operational status of the table
    createdAt: string;// ISO date string when the table record was created
    updatedAt: string; // ISO date string when the table record was last updated

}

// New Addition to define the interface for my API response structure
export interface FetchTableResponse {
    success: boolean; //Indicates if the fetch was successfull
    data: Table; // This 'data' property holds the actual Table Object
}

export interface BulkTableActionsProps {
    selectedTableIds: Set<string>; // Set of selected table IDs for bulk actions
    tables: Table[]; //Pass the full tables array to get details of elected tables
    onBulkUpdateComplete: () => void; //Callback to re-fetch tables in parent after update
    onClearSelection: () => void; //Callback to clear selection in parent
    onShowMessage: (message: string, isError?: boolean) => void; // Helper to display messages in parent component
}