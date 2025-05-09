'use client';

import React, { useEffect, useState } from 'react';
import styles from './MyOrderButton.module.css';
import Link from 'next/link';

const MyOrderButton: React.FC = () => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true); // Ensure hydration consistency
  }, []);

  return (
    <div className={styles.buttonContainer}>
      {isClient && <span className={styles.notificationDot}></span>}
      {/* Link wraps only the button */}
      <Link href="/myorder">
        <button className={styles.button}>
          <span className={styles.my}>My</span>
          <span className={styles.order}>Order</span>
        </button>
      </Link>
    </div>
  );
};

export default MyOrderButton;
