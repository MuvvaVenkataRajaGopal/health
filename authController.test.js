const request = require('supertest')
const mongoose = require('mongoose')
const app = require('../server')
const User = require('../models/User')
const Profile = require('../models/Profile')
const { createTestUser, authHeader } = require('./helpers')

describe('Auth Controller', () => {
  // ==================== REGISTER ====================
  describe('POST /api/auth/register', () => {
    const validUser = {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
    }

    it('should register a new user successfully', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(validUser)
        .expect(201)

      expect(res.body).toHaveProperty('token')
      expect(res.body.user).toMatchObject({
        name: validUser.name,
        email: validUser.email,
        role: 'user',
      })
      expect(res.body.user).toHaveProperty('id')
      expect(res.body.user).not.toHaveProperty('password')

      // Verify user was created in DB
      const user = await User.findOne({ email: validUser.email })
      expect(user).toBeTruthy()
      expect(user.name).toBe(validUser.name)
      // Password should be hashed, not plaintext
      expect(user.password).not.toBe(validUser.password)

      // Verify profile was auto-created
      const profile = await Profile.findOne({ user: user._id })
      expect(profile).toBeTruthy()
    })

    it('should return 400 if name is missing', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com', password: 'password123' })
        .expect(400)

      expect(res.body.message).toBe('All fields are required')
    })

    it('should return 400 if email is missing', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Test', password: 'password123' })
        .expect(400)

      expect(res.body.message).toBe('All fields are required')
    })

    it('should return 400 if password is missing', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Test', email: 'test@example.com' })
        .expect(400)

      expect(res.body.message).toBe('All fields are required')
    })

    it('should return 400 if user already exists', async () => {
      await createTestUser({ email: validUser.email })

      const res = await request(app)
        .post('/api/auth/register')
        .send(validUser)
        .expect(400)

      expect(res.body.message).toBe('User already exists')
    })

    it('should return a valid JWT token', async () => {
      const jwt = require('jsonwebtoken')
      const res = await request(app)
        .post('/api/auth/register')
        .send({ ...validUser, email: 'newuser@example.com' })
        .expect(201)

      const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET)
      expect(decoded).toHaveProperty('id')
      expect(decoded).toHaveProperty('exp')
    })

    it('should lowercase and trim email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ ...validUser, email: '  JOHN@EXAMPLE.COM  ' })
        .expect(201)

      expect(res.body.user.email).toBe('john@example.com')
    })
  })

  // ==================== LOGIN ====================
  describe('POST /api/auth/login', () => {
    const userData = {
      name: 'Login User',
      email: 'login@example.com',
      password: 'password123',
    }

    beforeEach(async () => {
      await createTestUser(userData)
    })

    it('should login successfully with correct credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: userData.email, password: userData.password })
        .expect(200)

      expect(res.body).toHaveProperty('token')
      expect(res.body.user).toMatchObject({
        name: userData.name,
        email: userData.email,
        role: 'user',
      })
      expect(res.body.user).not.toHaveProperty('password')
    })

    it('should return 400 if email is missing', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ password: 'password123' })
        .expect(400)

      expect(res.body.message).toBe('Email and password are required')
    })

    it('should return 400 if password is missing', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'login@example.com' })
        .expect(400)

      expect(res.body.message).toBe('Email and password are required')
    })

    it('should return 401 with wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: userData.email, password: 'wrongpassword' })
        .expect(401)

      expect(res.body.message).toBe('Invalid credentials')
    })

    it('should return 401 with non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nonexistent@example.com', password: 'password123' })
        .expect(401)

      expect(res.body.message).toBe('Invalid credentials')
    })

    it('should return a valid JWT token', async () => {
      const jwt = require('jsonwebtoken')
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: userData.email, password: userData.password })
        .expect(200)

      const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET)
      expect(decoded).toHaveProperty('id')
    })
  })

  // ==================== GET ME ====================
  describe('GET /api/auth/me', () => {
    it('should return current user and profile', async () => {
      const { user, token } = await createTestUser({
        name: 'Me User',
        email: 'me@example.com',
      })

      const res = await request(app)
        .get('/api/auth/me')
        .set(authHeader(token))
        .expect(200)

      expect(res.body.user).toMatchObject({
        name: 'Me User',
        email: 'me@example.com',
      })
      expect(res.body.user).not.toHaveProperty('password')
      // Profile may or may not exist depending on createTestUser
      expect(res.body).toHaveProperty('profile')
    })

    it('should return 401 without token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .expect(401)

      expect(res.body.message).toBe('No token, authorization denied')
    })

    it('should return 401 with invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set(authHeader('invalid-token-here'))
        .expect(401)

      expect(res.body.message).toBe('Token is not valid')
    })

    it('should return 401 with expired token', async () => {
      const jwt = require('jsonwebtoken')
      const { user } = await createTestUser()
      const expiredToken = jwt.sign(
        { id: user._id },
        process.env.JWT_SECRET,
        { expiresIn: '0s' }
      )

      // Wait a moment to ensure token is expired
      await new Promise((resolve) => setTimeout(resolve, 1100))

      const res = await request(app)
        .get('/api/auth/me')
        .set(authHeader(expiredToken))
        .expect(401)

      expect(res.body.message).toBe('Token is not valid')
    })

    it('should return 401 with token for deleted user', async () => {
      const { token } = await createTestUser()

      // Delete the user
      await User.deleteMany({})

      const res = await request(app)
        .get('/api/auth/me')
        .set(authHeader(token))
        .expect(401)

      expect(res.body.message).toBe('Token is not valid')
    })
  })
})
