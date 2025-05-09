const express = require('express');

const {
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory
} = require('../controllers/categoryController');

const Category = require('../models/Category'); // Import the Category model

const router = express.Router();

// GET /api/categories
router.get('/', getAllCategories);

// POST /api/categories
router.post('/', createCategory);

//New PUT route to reorder categories
router.put('/reorder', async (req, res) => {
  const { categories } = req.body; // The ordered array of categories sent from frontend

  try {
    // Loop through the categories array, and update the position of each category
    for (let i = 0; i < categories.length; i++) {
      const category = await Category.findById(categories[i]._id);
      category.position = i; // Set the position in the order received from frontend
      await category.save(); // Save the updated category
    }

    res.json({ message: 'Categories reordered successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error saving category order', error: err.message });
  }
});

// PUT /api/categories/:id
router.put('/:id', updateCategory);

// DELETE /api/categories/:id
router.delete('/:id', deleteCategory);



module.exports = router;
