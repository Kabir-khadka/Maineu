'use client';

import React, { use, useEffect, useState } from 'react';
import { useOrder } from '@/app/context/OrderContext';

interface MenuItem {
  _id: string;
  name: string;
  price: number;
  category: string;
  available: boolean;
  image: string;
}

interface MenuItemWithQuantity extends MenuItem {
  quantity: number;
}

const FoodMenu = () => {
  const { addOrderItem } = useOrder();
  const [activeButton, setActiveButton] = useState<string | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItemWithQuantity[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);

  // Fecth categories from the server
  const fetchCategories = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/menu/categories/all');
        if (!res.ok) throw new Error('Failed to fetch categories');
        const categoryNames: string[] = await res.json();
        setCategories(categoryNames);
        // Automatically activate the first category
    if (categoryNames.length > 0) {
      setActiveButton(prev => prev || categoryNames[0]);
    }
  } catch (err) {
    console.error(err);
    setError('Failed to load categories');
  }
};

  const fetchMenuItems = async (category: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`http://localhost:5000/api/menu?category=${category}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data: MenuItem[] = await res.json();
      // Add quantity field to each item
      const itemsWithQuantity: MenuItemWithQuantity[] = data.map(item => ({
        ...item,
        quantity: 0,
      }));
      setMenuItems(itemsWithQuantity);
    } catch (err) {
      setError('Failed to fetch items');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (activeButton) {
      fetchMenuItems(activeButton);
    }
  }, [activeButton]);

  const handleButtonClick = (category: string) => {
    setActiveButton(category);
  };

  const increaseQuantity = (item: MenuItemWithQuantity) => {
    const updatedItems = menuItems.map((menuItem) =>
      menuItem._id === item._id
    ? { ...menuItem, quantity: menuItem.quantity + 1 }
    : menuItem
  );
  setMenuItems(updatedItems);
  addOrderItem({
    name: item.name,
    quantity: item.quantity + 1,
    price: item.price,
  });
  };

  const decreaseQuantity = (item : MenuItemWithQuantity) => {
    if (item.quantity > 0) {
      const updatedItems = menuItems.map((menuItem) => 
        menuItem._id == menuItem._id
          ? { ...menuItem, quantity: Math.max(0, menuItem.quantity - 1)}
           : menuItem
        );
        setMenuItems(updatedItems);
        addOrderItem({
          name: item.name,
          quantity: Math.max(0, item.quantity - 1),
          price: item.price,
        });
    }
  };

  return (
    <div style={styles.container}>
      {/* Category Buttons */}
      <div style={styles.buttonGrid}>
        {categories.map((item) => (
          <button
            key={item}
            onClick={() => handleButtonClick(item)}
            style={{
              ...styles.button,
              ...(activeButton === item ? styles.activeButton : {}),
            }}
          >
            <span style={styles.text}>{item}</span>
          </button>
        ))}
      </div>

      {/* Available items (optional button) */}
      <div style={styles.availableItemsContainer}>
        <button style={styles.availableItemsButton}>Available items</button>
      </div>

      {/* Render menu items */}
      <div style={styles.contentContainer}>
        <h2>{activeButton} Items</h2>
        {isLoading ? (
          <p>Loading...</p>
        ) : error ? (
          <p style={{ color: 'red' }}>{error}</p>
        ) : menuItems.length === 0 ? (
          <p>No items in this category.</p>
        ) : (
          menuItems.map((item) => (
            <div key={item._id} style={styles.card}>
              <img
                src={`http://localhost:5000${item.image}`}
                alt={item.name}
                style={styles.image}
              />
              <div style={styles.details}>
                <h3 style={styles.itemName}>{item.name}</h3>
                <p style={styles.price}>${item.price.toFixed(2)}</p>
                <p style={styles.status}>
                  {item.available ? 'Available' : 'Unavailable'}
                </p>
                <div style={styles.quantityControls}>
                  <button onClick={() => decreaseQuantity(item)}>-</button>
                  <span>{item.quantity}</span>
                  <button onClick={() => increaseQuantity(item)}>+</button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// 🔧 Styling
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '10px',
    width: '100%',
  },
  buttonGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '10px',
    width: '100%',
    maxWidth: '600px',
    justifyContent: 'center',
    marginLeft: '-15px',
  },
  button: {
    padding: '10px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    border: '1px solid #ccc',
    borderRadius: '6px',
    background: 'none',
    color: '#333',
    textAlign: 'center',
    transition: 'background 0.3s ease, transform 0.2s ease',
  },
  activeButton: {
    background: '#444',
    color: '#fff',
    boxShadow: '2px 2px 5px rgba(0, 0, 0, 0.3)',
  },
  text: {
    fontWeight: 'bold',
  },
  availableItemsContainer: {
    marginTop: '15px',
  },
  availableItemsButton: {
    padding: '12px 5px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    backgroundColor: 'transparent',
    color: '#FF4500',
    borderRadius: '10px',
    border: 'none',
    textShadow: '1px 2px 4px rgba(0, 0, 0, 0.4)',
    transition: 'all 0.3s ease',
    marginLeft: '200px',
  },
  contentContainer: {
    marginTop: '20px',
    width: '100%',
    maxWidth: '600px',
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  card: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '10px',
    backgroundColor: '#f9f9f9',
  },
  image: {
    width: '80px',
    height: '80px',
    borderRadius: '8px',
    objectFit: 'cover',
  },
  details: {
    flex: 1,
  },
  itemName: {
    margin: 0,
  },
  price: {
    margin: '4px 0',
  },
  status: {
    fontSize: '12px',
    color: '#666',
  },
  quantityControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginTop: '8px',
  },
};

export default FoodMenu;