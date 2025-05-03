const express = require('express');
const router = express.Router();
const MenuItem = require('../models/MenuItem');

//Predefined categories list
const predefinedCategories = [
    "Food",
    "Momos",
    "Noodles",
    "Pizza",
    "Drinks",
    "Snacks",
    "Thali",
    "Desserts",
    "Ice Cream"
];

//Create a new Item
router.post('/', async (req, res) => {
    try {
        const newItem = new MenuItem(req.body);
        await newItem.save();
        res.status(201).json(newItem);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Get all Menu Items
router.get('/', async (req, res) => {
    const { category } = req.query;
    const query = category ? { category } : {}; //Filter by category if provided

    try {
        const items = await MenuItem.find(query);
        res.status(200).json(items);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch menu items' });
    }
});

// Get all unique categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await MenuItem.distinct('category');
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

//Get all predefined categories
router.get('/categories/all', (req, res) => {
    res.json(predefinedCategories);
});

// Update a Menu Item
router.put('/:id', async (req, res) => {
    try {
        const updatedItem = await MenuItem.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.status(200).json(updatedItem);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Delete a Menu Item
router.delete('/:id', async (req, res)=> {
    try {
        await MenuItem.findByIdAndDelete(req.params.id);
        res.status(204).end();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
//This code defines the routes for managing menu items in a restaurant application.
// It includes routes to create, read, update, and delete menu items using Express.js and Mongoose for MongoDB interactions.
// It also includes a route to fetch all unique categories available in the menu items.