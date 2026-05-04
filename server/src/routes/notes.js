const express = require('express');
const { body } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/notes
router.get('/', auth, async (req, res) => {
  try {
    const notes = await prisma.note.findMany({
      where: { OR: [{ senderId: req.user.id }, { receiverId: req.user.id }] },
      include: {
        sender: { select: { id: true, name: true, avatar: true } },
        receiver: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ notes });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notes.' });
  }
});

// POST /api/notes
router.post('/', auth,
  validate([
    body('content').trim().notEmpty().withMessage('Note content is required.'),
    body('receiverId').notEmpty().withMessage('Receiver ID is required.'),
  ]),
  async (req, res) => {
    try {
      const { content, receiverId, projectId } = req.body;
      const note = await prisma.note.create({
        data: { content, senderId: req.user.id, receiverId, projectId: projectId || null },
        include: {
          sender: { select: { id: true, name: true, avatar: true } },
          receiver: { select: { id: true, name: true, avatar: true } },
        },
      });

      if (req.io) {
        req.io.to(`user:${receiverId}`).emit('note:received', note);
      }

      res.status(201).json({ note });
    } catch (err) {
      res.status(500).json({ error: 'Failed to send note.' });
    }
  }
);

// PUT /api/notes/:id/read
router.put('/:id/read', auth, async (req, res) => {
  try {
    const note = await prisma.note.update({
      where: { id: req.params.id },
      data: { isRead: true },
    });
    res.json({ note });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark note as read.' });
  }
});

// GET /api/notes/unread-count
router.get('/unread-count', auth, async (req, res) => {
  try {
    const count = await prisma.note.count({
      where: { receiverId: req.user.id, isRead: false },
    });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch unread count.' });
  }
});

module.exports = router;
