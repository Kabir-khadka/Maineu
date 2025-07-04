// Customer/src/lib/socket.js

import { io } from 'socket.io-client';

// Get the backend URL from environment variables
// It's crucial that NEXT_PUBLIC_BACKEND_URL points to your backend's Socket.IO server address
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

// Initialize the Socket.IO client
// The 'io()' function attempts to connect to the URL where the script is served from by default.
// However, since our backend is on a different port/origin, we explicitly provide its URL.
const socket = io(BACKEND_URL, {
  // You can add options here if needed, e.g., for authentication headers
  // auth: {
  //   token: 'your_auth_token_if_any'
  // },
  // transports: ['websocket'] // Optionally force WebSocket transport
});

// Basic connection logging for debugging
socket.on('connect', () => {
  console.log('⚡ Connected to Socket.IO backend!');
  console.log('Socket ID:', socket.id);
});

socket.on('disconnect', () => {
  console.log('🔥 Disconnected from Socket.IO backend');
});

socket.on('connect_error', (err) => {
  console.error('❌ Socket.IO connection error:', err.message);
});

// Export the socket instance so it can be imported and used in other components
export default socket;