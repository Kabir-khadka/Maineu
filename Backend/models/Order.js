const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
    name: { type:String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },

});

const orderSchema = new mongoose.Schema({
    tableNumber: { type: String, required: true },
    orderItems: { type: [orderItemSchema], required: true },
    totalPrice: { type: Number, required: true },
    status: { 
        type: String,
        enum: ['In progress', 'Delivered', 'Paid'],
        default: 'In progress'  // e.g., pending, confirmed, preparing, delivered
}, 
statusHistory: {
    type: [String],
    default: []
}
},{ timestamps: true });

module.exports = mongoose.model('Order', orderSchema);