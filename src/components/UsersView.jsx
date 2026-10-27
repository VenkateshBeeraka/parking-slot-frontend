import React, { useEffect, useState } from 'react';
import { Users, RefreshCw, Search, Trash2, MapPin, ShieldCheck, UserRound, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { isAdmin, pluralize } from '../lib/format';
import { PageHeader, EmptyState, Segmented, SkeletonRows, StatCard, Spinner, useConfirm, initials } from './ui';

export default function UsersView({ user: currentUser, addToast }) {
  const confirm = useConfirm();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setUsers(await api.users.getAll());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleRoleChange = async (u) => {
    const makeAdmin = !isAdmin(u);
    const ok = await confirm({
      title: makeAdmin ? `Make ${u.name} an administrator?` : `Remove admin access for ${u.name}?`,
      message: makeAdmin
        ? 'Administrators can manage buildings, slots, reservations and other users.'
        : 'They will keep their account and bookings but lose access to management pages.',
      confirmText: makeAdmin ? 'Make admin' : 'Remove admin',
      tone: makeAdmin ? 'primary' : 'danger',
      icon: <ShieldCheck size={20} />
    });
    if (!ok) return;
    setBusyId(u.id);
    try {
      await api.users.update(u.id, { role: makeAdmin ? 'ADMIN' : 'USER' });
      setUsers(prev => prev.map(x => (x.id === u.id ? { ...x, role: makeAdmin ? 'ADMIN' : 'USER' } : x)));
      addToast(`${u.name} is now ${makeAdmin ? 'an administrator' : 'a member'}`, 'success');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (u) => {
    const ok = await confirm({
      title: `Delete ${u.name}?`,
      message: `${u.email} will lose access immediately. This cannot be undone.`,
      confirmText: 'Delete user'
    });
    if (!ok) return;
    setBusyId(u.id);
    try {
      await api.users.delete(u.id);
      setUsers(prev => prev.filter(x => x.id !== u.id));
      addToast(`${u.name} was deleted`, 'success');
    } catch (err) {
      addToast(err.status >= 500 ? `${u.name} couldn't be deleted. They may still have reservations.` : err.message, 'error');
    } finally {
      setBusyId(null);
    }
  };

  const admins = users.filter(isAdmin).length;
  const q = query.trim().toLowerCase();
  const filtered = users.filter(u =>
    (roleFilter === 'all' || (roleFilter === 'admin' ? isAdmin(u) : !isAdmin(u))) &&
    (!q || [u.name, u.email, u.city].some(v => String(v || '').toLowerCase().includes(q)))
  );

  return (
    <div>
      <PageHeader
        eyebrow={<><Users size={13} /> Manage</>}
        title="Users"
        subtitle="People with access to ParkPulse."
        actions={
          <button className="btn btn-secondary" onClick={load} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
        }
      />

      <div className="grid grid-3 stagger mb-lg">
        <StatCard style={{ '--i': 0 }} label="Total users" value={error ? null : users.length} icon={<Users size={20} />} tone="violet" loading={loading} meta="Registered accounts" />
        <StatCard style={{ '--i': 1 }} label="Members" value={error ? null : users.length - admins} icon={<UserRound size={20} />} tone="success" loading={loading} meta="Can book parking" />
        <StatCard style={{ '--i': 2 }} label="Administrators" value={error ? null : admins} icon={<ShieldCheck size={20} />} loading={loading} meta="Full management access" />
      </div>

      <div className="card">
        <div className="card-header">
          <Segmented
            value={roleFilter}
            onChange={setRoleFilter}
            options={[
              { value: 'all', label: `All ${users.length}` },
              { value: 'member', label: `Members ${users.length - admins}` },
              { value: 'admin', label: `Admins ${admins}` }
            ]}
          />
          <div className="input-wrap" style={{ width: 260, maxWidth: '100%' }}>
            <Search size={15} className="input-icon" />
            <input className="input-field" style={{ height: 36 }} placeholder="Search name, email or city" value={query} onChange={e => setQuery(e.target.value)} aria-label="Search users" />
          </div>
        </div>

        {loading && users.length === 0 ? (
          <SkeletonRows rows={4} cols={4} />
        ) : error ? (
          <EmptyState icon={<AlertCircle size={26} />} title="Couldn't load users"
            action={<button className="btn btn-secondary" onClick={load}>Try again</button>}>
            {error}
          </EmptyState>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<Users size={26} />} title={q ? 'No matching users' : 'No users here'}>
            {q ? 'Try a different name, email or city.' : 'Nobody matches this filter.'}
          </EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>City</th>
                  <th className="right">Actions</th>
                </tr>
              </thead>
              <tbody key={`${roleFilter}-${q}`}>
                {filtered.map((u, i) => {
                  const self = u.id === currentUser.id;
                  const busy = busyId === u.id;
                  return (
                    <tr key={u.id} style={{ '--i': Math.min(i, 15), opacity: busy ? 0.55 : 1 }}>
                      <td>
                        <div className="row gap-md">
                          <span className="avatar">{initials(u.name || u.email)}</span>
                          <div style={{ minWidth: 0 }}>
                            <div className="strong">{u.name}{self && <span className="badge badge-outline" style={{ marginLeft: 8 }}>You</span>}</div>
                            <div className="text-xs secondary">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${isAdmin(u) ? 'badge-violet' : 'badge-success'}`}>
                          {isAdmin(u) ? 'Administrator' : 'Member'}
                        </span>
                      </td>
                      <td className="secondary">
                        {u.city ? <span className="row gap-xs"><MapPin size={13} className="muted" />{u.city}</span> : '—'}
                      </td>
                      <td className="right">
                        {self ? (
                          <span className="text-xs muted">—</span>
                        ) : (
                          <div className="row gap-xs" style={{ justifyContent: 'flex-end' }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => handleRoleChange(u)} disabled={busy}>
                              {busy ? <Spinner size={13} /> : <ShieldCheck size={14} />}
                              <span>{isAdmin(u) ? 'Remove admin' : 'Make admin'}</span>
                            </button>
                            <button className="btn btn-danger-soft btn-sm btn-icon" onClick={() => handleDelete(u)} disabled={busy} aria-label={`Delete ${u.name}`} title="Delete user">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!loading && !error && filtered.length > 0 && (
          <div className="card-footer text-xs muted" style={{ padding: '0.75rem 1.5rem' }}>
            Showing {pluralize(filtered.length, 'user')}
          </div>
        )}
      </div>
    </div>
  );
}
