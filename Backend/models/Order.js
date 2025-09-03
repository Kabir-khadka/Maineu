const mongoose = require('mongoose');

const orderEntrySchema = new mongoose.Schema({
    name: { type:String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },

});

const orderSchema = new mongoose.Schema({
    tableNumber: { type: String, required: true },
    orderItems: { type: [orderEntrySchema], required: true },
    totalPrice: { type: Number, required: true },
    status: { 
        type: String,
        enum: ['In progress', 'Delivered', 'Paid', 'Cancelled'],
        default: 'In progress'  // e.g., pending, confirmed, preparing, delivered
}, 
statusHistory: {
    type: [String],
    default: []
},
kitchenDone: {
    type: Boolean,
    default: false
}
},{ timestamps: true });

module.exports = mongoose.model('Order', orderSchema);