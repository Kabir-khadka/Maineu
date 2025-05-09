'use client';

import React, { CSSProperties, useState } from 'react';
import { useOrder } from '@/app/context/OrderContext';

const itemNames = ['Buff Laphing', 'Veg Laphing (Chips)', 'Chicken Laphing'];

const LeftSideText = () => {
  const [quantities, setQuantities] = useState<{ [key: string]: number }>({
    'Buff Laphing': 0,
    'Veg Laphing (Chips)': 0,
    'Chicken Laphing': 0,
  });

  const { addOrderItem } = useOrder();

  const decreaseQuantity = (itemName: string) => {
    setQuantities((prev) => ({
      ...prev,
      [itemName]: Math.max(0, prev[itemName] - 1),
    }));
  };

  const increaseQuantity = (itemName: string) => {
    const newQuantity = quantities[itemName] + 1;
    setQuantities((prev) => ({
      ...prev,
      [itemName]: newQuantity,
    }));

    if (newQuantity > 0) {
      addOrderItem({
        name: itemName,
        quantity: newQuantity,
        price: 5,
      });
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.textStyleTwo}>Our Specials</div>
      <div style={styles.textStyle}>Laphing</div>
      <img
        src="/pictures/laphing.jpg"
        alt="Laphing"
        style={styles.imageStyle}
      />
      {itemNames.map((itemName) => (
        <ItemRow
          key={itemName}
          itemName={itemName}
          quantity={quantities[itemName]}
          onDecrease={() => decreaseQuantity(itemName)}
          onIncrease={() => increaseQuantity(itemName)}
        />
      ))}
    </div>
  );
};

interface ItemRowProps {
  itemName: string;
  quantity: number;
  onDecrease: () => void;
  onIncrease: () => void;
}

const ItemRow = ({ itemName, quantity, onDecrease, onIncrease }: ItemRowProps) => (
  <div style={styles.buttonContainer}>
    <span style={styles.itemName}>{itemName}</span>
    <span style={styles.plate}>Per Set</span>
    <span style={styles.price}>$5</span>
    <div style={styles.quantityContainer}>
      <button
        style={styles.quantityButton}
        onClick={onDecrease}
        aria-label={`Decrease ${itemName} quantity`}
      >
        -
      </button>
      <div style={styles.quantityBox}>{quantity}</div>
      <button
        style={styles.quantityButton}
        onClick={onIncrease}
        aria-label={`Increase ${itemName} quantity`}
      >
        +
      </button>
    </div>
  </div>
);

// Exact styles integrated from old version
const styles: { [key: string]: CSSProperties } = {
  container: {
    position: 'relative',
    width: '100%',
    padding: '0px 1px',
    margin: '0 auto',
    maxWidth: '500px',
    
  },
  
  textStyleTwo: {
    position: 'absolute',
    left: '125px',
    transform: 'translateY(-50%)',
    fontSize: '17px', // Exact font size
    fontWeight: 'bold',
    color: '#333',
    marginTop: '15px',
    fontFamily: "'Montserrat', sans-serif",
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

export default LeftSideText;
