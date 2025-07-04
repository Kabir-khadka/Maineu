const express = require('express');

const Category = require('../models/Category'); // Import the Category model



module.exports = (io) => {

const router = express.Router();

const {
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories
} = require('../controllers/categoryController')(io);

// GET /api/categories
router.get('/', getAllCategories);

// POST /api/categories
router.post('/', createCategory);

//New PUT route to reorder categories
router.put('/reorder', reorderCategories);

// PUT /api/categories/:id
router.put('/:id', updateCategory);

// DELETE /api/categories/:id
router.delete('/:id', deleteCategory);

return router;
}