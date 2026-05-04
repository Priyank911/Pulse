require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const taskRoutes = require('./routes/tasks');
const progressRoutes = require('./routes/progress');
const noteRoutes = require('./routes/notes');
const setupSocket = require('./socket');

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  'http://localhost:5173',
  'http://localhost:4000',
];

const io = new Server(server, {
  cors: {
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      // allow railway domains
      if (origin && origin.endsWith('.railway.app')) return cb(null, true);
      cb(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

setupSocket(io);

// middleware
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    if (origin && origin.endsWith('.railway.app')) return cb(null, true);
    cb(null, true);
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// attach io to requests
app.use((req, res, next) => {
  req.io = io;
  next();
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/notes', noteRoutes);

// health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// serve static frontend in production
const clientBuild = path.join(__dirname, '../../client/dist');
app.use(express.static(clientBuild));
app.get('*', (req, res) => {
  res.sendFile(path.join(clientBuild, 'index.html'));
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Pulse server running on port ${PORT}`);
});
