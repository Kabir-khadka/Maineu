const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
    name: {type: String, required: true },
    quantity: { type: Number, required: true, min: 0 },
    price: {type: Number, required: true, min: 0 },
}, {_id: false });

const archivedOrderSchema = new mongoose.Schema({
    tableNumber: String,
    orderItems: {
        type: [orderItemSchema],
        required: true,
        validate: {
            validator: function(v) {
                // Allow empty array if status is 'Cancelled'
                if (this.status === 'Cancelled') {
                    return true;
                }
                // Otherwise, must have at least one item and quantity > 0
                return v && v.length > 0 && v.every(item => item.quantity > 0);
            },
            message: props => `Order must have at least one item (with quantity > 0) unless it's cancelled!`
        }
    },
    totalPrice: { type: Number, required: true, min: 0 }, // Added required: true and min: 0
    status: {
        type: String,
        required: true, // Added required: true
        enum: ['In progress', 'Delivered', 'Paid', 'Cancelled'], // <-- CRITICAL: Added 'Cancelled' here
        default: 'In progress'
    },
    statusHistory: { // Added statusHistory field
        type: [String],
        default: []
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
}, { timestamps: true }); // Kept timestamps: true as in your provided snippet

// You can keep this pre-save hook if you want to manually update 'updatedAt'
// or rely solely on Mongoose's `timestamps: true` option.
// If `timestamps: true` is used, Mongoose handles `createdAt` and `updatedAt` automatically.
// If you use both, the pre-save hook will override the `timestamps` behavior for `updatedAt`.
/*
archivedOrderSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});
*/

module.exports = mongoose.model('ArchivedOrder', archivedOrderSchema);
// Compare this snippet from Backend/routes/orderRoutes.js: