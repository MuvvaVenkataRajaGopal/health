const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

async function start() {
  console.log('Starting in-memory MongoDB...');
  const mongod = await MongoMemoryServer.create({
    instance: { port: 27017, startupWait: 60000 }
  });
  const uri = mongod.getUri();
  console.log(`MongoDB running at: ${uri}`);

  process.env.MONGODB_URI = uri;

  await mongoose.connect(uri);
  console.log('Connected to in-memory MongoDB');

  const Food = require('./models/Food');
  const foods = require('./seedData');
  await Food.deleteMany({});
  await Food.insertMany(foods);
  console.log(`Seeded ${foods.length} foods`);

  const app = require('./server');
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Startup error:', err);
  process.exit(1);
});
