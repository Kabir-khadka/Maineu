const Category = require('../models/Category');

// GET all categories
const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ position: 1 }); // Sort by creation date
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
};

// CREATE category
const createCategory = async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: 'Category name is required' });

  try {
    const exists = await Category.findOne({ name: name.trim() });
    if (exists) return res.status(400).json({ message: 'Category already exists' });

    const category = new Category({ name: name.trim() });
    await category.save();
    res.status(201).json(category);
  } catch (err) {
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
};

// UPDATE category
const updateCategory = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  try {
    const category = await Category.findById(id);
    if (!category) return res.status(404).json({ message: 'Category not found' });

    category.name = name.trim();
    await category.save();
    res.json(category);
  } catch (err) {
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
};

// DELETE category
const deleteCategory = async (req, res) => {
  const { id } = req.params;

  try {
    const category = await Category.findByIdAndDelete(id);
    if (!category) return res.status(404).json({ message: 'Category not found' });

    res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
};

// Export all controller functions
module.exports = {
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory
};
// This code defines a set of controller functions for managing categories in a MongoDB database using Mongoose. It includes functions to get all categories, create a new category, update an existing category, and delete a category. Each function handles errors and sends appropriate responses to the client.