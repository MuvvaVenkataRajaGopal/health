const mongoose = require('mongoose')
const { createTestUser, createTestFood, createTestMealLog, authHeader, generateToken } = require('./helpers')
const User = require('../models/User')
const Food = require('../models/Food')

describe('Test Infrastructure Smoke Test', () => {
  it('mongodb-memory-server is connected', () => {
    expect(mongoose.connection.readyState).toBe(1) // 1 = connected
  })

  it('can create and retrieve a test user', async () => {
    const { user, token } = await createTestUser({ name: 'Smoke Test User' })
    expect(user.name).toBe('Smoke Test User')
    expect(user._id).toBeDefined()
    expect(token).toBeDefined()
    expect(typeof token).toBe('string')
  })

  it('can create a test food item', async () => {
    const food = await createTestFood({ name: 'Test Apple', calories: 95 })
    expect(food.name).toBe('Test Apple')
    expect(food.calories).toBe(95)
    expect(food._id).toBeDefined()
  })

  it('can create a meal log linked to user and food', async () => {
    const { user } = await createTestUser()
    const food = await createTestFood()
    const meal = await createTestMealLog(user._id, food._id, {
      mealType: 'breakfast',
      calories: 250,
    })
    expect(meal.user.toString()).toBe(user._id.toString())
    expect(meal.food.toString()).toBe(food._id.toString())
    expect(meal.mealType).toBe('breakfast')
    expect(meal.calories).toBe(250)
  })

  it('generateToken produces a valid JWT', () => {
    const userId = new mongoose.Types.ObjectId()
    const token = generateToken(userId)
    const jwt = require('jsonwebtoken')
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    expect(decoded.id).toBe(userId.toString())
  })

  it('authHeader returns correct format', () => {
    const header = authHeader('my-token')
    expect(header).toEqual({ Authorization: 'Bearer my-token' })
  })

  it('database isolation works - collections are cleared between tests', async () => {
    // This test verifies that afterEach cleanup is working
    // If the previous tests' data leaked here, the count would not be 0
    const userCount = await User.countDocuments()
    const foodCount = await Food.countDocuments()
    expect(userCount).toBe(0)
    expect(foodCount).toBe(0)
  })
})
