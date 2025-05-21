const express = require('express');
const router = express.Router();
const Order = require('../models/Order'); // Import the Order model



// POST route to create a new order
router.post('/orders', async (req, res) => {
    try {
        const { tableNumber, orderItems, totalPrice } = req.body;

        //Filter out items with quantity 0
        const filteredItems = orderItems.filter(item => item.quantity > 0);

        // Prevent saving orders with no valid items
        if(filteredItems.length === 0) {
            return res.status(400).json({ message: 'Order contains no valid items.' });
        }

        // Create a new order document with filtered items
        const newOrder = new Order({
            tableNumber,
            orderItems: filteredItems,
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

//GET - Fetch all orders for admin UI
router.get('/orders', async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 });
        res.status(200).json(orders);
    } catch (err) {
        console.error('Error fetching orders:', err);
        res.status(500).json({ messsage: 'Error fetching orders' });
    }
});

//PATCH - Update order status
router.patch('/orders/:id/status', async (req, res) => {
    const { status } = req.body;

    if (!['In progress', 'Delivered', 'Paid'].includes(status)){
        return res.status(400).json({ error: 'Invalid status' });
    }

    try {
        const order = await Order.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        res.json(order);
    } catch (error) {
        console.error('Error updating the order status:', error);
        res.status(500).json({ error: 'Failed to update status' });
    }
});

module.exports = router;

//The /api/orders POST route receives order data from the frontend.

//It creates and saves a new order document to MongoDB.

//Returns a success message and order ID.