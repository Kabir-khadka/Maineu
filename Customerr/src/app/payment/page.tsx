'use client';

import React, { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { useOrder } from "../context/OrderContext";

const PaymentPage: React.FC = () => {
    const router = useRouter();
    const [isHovered, setIsHovered] = useState(false);
    const [isEsewaHovered, setIsEsewaHovered] = useState(false);
    const [isClient, setIsClient] = useState(false);
    const [showNotice, setShowNotice] = useState(false);
    const { orderItems } = useOrder();

    const totalBill = orderItems.reduce(
        (total, item) => total + item.quantity * item.price,
        0
    );

    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        if (showNotice) {
            const handleClickOutside = () => {
                setShowNotice(false);
            };

            document.addEventListener('click', handleClickOutside);

            return () => {
                document.removeEventListener('click', handleClickOutside);
            };
        }
    }, [showNotice]);

    const handleEsewaPayment = () => {
        window.location.href = "intent://esewa/#Intent;scheme=esewa;package=com.f1soft.esewa;end";
    };

    return (
        <div style={pageStyle}>
            <button style={backButtonStyle} onClick={() => router.push('/myorder')}>
                ← Back
            </button>

            <h1 style={headingStyle}>Payment</h1>

            <div style={billContainerStyle}>
                <div style={billHeaderStyle}>
                    <h2 style={billTitleStyle}>Order Summary</h2>
                    <div style={dateStyle}>{new Date().toLocaleDateString()}</div>
                </div>

                <div style={billItemsContainerStyle}>
                    <div style={billRowHeaderStyle}>
                        <span style={itemNameHeaderStyle}>Item</span>
                        <span style={qtyHeaderStyle}>Qty</span>
                        <span style={priceHeaderStyle}>Price</span>
                    </div>

                    {orderItems.map((item, index) => (
                        <div key={index} style={billRowStyle}>
                            <span style={itemNameStyle}>{item.name}</span>
                            <span style={qtyStyle}>{item.quantity}</span>
                            <span style={priceStyle}>${(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                    ))}

                    <div style={totalRowStyle}>
                        <span style={totalLabelStyle}>Total Amount</span>
                        <span style={totalAmountStyle}>${totalBill.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            <div style={buttonContainerStyle}>
                <button 
                    style={{ ...bankPayButtonStyle, ...(isHovered ? hoverStyle : {}) }}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowNotice(true);
                    }}
                >
                    Pay with your trusted bank App
                </button>

                {showNotice && (
                    <div style={overlayStyle}>
                        <div style={noticeboardStyle} onClick={(e) => e.stopPropagation()}>
                            <div style={noticeContentStyle}>Please use the QR that's on your table!</div>
                        </div>
                    </div>
                )}

                <h3 style={orStyle}>OR</h3>

                <button 
                    style={{ ...bankPayButtonStyle, ...(isEsewaHovered ? hoverStyle : {}), backgroundColor: '#60BB46' }}
                    onMouseEnter={() => setIsEsewaHovered(true)}
                    onMouseLeave={() => setIsEsewaHovered(false)}
                    onClick={handleEsewaPayment}
                >
                    Pay with Esewa
                </button>
            </div>
        </div>
    );
};


const pageStyle: React.CSSProperties = {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'center',
    backgroundColor: "#fdd7a2",
    padding: '20px',
};

const backButtonStyle: React.CSSProperties = {
    position: 'absolute',
    top: '20px',
    left: '20px',
    padding: '10px 15px',
    fontSize: '14px',
    fontFamily: "'Montserrat', sans-serif",
    fontWeight: 'bold',
    color: '#ffffff',
    backgroundColor: '#F5B849',
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.2)',
};

const headingStyle: React.CSSProperties = {
    marginTop: '60px',
    fontSize: '24px',
    color: '#333',
    textAlign: 'center',
};

const buttonContainerStyle: React.CSSProperties = {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
};

