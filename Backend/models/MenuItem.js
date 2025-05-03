const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: String, required: true }, //e.g., 'Momos', 'Nooodles', etc.
    available: { type: Boolean, default: true }
});

module.exports = mongoose.model('MenuItems', menuItemSchema);