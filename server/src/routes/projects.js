const express = require('express');
const { body } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');
const { requireRole, requireProjectRole } = require('../middleware/rbac');
const validate = require('../middleware/validate');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/projects — list user's projects
router.get('/', auth, async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      where: {
        members: {
          some: { userId: req.user.id },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true },
            },
          },
        },
        tasks: {
          include: {
            progressLogs: {
              orderBy: { date: 'desc' },
              take: 1,
              select: { percentage: true },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const enriched = projects.map((p) => {
      const totalTasks = p.tasks.length;
      const doneTasks = p.tasks.filter((t) => t.status === 'DONE').length;
      const overdueTasks = p.tasks.filter(
        (t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'DONE'
      ).length;
      // Real progress: average of latest progress log per task
      let progress = 0;
      if (totalTasks > 0) {
        const sum = p.tasks.reduce((acc, t) => {
          if (t.status === 'DONE') return acc + 100;
          const latest = t.progressLogs?.[0];
          return acc + (latest ? latest.percentage : 0);
        }, 0);
        progress = Math.round(sum / totalTasks);
      }

      return {
        ...p,
        stats: { totalTasks, doneTasks, overdueTasks, progress },
      };
    });

    res.json({ projects: enriched });
  } catch (err) {
    console.error('List projects error:', err);
    res.status(500).json({ error: 'Failed to fetch projects.' });
  }
});

// POST /api/projects — create project
router.post(
  '/',
  auth,
  validate([
    body('name').trim().notEmpty().withMessage('Project name is required.'),
  ]),
  async (req, res) => {
    try {
      const { name, description, deadline } = req.body;

      const project = await prisma.project.create({
        data: {
          name,
          description: description || null,
          deadline: deadline ? new Date(deadline) : null,
          members: {
            create: {
              userId: req.user.id,
              role: 'MAINTAINER',
            },
          },
        },
        include: {
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true, avatar: true },
              },
            },
          },
        },
      });

      res.status(201).json({ project });
    } catch (err) {
      console.error('Create project error:', err);
      res.status(500).json({ error: 'Failed to create project.' });
    }
  }
);

// GET /api/projects/:id — get project details
router.get('/:id', auth, async (req, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true, role: true },
            },
          },
        },
        tasks: {
          include: {
            assignee: {
              select: { id: true, name: true, avatar: true },
            },
            creator: {
              select: { id: true, name: true },
            },
            progressLogs: {
              orderBy: { date: 'desc' },
              take: 5,
              include: { user: { select: { id: true, name: true } } },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    // check access — all users must be a member
    const isMember = project.members.some((m) => m.userId === req.user.id);
    if (!isMember) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const totalTasks = project.tasks.length;
    const doneTasks = project.tasks.filter((t) => t.status === 'DONE').length;
    const overdueTasks = project.tasks.filter(
      (t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'DONE'
    ).length;
    // Real progress: average of latest progress log per task
    let progress = 0;
    if (totalTasks > 0) {
      const sum = project.tasks.reduce((acc, t) => {
        if (t.status === 'DONE') return acc + 100;
        const latest = t.progressLogs?.[0];
        return acc + (latest ? latest.percentage : 0);
      }, 0);
      progress = Math.round(sum / totalTasks);
    }

    res.json({
      project: {
        ...project,
        stats: { totalTasks, doneTasks, overdueTasks, progress },
      },
    });
  } catch (err) {
    console.error('Get project error:', err);
    res.status(500).json({ error: 'Failed to fetch project.' });
  }
});

// PUT /api/projects/:id — update project
router.put('/:id', auth, requireProjectRole('MAINTAINER'), async (req, res) => {
  try {
    const { name, description, status, deadline } = req.body;
    const data = {};
    if (name) data.name = name;
    if (description !== undefined) data.description = description;
    if (status) data.status = status;
    if (deadline !== undefined) data.deadline = deadline ? new Date(deadline) : null;

    const project = await prisma.project.update({
      where: { id: req.params.id },
      data,
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true },
            },
          },
        },
      },
    });

    res.json({ project });
  } catch (err) {
    console.error('Update project error:', err);
    res.status(500).json({ error: 'Failed to update project.' });
  }
});

// DELETE /api/projects/:id
router.delete('/:id', auth, requireProjectRole('MAINTAINER'), async (req, res) => {
  try {
    await prisma.project.delete({ where: { id: req.params.id } });
    res.json({ message: 'Project deleted.' });
  } catch (err) {
    console.error('Delete project error:', err);
    res.status(500).json({ error: 'Failed to delete project.' });
  }
});

// POST /api/projects/:id/members — add member
router.post(
  '/:id/members',
  auth,
  requireProjectRole('MAINTAINER'),
  validate([
    body('userId').notEmpty().withMessage('User ID is required.'),
    body('role').optional().isIn(['MAINTAINER', 'DEVELOPER']),
  ]),
  async (req, res) => {
    try {
      const { userId, role } = req.body;

      const existing = await prisma.projectMember.findUnique({
        where: {
          userId_projectId: {
            userId,
            projectId: req.params.id,
          },
        },
      });

      if (existing) {
        return res.status(409).json({ error: 'User is already a member of this project.' });
      }

      const member = await prisma.projectMember.create({
        data: {
          userId,
          projectId: req.params.id,
          role: role || 'DEVELOPER',
        },
        include: {
          user: {
            select: { id: true, name: true, email: true, avatar: true },
          },
        },
      });

      res.status(201).json({ member });
    } catch (err) {
      console.error('Add member error:', err);
      res.status(500).json({ error: 'Failed to add member.' });
    }
  }
);

// DELETE /api/projects/:id/members/:userId
router.delete(
  '/:id/members/:userId',
  auth,
  requireProjectRole('MAINTAINER'),
  async (req, res) => {
    try {
      await prisma.projectMember.delete({
        where: {
          userId_projectId: {
            userId: req.params.userId,
            projectId: req.params.id,
          },
        },
      });

      res.json({ message: 'Member removed.' });
    } catch (err) {
      console.error('Remove member error:', err);
      res.status(500).json({ error: 'Failed to remove member.' });
    }
  }
);

module.exports = router;
