import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { getInitials, formatRelative, formatDate } from '../utils/helpers';
import {
  FolderKanban, ListChecks, AlertTriangle, Users, TrendingUp,
  Plus, CalendarDays, ArrowRight, CheckCircle2
} from 'lucide-react';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { on, off } = useSocket();
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const res = await api.get('/progress/dashboard');
      setData(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchData();
    const handler = () => fetchData();
    on('progress:logged', handler);
    on('task:updated', handler);
    return () => { off('progress:logged', handler); off('task:updated', handler); };
  }, []);

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  if (loading) return <div className="page-body"><p>Loading dashboard...</p></div>;

  const stats = data?.stats || { totalProjects: 0, totalTasks: 0, doneTasks: 0, overdueTasks: 0, inProgressTasks: 0 };
  const projects = data?.projects || [];
  const recentLogs = data?.recentLogs || [];
  const developers = data?.developers || [];
  const completionRate = stats.totalTasks > 0 ? Math.round((stats.doneTasks / stats.totalTasks) * 100) : 0;

  return (
    <>
      {/* Top strip -- greeting + date + action */}
      <div className="top-header">
        <div className="top-header-left">
          <div className="top-header-greeting">
            <h2>Welcome back, {user?.name?.split(' ')[0]}</h2>
            <div className="top-header-date">
              <CalendarDays size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
              {dateStr}
            </div>
          </div>
        </div>
        <div className="quick-actions">
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/projects')}>
            <Plus size={14} /> New Project
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* Asymmetric stats -- hero card left, 3 secondary right */}
        <div className="stats-asymmetric mb-24">
          <div className="stat-hero">
            <div className="stat-hero-ring">
              <svg viewBox="0 0 80 80" className="stat-hero-svg">
                <circle cx="40" cy="40" r="35" fill="none" stroke="var(--border)" strokeWidth="4" />
                <circle cx="40" cy="40" r="35" fill="none" stroke="var(--accent)" strokeWidth="4"
                  strokeDasharray={`${completionRate * 2.2} 220`}
                  strokeLinecap="round" transform="rotate(-90 40 40)"
                  style={{ transition: 'stroke-dasharray 600ms ease' }} />
              </svg>
              <div className="stat-hero-pct">{completionRate}%</div>
            </div>
            <div className="stat-hero-meta">
              <div className="stat-hero-label">Overall Completion</div>
              <div className="stat-hero-detail">{stats.doneTasks} of {stats.totalTasks} tasks completed across {stats.totalProjects} project{stats.totalProjects !== 1 ? 's' : ''}</div>
            </div>
          </div>
          <div className="stat-secondary-stack">
            <div className="stat-secondary">
              <FolderKanban size={16} />
              <div className="stat-secondary-data">
                <span className="stat-secondary-value">{stats.totalProjects}</span>
                <span className="stat-secondary-label">Projects</span>
              </div>
            </div>
            <div className="stat-secondary">
              <TrendingUp size={16} />
              <div className="stat-secondary-data">
                <span className="stat-secondary-value">{stats.inProgressTasks}</span>
                <span className="stat-secondary-label">In Progress</span>
              </div>
            </div>
            <div className="stat-secondary" style={{ borderColor: stats.overdueTasks > 0 ? 'var(--error)' : undefined }}>
              <AlertTriangle size={16} style={{ color: stats.overdueTasks > 0 ? 'var(--error)' : undefined }} />
              <div className="stat-secondary-data">
                <span className="stat-secondary-value" style={{ color: stats.overdueTasks > 0 ? 'var(--error)' : undefined }}>{stats.overdueTasks}</span>
                <span className="stat-secondary-label">Overdue</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid-2">
          {/* Project Progress */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Project Progress</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => navigate('/projects')}>
                View All <ArrowRight size={12} />
              </button>
            </div>
            {projects.length === 0 ? (
              <div className="empty-state">
                <FolderKanban size={36} />
                <p>No projects yet</p>
                <button className="btn btn-primary btn-sm mt-16" onClick={() => navigate('/projects')}>
                  <Plus size={14} /> Create First Project
                </button>
              </div>
            ) : (
              projects.map((p) => {
                const total = p.tasks.length;
                const done = p.tasks.filter((t) => t.status === 'DONE').length;
                const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                return (
                  <div key={p.id} className="project-row" onClick={() => navigate(`/projects/${p.id}`)}>
                    <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                      <span style={{ fontSize: '0.85rem' }}>{p.name}</span>
                      <span style={{ fontSize: '0.75rem', color: pct === 100 ? 'var(--success)' : 'var(--text-muted)' }}>{pct}%</span>
                    </div>
                    <div className="progress-bar-wrap">
                      <div className={`progress-bar-fill ${pct === 100 ? 'success' : pct > 50 ? 'warning' : ''}`} style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex items-center justify-between" style={{ marginTop: 6 }}>
                      <div className="avatar-stack">
                        {p.members.slice(0, 4).map((m) => (
                          <div key={m.id} className="avatar avatar-sm" title={m.user.name}>{getInitials(m.user.name)}</div>
                        ))}
                      </div>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{done}/{total} tasks{p.deadline ? ` \u00B7 Due ${formatDate(p.deadline)}` : ''}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Recent Activity */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Recent Activity</h3>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{recentLogs.length} entries</span>
            </div>
            {recentLogs.length === 0 ? (
              <div className="empty-state">
                <TrendingUp size={36} />
                <p>No activity yet. Progress logs will appear here.</p>
              </div>
            ) : (
              recentLogs.slice(0, 8).map((log) => (
                <div key={log.id} className="activity-item">
                  <div className="avatar avatar-sm">{getInitials(log.user.name)}</div>
                  <div className="activity-content">
                    <div className="activity-text">
                      <strong>{log.user.name}</strong> logged {log.percentage}% on <strong>{log.task.title}</strong>
                    </div>
                    <div className="activity-time">{log.task.project?.name} &middot; {formatRelative(log.date)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Team Performance */}
        {developers.length > 0 && (
          <>
            <hr className="section-divider" />
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Team Performance</h3>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{developers.length} member{developers.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Developer</th>
                      <th>Assigned</th>
                      <th>Completed</th>
                      <th>In Progress</th>
                      <th>Completion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {developers.map((dev) => {
                      const pct = dev.assigned > 0 ? Math.round((dev.completed / dev.assigned) * 100) : 0;
                      return (
                        <tr key={dev.id}>
                          <td>
                            <div className="flex items-center gap-8">
                              <div className="avatar avatar-sm">{getInitials(dev.name)}</div>
                              {dev.name}
                            </div>
                          </td>
                          <td>{dev.assigned}</td>
                          <td style={{ color: 'var(--success)' }}>{dev.completed}</td>
                          <td>{dev.inProgress}</td>
                          <td>
                            <div className="flex items-center gap-8">
                              <div className="progress-bar-wrap" style={{ width: 80 }}>
                                <div className={`progress-bar-fill ${pct === 100 ? 'success' : ''}`} style={{ width: `${pct}%` }} />
                              </div>
                              <span style={{ fontSize: '0.72rem' }}>{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
