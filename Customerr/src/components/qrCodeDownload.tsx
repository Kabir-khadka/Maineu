// components/QRCodeDownload.tsx

'use client';  // This marks this file as a client component

import React, { useRef } from 'react';
import QRCode from 'qrcode'; // Use qrcode package

const QRCodeDownload = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // The URL to encode in the QR code
  const homepageUrl = 'https://6e6c-2400-1a00-b080-6110-a18a-7ee8-f31d-675a.ngrok-free.app';

  // Function to generate and download the QR code
  const generateQRCode = async () => {
    if (canvasRef.current) {
      try {
        // Generate QR code with the 'qrcode' package and draw it on the canvas
        await QRCode.toCanvas(canvasRef.current, homepageUrl);

        // Once generated, enable download
        const imageUrl = canvasRef.current.toDataURL('image/png'); // Convert to data URL
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = 'homepage-qr-code.png'; // Set the filename for download
        link.click(); // Trigger the download
      } catch (err) {
        console.error('Error generating QR code', err);
      }
    }
  };

  return (
    <div>
      <h3>Generate and Download QR Code</h3>
      {/* Canvas where QR code will be drawn */}
      <canvas ref={canvasRef}></canvas>
      <button onClick={generateQRCode}>Download QR Code</button>
    </div>
  );
};

export default QRCodeDownload;
