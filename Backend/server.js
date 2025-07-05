require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const path = require('path');
const syncPredefinedCategories = require('./utils/syncCategories');

const http = require('http');
const { Server } = require('socket.io');

const app = express();
const PORT = process.env.PORT || 5000;

// Define the allowed origins for CORS.
// Include both your CLIENT_URL from .env and http://localhost:3000
// Add http://127.0.0.1:3000 as well for comprehensive local testing
const allowedOrigins = [
    process.env.CLIENT_URL, // This will be "http://192.168.1.74:3000" if set in .env
    "http://localhost:3000",
].filter(Boolean); // Filter out any empty/undefined values if CLIENT_URL is not set

// Middleware
// Apply CORS for Express routes
app.use(cors({
    origin: allowedOrigins, // Use the array for Express routes
    credentials: true, // Important if you send cookies or authentication headers
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Creating HTTP server and integrating Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: allowedOrigins, // Use the same array for Socket.IO
        methods: ["GET", "POST"]
    }
});

//New: Socket.IO connection handling
io.on('connection', (socket) => {
    console.log(`⚡: ${socket.id} user just connected!`);

    socket.on('disconnect', () => {
        console.log('🔥: A user disconnected');
    });
});

// Import routes
const orderRoutes = require('./routes/orderRoutes');
const menuRoutes = require('./routes/menuRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const tableRoutes = require('./routes/tableRoutes');

// Use routes, passing the 'io' instance
app.use('/api', orderRoutes(io));
app.use('/api/menu', menuRoutes(io));
app.use('/api/categories', categoryRoutes(io));
app.use('/api/tables', tableRoutes(io));

// Test route
app.get('/', (req, res) => {
    res.send('Backend is Running!');
});

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log('✅ MongoDB Atlas connected');

        // 👉 Sync categories after DB is connected
        await syncPredefinedCategories();

        // Start the server after sync
        server.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`); // This can stay http://localhost for logging
        });
    })
    .catch(err => {
        console.error('❌ MongoDB connection error:', err);
        process.exit(1);
    });

module.exports = { app, io, server };