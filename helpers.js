const jwt = require('jsonwebtoken')
const User = require('../models/User')
const Profile = require('../models/Profile')
const Food = require('../models/Food')
const MealLog = require('../models/MealLog')
const WaterLog = require('../models/WaterLog')

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing'

/**
 * Generate a JWT token for a given user ID.
 */
function generateToken(userId) {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '7d' })
}

/**
 * Create a test user and return the user document + auth token.
 */
async function createTestUser(overrides = {}) {
  const userData = {
    name: 'Test User',
    email: `test-${Date.now()}@example.com`,
    password: 'password123',
    ...overrides,
  }
  const user = await User.create(userData)
  const token = generateToken(user._id)
  return { user, token }
}

/**
 * Create a test profile for a user.
 */
async function createTestProfile(userId, overrides = {}) {
  const profileData = {
    user: userId,
    age: 25,
    gender: 'male',
    height: 175,
    weight: 70,
    targetWeight: 65,
    goal: 'weight_loss',
    dietaryPreference: 'non_vegetarian',
    activityLevel: 'moderate',
    dailyCalorieGoal: 2000,
    dailyWaterGoal: 8,
    ...overrides,
  }
  return Profile.create(profileData)
}

/**
 * Create a test food item.
 */
async function createTestFood(overrides = {}) {
  const foodData = {
    name: `Test Food ${Date.now()}`,
    category: 'general',
    calories: 100,
    protein: 10,
    carbs: 15,
    fat: 3,
    fiber: 2,
    sugar: 5,
    servingSize: '100g',
    servingWeight: 100,
    ...overrides,
  }
  return Food.create(foodData)
}

/**
 * Create a test meal log entry.
 */
async function createTestMealLog(userId, foodId, overrides = {}) {
  const mealData = {
    user: userId,
    food: foodId,
    foodName: 'Test Food',
    mealType: 'lunch',
    date: new Date(),
    quantity: 1,
    servingSize: 100,
    calories: 100,
    protein: 10,
    carbs: 15,
    fat: 3,
    ...overrides,
  }
  return MealLog.create(mealData)
}

/**
 * Create a test water log entry.
 */
async function createTestWaterLog(userId, overrides = {}) {
  const waterData = {
    user: userId,
    date: new Date(),
    glasses: 0,
    ml: 0,
    ...overrides,
  }
  return WaterLog.create(waterData)
}

/**
 * Helper to make authenticated requests with supertest.
 * Usage: await request(app).get('/api/...').set(authHeader(token))
 */
function authHeader(token) {
  return { Authorization: `Bearer ${token}` }
}

module.exports = {
  generateToken,
  createTestUser,
  createTestProfile,
  createTestFood,
  createTestMealLog,
  createTestWaterLog,
  authHeader,
}
