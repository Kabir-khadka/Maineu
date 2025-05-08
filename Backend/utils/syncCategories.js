// utils/syncCategories.js
const Category = require('../models/Category');

const predefinedCategories = [
  'Food', 'Momos', 'Noodles', 'Pizza', 'Drinks',
  'Snacks', 'Thali', 'Desserts','Ice Cream', 'Sea'
];


async function syncPredefinedCategories() {
  const existing = await Category.find().select('name');
  const existingNames = existing.map(c => c.name);

  const toInsert = predefinedCategories
    .filter(name => !existingNames.includes(name))
    .map(name => ({ name }));

  if (toInsert.length) {
    await Category.insertMany(toInsert);
    console.log('✅ Inserted predefined categories into DB:', toInsert);
  } else {
    console.log('✅ All predefined categories already exist in DB.');
  }
}

module.exports = syncPredefinedCategories;
