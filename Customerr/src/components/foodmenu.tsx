'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useOrder } from '@/app/context/OrderContext';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

interface MenuItem {
  _id: string;
  name: string;
  price: number;
  category: string;
  available: boolean;
  image: string;
}

interface MenuItemWithQuantity extends MenuItem {
  // This quantity is now solely for tracking new additions made *within this FoodMenu session*.
  // It resets to 0 whenever the FoodMenu loads/reloads or a category changes.
  quantity: number;
}

const FoodMenu = () => {
  const { increaseItemQuantity, decreaseItemQuantity } = useOrder();
  const [activeButton, setActiveButton] = useState<string | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItemWithQuantity[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);

  // Fetch categories from the server
  const fetchCategories = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/menu/categories/all`);
      if (!res.ok) throw new Error('Failed to fetch categories');
      const categoryNames: string[] = await res.json();
      setCategories(categoryNames);
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
      const res = await fetch(`${BACKEND_URL}/api/menu?category=${category}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data: MenuItem[] = await res.json();
      // Crucially, always initialize quantities to 0 for the FoodMenu display
      const itemsWithQuantity: MenuItemWithQuantity[] = data.map(item => ({
        ...item,
        quantity: 0, // This is exactly what you want: always start at 0 here
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

  // --- FIXED QUANTITY HANDLERS WITH useCallback ---
  const handleIncreaseQuantity = useCallback((item: MenuItemWithQuantity) => {
    console.log('handleIncreaseQuantity called for:', item.name);
    
    // Update local state first
    setMenuItems(prevItems => {
      return prevItems.map(menuItem => {
        if (menuItem._id === item._id) {
          const newLocalQuantity = menuItem.quantity + 1;
          return { ...menuItem, quantity: newLocalQuantity };
        }
        return menuItem;
      });
    });

    // Then update the OrderContext
    increaseItemQuantity(item.name, item.price);
  }, [increaseItemQuantity]);

  const handleDecreaseQuantity = useCallback((item: MenuItemWithQuantity) => {
    console.log('handleDecreaseQuantity called for:', item.name);
    
    // Update local state first
    setMenuItems(prevItems => {
      return prevItems.map(menuItem => {
        if (menuItem._id === item._id && menuItem.quantity > 0) {
          const newLocalQuantity = menuItem.quantity - 1;
          return { ...menuItem, quantity: newLocalQuantity };
        }
        return menuItem;
      });
    });

    // Then update the OrderContext
    decreaseItemQuantity(item.name);
  }, [decreaseItemQuantity]);
  // --- END FIXED QUANTITY HANDLERS ---

  return (
    <div style={styles.container}>
      {/* Category Buttons */}
      <div style={styles.buttonGrid}>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => handleButtonClick(cat)}
            style={{
              ...styles.button,
              ...(activeButton === cat ? styles.activeButton : {}),
            }}
          >
            <span style={styles.text}>{cat}</span>
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
                src={`${BACKEND_URL}${item.image}`}
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
                  <button 
                    onClick={() => handleDecreaseQuantity(item)}
                    disabled={item.quantity === 0}
                    style={{
                      ...styles.quantityButton,
                      opacity: item.quantity === 0 ? 0.5 : 1,
                      cursor: item.quantity === 0 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    -
                  </button>
                  {/* This quantity is now purely the local count for this FoodMenu session */}
                  <span style={styles.quantityDisplay}>{item.quantity}</span>
                  <button 
                    onClick={() => handleIncreaseQuantity(item)}
                    style={styles.quantityButton}
                  >
                    +
                  </button>
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
    backgroundColor: '#fdd7a2',
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