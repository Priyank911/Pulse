import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { statusLabel, statusBadgeClass, priorityBadgeClass, priorityLabel, formatDate, isOverdue } from '../utils/helpers';
import { getInitials } from '../utils/helpers';
import {
  ListChecks, CheckCircle2, AlertTriangle, Clock, Send,
  CalendarDays, TrendingUp
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function MemberDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [logForm, setLogForm] = useState({ taskId: '', percentage: 0, description: '' });
  const [logging, setLogging] = useState(false);
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const res = await api.get('/progress/developer');
      setData(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleLog = async (e) => {
    e.preventDefault();
    if (!logForm.taskId || !logForm.description) return toast.error('Select a task and add a description');
    setLogging(true);
    try {
      await api.post('/progress', logForm);
      toast.success('Progress logged');
      setLogForm({ taskId: '', percentage: 0, description: '' });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to log progress');
    } finally { setLogging(false); }
  };

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  if (loading) return <div className="page-body"><p>Loading...</p></div>;

  const tasks = data?.tasks || [];
  const stats = data?.stats || { totalAssigned: 0, completed: 0, overdue: 0, todayLogs: 0 };
  const todayLogs = data?.todayLogs || [];
  const groups = { TODO: [], IN_PROGRESS: [], IN_REVIEW: [], DONE: [] };
  tasks.forEach((t) => { if (groups[t.status]) groups[t.status].push(t); });
  const activeTasks = tasks.filter((t) => t.status !== 'DONE');
  const completionRate = stats.totalAssigned > 0 ? Math.round((stats.completed / stats.totalAssigned) * 100) : 0;

  return (
    <>
      {/* Top strip */}
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
      </div>

      <div className="page-body">
        {/* Asymmetric stats */}
        <div className="stats-asymmetric mb-24">
          <div className="stat-hero">
            <div className="stat-hero-ring">
              <svg viewBox="0 0 80 80" className="stat-hero-svg">
                <circle cx="40" cy="40" r="35" fill="none" stroke="var(--border)" strokeWidth="4" />
                <circle cx="40" cy="40" r="35" fill="none" stroke="var(--success)" strokeWidth="4"
                  strokeDasharray={`${completionRate * 2.2} 220`}
                  strokeLinecap="round" transform="rotate(-90 40 40)"
                  style={{ transition: 'stroke-dasharray 600ms ease' }} />
              </svg>
              <div className="stat-hero-pct">{completionRate}%</div>
            </div>
            <div className="stat-hero-meta">
              <div className="stat-hero-label">My Progress</div>
              <div className="stat-hero-detail">{stats.completed} of {stats.totalAssigned} tasks completed</div>
            </div>
          </div>
          <div className="stat-secondary-stack">
            <div className="stat-secondary">
              <Clock size={16} />
              <div className="stat-secondary-data">
                <span className="stat-secondary-value">{stats.todayLogs}</span>
                <span className="stat-secondary-label">Logged Today</span>
              </div>
            </div>
            <div className="stat-secondary">
              <TrendingUp size={16} />
              <div className="stat-secondary-data">
                <span className="stat-secondary-value">{activeTasks.length}</span>
                <span className="stat-secondary-label">Active Tasks</span>
              </div>
            </div>
            <div className="stat-secondary" style={{ borderColor: stats.overdue > 0 ? 'var(--error)' : undefined }}>
              <AlertTriangle size={16} style={{ color: stats.overdue > 0 ? 'var(--error)' : undefined }} />
              <div className="stat-secondary-data">
                <span className="stat-secondary-value" style={{ color: stats.overdue > 0 ? 'var(--error)' : undefined }}>{stats.overdue}</span>
                <span className="stat-secondary-label">Overdue</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid-2 mb-24">
          {/* Progress Logger */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Log Daily Progress</h3>
            </div>
            {activeTasks.length === 0 ? (
              <div className="empty-state">
                <TrendingUp size={36} />
                <p>No active tasks to log progress for</p>
              </div>
            ) : (
              <form onSubmit={handleLog}>
                <div className="form-group">
                  <label className="form-label">Task</label>
                  <select className="form-input" value={logForm.taskId} onChange={(e) => setLogForm({ ...logForm, taskId: e.target.value })}>
                    <option value="">Select a task</option>
                    {activeTasks.map((t) => (
                      <option key={t.id} value={t.id}>{t.title} ({t.project?.name})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Progress: {logForm.percentage}%</label>
                  <input type="range" min="0" max="100" step="5" value={logForm.percentage} onChange={(e) => setLogForm({ ...logForm, percentage: parseInt(e.target.value) })} style={{ width: '100%', accentColor: '#1a1a1a' }} />
                  <div className="progress-bar-wrap mt-8">
                    <div className={`progress-bar-fill ${logForm.percentage === 100 ? 'success' : logForm.percentage > 50 ? 'warning' : ''}`} style={{ width: `${logForm.percentage}%` }} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">What did you work on?</label>
                  <textarea className="form-input" value={logForm.description} onChange={(e) => setLogForm({ ...logForm, description: e.target.value })} placeholder="Describe your progress..." rows={3} />
                </div>
                <button type="submit" className="btn btn-primary" disabled={logging}>
                  <Send size={14} /> {logging ? 'Logging...' : 'Log Progress'}
                </button>
              </form>
            )}
          </div>

          {/* Today's Logs */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Today's Activity</h3>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{todayLogs.length} entr{todayLogs.length === 1 ? 'y' : 'ies'}</span>
            </div>
            {todayLogs.length === 0 ? (
              <div className="empty-state">
                <Clock size={36} />
                <p>No progress logged today yet</p>
              </div>
            ) : (
              todayLogs.map((log, i) => (
                <div key={log.id || i} className="activity-item">
                  <div className="activity-content">
                    <div className="flex items-center justify-between">
                      <div className="activity-text"><strong>{log.taskTitle}</strong></div>
                      <span className="badge badge-in-progress">{log.percentage}%</span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 4 }}>{log.description}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Task Kanban */}
        <hr className="section-divider" />
        <div className="flex items-center justify-between mb-16">
          <h3>My Tasks</h3>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{tasks.length} total</span>
        </div>
        <div className="kanban">
          {Object.entries(groups).map(([status, items]) => (
            <div key={status} className="kanban-col">
              <div className="kanban-col-header">
                {statusLabel(status)}
                <span className="kanban-col-count">{items.length}</span>
              </div>
              {items.map((task) => (
                <div key={task.id} className="kanban-card" onClick={() => navigate(`/projects/${task.project?.id}`)}>
                  <div className="kanban-card-title">{task.title}</div>
                  <div className="kanban-card-meta">
                    <span className={`badge ${priorityBadgeClass(task.priority)}`}>{priorityLabel(task.priority)}</span>
                    {task.dueDate && (
                      <span style={{ color: isOverdue(task.dueDate, task.status) ? 'var(--error)' : 'inherit' }}>
                        {formatDate(task.dueDate)}
                      </span>
                    )}
                  </div>
                  {task.project && (
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 6 }}>{task.project.name}</div>
                  )}
                  {task.progressLogs?.[0] && (
                    <div className="progress-bar-wrap" style={{ marginTop: 8 }}>
                      <div className={`progress-bar-fill ${task.progressLogs[0].percentage === 100 ? 'success' : ''}`} style={{ width: `${task.progressLogs[0].percentage}%` }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
