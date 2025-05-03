const express = require('express');
const router = express.Router();
const Order = require('../models/Order'); // Import the Order model



// POST route to create a new order
router.post('/orders', async (req, res) => {
    try {
        const { tableNumber, orderItems, totalPrice } = req.body;

        // Create a new order document
        const newOrder = new Order({
            tableNumber,
            orderItems,
            totalPrice,
        });

        // Save the order to the database
        await newOrder.save();
        // Send a response back to the client
        console.log('Recieved order:', req.body);
        res.status(201).json({message: 'Order recieved successfully!', orderId: newOrder._id});
    } catch (error) {
        console.error('Error saving order:', error);
        res.status(500).json({message: 'Error saving order' });
    }
});

module.exports = router;

//The /api/orders POST route receives order data from the frontend.

//It creates and saves a new order document to MongoDB.

//Returns a success message and order ID.