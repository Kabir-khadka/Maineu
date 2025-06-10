const mongoose = require('mongoose');

const TableSchema = new mongoose.Schema({
    tableNumber: {
        type: String,
        required: [true, 'Table number is required'],
        unique: true, // Ensure table numbers are unique
        trim: true, //Removes whitespace from both ends of a string
        uppercase: true // Convert to uppercase for consistency
    },
    qrCodeIdentifier: {
        type: String,
        required: [true, 'QR code identifier is required'],
        unique: true, // Ensure QR code identifiers are unique
        default: () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15), // Generate a random identifier
    },
    status: {
        type: String,
        enum: ['available', 'occupied', 'needs_cleaning', 'out_of_service'], // Define possible statuses for the table
        default: 'available' // Default status is available
    },
    createdAt: {
        type:  Date,
        default: Date.now // Automatically set the creation date
    },
    updatedAt: {
        type: Date,
        default: Date.now // Automatically set the update date
    }
});

//Middleware to update the updatedAt field before saving
TableSchema.pre('save', function(next) {
    this.updatedAt = Date.now(); // Update the updatedAt field to the current date
    next(); // Proceed to the next middleware or save operation
})

module.exports = mongoose.model('Table', TableSchema); // Export the Table model
// This model can be used to manage tables in a restaurant setting, including their status and QR code identifiers.