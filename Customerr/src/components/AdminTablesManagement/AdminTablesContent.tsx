//components/AdminTablesManagement/AdminTablesContent.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Table } from '@/types/table';


//Base URL for the API
const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL + '/api';

export default function AdminTablesContent() {
    const [tables, setTables] = useState<Table[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    //State for the "Add New Table" form inputs
    const [newTableNumber, setNewTableNumber] = useState<string>('');
    const [newTableStatus, setNewTableStatus] = useState<Table['status']>('available');

    //State for the "Edit Table" form/modal inputs. 'editingTable' holds the full object
    const [editingTable, setEditingTable] = useState<Table | null>(null);
    const [editTableNumber, setEditTableNumber] = useState<string>('');
    const [editTableStatus, setEditTableStatus] = useState<Table['status']>('available');

    //Helper function to display temporary success or error messages
    const showMessage = (message: string, isError: boolean = false) => {
        if (isError) {
            setError(message);
            setSuccessMessage(null); //Clear success if there's an error
        } else {
            setSuccessMessage(message);
            setError(null); //Clear error if there's success
        }
        //Messages disappear after 3 seconds
        setTimeout(() => {
            setSuccessMessage(null);
            setError(null);
        }, 3000);
    };

    //Function to fetch all tables from the backend
    const fetchTables = async () => {
        setLoading(true);
        setError(null); //Clear any previous errors
        try {
            const res = await fetch(`${API_BASE_URL}/tables`);
            if(!res.ok) {
                //If response is not OK (e.g., 404,500), try to read error message from backend
                const errData = await res.json();
                throw new Error(errData.message || 'Failed to fetch tables from server.');
            }
            const data = await res.json();
            //Assuming your backend response is structured like { success: true, data: [...]}
            setTables(data.data);
        } catch (err: any) {
            console.error('Error fetching tables:', err);
            showMessage('Failed to fetch tables: ${err.message}', true);
        } finally {
            setLoading(false); // Always set loading to false when done
        }
    };

    //Effect hook to fetch tables when the component mounts
    useEffect(() => {
        fetchTables();
    }, []); // Empty dependency array means this runs once a mount

    // ----Handlers for Adding Tables-----
    const handleAddTable = async (e: React.FormEvent) => {
        e.preventDefault(); // prevent default form submission
        if (!newTableNumber.trim()) {
            showMessage('Table Number cannot be empty!', true);
            return;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/tables`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tableNumber: newTableNumber.trim(), //Send trimmed table number 
                    status: newTableStatus
                })
            });
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || 'Failed to add table.');
            }
            const data = await res.json();
            setTables([...tables, data.data]); //Add the newly created table object to existing state
            setNewTableNumber(''); // Clear the input field
            setNewTableStatus('available'); //Reset status to default
            showMessage('Table sdded successfully!');
        } catch (err: any) {
            console.error('Error addding table:', err);
            showMessage('Failed to add table: ${err.message}', true);
        }
     };

     //----Handlers for Editing Tables----
     const handleEditClick = (table: Table) => {
        setEditingTable(table); //Set the table object that is currently being edited
        setEditTableNumber(table.tableNumber); // Populate the edit form inputs with current data
        setEditTableStatus(table.status);
     };

     const handleCancelEdit = () => {
        setEditingTable(null); //Clear the editingTable state to close the edit form
        setEditTableNumber(''); // Clear edit form inputs
        setEditTableStatus('available');
     };

     const handleUpdateTable =async (e: React.FormEvent) => {
        e.preventDefault(); // prevent default form submission
        if (!editingTable || !editTableNumber.trim()) {
            showMessage('Table Number cannot be empty or no table selected for edit!', true);
            return;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/tables/${editingTable._id}`, {
                method: 'PUT', //Using PUT for full replacement or PATCH for partial upate can be used
                headers: { 'Content-Type' : 'application/json' },
                body: JSON.stringify({
                    tableNumber: editTableNumber.trim(),
                    status: editTableStatus
                })

            });
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || 'Faled to update table.');
            }
            const data = await res.json();
            //Update the state: replace the old table object with the updated one
            setTables(tables.map(table => 
                table._id === editingTable._id ? data.data : table
            ));
            setEditingTable(null); //Close the edit form after successful update
            showMessage('Table updated successfully!');

        } catch (err: any) {
            console.error('Error updaying table:', err);
            showMessage('Failed to update table: ${err.message}', true);
        }
     };

     //--- Handlers for Deleting Tables ----
     const handleDeleteTable = async (tableId: string) => {
        //Confirm with the user before deleting a table
        if (!window.confirm('Are you sure you want to delete this table? This action cannot be undone.')) {
            return; // User cancelled the deletion
        }

        try {
            const res = await fetch(`${API_BASE_URL}/tables/${tableId}`, {
                method: 'DELETE', //Use DELETE method for deletion

            });
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || 'Failed to delete table.');
            }
            // Remove the deleted table from the state
            setTables(tables.filter(table => table._id !== tableId));
            showMessage('Table deleted successfully!');
        } catch (err: any) {
            console.error('Error deleting table:', err);
            showMessage('Failed to delete table: ${err.message', true);
        }
     };

     //---- QR Code Link Helper ----
     // This function constructs the full URL that the physical QR code will encode.
     // When a customer scans the QR code, their device will navigate to this URL.
     const getCustomerScanURL = (qrId: string) => {
        // For local development: 'window.location.origin' will give  'htttp://localhost:3000'
        // In Production: You'd typically use an environment variable like 'process.env.NEXT_PUBLIC_CUSTOMER_APP_URL'
        // to point to your actual customer-facing domain.
        const frontendBaseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL;

        //Ensuring the environement variable is actually defined
        if(!frontendBaseUrl) {
            console.error("NEXT_PUBLIC_FRONTEND_URL is not defined! Check your .env.local file.");
            return `http://localhost:3000/?qr=${qrId}`; //Fallback to localhost if not defined
        }

        // This path '/' is a customer side root path since page.tsx is directly inside /src/app assumes your customer-side application has a page
        // at '/' that can read then 'qr' query parameter to identify the table.
        return `${frontendBaseUrl}/?qr=${qrId}`; 
      };

      // Display a loading message while fetching data
      if (loading) {
        return <div className="p-6 text-center text-gray-700">Loading Tables...</div>
      }

      return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <h1 className='text-3xl font-bold mb-6 text-gray-800'>Manage Restaurant Tables</h1>

            {/* Success/Error message Display Area (consistent with the existing alerts)*/}
            {successMessage && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
                    <strong className='font-bold'>Success!</strong>
                    <span className='block sm:inline ml-2'>{successMessage}</span>
                </div>
            )}
            {error && (
                <div className='bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4' role="alert">
                    <strong className='font-bold'>Error!</strong>
                    <span className='block sm:inline ml-2'>{error}</span>
                </div>
            )}

            {/* Add New Table Form Section*/}
            <div className='mb-8 p-6 bg-white rounded-lg shadow-md'>
                <h2 className='text-2xl font-semibold mb-4 text-gray-700'>Add New Tables</h2>
                <form onSubmit={handleAddTable} className='grid grid-cols-1 md:grid-cols-3 gap-4 items-end'>
                    <div>
                        <label htmlFor = "newTableNumber" className="block text-sm font-medium text-gray-700 mb-1">Table Number:</label>
                        <input
                            type="text"
                            id="newTableNumber"
                            value={newTableNumber}
                            onChange={(e) => setNewTableNumber(e.target.value)}
                            placeholder="e.g., T1, BAR A"
                            required//HTML5 validation for required field
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label htmlFor="newTableStatus" className='block text-sm font-medium text-gray-700 mb-1'>Initial Status</label>
                        <select
                            id="newTableStatus"
                            value={newTableStatus}
                            onChange={(e) => setNewTableStatus(e.target.value as Table['status'])}
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            >
                            <option value="available">Available</option>
                            <option value="occupied">Occupied</option>
                            <option value="needs_cleaning">Needs Cleaning</option>
                            <option value="out_of_service">Out of Service</option>
                            </select>
                    </div>
                    <button
                        type="submit"
                        className='w-full md:w-auto px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700
                        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors'
                        >
                            Add Table
                        </button>
                </form>
            </div>

            {/* Editing Table Form (Conditionally displayed when a table is selected for editing)  */}
            {editingTable && (
                <div className='mb-8 p-6 bg-white rounded-lg shadow-md border-2 border-blue-500'>
                    <h2 className='text-2xl font-semibold mb-4 text-blue-700'>Edit Table: {editingTable.tableNumber}</h2>
                    <form onSubmit={handleUpdateTable} className='grid grid-cols-1 md:grid-cols-3 gap-4 items-end'>
                        <div>
                            <label htmlFor='editTableNumber' className='block text-sm font-medium text-gray-700 mb-1'>Table Number:</label>
                            <input
                                type="text"
                                id="editTableNumber"
                                value={editTableNumber}
                                onChange={(e) => setEditTableNumber(e.target.value)}
                                required
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                />

                        </div>
                        <div>
                            <label htmlFor="editTableStatus" className="bloc text-sm font-medium text-gray-700 mb-1">Status</label>
                            <select
                                id="editTableStatus"
                                value={editTableStatus}
                                onChange={(e) => setEditTableStatus(e.target.value as Table['status'])}// Corrected: this updates the editTableStatus state
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="available">Available</option>
                                <option value="occupied">Occupied</option>
                                <option value="needs_cleaning">Needs Cleaning</option>
                                <option value="out_of_service">Out of Service</option>
                            </select>
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="submit"
                                className="w-full md:w-auto px-4 py-2 bg-green-600 text-white
                                font-medium rounded-md hover:bg-green-700 focus:outline-none focu:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
                            >
                                Save Changes
                            </button>
                            <button
                                type="button"
                                onClick={handleCancelEdit}
                                className="w-full md:w-auto px-4 py-2 bg-gray-400 text-white font-medium rounded-md hover:bg-gray-500 focus:outline-none focus:ring-2 
                                focus:ring-gray-300 focus:ring-offset-2 transition-colors"
                                >
                                    Cancel
                                </button>
                        </div>
                    </form>
                </div>
            )}

            {/* List of current tables */}
            <h2 className="text-2xl font-semibold mb-4 text-gray-700">Current Tables</h2>
            {tables.length === 0 ? (
                <p className="text-gray-600">No tables found. Add A new one using the form above!</p>
            ) : (
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Table Number</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracling-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">QR Code Identifier</th>
                                <th className="px-6 py-3 text-left text-xs font-mediumtext-gray-500 uppercase tracking-wider">Actions</th>
                                
                            </tr>
                         </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {tables.map((table) => (
                                <tr key={table._id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{table.tableNumber}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{table.status}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        <span className="font-mono text-xs break-all">{table.qrCodeIdentifier}</span>
                                        <div className="mt-1 text-xs text-blue-600 flex items-center">
                                            <a href={getCustomerScanURL(table.qrCodeIdentifier)} target="_blank" rel="noopener noreferrer" className="hover:underlibe">
                                                Customer Scan Link
                                            </a>
                                            <button
                                                onClick={() => {
                                                    //Copy the generated customer link to the clipboard
                                                    navigator.clipboard.writeText(getCustomerScanURL(table.qrCodeIdentifier));
                                                    showMessage('Customer link copied to clipboard!');
                                                }}
                                                title="Copy link to clipboard"
                                                className="ml-2 p-1 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 
                                                focus:ring-gray-300 rounded-md transition-colors"
                                                >
                                                    {/* Simple copy icon or text */}
                                                    📋 {/*  replace this with an SVG icon later */}
                                                </button>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => handleEditClick(table)}
                                            className="text-indigo-600 hover:text-indigo-900 mr-4 transition-colors"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDeleteTable(table._id)}
                                            className="text-red-600 hover:text-red-900 transition-colors"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    
                </div>
            )}
        </div>
      );
}