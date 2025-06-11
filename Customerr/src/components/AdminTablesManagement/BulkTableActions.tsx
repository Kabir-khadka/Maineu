//components/AdminTablesManagement/BulkTableActions.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Table, FetchTableResponse, BulkTableActionsProps } from '@/types/table'; //Assuming you have this type defined
import { LucideClipboardCopy, LucideDownload, LucideQrCode } from 'lucide-react'; // Example icons, install 'lucide-react' if you dont have it

//Base URL for the API
const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL + '/api';
const FRONTEND_BASE_URL = process.env.NEXT_PUBLIC_FRONTEND_URL;

export default function BulkTableActions({
    selectedTableIds,
    tables,
    onBulkUpdateComplete,
    onClearSelection,
    onShowMessage,
}: BulkTableActionsProps) {
    //Initialize with 'available' as a default, or the most common/sensible default for the bulk
    const [bulkStatus, setBulkStatus] = useState<Table['status']>('available');
    const [isApplyingBulkAction, setIsApplyingBulkActions] = useState(false);

    //Filter ut the actual table objects that are selected based on their IDs
    const selectedTables = tables.filter(table => selectedTableIds.has(table._id));

    //Handle applying the bulk status update
    const handleApplyBulkStatus = async () => {
        if (selectedTableIds.size === 0) {
            onShowMessage('No tables selected for bulk action.', true);
            return;

        }

        //Important: For prodcution, replacing window.confirm with a custom modal for better UX and styling
        if (!window.confirm(`Are you sure you want to update status for ${selectedTableIds.size} table(s) to "${bulkStatus}"?`)) {
            return; //User cancelled the action
        }

        setIsApplyingBulkActions(true);
        let successCount = 0;
        let errorCount = 0;

        //Create an array of promises for each table update
        const updatePromises = Array.from(selectedTableIds).map(async (tableId) => {
            try {
                const res = await fetch(`${API_BASE_URL}/tables/${tableId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: bulkStatus }), //Only send the status for this bulk update
                });

                if (!res.ok) {
                    const errData = await res.json();
                    //Include table ID in error for easier debugging
                    throw new Error(errData.message || `Failed to update table ${tableId}`);
                }
                successCount++;
            } catch (err:any) {
                console.error(`Error updating table ${tableId}:`, err);
                errorCount++;
            }
        });

        //Wait for all update promises to settle (resolve or reject)
        await Promise.allSettled(updatePromises);

        setIsApplyingBulkActions(false);

        //Provide feedback based on the outcome of all operations
        if (successCount > 0) {
            onShowMessage(`Successfully updated ${successCount} table(s).`);
        }
        if (errorCount > 0) {
            onShowMessage(`Failed to update ${errorCount} tables. Check console for why`, true);
        }

        onBulkUpdateComplete(); // Telling the parent component to re-fetch the table list to show updated data
        onClearSelection(); // Clearing the selection checkboxes in the parent component

    };

    //Function to copy QR code Identifiers to clipboard
    const handleCopyQrIdentifiers = async () => {
        if (selectedTables.length === 0) {
            onShowMessage('No tables selected to copy QR Identifiers.', true);
            return;
        }

        // Map selected tables to their QR Identifiers and join them with newlines
        const qrIds = selectedTables.map(table => table.qrCodeIdentifier).join('\n');

        try {
            // Modern async Clipboard API (works in secure contexts - HTTPS)
               await navigator.clipboard.writeText(qrIds);
               onShowMessage('QR Identifiers copied to clipboard.');
            } catch (err) {
                // Fallback for older browsers or non-secure contexts
        try {
            const el = document.createElement('textarea');
            el.value = qrIds;
            el.style.position = 'fixed';  // Prevent scrolling to bottom
            el.style.opacity = '0';
            document.body.appendChild(el);
            el.select();
            const success = document.execCommand('copy');
            document.body.removeChild(el);

            if (success) {
                onShowMessage('QR Identifiers copied using fallback method.');
            } else {
                throw new Error('Fallback copy failed');
            }
        } catch (fallbackErr) {
            console.error('Clipboard copy failed:', fallbackErr);
            onShowMessage('Failed to copy QR Identifiers.', true);
        }
      };
    }
    

      // Function to download QR Code URLs(as a simple text file)
      const handleDownloadQrUrls = () => {
        if (selectedTables.length === 0) {
            onShowMessage('No tables selected to download QR URLs.', true);
            return;
        }
        //Generate the full customer scan URLs for each selected table
        const qrUrls = selectedTables.map(table => {
            //Ensure FRONTEND_BASE_URL is defined; fallback to localhost if not
            const baseUrl = FRONTEND_BASE_URL || 'http://localhost:3000';
            return `${table.tableNumber}: ${baseUrl}/?qr=${table.qrCodeIdentifier}`;
        }).join('\n');

        //Create a Blob containing the text data
        const blob = new Blob([qrUrls], {type: 'text/plain;charset=utf-8'});
        // Create a URL for the Blob
        const url = URL.createObjectURL(blob);

        //Create a temporary anchor element to trigger the download
        const a = document.createElement('a');
        a.href = url;
        a.download = 'table_qr_urls.txt'; //Set the desired filename
        document.body.appendChild(a); //Append to body (can be invisible)
        a.click(); //Programmatically click the anchor to trigger download
        document.body.removeChild(a); //Clean up the temporary element
        URL.revokeObjectURL(url); // Release the object URL

        onShowMessage('QR Code URLs downloaded as text file!');
      };

      //Render nothing if no tables are selected to keep the UI clean
      if (selectedTableIds.size === 0) {
        return null;
      }

      return (
        <div className="mb-8 p-6 bg-blue-50 rounded-lg shadow-md border-2 border-blue-300">
            <h2 className="text-2xl font-semibold mb-4 text-blue-800">
                Bulk Actions ({selectedTableIds.size} table{selectedTableIds.size === 1 ? '' : 's'} selected)
            </h2>

            {/* Bulk Status Update Section*/}
            <div className="mb-4">
                <h3 className="text-xl font-medium mb-2 text-blue-700">Change Status</h3>
                <div className="flex flex-col md:flex-row gap-4 items-center">
                    <label htmlFor="bulkTableStatus" className="text-sm font-medium text-gray-700 sr-only">Select New Status</label>
                    <select 
                      id="bulkTableStatus"
                      value={bulkStatus}
                      onChange={(e) => setBulkStatus(e.target.value as Table['status'])}
                      className="flex-grow p-2 border-blue-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      disabled={isApplyingBulkAction} // Disable dusring action
                    >
                        <option value="available">Available</option>
                        <option value="occupied">Occupied</option>
                        <option value="needs_cleaning">Needs Cleaning</option>
                        {/*Important : Updated to 'out-of-service' as per my Table interface*/}
                        <option value="out-of-service">Out of Service</option>
                    </select>
                    <button
                       onClick={handleApplyBulkStatus}
                       disabled={isApplyingBulkAction}//Disable during action
                       className={`px-6 py-2 rounded-md font-medium transition-colors
                        ${isApplyingBulkAction
                         ? 'bg-blue-300 text-gray-600 cursor-not-allowed'
                         : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                        }`}
                    >
                        {isApplyingBulkAction ? 'Applying...' : 'Apply Status Change'}
                    </button>
                </div>
            </div>

            {/* Bulk QR Code Actions */}
            <div className="mb-4">
                <h3 className="text-xl font-medium mb-2 text-blue-700">QR Code Actions</h3>
                <div className="flex flex-wrap gap-3">
                    <button
                      onClick={handleCopyQrIdentifiers}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white font-medium rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors"
                    >
                        <LucideDownload className="h-5 w-5" /> Download QR URLs (Text)
                    </button>
                    {/* Optional: Add a button for generating actal QR code images if youintegrate a QR generation library*/}

                </div>
            </div>

            {/* Clear Selection Button */}
            <div className="flex justify-end mt-4">
                <button
                 onClick={onClearSelection}
                 className="px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-md hover:bg-gray-300 focus:ouline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition-colors"
                >
                    Clear Selection
                </button>
            </div>
        </div>
      )
    }

