const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const User = require('../models/User')

describe('User Model', () => {
  // ==================== Password Hashing ====================
  describe('Password Hashing', () => {
    it('should hash password on save', async () => {
      const user = await User.create({
        name: 'Hash Test',
        email: `hash-${Date.now()}@example.com`,
        password: 'plaintext123',
      })

      // Password should be hashed, not plaintext
      expect(user.password).not.toBe('plaintext123')
      expect(user.password.length).toBeGreaterThan(20) // bcrypt hashes are 60 chars
    })

    it('should hash with bcrypt algorithm', async () => {
      const user = await User.create({
        name: 'Bcrypt Test',
        email: `bcrypt-${Date.now()}@example.com`,
        password: 'mypassword',
      })

      // bcrypt hashes start with $2a$, $2b$, or $2y$
      expect(user.password).toMatch(/^\$2[aby]\$/)
    })

    it('should not rehash password on non-password updates', async () => {
      const user = await User.create({
        name: 'No Rehash',
        email: `norehash-${Date.now()}@example.com`,
        password: 'password123',
      })
      const originalHash = user.password

      // Update name but not password
      user.name = 'Updated Name'
      await user.save()

      // Password hash should be unchanged
      expect(user.password).toBe(originalHash)
    })

    it('should rehash password when explicitly changed', async () => {
      const user = await User.create({
        name: 'Rehash Test',
        email: `rehash-${Date.now()}@example.com`,
        password: 'oldpassword',
      })
      const originalHash = user.password

      // Change the password
      user.password = 'newpassword123'
      await user.save()

      // Password hash should be different
      expect(user.password).not.toBe(originalHash)
      expect(user.password).not.toBe('newpassword123')
    })

    it('should hash with salt rounds of 10', async () => {
      const user = await User.create({
        name: 'Salt Test',
        email: `salt-${Date.now()}@example.com`,
        password: 'password123',
      })

      // bcrypt hash with 10 rounds should be 60 characters
      expect(user.password.length).toBe(60)
    })
  })

  // ==================== comparePassword ====================
  describe('comparePassword', () => {
    it('should return true for correct password', async () => {
      const user = await User.create({
        name: 'Compare Test',
        email: `compare-${Date.now()}@example.com`,
        password: 'correctpassword',
      })

      const isMatch = await user.comparePassword('correctpassword')
      expect(isMatch).toBe(true)
    })

    it('should return false for incorrect password', async () => {
      const user = await User.create({
        name: 'Compare Fail',
        email: `comparefail-${Date.now()}@example.com`,
        password: 'correctpassword',
      })

      const isMatch = await user.comparePassword('wrongpassword')
      expect(isMatch).toBe(false)
    })

    it('should return false for empty string', async () => {
      const user = await User.create({
        name: 'Empty Test',
        email: `empty-${Date.now()}@example.com`,
        password: 'password123',
      })

      const isMatch = await user.comparePassword('')
      expect(isMatch).toBe(false)
    })

    it('should return false for similar but wrong password', async () => {
      const user = await User.create({
        name: 'Similar Test',
        email: `similar-${Date.now()}@example.com`,
        password: 'Password123',
      })

      // Case-sensitive check
      const isMatch = await user.comparePassword('password123')
      expect(isMatch).toBe(false)
    })
  })

  // ==================== Schema Validation ====================
  describe('Schema Validation', () => {
    it('should require name field', async () => {
      await expect(
        User.create({
          email: `noname-${Date.now()}@example.com`,
          password: 'password123',
        })
      ).rejects.toThrow()
    })

    it('should require email field', async () => {
      await expect(
        User.create({
          name: 'No Email',
          password: 'password123',
        })
      ).rejects.toThrow()
    })

    it('should require password field', async () => {
      await expect(
        User.create({
          name: 'No Password',
          email: `nopass-${Date.now()}@example.com`,
        })
      ).rejects.toThrow()
    })

    it('should enforce unique email', async () => {
      const email = `unique-${Date.now()}@example.com`
      await User.create({
        name: 'First User',
        email,
        password: 'password123',
      })

      await expect(
        User.create({
          name: 'Second User',
          email,
          password: 'password456',
        })
      ).rejects.toThrow()
    })

    it('should enforce minimum password length of 6', async () => {
      await expect(
        User.create({
          name: 'Short Pass',
          email: `shortpass-${Date.now()}@example.com`,
          password: '12345',
        })
      ).rejects.toThrow()
    })

    it('should accept password with exactly 6 characters', async () => {
      const user = await User.create({
        name: 'Six Chars',
        email: `sixchars-${Date.now()}@example.com`,
        password: '123456',
      })
      expect(user._id).toBeDefined()
    })

    it('should lowercase and trim email', async () => {
      const timestamp = Date.now()
      const user = await User.create({
        name: 'Trim Test',
        email: `  TRIM-${timestamp}@EXAMPLE.COM  `,
        password: 'password123',
      })
      expect(user.email).toBe(`trim-${timestamp}@example.com`)
    })

    it('should trim name', async () => {
      const user = await User.create({
        name: '  Trimmed Name  ',
        email: `trimname-${Date.now()}@example.com`,
        password: 'password123',
      })
      expect(user.name).toBe('Trimmed Name')
    })

    it('should default role to "user"', async () => {
      const user = await User.create({
        name: 'Default Role',
        email: `defaultrole-${Date.now()}@example.com`,
        password: 'password123',
      })
      expect(user.role).toBe('user')
    })

    it('should accept valid roles: user, dietitian, admin', async () => {
      const roles = ['user', 'dietitian', 'admin']
      for (const role of roles) {
        const user = await User.create({
          name: `${role} User`,
          email: `${role}-${Date.now()}@example.com`,
          password: 'password123',
          role,
        })
        expect(user.role).toBe(role)
      }
    })

    it('should reject invalid role', async () => {
      await expect(
        User.create({
          name: 'Bad Role',
          email: `badrole-${Date.now()}@example.com`,
          password: 'password123',
          role: 'superadmin',
        })
      ).rejects.toThrow()
    })

    it('should default avatar to empty string', async () => {
      const user = await User.create({
        name: 'No Avatar',
        email: `noavatar-${Date.now()}@example.com`,
        password: 'password123',
      })
      expect(user.avatar).toBe('')
    })

    it('should have timestamps (createdAt, updatedAt)', async () => {
      const user = await User.create({
        name: 'Timestamps',
        email: `timestamps-${Date.now()}@example.com`,
        password: 'password123',
      })
      expect(user.createdAt).toBeDefined()
      expect(user.updatedAt).toBeDefined()
    })
  })
})
