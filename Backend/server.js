require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const PORT = 5000;

// Declare MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI;

// Connect to MongoDB using Mongoose
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((error) => console.error('Error connecting to MongoDB:', error));

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Import routes
const orderRoutes = require('./routes/orderRoutes');
const menuRoutes = require('./routes/menuRoutes');
const categoryRoutes = require('./routes/categoryRoutes');

// Use routes
app.use('/api', orderRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/categories', categoryRoutes); // ✅ fixed path

// Test route
app.get('/', (req, res) => {
  res.send('Backend is Running!');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
// This code sets up an Express.js server that connects to a MongoDB database using Mongoose. It includes middleware for CORS and body parsing, and it serves static files from the 'uploads' directory. The server has routes for handling orders, menu items, and categories, and it listens on port 5000.