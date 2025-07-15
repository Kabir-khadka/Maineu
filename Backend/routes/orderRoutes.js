const express = require('express');
const router = express.Router();
const Order = require('../models/Order'); // Import the Order model
const ArchivedOrder = require('../models/ArchivedOrder'); // Import the ArchivedOrder model

//Exports a function that takes the 'io' instance
module.exports = (io) => {

// POST route to create a new order
//This route will be used specifically for new items or increases in quantity.
router.post('/orders', async (req, res) => {
    try {
        const { tableNumber, orderItems } = req.body;

        //Filter out items with quantity 0
        const filteredItems = orderItems.filter(item => item.quantity > 0);

        // Prevent saving orders with no valid items
        if(filteredItems.length === 0) {
            return res.status(400).json({ message: 'Order contains no valid items.' });
        }

        const createdOrders = []; // Array to hold all newly created individual order documents

        // Create a new order document with filtered items
        // Creating a SEPARATE Order document for EACH item
        for (const item of filteredItems) {
            // Add this log for debugging the data being saved
            console.log('Backend: Attempting to save new order for item:', item);

            const newOrder = new Order({
                tableNumber,
                orderItems: [{ //Each new order document will have an array with only one item
                    name: item.name,
                    quantity: item.quantity,
                    price: item.price,
                }],
                totalPrice: item.quantity * item.price,
                status: 'In progress',
                statusHistory: [] // Initialize with an empty history
            });

            // Save the order to the database
            await newOrder.save();
            createdOrders.push(newOrder); // Add to the array of created orders

            //Emit a Socket.IO event for a new order
            //This will notify all connected clients (e.g Kitchen, admin)
            io.emit('newOrder', newOrder);
        }
        // Send a response back to the client
        console.log(`Received and processed ${createdOrders.length} individual orders for table ${tableNumber}.`);
        res.status(201).json({ message: 'Orders received successfully!', orders: createdOrders });
    } catch (error) {
        console.error('Error saving orders:', error);
        if (error.name === 'ValidationError') {
            const errors = Object.keys(error.errors).map(key => error.errors[key].message);
            return res.status(400).json({ message: 'Validation failed', errors: errors });
        }
        res.status(500).json({ message: 'Error saving orders' });
    }
});

// 2. GET endpoint: Fetch ALL active (unpaid) orders for a given table number
//    This is crucial for MyOrderPage to know all existing orders to modify/track.
//    We need to fetch ALL active orders to accurately track individual item quantities.
router.get('/orders/table/:tableNumber/active', async (req, res) => {
    try {
        const { tableNumber } = req.params;
        // Find all orders for this table that are NOT 'Paid' or 'Archived'.
        // This ensures 'Cancelled' orders are included for MyOrderPage.
        const activeOrders = await Order.find({
            tableNumber: tableNumber,
            status: { $nin: ['Paid', 'Cancelled']} // Changed from ['Paid', 'Cancelled'] to include Cancelled
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
        // Destructure orderItems, totalPrice, and status from req.body
        const { orderItems, totalPrice, status } = req.body;

        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Prevent modification of 'Paid' or 'Archived' orders
        if (order.status === 'Paid' || order.status === 'Archived') {
            return res.status(400).json({ message: 'Cannot modify a paid or archived order.' });
        }

        // --- CRITICAL FIX START ---
        // Scenario: Client sends an empty orderItems array to signal cancellation of this specific item/order.
        if (orderItems && orderItems.length === 0) {
            // Ensure there's an item to modify and it's not already cancelled
            if (order.orderItems.length > 0) {
                // Preserve the item details but set quantity to 0
                order.orderItems[0].quantity = 0; 
                order.totalPrice = 0; // Total price for this order is now 0
                
                // Only change status to 'Cancelled' if it's not already
                if (order.status !== 'Cancelled') {
                    order.statusHistory.push(order.status); // Push old status to history
                    order.status = 'Cancelled'; // Set new status
                }
                console.log(`Order ${order._id} item quantity set to 0 and status to 'Cancelled'. Item details retained.`);
            } else {
                // Edge case: Order already had no items, just ensure status is cancelled
                order.totalPrice = 0;
                if (order.status !== 'Cancelled') {
                    order.statusHistory.push(order.status);
                    order.status = 'Cancelled';
                }
                console.log(`Order ${order._id} was already empty, setting status to 'Cancelled'.`);
            }
        } else {
            // Standard update: orderItems array contains the updated item(s) with quantity > 0
            order.orderItems = orderItems;
            order.totalPrice = totalPrice;

            // If a status is provided in the request body, update it
            if (status !== undefined) {
                // Validate the incoming status
                if (!['In progress', 'Delivered', 'Paid', 'Cancelled'].includes(status)) {
                    return res.status(400).json({ error: 'Invalid status provided for update.' });
                }

                // Only push to status history if status is actually changing
                if (order.status !== status) {
                    order.statusHistory.push(order.status); // Push the OLD status to history
                    order.status = status; // Update status
                }
            }
        }
        // --- CRITICAL FIX END ---

        await order.save();

        // Emitting a Socket.IO event for an updated order
        io.emit('orderUpdated', order);

        console.log('Updated order (PATCH):', order._id, order.orderItems, 'New Status:', order.status);
        res.json(order);
    } catch (err) {
        console.error('Error updating order:', err);
        res.status(500).json({ error: 'Failed to update order' });
    }
});


//GET - Fetch all orders for admin UI
router.get('/orders', async (req, res) => {
    try {
        // Fetch all orders, including 'Cancelled' ones, but exclude 'Archived' (if 'Archived' is your final removal state)
        const orders = await Order.find({ status: { $nin: ['Archived'] } }).sort({ createdAt: -1 });
        res.status(200).json(orders);
    } catch (err) {
        console.error('Error fetching orders:', err);
        res.status(500).json({ message: 'Error fetching orders' });
    }
});



//PATCH - Update an order status (e.g., from admin panel)
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

        // Only push if status is actually changing
        if (order.status !== status) {
            order.statusHistory.push(order.status);//Pushing old status to history
            order.status = status; //Update status
            await order.save();

            //Emitting a Socket.IO event for order status change
            io.emit('orderStatusUpdated', order);
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

        // If current status is 'Cancelled' and there's history, revert from cancelled
        if (order.status === 'Cancelled' && order.statusHistory.length > 0) {
            const previousStatus = order.statusHistory.pop();
            order.status = previousStatus;
            // Restore item quantity if it was set to 0 due to cancellation
            // This is a heuristic: if quantity was 0 and we're reverting from cancelled,
            // assume it should go back to 1. A more robust solution would store the quantity in statusHistory.
            if (order.orderItems.length > 0 && order.orderItems[0].quantity === 0) {
                order.orderItems[0].quantity = 1; // Default to 1
                order.totalPrice = order.orderItems[0].price; // Recalculate total price
            }
        } else if (order.statusHistory.length > 0) {
            // Normal status revert
            const newStatus = order.statusHistory.pop(); 
            order.status = newStatus;
        } else {
            return res.status(400).json({ error: 'No status history to revert further.' });
        }

        await order.save(); // Save the order with the updated status and history

        //Emitting a Socket.IO event for order status chnage (revert)
        io.emit('orderStatusUpdated', order);

        console.log('Reverted order status:', order._id, 'New Status:', order.status, 'Remaining History:', order.statusHistory);
        res.json(order);
    } catch (err) {
        console.error('Error reverting order status:', err);
        res.status(500).json({ error: 'Failed to revert status' });
    }
});

//DELETE = Delete order (archive)
router.delete('/orders/:id/archive', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: 'Order not found'});

        // Only allow archiving if the order is 'Paid' or 'Cancelled'
        if (order.status !== 'Paid' && order.status !== 'Cancelled') {
            // This condition is correct for your business logic.
            // If the error message "Only paid orders can be archived" is appearing,
            // it means the status is neither 'Paid' nor 'Cancelled'.
            console.warn(`Attempted to archive order ${order._id} with status '${order.status}'. Only Paid or Cancelled orders can be archived.`);
            return res.status(400).json({ message: 'Only paid or cancelled orders can be archived' });
        }

        // --- ADDED: Debugging log for the order object before archiving ---
        console.log(`Attempting to archive order ${order._id}. Order object before toObject():`, JSON.stringify(order.toObject(), null, 2));

        // Copy order to archiveOrders collection
        await ArchivedOrder.create(order.toObject());

        // Delete the original from active orders
        await Order.findByIdAndDelete(order._id);

        // Emit a Socket.IO event for order archived/deleted
        io.emit('orderArchived', { _id: order._id, tableNumber: order.tableNumber }); 

        res.status(200).json({ message: 'Order archived and deleted' });
    } catch (error) {
        // --- IMPROVED ERROR HANDLING ---
        console.error(`Error archiving order ${req.params.id}:`, error);
        if (error.name === 'ValidationError') {
            console.error('Mongoose Validation Error details:', error.errors);
            return res.status(400).json({ message: 'Validation error during archiving: ' + error.message });
        }
        res.status(500).json({ message: 'Error archiving order: ' + error.message });
    }
});

return router;
}
