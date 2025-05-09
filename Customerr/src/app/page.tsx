'use client';

import React, { useEffect, useState } from 'react';
import ActionButtons from '../components/ActionButtons';
import MyOrderButton from '../components/myOrderButton';
import FoodMenu from '../components/foodmenu';
import QRCodeDownload from '../components/qrCodeDownload';



export default function HomePage() {
const [tableNumber, setTableNumber] = useState<string>(''); // Table Number State

//Assign a unique table number on page load
useEffect(() =>{
  const storedTableNumber = sessionStorage.getItem('tableNumber');
  if(!storedTableNumber) {
    //If no table number exists, generate a random one(e.g between 1 and 1000)
    const randomTableNumber = Math.floor(Math.random() * 1000) +1;
    sessionStorage.setItem('tableNumber', randomTableNumber.toString());
    setTableNumber(randomTableNumber.toString());

  } else {
    setTableNumber(storedTableNumber);
  }
}, []);

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
