export function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

export function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatRelative(date) {
  if (!date) return '';
  const d = new Date(date);
  const now = new Date();
  const diff = now - d;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatDate(date);
}

export function isOverdue(dueDate, status) {
  if (!dueDate || status === 'DONE') return false;
  return new Date(dueDate) < new Date();
}

export function statusLabel(status) {
  const map = { TODO: 'To Do', IN_PROGRESS: 'In Progress', IN_REVIEW: 'In Review', DONE: 'Done' };
  return map[status] || status;
}

export function priorityLabel(priority) {
  const map = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', URGENT: 'Urgent' };
  return map[priority] || priority;
}

export function statusBadgeClass(status) {
  const map = { TODO: 'badge-todo', IN_PROGRESS: 'badge-in-progress', IN_REVIEW: 'badge-in-review', DONE: 'badge-done' };
  return map[status] || '';
}

export function priorityBadgeClass(priority) {
  const map = { LOW: 'badge-low', MEDIUM: 'badge-medium', HIGH: 'badge-high', URGENT: 'badge-urgent' };
  return map[priority] || '';
}
