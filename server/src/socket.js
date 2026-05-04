const setupSocket = (io) => {
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // join user-specific room for notes
    socket.on('join:user', (userId) => {
      socket.join(`user:${userId}`);
    });

    // join project room for live updates
    socket.on('join:project', (projectId) => {
      socket.join(`project:${projectId}`);
    });

    socket.on('leave:project', (projectId) => {
      socket.leave(`project:${projectId}`);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });
};

module.exports = setupSocket;
