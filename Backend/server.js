require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const path = require('path');
const syncPredefinedCategories = require('./utils/syncCategories');

const app = express();
const PORT = process.env.PORT || 5000;

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
app.use('/api/categories', categoryRoutes);

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
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1); // Exit the process with an error code
  });