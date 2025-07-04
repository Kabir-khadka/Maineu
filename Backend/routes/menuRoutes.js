const express = require('express');
const router = express.Router();
const MenuItem = require('../models/MenuItem');
const upload = require('../middlewares/upload'); // Assuming you have a middleware for handling file uploads
const Category = require('../models/Category'); // Import the Category model


//Exporting a function that takes the 'io' instance
module.exports = (io) => {

//Create a new Item
router.post('/', upload.single('image'), async (req, res) => {
    try {
        const { name, price, category, available } =req.body;
        const image = req.file ? `/uploads/${req.file.filename}` : null; 
        const newItem = new MenuItem({ name, price, category, available, image });
        await newItem.save();

        //Emitting a Socket.IO event for a new menu item
        io.emit('newMenuItem', newItem);

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
router.get('/categories/all', async (req, res) => {
    try {
      const categories = await Category.find().sort({ position: 1 }).select('name'); // dynamic categories from DB
      const categoryNames = categories.map(cat => cat.name);
      res.json(categoryNames); // return the merged list
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch all categories' });
    }
  });

  // Toggle availability status of a Menu Item
router.patch('/:id/toggle', async (req, res) => {
  try {
    const menuItem = await MenuItem.findById(req.params.id);
    if (!menuItem) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    // Toggle the availability
    menuItem.available = !menuItem.available;

    // Save changes
    await menuItem.save();

    //Emit a Socket.IO event for menu item availablility toggle
    io.emit('menuItemToggled', menuItem);

    res.status(200).json(menuItem);
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle availability' });
  }
});

  

// Update a Menu Item
router.put('/:id', upload.single('image'), async (req, res) => {
    try {
        const { name, price, category, available } = req.body;

        const updatedFields ={
            name,
            price,
            category,
            available,
        };

        if (req.file) {
            updatedFields.image = `/uploads/${req.file.filename}`;
        }


        const updatedItem = await MenuItem.findByIdAndUpdate(req.params.id, updatedFields, { new: true });

        //Emitting a Socket.IO event for a menu item update
        io.emit('menuItemUpdated', updatedItem);

        res.status(200).json(updatedItem);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Delete a Menu Item
router.delete('/:id', async (req, res)=> {
    try {
        const deletedItem = await MenuItem.findByIdAndDelete(req.params.id);
        if(!deletedItem) {
          return res.status(404).json({ message: 'Menu item not found' });
        }

        //Emitting a Socket.IO event for a menu item deletion
        io.emit('menuItemDeleted', { _id: deletedItem._id });
        
        res.status(204).end();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Bulk Delete Menu Items
router.delete('/', async (req, res) => {
    const { ids } = req.body; // Expect array of IDs
    if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'ids must be a non-empty array'});
    }

    try {
        const result = await MenuItem.deleteMany({_id: { $in: ids } });

        //Emitting a Socket.IO event for bulk menu item deletion
        io.emit('menuItemBulkDeleted', { deletedIds: ids });

        res.status(204).end();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
});

// Bulk Toggle Availability
router.patch('/toggle', async (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids must be a non-empty array'});
    }

    try {
        // Get current availability of all targeted items
        const itemsToToggle = await MenuItem.find({ _id: { $in : ids } });

        if (itemsToToggle.length === 0) {
                return res.status(404).json({ message: 'No items found with provided IDs' });
        }

        // Toggle availability for each item
        const bulkOps = items.map(item => ({
            updateOne: {
              filter: { _id: item._id },
              update: { available: !item.available }
            }
        }));

        if (bulkOps.length > 0) {
            await MenuItem.bulkWrite(bulkOps);
        }

        const updatedItems = await MenuItem.find({ _id: { $in: ids } });

        //Emitting a Socket.IO event for bulk availability toggle
        io.emit('menuItemBulkToggled', updatedItems);

        res.status(200).json(updatedItems);
    } catch (error) {
        res.status(500).json({ error: 'Failed to toggle availability' });
    }
});

// Bulk Change Category
router.patch('/change-category', async (req, res) => {
    const { ids, category } = req.body;
    if (!Array.isArray(ids) || ids.length === 0 || !category) {
        return res.status(400).json({ error: 'ids must be a non-empty array and category is required' });
    }

    try {
      await MenuItem.updateMany(
        {_id: { $in: ids }},
        { $set: { category }}
      );

      const updatedItems = await MenuItem.find({ _id: { $in: ids }});

      //Emitting a Socket.IO event for bulk category change
      io.emit('menuItemBulkCategoryChanged', updatedItems);
      
      res.status(200).json(updatedItems);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
});
return router;
}
//This code defines the routes for managing menu items in a restaurant application.
// It includes routes to create, read, update, and delete menu items using Express.js and Mongoose for MongoDB interactions.
// It also includes a route to fetch all unique categories available in the menu items.