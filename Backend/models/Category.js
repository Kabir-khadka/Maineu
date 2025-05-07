const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
}, {
  timestamps: true
});

module.exports = mongoose.model('Category', categorySchema);
// This schema defines a Category model with a name field that is required, unique, and trimmed of whitespace. The timestamps option automatically adds createdAt and updatedAt fields to the documents.