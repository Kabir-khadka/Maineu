const express = require('express');
const router = express.Router();
const Table = require('../models/Table'); // Import the Table model
const { authorizeAdmin } = require('../middlewares/authMiddleware'); // Import the authorization middleware


//Exporting a function that takes the 'io' instance
module.exports = (io) => {


// Crud operations for Table model

//GET all tables
//GET /api/tables
router.get('/', async (req, res) => {
    try {
        const tables = await Table.find({});
        res.status(200).json({ success: true, count: tables.length, data: tables });
    } catch (error) {
        console.error('Error fetching tables:', error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
});

//GET a single table by tableNumber
//GET /api/tables/:tableNumber
router.get('/:tableNumber', async (req, res) => {
    try {
        const table = await Table.findOne({ tableNumber: req.params.tableNumber.toUpperCase() });
        if (!table) {
            return res.status(404).json({ success: false, message: 'Table not found' });
        }
        res.status(200).json({ success: true, data: table });
    } catch (error) {
        console.error('Error fetching table by number:', error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
});

//GET a single table by qrCodeIndentifier
// This endpoint is useful for the frontend when a QR code is scanned
//GET /api/tables/qr/:qrCodeIdentifier
router.get('/qr/:qrCodeIdentifier', async (req, res) => {
    try {
        const table = await Table.findOne({ qrCodeIdentifier: req.params.qrCodeIdentifier });
        if (!table) {
            return res.status(404).json({ success: false, message: 'Table not found for this QR code' });
        }
        res.status(200).json({ success: true, data: table });
    } catch (error) {
        console.error('Error fetching table by QR code identifier:', error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
});

//POST a new table (ADMIN ONLY)
//POST /api/tables
router.post('/', authorizeAdmin, async (req, res) => {
    try {
        const { tableNumber, status } = req.body; 

        //Basic validation
        if(!tableNumber) {
            return res.status(400).json({ success: false, message: 'Table number is required.' });
        }

        const newTable =  await Table.create({ tableNumber, status });

        //Emitting a Socket.IO event for a new table
        io.emit('newTable', newTable);

        res.status(201).json({ success: true, data: newTable });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'Table number or QR Code Identifier already exists.'});
        }
        console.error('Error creating new table:', error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
});

//PUT/PATCH update a table (ADMIN ONLY)
//PUT /api/tables/:id (using MongoDB's _id)
router.put('/:id', authorizeAdmin, async (req, res) => {
    try {
        const { tableNumber, status } = req.body; //Destructure the request body
        const updatedTable = await Table.findByIdAndUpdate(
            req.params.id,
            { tableNumber, status },
            { new: true, runValidators: true }
        );

        if (!updatedTable) {
            return res.status(404).json({ success: false, message: 'Table not found' });
        }

        //Emitting a Socket.IO event for a table update
        io.emit('tableUpdated', updatedTable);

        res.status(200).json({ success: true, data: updatedTable });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'Table number or QRCode Identifier already exists.' });
        }
        console.error('Error updating table:', error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
});

//DELETE a table(ADMIN ONLY)
//DELETE /api/tables/:id
router.delete('/:id', authorizeAdmin, async (req, res) => {
    try {
        const deletedTable = await Table.findByIdAndDelete(req.params.id);
        if (!deletedTable) {
            return res.status(404).json({ success: false, message: 'Table not found' });
        }

        //Emitting a Socket.IO event for a table deletion
        io.emit('tableDeleted', { _id: deletedTable._id, tableNumber: deletedTable.tableNumber });
        
        res.status(200).json({ success: true, message: 'Table deleted successfully' });
    } catch (error) {
        console.error('Error deleting table:', error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
});

return router;
}
// Export the router to be used in the main app file
// This router handles CRUD operations for the Table model, including fetching all tables, fetching by table number or QR code identifier, creating, updating, and deleting tables.