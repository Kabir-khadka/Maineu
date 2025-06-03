const express = require('express');
const router = express.Router();
const Order = require('../models/Order'); // Import the Order model
const ArchivedOrder = require('../models/ArchivedOrder'); // Import the ArchivedOrder model


// POST route to create a new order
//This route will be used specifically for new items or increases in quantity.
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
        console.log('Recieved order:', newOrder._id, req.body);
        res.status(201).json({message: 'Order recieved successfully!', orderId: newOrder._id});
    } catch (error) {
        console.error('Error saving order:', error);
        res.status(500).json({message: 'Error saving order' });
    }
});

// 2. GET endpoint: Fetch ALL active (unpaid) orders for a given table number
//    This is crucial for MyOrderPage to know all existing orders to modify/track.
//    We need to fetch ALL active orders to accurately track individual item quantities.
router.get('/orders/table/:tableNumber/active', async (req, res) => {
    try {
        const { tableNumber } = req.params;
        // Find all orders for this table that are NOT 'Paid'
        const activeOrders = await Order.find({
            tableNumber: tableNumber,
            status: { $nin: ['Paid', 'Cancelled']}
        }).sort({ createdAt: 1 }); // Sort by creation date to process oldest first if needed

        res.status(200).json(activeOrders);
    } catch (err) {
        console.error('Error fetching active orders for table:', err);
        res.status(500).json({ message: 'Error fetching active orders' });
    }
});

//PATCH endpoint to update an existing order's items
//This will be used when a table modifies an existing order(decrease, removal)
router.patch('/orders/:id', async (req, res) => {
    try {
         // Destructure status from req.body as well
        const { orderItems, totalPrice, status} = req.body;

        //orderItems can be an empty array if all items are removed from this specidic order
        if (orderItems === undefined || totalPrice === undefined) {
            return res.status(400).json({ message: 'Missing order items or total price data.'});

        }

        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        if (order.status === 'Paid') {
            return res.status(400).json({ message: 'Cannot modify a paid order.' });
        }

        //Update order items and total price by replacing the existing arrays
        order.orderItems = orderItems;
        order.totalPrice = totalPrice;

        //If a status is provided in the request body, update it
        if (status !== undefined) {
            // Validate the incoming status to ensure its one of the following allowed enums
            if (!['In progress', 'Delivered', 'Paid', 'Cancelled'].includes(status)) {
                return res.status(400).json({ error: 'Invalid status provided for update .' });
            }

            //Only push to status history if status is actually changing and its not the initial 'cancelled' state
            if (order.status !== status) {
                //Its good practise to push the OLD status to history before updating
                order.statusHistory.push(order.status);
                order.status = status;
            }
        }
        await order.save();

        console.log('Updated order (PATCH):', order._id, orderItems, 'New Status:', order.status);
        res.json(order);
    } catch (err) {
        console.erorr('Error updating order:', err);
        res.status(500).json({ error: 'Failed to update order' });
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



//PATCH - Update an order status
router.patch('/orders/:id/status', async (req, res) => {
    const { status } = req.body;

    if (!['In progress', 'Delivered', 'Paid', 'Cancelled'].includes(status)){
        return res.status(400).json({ error: 'Invalid status' });
    }

    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        //Only push if status is actually changing
        if (order.status !== status) {
            order.statusHistory.push(order.status);//Pushing old status to history
            order.status = status; //Update status
            await order.save();
        }
        res.json(order);
    } catch (error) {
        console.error('Error updating the order status:', error);
        res.status(500).json({ error: 'Failed to update status' });
    }
});

//PATCH - Revert to previous status
router.patch('/orders/:id/revert-status', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        if (order.statusHistory.length === 0) {
            // If no history, and current status is not 'In progress', then it's the first state.
            // We can't revert further.
            return res.status(400).json({ error: 'No status history to revert further.' });
        }

        // Pop the last status from history
        const newStatus = order.statusHistory.pop(); 

        // Set the current status to the popped history status
        order.status = newStatus;

        await order.save(); // Save the order with the updated status and history

        console.log('Reverted order status:', order._id, 'New Status:', order.status, 'Remaining History:', order.statusHistory);
        res.json(order);
    } catch (err) {
        console.error('Error reverting order status:', err);
        res.status(500).json({ error: 'Failed to revert status' });
    }
});

//DELETE = Delete order 
router.delete('/orders/:id/archive', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: 'Order not found'});

        if (order.status !== 'Paid' && order.status !== 'Cancelled') {
            return res.status(400).json({ message: 'Only paid orders can be archived' });
        }

        //Copy order to archiveOrders collection
        await ArchivedOrder.create(order.toObject());

        //Delete the original from active orders
        await Order.findByIdAndDelete(order._id);

        res.status(200).json({ message: 'Order archived and deleted' });
    } catch (error) {
        console.error('Error archiving order:', error);
        res.status(500).json({ message: 'Error archiving order' });
    }
});



module.exports = router;

//The /api/orders POST route receives order data from the frontend.

//It creates and saves a new order document to MongoDB.

//Returns a success message and order ID.