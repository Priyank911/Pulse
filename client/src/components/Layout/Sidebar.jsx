import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getInitials } from '../../utils/helpers';
import {
  LayoutDashboard, FolderKanban, MessageSquareText, LogOut, ChevronUp
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  const handleLogout = () => { logout(); navigate('/login'); };
  const handleNav = () => { if (window.innerWidth <= 768) onClose(); };

  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <img src="/pulse-logo.svg" alt="Pulse" className="sidebar-logo-img" />
        <div className="sidebar-brand">
          <span className="sidebar-brand-name">Pulse</span>
          <span className="sidebar-brand-tag">Project Mgmt</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section">
          <div className="sidebar-section-title">Workspace</div>
          <NavLink to="/" end className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={handleNav}>
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
            <div className="sidebar-link-indicator" />
          </NavLink>
          <NavLink to="/projects" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={handleNav}>
            <FolderKanban size={18} />
            <span>Projects</span>
            <div className="sidebar-link-indicator" />
          </NavLink>
          <NavLink to="/notes" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={handleNav}>
            <MessageSquareText size={18} />
            <span>Notes</span>
            <div className="sidebar-link-indicator" />
          </NavLink>
        </div>
      </nav>

      {/* User section */}
      <div className="sidebar-user-wrap" ref={profileRef}>
        {profileOpen && (
          <div className="sidebar-profile-card">
            <div className="sidebar-profile-card-header">
              <div className="sidebar-profile-avatar-lg">{getInitials(user?.name)}</div>
              <div className="sidebar-profile-meta">
                <div className="sidebar-profile-name">{user?.name}</div>
                <div className="sidebar-profile-email">{user?.email}</div>
                <div className="sidebar-profile-badge">{user?.role}</div>
              </div>
            </div>
            <div className="sidebar-profile-card-divider" />
            <button className="sidebar-profile-action" onClick={handleLogout}>
              <LogOut size={14} />
              <span>Sign out of Pulse</span>
            </button>
          </div>
        )}
        <button className="sidebar-user-trigger" onClick={() => setProfileOpen(!profileOpen)}>
          <div className="sidebar-user-avatar">{getInitials(user?.name)}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.name}</div>
          </div>
          <ChevronUp size={14} className={`sidebar-chevron ${profileOpen ? 'rotated' : ''}`} />
        </button>
      </div>
    </aside>
  );
}
