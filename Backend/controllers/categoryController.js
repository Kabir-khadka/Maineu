const Category = require('../models/Category');

// Exports a function that takes the 'io' instance
module.exports = (io) => { // This is correct: the entire module exports a function

    // GET all categories
    const getAllCategories = async (req, res) => {
        try {
            const categories = await Category.find().sort({ position: 1 });
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

            // Emit a Socket.IO event for a new category
            io.emit('categoryCreated', category); // Correct use of io

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

            // Emitting a Socket.IO event for an updated category
            io.emit('categoryUpdated', category); // Correct use of io

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

            // Emitting a Socket.IO event for a deleted category
            io.emit('categoryDeleted', { categoryId: id }); // Correct use of io

            res.json({ message: 'Category deleted successfully' });
        } catch (err) {
            res.status(500).json({ message: 'Server Error', error: err.message });
        }
    };

    // Reordering categories
    const reorderCategories = async (req, res) => {
        const { categories } = req.body;

        if (!Array.isArray(categories)) {
            return res.status(400).json({ message: 'Invalid data: categories must be an array.' });
        }

        try {
            const updatePromises = categories.map(async (cat, index) => {
                if (!cat._id) {
                    console.warn('Category object missing _id during reorder:', cat);
                    return null;
                }
                return Category.findByIdAndUpdate(cat._id, { position: index }, { new: true });
            });

            const updatedCategories = await Promise.all(updatePromises);

            // Emitting a Socket.IO event after reordering
            io.emit('categoriesReordered', updatedCategories.filter(Boolean)); // Correct use of io, filter nulls

            res.json({ message: 'Categories reordered successfully' });
        } catch (err) {
            console.error('Error reordering categories:', err);
            res.status(500).json({ message: 'Error saving category order', error: err.message });
        }
    };

    // Return all controller functions as an object
    // This is the ONLY module.exports in this file, and it's returning the object.
    return {
        getAllCategories,
        createCategory,
        updateCategory,
        deleteCategory,
        reorderCategories,
    };
}; // This closes the function that module.exports is assigning.