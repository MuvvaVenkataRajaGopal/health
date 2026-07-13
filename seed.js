const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Food = require('./models/Food');
const foods = require('./seedData');

dotenv.config();

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    await Food.deleteMany({});
    console.log('Cleared existing foods');
    await Food.insertMany(foods);
    console.log(`Seeded ${foods.length} foods`);
    await mongoose.disconnect();
    console.log('Done');
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seed();
