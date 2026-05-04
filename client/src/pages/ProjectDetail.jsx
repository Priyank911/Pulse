import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { getInitials, formatDate, formatRelative, statusLabel, priorityBadgeClass, priorityLabel, isOverdue } from '../utils/helpers';
import {
  Plus, X, ArrowLeft, UserPlus, Trash2, Search, CalendarDays,
  ListChecks, CheckCircle2, AlertTriangle, Clock, TrendingUp
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { joinProject, leaveProject, on, off } = useSocket();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', priority: 'MEDIUM', dueDate: '', assigneeId: '' });

  // Email-based member search
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState('DEVELOPER');
  const [foundUser, setFoundUser] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  const isAdmin = user?.role === 'ADMIN';
  const isMaintainer = project?.members?.some((m) => m.userId === user?.id && m.role === 'MAINTAINER');
  const canManage = isAdmin || isMaintainer;

  const todayStr = new Date().toISOString().split('T')[0];

  const fetchProject = async () => {
    try {
      const res = await api.get(`/projects/${id}`);
      setProject(res.data.project);
    } catch (err) { toast.error('Failed to load project'); navigate('/projects'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchProject();
    joinProject(id);
    const handler = () => fetchProject();
    on('task:created', handler); on('task:updated', handler); on('task:deleted', handler); on('progress:logged', handler);
    return () => { leaveProject(id); off('task:created', handler); off('task:updated', handler); off('task:deleted', handler); off('progress:logged', handler); };
  }, [id]);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!taskForm.title) return toast.error('Title is required');
    try {
      await api.post('/tasks', { ...taskForm, projectId: id });
      toast.success('Task created');
      setShowTaskModal(false);
      setTaskForm({ title: '', description: '', priority: 'MEDIUM', dueDate: '', assigneeId: '' });
      fetchProject();
    } catch (err) { toast.error('Failed to create task'); }
  };

  const handleSearchEmail = async () => {
    if (!memberEmail.trim()) return;
    setSearching(true);
    setFoundUser(null);
    setSearchError('');
    try {
      const res = await api.get(`/auth/search?email=${encodeURIComponent(memberEmail.trim())}`);
      const u = res.data.user;
      if (project.members.some((m) => m.userId === u.id)) {
        setSearchError('This user is already a member of this project.');
      } else {
        setFoundUser(u);
      }
    } catch (err) {
      setSearchError(err.response?.data?.error || 'User not found with this email.');
    } finally { setSearching(false); }
  };

  const handleAddMember = async () => {
    if (!foundUser) return;
    try {
      await api.post(`/projects/${id}/members`, { userId: foundUser.id, role: memberRole });
      toast.success(`${foundUser.name} added`);
      setShowMemberModal(false);
      setMemberEmail(''); setFoundUser(null); setSearchError('');
      fetchProject();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to add member'); }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Delete this task?')) return;
    try { await api.delete(`/tasks/${taskId}`); toast.success('Deleted'); fetchProject(); }
    catch (err) { toast.error('Failed'); }
  };

  const handleStatusChange = async (taskId, status) => {
    try { await api.put(`/tasks/${taskId}`, { status }); fetchProject(); }
    catch (err) { toast.error('Failed'); }
  };

  // Get the latest progress percentage for a task
  const getTaskProgress = (task) => {
    if (task.status === 'DONE') return 100;
    return task.progressLogs?.[0]?.percentage || 0;
  };

  if (loading) return <div className="page-body"><p>Loading...</p></div>;
  if (!project) return null;

  const groups = { TODO: [], IN_PROGRESS: [], IN_REVIEW: [], DONE: [] };
  project.tasks.forEach((t) => { if (groups[t.status]) groups[t.status].push(t); });

  // Collect all progress logs across tasks for the activity feed
  const allLogs = [];
  project.tasks.forEach((t) => {
    (t.progressLogs || []).forEach((log) => {
      allLogs.push({ ...log, taskTitle: t.title, taskId: t.id });
    });
  });
  allLogs.sort((a, b) => new Date(b.date) - new Date(a.date));

  const inProgressCount = groups.IN_PROGRESS.length + groups.IN_REVIEW.length;

  return (
    <>
      {/* Top Header */}
      <div className="top-header">
        <div className="top-header-left">
          <button className="btn-icon btn-secondary" onClick={() => navigate('/projects')} style={{ padding: '6px 8px' }}><ArrowLeft size={18} /></button>
          <div className="top-header-greeting">
            <h2>{project.name}</h2>
            <div className="top-header-date">
              {project.description && <span>{project.description} &middot; </span>}
              {project.deadline && <span>Due {formatDate(project.deadline)}</span>}
            </div>
          </div>
        </div>
        <div className="quick-actions">
          {canManage && <button className="btn btn-secondary btn-sm" onClick={() => { setShowMemberModal(true); setMemberEmail(''); setFoundUser(null); setSearchError(''); }}><UserPlus size={14} /> Add Member</button>}
          {canManage && <button className="btn btn-primary btn-sm" onClick={() => setShowTaskModal(true)}><Plus size={14} /> New Task</button>}
        </div>
      </div>

      <div className="page-body">
        {/* Stats row -- asymmetric hero + secondaries */}
        <div className="stats-asymmetric mb-24">
          <div className="stat-hero">
            <div className="stat-hero-ring">
              <svg viewBox="0 0 80 80" className="stat-hero-svg">
                <circle cx="40" cy="40" r="35" fill="none" stroke="var(--border)" strokeWidth="4" />
                <circle cx="40" cy="40" r="35" fill="none" stroke={project.stats.progress === 100 ? 'var(--success)' : 'var(--accent)'} strokeWidth="4"
                  strokeDasharray={`${project.stats.progress * 2.2} 220`}
                  strokeLinecap="round" transform="rotate(-90 40 40)"
                  style={{ transition: 'stroke-dasharray 600ms ease' }} />
              </svg>
              <div className="stat-hero-pct">{project.stats.progress}%</div>
            </div>
            <div className="stat-hero-meta">
              <div className="stat-hero-label">Project Progress</div>
              <div className="stat-hero-detail">{project.stats.doneTasks} of {project.stats.totalTasks} tasks completed. {project.stats.progress < 100 ? 'Based on logged progress across all tasks.' : 'All tasks complete.'}</div>
            </div>
          </div>
          <div className="stat-secondary-stack">
            <div className="stat-secondary">
              <ListChecks size={16} />
              <div className="stat-secondary-data">
                <span className="stat-secondary-value">{project.stats.totalTasks}</span>
                <span className="stat-secondary-label">Total</span>
              </div>
            </div>
            <div className="stat-secondary">
              <TrendingUp size={16} />
              <div className="stat-secondary-data">
                <span className="stat-secondary-value">{inProgressCount}</span>
                <span className="stat-secondary-label">Active</span>
              </div>
            </div>
            <div className="stat-secondary" style={{ borderColor: project.stats.overdueTasks > 0 ? 'var(--error)' : undefined }}>
              <AlertTriangle size={16} style={{ color: project.stats.overdueTasks > 0 ? 'var(--error)' : undefined }} />
              <div className="stat-secondary-data">
                <span className="stat-secondary-value" style={{ color: project.stats.overdueTasks > 0 ? 'var(--error)' : undefined }}>{project.stats.overdueTasks}</span>
                <span className="stat-secondary-label">Overdue</span>
              </div>
            </div>
          </div>
        </div>

        {/* Members strip */}
        <div className="flex items-center gap-8 mb-24" style={{ flexWrap: 'wrap' }}>
          {project.members.map((m) => (
            <div key={m.id} className="member-chip">
              <div className="avatar avatar-sm">{getInitials(m.user.name)}</div>
              <span className="member-chip-name">{m.user.name}</span>
              <span className="member-chip-role">{m.role}</span>
            </div>
          ))}
        </div>

        {/* Task Board */}
        <div className="flex items-center justify-between mb-16">
          <h3>Task Board</h3>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{project.tasks.length} task{project.tasks.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="kanban mb-24">
          {Object.entries(groups).map(([status, items]) => (
            <div key={status} className="kanban-col">
              <div className="kanban-col-header">
                {statusLabel(status)}
                <span className="kanban-col-count">{items.length}</span>
              </div>
              {items.map((task) => {
                const pct = getTaskProgress(task);
                return (
                  <div key={task.id} className="kanban-card">
                    <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
                      <span className="kanban-card-title">{task.title}</span>
                      {canManage && <button className="btn-icon" onClick={() => handleDeleteTask(task.id)} style={{ color: 'var(--text-muted)', padding: 2 }}><Trash2 size={13} /></button>}
                    </div>
                    {task.description && <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: 6, lineHeight: 1.4 }}>{task.description}</p>}
                    <div className="kanban-card-meta">
                      <span className={`badge ${priorityBadgeClass(task.priority)}`}>{priorityLabel(task.priority)}</span>
                      {task.dueDate && <span style={{ color: isOverdue(task.dueDate, task.status) ? 'var(--error)' : 'inherit' }}>{formatDate(task.dueDate)}</span>}
                    </div>
                    {task.assignee && (
                      <div className="flex items-center gap-8" style={{ marginTop: 8 }}>
                        <div className="avatar avatar-sm">{getInitials(task.assignee.name)}</div>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{task.assignee.name}</span>
                      </div>
                    )}
                    {/* Real progress bar with percentage */}
                    <div className="flex items-center gap-8" style={{ marginTop: 8 }}>
                      <div className="progress-bar-wrap" style={{ flex: 1 }}>
                        <div className={`progress-bar-fill ${pct === 100 ? 'success' : pct > 50 ? 'warning' : ''}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span style={{ fontSize: '0.68rem', color: pct === 100 ? 'var(--success)' : 'var(--text-muted)', minWidth: 28, textAlign: 'right' }}>{pct}%</span>
                    </div>
                    {/* Status changer */}
                    <div style={{ marginTop: 8 }}>
                      <select className="form-input" value={task.status} onChange={(e) => handleStatusChange(task.id, e.target.value)} style={{ padding: '4px 6px', fontSize: '0.7rem' }}>
                        <option value="TODO">To Do</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="IN_REVIEW">In Review</option>
                        <option value="DONE">Done</option>
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Progress Activity Log */}
        {allLogs.length > 0 && (
          <>
            <hr className="section-divider" />
            <div className="flex items-center justify-between mb-16">
              <h3>Progress Log</h3>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{allLogs.length} entr{allLogs.length === 1 ? 'y' : 'ies'}</span>
            </div>
            <div className="card">
              {allLogs.slice(0, 15).map((log, i) => (
                <div key={log.id || i} className="activity-item">
                  <div className="avatar avatar-sm">{getInitials(log.user?.name || 'U')}</div>
                  <div className="activity-content">
                    <div className="activity-text">
                      <strong>{log.user?.name}</strong> logged <strong>{log.percentage}%</strong> on <strong>{log.taskTitle}</strong>
                    </div>
                    {log.description && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>{log.description}</div>}
                    <div className="activity-time">{formatRelative(log.date)}</div>
                  </div>
                  <span style={{ fontSize: '0.78rem', color: log.percentage === 100 ? 'var(--success)' : 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{log.percentage}%</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Create Task Modal */}
      {showTaskModal && (
        <div className="modal-overlay" onClick={() => setShowTaskModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h3>New Task</h3><button className="btn-icon" onClick={() => setShowTaskModal(false)}><X size={18} /></button></div>
            <form onSubmit={handleCreateTask}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Title</label>
                  <input className="form-input" value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} placeholder="Task title" />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-input" value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} rows={3} />
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Priority</label>
                    <select className="form-input" value={taskForm.priority} onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}>
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Due Date</label>
                    <input className="form-input" type="date" min={todayStr} value={taskForm.dueDate} onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Assign To</label>
                  <select className="form-input" value={taskForm.assigneeId} onChange={(e) => setTaskForm({ ...taskForm, assigneeId: e.target.value })}>
                    <option value="">Unassigned</option>
                    {project.members.map((m) => <option key={m.userId} value={m.userId}>{m.user.name} ({m.role})</option>)}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowTaskModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Task</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Member by Email Modal */}
      {showMemberModal && (
        <div className="modal-overlay" onClick={() => setShowMemberModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h3>Add Member</h3><button className="btn-icon" onClick={() => setShowMemberModal(false)}><X size={18} /></button></div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Find User by Email</label>
                <div className="email-search-wrap">
                  <input
                    className="form-input"
                    type="email"
                    value={memberEmail}
                    onChange={(e) => { setMemberEmail(e.target.value); setFoundUser(null); setSearchError(''); }}
                    placeholder="Enter user email address"
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearchEmail(); } }}
                  />
                  <button type="button" className="btn btn-primary" onClick={handleSearchEmail} disabled={searching || !memberEmail.trim()}>
                    <Search size={14} /> {searching ? '...' : 'Search'}
                  </button>
                </div>
                {searchError && <p style={{ fontSize: '0.75rem', color: 'var(--error)', marginTop: 8 }}>{searchError}</p>}
                {foundUser && (
                  <div className="email-search-result">
                    <div className="avatar avatar-sm">{getInitials(foundUser.name)}</div>
                    <div style={{ flex: 1 }}>
                      <div className="found-name">{foundUser.name}</div>
                      <div className="found-email">{foundUser.email}</div>
                    </div>
                    <span className="badge badge-done">{foundUser.role}</span>
                  </div>
                )}
              </div>
              {foundUser && (
                <div className="form-group">
                  <label className="form-label">Project Role</label>
                  <select className="form-input" value={memberRole} onChange={(e) => setMemberRole(e.target.value)}>
                    <option value="DEVELOPER">Developer</option>
                    <option value="MAINTAINER">Maintainer</option>
                  </select>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowMemberModal(false)}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={handleAddMember} disabled={!foundUser}>Add Member</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
