import React, { useEffect, useState } from 'react';
import { UserRound, Mail, MapPin, ShieldCheck, LogOut, Save, User, KeyRound } from 'lucide-react';
import { api, authStorage } from '../services/api';
import { formatDateTime } from '../lib/format';
import { PageHeader, Spinner, initials } from './ui';

export default function AccountView({ user, admin, addToast, onUserUpdate, onLogout }) {
  const [form, setForm] = useState({ name: user.name || '', city: user.city || '' });
  const [saving, setSaving] = useState(false);

  // Refresh from the server so the form shows the latest saved values
  useEffect(() => {
    if (user.id == null) return;
    api.users.getById(user.id)
      .then(p => {
        setForm({ name: p.name || '', city: p.city || '' });
        onUserUpdate({ name: p.name, city: p.city, email: p.email });
      })
      .catch(() => {});
  }, [user.id]);

  const dirty = form.name.trim() !== (user.name || '') || form.city.trim() !== (user.city || '');
  const valid = form.name.trim() && form.city.trim();

  const handleSave = async (e) => {
    e.preventDefault();
    if (!dirty || !valid) return;
    setSaving(true);
    try {
      const updated = await api.users.update(user.id, { name: form.name.trim(), city: form.city.trim() });
      onUserUpdate({ name: updated?.name ?? form.name.trim(), city: updated?.city ?? form.city.trim() });
      addToast('Profile updated', 'success');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const exp = authStorage.getClaims()?.exp;

  return (
    <div>
      <PageHeader
        eyebrow={<><UserRound size={13} /> Account</>}
        title="Account settings"
        subtitle="Manage your profile and session."
      />

      <div className="layout-split">
        <div className="main">
          <form className="card" onSubmit={handleSave} style={{ animation: 'riseIn 420ms var(--ease-out) backwards' }}>
            <div className="card-header">
              <div>
                <h2 className="section-title">Profile</h2>
                <p className="section-subtitle">This is how you appear across ParkPulse.</p>
              </div>
            </div>
            <div className="card-body">
              <div className="grid grid-2" style={{ gap: '0.75rem' }}>
                <div className="input-group">
                  <label className="input-label" htmlFor="acc-name">Full name</label>
                  <div className="input-wrap">
                    <User size={16} className="input-icon" />
                    <input id="acc-name" className="input-field" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                  </div>
                </div>
                <div className="input-group">
                  <label className="input-label" htmlFor="acc-city">City</label>
                  <div className="input-wrap">
                    <MapPin size={16} className="input-icon" />
                    <input id="acc-city" className="input-field" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} required />
                  </div>
                </div>
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label" htmlFor="acc-email">Email</label>
                <div className="input-wrap">
                  <Mail size={16} className="input-icon" />
                  <input id="acc-email" className="input-field" value={user.email || ''} disabled style={{ opacity: 0.7 }} />
                </div>
                <span className="input-hint">Your email is used to sign in and can't be changed here.</span>
              </div>
            </div>
            <div className="card-footer" style={{ justifyContent: 'flex-end', padding: '1rem 1.5rem' }}>
              <button type="button" className="btn btn-secondary" disabled={!dirty || saving} onClick={() => setForm({ name: user.name || '', city: user.city || '' })}>
                Discard
              </button>
              <button type="submit" className="btn btn-primary" disabled={!dirty || !valid || saving}>
                {saving ? <Spinner /> : <Save size={16} />}
                <span>{saving ? 'Saving…' : 'Save changes'}</span>
              </button>
            </div>
          </form>

          <div className="card" style={{ animation: 'riseIn 420ms var(--ease-out) 80ms backwards' }}>
            <div className="card-header">
              <div>
                <h2 className="section-title">Session</h2>
                <p className="section-subtitle">You're signed in on this device.</p>
              </div>
            </div>
            <div className="card-body row between wrap gap-md">
              <div className="row gap-md">
                <span className="icon-tile"><KeyRound size={18} /></span>
                <div>
                  <div className="strong text-sm">Current session</div>
                  <div className="text-xs secondary">{exp ? `Expires ${formatDateTime(exp * 1000, { weekday: true })}` : 'Active'}</div>
                </div>
              </div>
              <button className="btn btn-danger-soft" onClick={onLogout}>
                <LogOut size={16} />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        </div>

        <div className="side">
          <div className="card card-pad" style={{ textAlign: 'center', animation: 'riseIn 420ms var(--ease-out) 40ms backwards' }}>
            <span className="avatar" style={{ width: 72, height: 72, fontSize: '1.4rem', margin: '0 auto' }}>{initials(user.name || user.email)}</span>
            <div className="strong" style={{ marginTop: '0.9rem', fontSize: '1.05rem' }}>{user.name || '—'}</div>
            <div className="text-sm secondary">{user.email}</div>
            <div className="row gap-sm" style={{ justifyContent: 'center', marginTop: '0.85rem' }}>
              <span className={`badge ${admin ? 'badge-violet' : 'badge-success'}`}>
                {admin && <ShieldCheck size={12} />}
                {admin ? 'Administrator' : 'Member'}
              </span>
              {user.city && <span className="badge badge-neutral"><MapPin size={11} /> {user.city}</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
