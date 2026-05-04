const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions.' });
    }
    next();
  };
};

const requireProjectRole = (...memberRoles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required.' });
      }

      const projectId = req.params.projectId || req.params.id || req.body.projectId;
      if (!projectId) {
        return res.status(400).json({ error: 'Project ID is required.' });
      }

      const membership = await prisma.projectMember.findUnique({
        where: {
          userId_projectId: {
            userId: req.user.id,
            projectId: projectId,
          },
        },
      });

      if (!membership) {
        return res.status(403).json({ error: 'You are not a member of this project.' });
      }

      if (memberRoles.length > 0 && !memberRoles.includes(membership.role)) {
        return res.status(403).json({ error: 'Insufficient project permissions.' });
      }

      req.membership = membership;
      next();
    } catch (err) {
      return res.status(500).json({ error: 'Authorization check failed.' });
    }
  };
};

module.exports = { requireRole, requireProjectRole };
