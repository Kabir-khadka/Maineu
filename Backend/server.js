require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const app = express();
const PORT = 5000;

//Declare MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI;

//Connect to MongoDB using Mongoose
mongoose.connect(MONGODB_URI) 
  .then(() => console.log('Connected to MongoDB'))
  .catch((error) => console.error('Error connecting to MongoDB:', error));


//Middleware
app.use(cors());
app.use(bodyParser.json());

//Import routes
const orderRoutes = require('./routes/orderRoutes');
const menuRoutes = require('./routes/menuRoutes');

//Routes
app.use('/api', orderRoutes);
app.use('/api/menu', menuRoutes);

// Test Route
app.get('/', (req, res) => {
    res.send('Backend is Running!');
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});