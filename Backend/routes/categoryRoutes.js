const express = require('express');
const {
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory
} = require('../controllers/categoryController');

const router = express.Router();

// GET /api/categories
router.get('/', getAllCategories);

// POST /api/categories
router.post('/', createCategory);

// PUT /api/categories/:id
router.put('/:id', updateCategory);

// DELETE /api/categories/:id
router.delete('/:id', deleteCategory);

module.exports = router;
