import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { getInitials, formatRelative } from '../utils/helpers';
import { Send, MessageSquareText } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Notes() {
  const { user } = useAuth();
  const { on, off } = useSocket();
  const [notes, setNotes] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ receiverId: '', content: '' });
  const [sending, setSending] = useState(false);

  const fetchNotes = async () => {
    try {
      const res = await api.get('/notes');
      setNotes(res.data.notes);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/auth/users');
      setUsers(res.data.users.filter((u) => u.id !== user.id));
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchNotes();
    fetchUsers();
    const handler = () => fetchNotes();
    on('note:received', handler);
    return () => off('note:received', handler);
  }, []);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!form.receiverId || !form.content) return toast.error('Select a recipient and write a message');
    setSending(true);
    try {
      await api.post('/notes', form);
      toast.success('Note sent');
      setForm({ receiverId: '', content: '' });
      fetchNotes();
    } catch (err) { toast.error('Failed to send'); }
    finally { setSending(false); }
  };

  const markRead = async (noteId) => {
    try { await api.put(`/notes/${noteId}/read`); fetchNotes(); }
    catch (err) { console.error(err); }
  };

  const received = notes.filter((n) => n.receiverId === user.id);
  const sent = notes.filter((n) => n.senderId === user.id);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Notes</h1>
          <p className="page-subtitle">Team communication</p>
        </div>
      </div>
      <div className="page-body">
        <div className="grid-2">
          {/* Send Note */}
          <div className="card">
            <div className="card-header"><h3 className="card-title">Send a Note</h3></div>
            <form onSubmit={handleSend}>
              <div className="form-group">
                <label className="form-label">To</label>
                <select className="form-input" value={form.receiverId} onChange={(e) => setForm({ ...form, receiverId: e.target.value })}>
                  <option value="">Select recipient</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Message</label>
                <textarea className="form-input" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Write your note..." rows={4} />
              </div>
              <button type="submit" className="btn btn-primary" disabled={sending}>
                <Send size={14} /> {sending ? 'Sending...' : 'Send Note'}
              </button>
            </form>
          </div>

          {/* Received */}
          <div className="card">
            <div className="card-header"><h3 className="card-title">Inbox ({received.filter((n) => !n.isRead).length} unread)</h3></div>
            {received.length === 0 ? (
              <div className="empty-state"><MessageSquareText size={36} /><p>No notes received</p></div>
            ) : (
              received.map((note) => (
                <div key={note.id} className={`note-item ${!note.isRead ? 'unread' : ''}`} onClick={() => !note.isRead && markRead(note.id)}>
                  <div className="note-header">
                    <div className="flex items-center gap-8">
                      <div className="avatar avatar-sm">{getInitials(note.sender.name)}</div>
                      <span className="note-sender">{note.sender.name}</span>
                    </div>
                    <span className="note-time">{formatRelative(note.createdAt)}</span>
                  </div>
                  <div className="note-content" style={{ marginTop: 4 }}>{note.content}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Sent Notes */}
        <div className="card mt-24">
          <div className="card-header"><h3 className="card-title">Sent ({sent.length})</h3></div>
          {sent.length === 0 ? (
            <div className="empty-state"><p>No notes sent yet</p></div>
          ) : (
            sent.map((note) => (
              <div key={note.id} className="note-item">
                <div className="note-header">
                  <div className="flex items-center gap-8">
                    <span className="note-sender" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>To: {note.receiver.name}</span>
                  </div>
                  <span className="note-time">{formatRelative(note.createdAt)}</span>
                </div>
                <div className="note-content" style={{ marginTop: 4 }}>{note.content}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
