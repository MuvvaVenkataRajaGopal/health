const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')
const { auth, authorize } = require('../middleware/auth')
const User = require('../models/User')
const { createTestUser, generateToken } = require('./helpers')

// Mock req, res, next for middleware testing
function mockReq(header = null) {
  return {
    header: (name) => (name === 'Authorization' ? header : null),
  }
}

function mockRes() {
  const res = {}
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  return res
}

function mockNext() {
  return jest.fn()
}

describe('Auth Middleware', () => {
  // ==================== auth middleware ====================
  describe('auth', () => {
    it('should call next and set req.user for valid token', async () => {
      const { user, token } = await createTestUser()
      const req = mockReq(`Bearer ${token}`)
      const res = mockRes()
      const next = mockNext()

      await auth(req, res, next)

      expect(next).toHaveBeenCalledTimes(1)
      expect(req.user).toBeDefined()
      expect(req.user._id.toString()).toBe(user._id.toString())
      expect(req.user.name).toBe('Test User')
      expect(req.token).toBe(token)
      // Password should not be included
      expect(req.user.password).toBeUndefined()
    })

    it('should return 401 without Authorization header', async () => {
      const req = mockReq(null)
      const res = mockRes()
      const next = mockNext()

      await auth(req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({
        message: 'No token, authorization denied',
      })
      expect(next).not.toHaveBeenCalled()
    })

    it('should return 401 with empty Authorization header', async () => {
      const req = mockReq('')
      const res = mockRes()
      const next = mockNext()

      await auth(req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({
        message: 'No token, authorization denied',
      })
    })

    it('should return 401 with header not starting with "Bearer "', async () => {
      const req = mockReq('Basic abc123')
      const res = mockRes()
      const next = mockNext()

      await auth(req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({
        message: 'No token, authorization denied',
      })
    })

    it('should return 401 with expired token', async () => {
      const { user } = await createTestUser()
      const expiredToken = jwt.sign(
        { id: user._id },
        process.env.JWT_SECRET,
        { expiresIn: '0s' }
      )

      // Wait to ensure token expires
      await new Promise((resolve) => setTimeout(resolve, 1100))

      const req = mockReq(`Bearer ${expiredToken}`)
      const res = mockRes()
      const next = mockNext()

      await auth(req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({
        message: 'Token is not valid',
      })
    })

    it('should return 401 with token signed by wrong secret', async () => {
      const { user } = await createTestUser()
      const wrongToken = jwt.sign(
        { id: user._id },
        'wrong-secret-key',
        { expiresIn: '7d' }
      )

      const req = mockReq(`Bearer ${wrongToken}`)
      const res = mockRes()
      const next = mockNext()

      await auth(req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({
        message: 'Token is not valid',
      })
    })

    it('should return 401 with token for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId()
      const token = generateToken(fakeId)

      const req = mockReq(`Bearer ${token}`)
      const res = mockRes()
      const next = mockNext()

      await auth(req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({
        message: 'Token is not valid',
      })
    })

    it('should return 401 with malformed token', async () => {
      const req = mockReq('Bearer not.a.valid.jwt.token')
      const res = mockRes()
      const next = mockNext()

      await auth(req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({
        message: 'Token is not valid',
      })
    })

    it('should exclude password from req.user', async () => {
      const { token } = await createTestUser()
      const req = mockReq(`Bearer ${token}`)
      const res = mockRes()
      const next = mockNext()

      await auth(req, res, next)

      expect(req.user.password).toBeUndefined()
    })
  })

  // ==================== authorize middleware ====================
  describe('authorize', () => {
    it('should call next if user has allowed role', () => {
      const req = { user: { role: 'admin' } }
      const res = mockRes()
      const next = mockNext()

      const middleware = authorize('admin', 'dietitian')
      middleware(req, res, next)

      expect(next).toHaveBeenCalledTimes(1)
    })

    it('should call next for single allowed role', () => {
      const req = { user: { role: 'user' } }
      const res = mockRes()
      const next = mockNext()

      const middleware = authorize('user')
      middleware(req, res, next)

      expect(next).toHaveBeenCalledTimes(1)
    })

    it('should return 403 if user role is not allowed', () => {
      const req = { user: { role: 'user' } }
      const res = mockRes()
      const next = mockNext()

      const middleware = authorize('admin', 'dietitian')
      middleware(req, res, next)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith({ message: 'Access denied' })
      expect(next).not.toHaveBeenCalled()
    })

    it('should return 403 for dietitian when only admin allowed', () => {
      const req = { user: { role: 'dietitian' } }
      const res = mockRes()
      const next = mockNext()

      const middleware = authorize('admin')
      middleware(req, res, next)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith({ message: 'Access denied' })
    })

    it('should work with all three roles', () => {
      const res = mockRes()
      const next = mockNext()

      const middleware = authorize('user', 'dietitian', 'admin')

      // Test user
      middleware({ user: { role: 'user' } }, res, next)
      expect(next).toHaveBeenCalledTimes(1)

      // Test dietitian
      middleware({ user: { role: 'dietitian' } }, res, next)
      expect(next).toHaveBeenCalledTimes(2)

      // Test admin
      middleware({ user: { role: 'admin' } }, res, next)
      expect(next).toHaveBeenCalledTimes(3)
    })
  })
})
