import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import AppLayout from './components/Layout/AppLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/AdminDashboard';
import MemberDashboard from './pages/MemberDashboard';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import Notes from './pages/Notes';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="auth-page"><p>Loading...</p></div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function DashboardRedirect() {
  const { user } = useAuth();
  if (user?.role === 'ADMIN') return <AdminDashboard />;
  return <MemberDashboard />;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="auth-page"><p style={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.8rem' }}>Loading</p></div>;
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />
      <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index element={<DashboardRedirect />} />
        <Route path="projects" element={<Projects />} />
        <Route path="projects/:id" element={<ProjectDetail />} />
        <Route path="notes" element={<Notes />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <AppRoutes />
          <Toaster
            position="top-right"
            toastOptions={{
              className: 'toast-custom',
              style: {
                background: '#1a1a1a',
                color: '#e8e2d6',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '4px',
                fontSize: '0.8rem',
                fontFamily: '"Special Gothic Expanded One", sans-serif',
              },
            }}
          />
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
