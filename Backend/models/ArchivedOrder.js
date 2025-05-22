const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
    name: String,
    quantity: Number,
    price: Number,
});

const archivedOrderSchema = new mongoose.Schema({
    tableNumber: String,
    orderItems: [orderItemSchema],
    totalPrice: Number,
    status: {
        type: String,
        enum: ['In progress', 'Delivered', 'Paid'],
        default: 'In progress'
    },
    createdAt: Date,
    updatedAt: Date,
}, { timestamps: true });

module.exports = mongoose.model('ArchivedOrder', archivedOrderSchema);
// Compare this snippet from Backend/routes/orderRoutes.js: