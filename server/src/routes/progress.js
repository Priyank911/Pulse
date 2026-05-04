const express = require('express');
const { body } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();
const prisma = new PrismaClient();

// POST /api/progress — log daily progress
router.post('/', auth,
  validate([
    body('taskId').notEmpty().withMessage('Task ID is required.'),
    body('percentage').isInt({ min: 0, max: 100 }).withMessage('Percentage must be 0-100.'),
    body('description').trim().notEmpty().withMessage('Description is required.'),
  ]),
  async (req, res) => {
    try {
      const { taskId, percentage, description } = req.body;
      const task = await prisma.task.findUnique({ where: { id: taskId } });
      if (!task) return res.status(404).json({ error: 'Task not found.' });

      const log = await prisma.progressLog.create({
        data: { taskId, userId: req.user.id, percentage, description },
        include: { user: { select: { id: true, name: true } }, task: { select: { id: true, title: true, projectId: true } } },
      });

      // auto-update task status based on progress
      let newStatus = task.status;
      if (percentage === 100) newStatus = 'DONE';
      else if (percentage > 0 && task.status === 'TODO') newStatus = 'IN_PROGRESS';

      if (newStatus !== task.status) {
        await prisma.task.update({ where: { id: taskId }, data: { status: newStatus } });
      }

      if (req.io) {
        req.io.to(`project:${task.projectId}`).emit('progress:logged', {
          ...log, taskStatus: newStatus,
        });
      }

      res.status(201).json({ log, taskStatus: newStatus });
    } catch (err) {
      console.error('Log progress error:', err);
      res.status(500).json({ error: 'Failed to log progress.' });
    }
  }
);

// GET /api/progress/task/:taskId
router.get('/task/:taskId', auth, async (req, res) => {
  try {
    const logs = await prisma.progressLog.findMany({
      where: { taskId: req.params.taskId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { date: 'desc' },
    });
    res.json({ logs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch progress logs.' });
  }
});

// GET /api/progress/dashboard — admin/maintainer analytics
router.get('/dashboard', auth, async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      where: { members: { some: { userId: req.user.id } } },
      include: {
        members: { include: { user: { select: { id: true, name: true, avatar: true } } } },
        tasks: {
          include: {
            assignee: { select: { id: true, name: true, avatar: true } },
            progressLogs: { orderBy: { date: 'desc' }, take: 1 },
          },
        },
      },
    });

    const totalProjects = projects.length;
    let totalTasks = 0, doneTasks = 0, overdueTasks = 0, inProgressTasks = 0;

    projects.forEach((p) => {
      p.tasks.forEach((t) => {
        totalTasks++;
        if (t.status === 'DONE') doneTasks++;
        if (t.status === 'IN_PROGRESS') inProgressTasks++;
        if (t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'DONE') overdueTasks++;
      });
    });

    // recent progress logs — only from user's projects
    const projectIds = projects.map((p) => p.id);
    const recentLogs = await prisma.progressLog.findMany({
      take: 20,
      orderBy: { date: 'desc' },
      where: { task: { projectId: { in: projectIds } } },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
        task: { select: { id: true, title: true, projectId: true, project: { select: { name: true } } } },
      },
    });

    // developer stats — only from user's projects
    const developers = {};
    projects.forEach((p) => {
      p.tasks.forEach((t) => {
        if (t.assignee) {
          if (!developers[t.assignee.id]) {
            developers[t.assignee.id] = { ...t.assignee, assigned: 0, completed: 0, inProgress: 0 };
          }
          developers[t.assignee.id].assigned++;
          if (t.status === 'DONE') developers[t.assignee.id].completed++;
          if (t.status === 'IN_PROGRESS') developers[t.assignee.id].inProgress++;
        }
      });
    });

    res.json({
      stats: { totalProjects, totalTasks, doneTasks, overdueTasks, inProgressTasks },
      projects, recentLogs, developers: Object.values(developers),
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard data.' });
  }
});

// GET /api/progress/developer — developer's own analytics
router.get('/developer', auth, async (req, res) => {
  try {
    const tasks = await prisma.task.findMany({
      where: { assigneeId: req.user.id },
      include: {
        project: { select: { id: true, name: true } },
        progressLogs: { orderBy: { date: 'desc' }, include: { user: { select: { id: true, name: true } } } },
      },
    });

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);

    const totalAssigned = tasks.length;
    const completed = tasks.filter((t) => t.status === 'DONE').length;
    const overdue = tasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'DONE').length;
    const todayLogs = [];

    tasks.forEach((t) => {
      t.progressLogs.forEach((l) => {
        if (new Date(l.date) >= today) todayLogs.push({ ...l, taskTitle: t.title });
      });
    });

    res.json({ tasks, stats: { totalAssigned, completed, overdue, todayLogs: todayLogs.length }, todayLogs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch developer data.' });
  }
});

module.exports = router;
