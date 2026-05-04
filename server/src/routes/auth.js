const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();
const prisma = new PrismaClient();

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// POST /api/auth/register
router.post(
  '/register',
  validate([
    body('name').trim().notEmpty().withMessage('Name is required.'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required.'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters.'),
  ]),
  async (req, res) => {
    try {
      const { name, email, password, role } = req.body;

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return res.status(409).json({ error: 'An account with this email already exists.' });
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      const user = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: role === 'ADMIN' ? 'ADMIN' : 'MEMBER',
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      });

      const token = generateToken(user.id);

      res.status(201).json({ user, token });
    } catch (err) {
      console.error('Register error:', err);
      res.status(500).json({ error: 'Registration failed.' });
    }
  }
);

// POST /api/auth/login
router.post(
  '/login',
  validate([
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required.'),
    body('password').notEmpty().withMessage('Password is required.'),
  ]),
  async (req, res) => {
    try {
      const { email, password } = req.body;

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const token = generateToken(user.id);

      res.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
        },
        token,
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Login failed.' });
    }
  }
);

// GET /api/auth/me
router.get('/me', auth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        createdAt: true,
      },
    });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile.' });
  }
});

// PUT /api/auth/profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, avatar } = req.body;
    const data = {};
    if (name) data.name = name;
    if (avatar !== undefined) data.avatar = avatar;

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
      },
    });

    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// GET /api/auth/users — Admin: list all users
router.get('/users', auth, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    });
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

// GET /api/auth/search?email= — find user by email
router.get('/search', auth, async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: 'Email query is required.' });

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'No user found with this email.' });
    }

    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Search failed.' });
  }
});

module.exports = router;
