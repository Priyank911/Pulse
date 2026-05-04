import { createContext, useContext, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const socketRef = useRef(null);

  useEffect(() => {
    if (!user) return;

    const url = import.meta.env.PROD ? window.location.origin : 'http://localhost:4000';
    socketRef.current = io(url, { transports: ['websocket', 'polling'] });

    socketRef.current.on('connect', () => {
      socketRef.current.emit('join:user', user.id);
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [user]);

  const joinProject = (projectId) => {
    if (socketRef.current) socketRef.current.emit('join:project', projectId);
  };

  const leaveProject = (projectId) => {
    if (socketRef.current) socketRef.current.emit('leave:project', projectId);
  };

  const on = (event, callback) => {
    if (socketRef.current) socketRef.current.on(event, callback);
  };

  const off = (event, callback) => {
    if (socketRef.current) socketRef.current.off(event, callback);
  };

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, joinProject, leaveProject, on, off }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
