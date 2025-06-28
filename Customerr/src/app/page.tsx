'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation'; //Import useSearchParams hook
import ActionButtons from '../components/ActionButtons';
import MyOrderButton from '../components/myOrderButton';
import FoodMenu from '../components/foodmenu';
import QRCodeDownload from '../components/qrCodeDownload';
import { Table, FetchTableResponse } from '../types/table'; // Import Table type for type safety


// Make sure this matches the base URL of your backend API
const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL + '/api';

export default function HomePage() {
const [tableNumber, setTableNumber] = useState<string>(''); // Table Number State
const searchParams = useSearchParams(); // Get search parameters from the URL
const [qrCodeIdentifier, setQrCodeIdentifier] = useState<string | null>(null); // State for QR code identifier
const [isLoading, setIsLoading] = useState(false);

//UseEffect to prioritize sessionStorage for qrCodeIdentifier from URL or localStorage
useEffect(() => {
  const storedQr = localStorage.getItem('qrCodeIdentifier');
  const storedTable = localStorage.getItem('tableNumber');
  //If not in local storage, check the URL search parameters
    const qrFromUrl = searchParams.get('qr');
    if (qrFromUrl) {
      setQrCodeIdentifier(qrFromUrl);
      console.log('Extended QR Code Identifier from URL:', qrFromUrl);
  
  } else if (storedQr && storedTable) {
    // Found it! Use them immediately
    setQrCodeIdentifier(storedQr);
    setTableNumber(storedTable);
    console.log('Loaded QR Code and Table Number from sessionStorage:', storedQr, storedTable);
    //Instead of immediately setting a random table number or stored one,
    //we will now fetch the actual table number based on this QR ID {
    
    } else {
    // If no QR code identifier in URL, this might be a direct visit or fallback
    //For now, if no QR, we default to "N/A" or "Unknown".
    // You could also redirect them to a page to scan a QR.
    setTableNumber('N/A');
    setQrCodeIdentifier(null); // Ensuring qrCodeIdentifier is null if no valid source
    console.warn('No QR code identifier found in URL. Displaying N/A.');
   }
}, [searchParams]); // Re-run if searchParams change

//useEffect to fetch the actual table number from the backend using the QR ID
useEffect(() => {
    const fetchTableNumber = async () => {
      if (!qrCodeIdentifier) { // Only fetch if qrCodeIdentifier is available
        setIsLoading(false); // If no QR, nothing to load
        return;
      }

      // Reset tableNumber and set loading to true whenever qrCodeIdentifier triggers a new fetch
      setTableNumber('Fetching...'); // Show immediate feedback that it's loading
      setIsLoading(true);

      console.log(`HomePage: Attempting to fetch table for QR ID: ${qrCodeIdentifier}`);
      console.log(`HomePage: API URL: ${API_BASE_URL}/tables/qr/${qrCodeIdentifier}`);

      try {
        const res = await fetch(`${API_BASE_URL}/tables/qr/${qrCodeIdentifier}`);
        console.log('HomePage: Response status:', res.status);

        if (!res.ok) {
          // If the QR is not found or other backend error, set a clear message
          const errorData = await res.json();
          throw new Error(errorData.message || 'Failed to fetch table details.');
        }

        const data: FetchTableResponse = await res.json();
        console.log('HomePage: Fetched table data:', data);

        if (data && data.data && data.data.tableNumber) {
          const fetchedTableNum = data.data.tableNumber;
          setTableNumber(fetchedTableNum); // Set the actual tableNumber for display
          // Store the newly fetched table number and QR ID in localStorage
          localStorage.setItem('tableNumber', fetchedTableNum);
          localStorage.setItem('qrCodeIdentifier', qrCodeIdentifier);
          console.log(`HomePage: Successfully fetched and set tableNumber: ${fetchedTableNum}`);
        } else {
          console.warn('HomePage: Fetched data is missing tableNumber:', data);
          setTableNumber('Table Not Found');
          // Clear localStorage if the QR somehow led to invalid data
          localStorage.removeItem('tableNumber');
          localStorage.removeItem('qrCodeIdentifier');
        }
      } catch (error: any) {
        console.error('HomePage: Error fetching table details:', error);
        setTableNumber(`Error: ${error.message}`); // Indicate an error in the UI
        localStorage.removeItem('tableNumber'); // Clear invalid stored data
        localStorage.removeItem('qrCodeIdentifier');
      } finally {
        setIsLoading(false); // Always set loading to false after the fetch attempt
      }
    };

    fetchTableNumber();
  }, [qrCodeIdentifier]); // This effect ONLY depends on qrCodeIdentifier

  // Render loading state for the whole page
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#fdd7a2]">
        <p className="text-xl text-gray-800">Loading table details...</p>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      
      <div style={yellowBoxStyle}>
        <button style={buttonStyle}>
          Categories <img src="/red_button.svg" alt="icon" style={iconStyle} />
        </button>
      </div>

      {/*seperate division for table number adjustments*/}
      <div style={tableNumberContainerStyle}>
        <h1 style={tableNumberStyle}>Table No: {tableNumber}</h1>
        </div>

      <MyOrderButton />
      <FoodMenu />
      <ActionButtons />              
    </div>
  );
}

// Styles defined and cast to React.CSSProperties
const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column', // Stack elements vertically
  justifyContent: 'flex-start',
  alignItems: 'flex-start',
  minHeight: '200vh', // Ensure extra height for scrolling
  paddingTop: '80px',
  paddingLeft: '20px', // Add padding as needed for alignment
  backgroundColor: '#fdd7a2',
  overflowY: 'auto', // Enable vertical scrolling
};

// Centered Table Number Style
const tableNumberContainerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  width: '100%', // Make it full width to center properly
  marginTop: '0px', // Adjust spacing
};

// Table number text (Matches Categories button size)
const tableNumberStyle: React.CSSProperties = {
  fontSize: '14px', // Match Categories button font size
  fontFamily: "'Montserrat', sans-serif",
  fontWeight: 600,
  color: 'black', // Ensure it's visible
};

const yellowBoxStyle: React.CSSProperties = {
  backgroundColor: '#F5B849', // Yellow box color
  borderRadius: '10px', // Optional: round corners
  padding: '10px -15px', // Padding inside the yellow box
  display: 'inline-flex', // Align content inline within the box
  alignItems: 'center',
  marginBottom: '20px', // Optional: Space below the yellow box
  marginTop: '10px',
  marginLeft: '-25px',
};

const buttonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '10px 24px',
  fontSize: '14px',
  fontFamily: "'Montserrat', sans-serif",
  fontWeight: 600,
  cursor: 'pointer',
  backgroundColor: 'transparent', // Remove button background to show yellow box
  border: 'none', // Remove button border
  color: 'black',
  textAlign: 'right', // Align text to the right inside the button
};
const iconStyle: React.CSSProperties = {
  width: '15px',
  height: '15px',
  marginLeft: '7px',
};
