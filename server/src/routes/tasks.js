const express = require('express');
const { body } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();
const prisma = new PrismaClient();

router.get('/project/:projectId', auth, async (req, res) => {
  try {
    const { status, priority, assigneeId } = req.query;
    const where = { projectId: req.params.projectId };
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assigneeId) where.assigneeId = assigneeId;

    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignee: { select: { id: true, name: true, avatar: true } },
        creator: { select: { id: true, name: true } },
        progressLogs: { orderBy: { date: 'desc' }, take: 1 },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });
    res.json({ tasks });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tasks.' });
  }
});

router.get('/my', auth, async (req, res) => {
  try {
    const tasks = await prisma.task.findMany({
      where: { assigneeId: req.user.id },
      include: {
        project: { select: { id: true, name: true } },
        progressLogs: { orderBy: { date: 'desc' }, take: 1 },
      },
      orderBy: [{ status: 'asc' }, { priority: 'desc' }, { dueDate: 'asc' }],
    });
    res.json({ tasks });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tasks.' });
  }
});

router.post('/', auth,
  validate([
    body('title').trim().notEmpty().withMessage('Task title is required.'),
    body('projectId').notEmpty().withMessage('Project ID is required.'),
  ]),
  async (req, res) => {
    try {
      const { title, description, priority, dueDate, projectId, assigneeId } = req.body;
      const task = await prisma.task.create({
        data: {
          title, description: description || null, priority: priority || 'MEDIUM',
          dueDate: dueDate ? new Date(dueDate) : null,
          projectId, assigneeId: assigneeId || null, creatorId: req.user.id,
        },
        include: {
          assignee: { select: { id: true, name: true, avatar: true } },
          creator: { select: { id: true, name: true } },
          project: { select: { id: true, name: true } },
        },
      });
      if (req.io) req.io.to(`project:${projectId}`).emit('task:created', task);
      res.status(201).json({ task });
    } catch (err) {
      res.status(500).json({ error: 'Failed to create task.' });
    }
  }
);

router.get('/:id', auth, async (req, res) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: {
        assignee: { select: { id: true, name: true, avatar: true, email: true } },
        creator: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        progressLogs: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { date: 'desc' },
        },
      },
    });
    if (!task) return res.status(404).json({ error: 'Task not found.' });
    res.json({ task });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch task.' });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { title, description, status, priority, dueDate, assigneeId } = req.body;
    const data = {};
    if (title) data.title = title;
    if (description !== undefined) data.description = description;
    if (status) data.status = status;
    if (priority) data.priority = priority;
    if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
    if (assigneeId !== undefined) data.assigneeId = assigneeId || null;

    const task = await prisma.task.update({
      where: { id: req.params.id }, data,
      include: {
        assignee: { select: { id: true, name: true, avatar: true } },
        project: { select: { id: true, name: true } },
      },
    });
    if (req.io) req.io.to(`project:${task.projectId}`).emit('task:updated', task);
    res.json({ task });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update task.' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const task = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!task) return res.status(404).json({ error: 'Task not found.' });
    await prisma.task.delete({ where: { id: req.params.id } });
    if (req.io) req.io.to(`project:${task.projectId}`).emit('task:deleted', { id: req.params.id });
    res.json({ message: 'Task deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete task.' });
  }
});

module.exports = router;
