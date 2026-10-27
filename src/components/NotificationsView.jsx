import React, { useEffect, useState } from 'react';
import { Bell, CheckCircle2, XCircle, RefreshCw, Building2, SquareParking, Clock, CalendarCheck, User, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { buildHref } from '../lib/router';
import { timeAgo, formatDateTime, formatRange, parseDate } from '../lib/format';
import { PageHeader, EmptyState, Segmented, Skeleton } from './ui';

const isConfirmation = (n) => !n.status || ['CONFIRMED', 'SLOT BOOKED'].includes(String(n.status).toUpperCase());

export default function NotificationsView({ admin, notifications, lastSeen, refreshNotifications, markNotificationsSeen }) {
  const [scope, setScope] = useState('mine');
  const [everyone, setEveryone] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Remember what was unread when the page opened, so the markers stay visible while reading
  const [seenAtOpen] = useState(lastSeen);

  const load = async (which = scope) => {
    setLoading(true);
    setError(null);
    try {
      if (which === 'all') setEveryone(await api.notifications.getAll());
      else await refreshNotifications();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load('mine').then(() => markNotificationsSeen());
  }, []);

  const changeScope = (next) => {
    setScope(next);
    load(next);
  };

  const list = scope === 'all' ? everyone : notifications;
  const isUnread = (n) => scope === 'mine' && (parseDate(n.timestamp)?.getTime() || 0) > seenAtOpen;

  return (
    <div style={{ maxWidth: 880, margin: '0 auto' }}>
      <PageHeader
        eyebrow={<><Bell size={13} /> Activity</>}
        title="Notifications"
        subtitle={scope === 'all' ? 'Booking activity across all users.' : 'Updates about your reservations.'}
        actions={
          <button className="btn btn-secondary" onClick={() => load()} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
        }
      />

      {admin && (
        <div className="mb-lg">
          <Segmented
            value={scope}
            onChange={changeScope}
            options={[{ value: 'mine', label: 'My notifications' }, { value: 'all', label: 'Everyone' }]}
          />
        </div>
      )}

      <div className="card" style={{ overflow: 'hidden' }}>
        {loading && list.length === 0 ? (
          <div>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="feed-item" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <Skeleton width={40} height={40} radius={999} />
                <div className="stack gap-sm grow">
                  <Skeleton width="30%" height={13} />
                  <Skeleton width="70%" height={11} />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <EmptyState icon={<AlertCircle size={26} />} title="Couldn't load notifications"
            action={<button className="btn btn-secondary" onClick={() => load()}>Try again</button>}>
            {error}
          </EmptyState>
        ) : list.length === 0 ? (
          <EmptyState icon={<Bell size={28} />} title="You're all caught up"
            action={scope === 'mine' && <a className="btn btn-primary" href={buildHref('book')}>Book parking</a>}>
            {scope === 'all' ? 'No booking activity yet.' : "When you book a slot, you'll get a confirmation here."}
          </EmptyState>
        ) : (
          <div className="stagger" key={scope}>
            {list.map((n, idx) => {
              const ok = isConfirmation(n);
              const unread = isUnread(n);
              return (
                <div
                  key={`${n.bookingId}-${idx}`}
                  className="feed-item"
                  style={{
                    '--i': Math.min(idx, 12),
                    borderBottom: idx < list.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                    background: unread ? 'var(--accent-soft)' : undefined
                  }}
                >
                  <span className={`icon-tile ${ok ? 'tone-success' : 'tone-warning'}`} style={{ borderRadius: '50%' }}>
                    {ok ? <CheckCircle2 size={19} /> : <XCircle size={19} />}
                  </span>

                  <div className="grow">
                    <div className="row between gap-md wrap">
                      <span className="strong">{ok ? 'Booking confirmed' : 'Booking update'}</span>
                      <span className="text-xs muted row gap-xs" title={formatDateTime(n.timestamp)}>
                        <Clock size={12} />
                        {timeAgo(n.timestamp)}
                      </span>
                    </div>

                    <p className="text-sm secondary" style={{ marginTop: '0.25rem' }}>
                      {scope === 'all' && n.recipientName ? `${n.recipientName} reserved` : 'Your reservation for'} slot{' '}
                      <strong className="strong mono">{n.slotNumber}</strong> at <strong className="strong">{n.buildingName || n.buildingNumber}</strong>
                      {n.bookingDate ? <> for {n.endDate ? formatRange(n.bookingDate, n.endDate) : formatDateTime(n.bookingDate, { weekday: true })}</> : null}
                      {ok ? ' is confirmed.' : '.'}
                    </p>

                    <div className="feed-meta">
                      {n.buildingNumber && <span className="row gap-xs"><Building2 size={13} /> {n.buildingNumber}</span>}
                      {n.slotNumber && <span className="row gap-xs"><SquareParking size={13} /> <span className="mono">{n.slotNumber}</span></span>}
                      {scope === 'all' && n.recipientEmail && <span className="row gap-xs"><User size={13} /> {n.recipientEmail}</span>}
                      {scope === 'mine' && (
                        <a className="card-link" href={buildHref('bookings')} style={{ padding: 0, fontSize: '0.78rem' }}>
                          <CalendarCheck size={13} /> View booking
                        </a>
                      )}
                    </div>
                  </div>
                  {unread && <span className="unread-dot" aria-label="Unread" />}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