// New styles for bank payment button
const bankPayButtonStyle: React.CSSProperties = {
    marginTop: "20px",
    padding: "12px 24px",
    fontSize: "16px",
    fontFamily: "'Montserrat', sans-serif",
    fontWeight: 'bold',
    color: 'white',
    backgroundColor: '#2ecc71',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    boxShadow: '0px 4px 6px rgba(0, 0, 0, 0.1)',
};

const hoverStyle: React.CSSProperties = {
    backgroundColor: '#27ae60',
    transform: 'translateY(-2px)',
    boxShadow: '0px 6px 8px rgba(0, 0, 0, 0.2)',
};

const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
};

const noticeboardStyle: React.CSSProperties = {
    backgroundColor: '#d4bc83',  // Aged paper color
    padding: '40px 30px',
    borderRadius: '8px',
    maxWidth: '90%',
    width: '400px',
    position: 'relative',
    backgroundImage: `
        radial-gradient(#c4a875 15%, transparent 16%),
        radial-gradient(#c4a875 15%, transparent 16%)
    `,
    backgroundSize: '10px 10px',
    backgroundPosition: '0 0, 5px 5px',
    border: '8px solid #8b4513',  // Brown border
    boxShadow: `
        0 0 10px rgba(0,0,0,0.5),
        inset 0 0 30px rgba(139,69,19,0.3)
    `,
    transform: 'rotate(-1deg)',  // Slight tilt
    fontFamily: '"Palatino", serif',  // More classical font
};

const noticeContentStyle: React.CSSProperties = {
    textAlign: 'center',
    fontSize: '1.5rem',
    color: '#441',  // Dark brown text
    textShadow: '1px 1px 1px rgba(0,0,0,0.1)',
    position: 'relative',
    padding: '20px 0',
    borderTop: '2px solid #8b4513',
    borderBottom: '2px solid #8b4513',
    margin: '10px 0',
    lineHeight: '1.6',
    letterSpacing: '1px',
};

const billContainerStyle: React.CSSProperties = {
    backgroundColor: 'white',
    borderRadius: '10px',
    padding: '20px',
    width: '90%',
    maxWidth: '500px',
    marginTop: '20px',
    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
    border: '1px solid #add',
};

const billHeaderStyle: React.CSSProperties = {
    borderBottom: '2px dashed #ccc',
    paddingBottom: '10px',
    marginBottom: '15px',
};

const billTitleStyle: React.CSSProperties = {
    fontSize: '20px',
    color: '#333',
    margin: '0 0 5px 0',
    textAlign: 'center',
};

const dateStyle: React.CSSProperties = {
    fontSize: '14px',
    color: '#666',
    textAlign: 'center',
};

const billItemsContainerStyle: React.CSSProperties ={
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
};

const billRowHeaderStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr',
    padding: '8px 0',
    borderBottom: '1px solid #eee',
    fontWeight: 'bold',
    color: '#666',
};

const billRowStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr',
    padding: '8px 0',
    borderBottom: '1px solid #eee',
};

const itemNameHeaderStyle: React.CSSProperties = {
    fontSize: '14px',
};

const qtyHeaderStyle: React.CSSProperties = {
    fontSize: '14px',
    textAlign: 'center',
};

const priceHeaderStyle: React.CSSProperties = {
    fontSize: '14px',
    textAlign: 'right',
};

const itemNameStyle: React.CSSProperties = {
    fontSize: '16px',
};

const qtyStyle: React.CSSProperties = {
    fontSize: '16px',
    textAlign: 'center',
};

const priceStyle: React.CSSProperties = {
    fontSize: '16px',
    textAlign: 'right',
};

const totalRowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '15px 0',
    marginTop: '10px',
    borderTop: '2px dashed #ccc',
    fontWeight: 'bold',
};

const totalLabelStyle: React.CSSProperties = {
    fontSize: '18px',
    color: '#333',
};

const totalAmountStyle: React.CSSProperties = {
    fontSize: '18px',
    color: '#F5B849',
};

const orStyle: React.CSSProperties = {
    marginTop: '30px',
    fontSize: '24px',
    color: '#333',
    textAlign: 'center',
}

export default PaymentPage;