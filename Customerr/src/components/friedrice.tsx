'use client';

import React, { CSSProperties, useState } from 'react';

const LeftSideTextTwo = () => {
  const [quantities, setQuantities] = useState([0, 0, 0]);

  const itemNames = ['Chicken Gravy Rice', 'Buff Gravy Rice', 'Veg Gravy Rice'];

  const decreaseQuantity = (index: number) => {
    setQuantities((prev) =>
      prev.map((q, i) => (i === index && q > 0 ? q - 1 : q))
    );
  };

  const increaseQuantity = (index: number) => {
    setQuantities((prev) =>
      prev.map((q, i) => (i === index ? q + 1 : q))
    );
  };

  return (
    <div style={styles.container}>
      <div style={styles.textStyle}>Fried Rice</div>

      <img src="/pictures/Friedrice.png" alt="Fried Rice" style={styles.imageStyle} />

      {quantities.map((quantity, index) => (
        <div style={styles.buttonContainer} key={index}>
          <span style={styles.itemName}>{itemNames[index]}</span>
          <span style={styles.plate}>Per Set</span>
          <span style={styles.price}>$5</span>

          <div style={styles.quantityContainer}>
            <span style={styles.quantityButton} onClick={() => decreaseQuantity(index)}>
              -
            </span>
            <div style={styles.quantityBox}>{quantity}</div>
            <span style={styles.quantityButton} onClick={() => increaseQuantity(index)}>
              +
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

// Exact styles integrated from the old version
const styles: { [key: string]: CSSProperties } = {
  container: {
    position: 'relative',
    width: '100%',
    padding: '0px 1px',
    margin: '0 auto',
    maxWidth: '500px',
  },
  textStyle: {
    position: 'absolute',
    left: '140px',
    transform: 'translateY(-50%)',
    fontSize: '17px', // Exact font size
    fontWeight: 'bold',
    color: '#333',
    marginTop: '40px',
    fontFamily: "'Montserrat', sans-serif",
  },
  imageStyle: {
    width: '80px', // Exact image width
    height: 'auto',
    margin: '10px auto',
    display: 'block',
    marginLeft: '135px',
    marginTop: '55px',
    borderRadius: '20px', // Exact border radius
  },
  buttonContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '100%',
    marginTop: '8px',
  },
  itemName: {
    fontSize: '14px', // Exact font size
    fontWeight: 'bold',
    color: '#555',
    cursor: 'pointer',
    fontFamily: "'Montserrat', sans-serif",
    whiteSpace: 'normal',
    overflow: 'hidden',
    wordWrap: 'break-word',
    width: '150px', // Exact width
    display: 'inline-block',
  },
  plate: {
    fontSize: '14px', // Exact font size
    color: '#777',
    fontFamily: "'Montserrat', sans-serif",
    whiteSpace: 'nowrap',
    marginRight: '18px', // Exact margin
  },
  price: {
    fontSize: '14px', // Exact font size
    color: '#777',
    fontFamily: "'Montserrat', sans-serif",
    whiteSpace: 'nowrap',
  },
  quantityContainer: {
    display: 'flex',
    alignItems: 'center',
    marginLeft: '20px', // Exact margin
  },
  quantityButton: {
    fontSize: '20px', // Exact font size
    fontWeight: 'bold',
    color: '#555',
    cursor: 'pointer',
    width: '30px', // Exact width
    height: '30px', // Exact height
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    border: '1px solid #ccc',
    borderRadius: '4px',
    margin: '0 5px', // Exact margin
  },
  quantityBox: {
    fontSize: '14px', // Exact font size
    color: '#333',
    width: '30px', // Exact width
    height: '30px', // Exact height
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    border: '1px solid #ccc',
    borderRadius: '4px',
  },
};

export default LeftSideTextTwo;
