import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { getInitials, formatDate } from '../utils/helpers';
import { Plus, FolderKanban, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Projects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', deadline: '' });
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  const fetchProjects = async () => {
    try {
      const res = await api.get('/projects');
      setProjects(res.data.projects);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchProjects(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name) return toast.error('Project name is required');
    setCreating(true);
    try {
      await api.post('/projects', form);
      toast.success('Project created');
      setShowCreate(false);
      setForm({ name: '', description: '', deadline: '' });
      fetchProjects();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create project');
    } finally { setCreating(false); }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={16} /> New Project
        </button>
      </div>
      <div className="page-body">
        {loading ? <p>Loading...</p> : projects.length === 0 ? (
          <div className="empty-state">
            <FolderKanban size={48} />
            <p>No projects yet. Create your first one.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {projects.map((p) => (
              <div key={p.id} className="card" style={{ cursor: 'pointer' }} onClick={() => navigate(`/projects/${p.id}`)}>
                <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
                  <h3 style={{ fontSize: '0.95rem' }}>{p.name}</h3>
                  <span className={`badge ${p.status === 'ACTIVE' ? 'badge-in-progress' : p.status === 'COMPLETED' ? 'badge-done' : 'badge-todo'}`}>
                    {p.status}
                  </span>
                </div>
                {p.description && <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 12 }}>{p.description}</p>}
                <div className="progress-bar-wrap" style={{ marginBottom: 10 }}>
                  <div className={`progress-bar-fill ${p.stats.progress === 100 ? 'success' : p.stats.progress > 50 ? 'warning' : ''}`} style={{ width: `${p.stats.progress}%` }} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="avatar-stack">
                    {p.members.slice(0, 5).map((m) => (
                      <div key={m.id} className="avatar avatar-sm" title={m.user.name}>{getInitials(m.user.name)}</div>
                    ))}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                    <div>{p.stats.doneTasks}/{p.stats.totalTasks} tasks</div>
                    {p.deadline && <div>{formatDate(p.deadline)}</div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>New Project</h3>
              <button className="btn-icon" onClick={() => setShowCreate(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Project Name</label>
                  <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Enter project name" />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description" rows={3} />
                </div>
                <div className="form-group">
                  <label className="form-label">Deadline</label>
                  <input className="form-input" type="date" min={new Date().toISOString().split('T')[0]} value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={creating}>{creating ? 'Creating...' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
