import { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('pulse_token');
    const saved = localStorage.getItem('pulse_user');
    if (token && saved) {
      setUser(JSON.parse(saved));
      api.get('/auth/me').then((res) => {
        setUser(res.data.user);
        localStorage.setItem('pulse_user', JSON.stringify(res.data.user));
      }).catch(() => {
        localStorage.removeItem('pulse_token');
        localStorage.removeItem('pulse_user');
        setUser(null);
      }).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('pulse_token', res.data.token);
    localStorage.setItem('pulse_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data.user;
  };

  const register = async (name, email, password, role) => {
    const res = await api.post('/auth/register', { name, email, password, role });
    localStorage.setItem('pulse_token', res.data.token);
    localStorage.setItem('pulse_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = () => {
    localStorage.removeItem('pulse_token');
    localStorage.removeItem('pulse_user');
    setUser(null);
  };

  const updateUser = (updated) => {
    setUser(updated);
    localStorage.setItem('pulse_user', JSON.stringify(updated));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
