import React, { useEffect, useState } from 'react';
import {
  CalendarPlus,
  CalendarCheck,
  History,
  Building2,
  Users,
  SquareParking,
  ArrowRight,
  Clock,
  MapPin,
  Bell,
  CheckCircle2,
  Timer,
  Plus,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';
import { navigate, buildHref } from '../lib/router';
import {
  bookingState,
  bookingEnd,
  isCurrent,
  formatTimeRange,
  formatDuration,
  sortByDate,
  formatTime,
  relativeDay,
  timeUntil,
  timeAgo,
  parseDate,
  toDateInput,
  toTimeInput,
  nextHalfHour,
  pluralize
} from '../lib/format';
import { PageHeader, StatCard, EmptyState, Skeleton, Spinner } from './ui';
import BookingItem from './BookingItem';

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

const firstName = (user) => (user.name || '').split(' ')[0] || 'there';

const todayLabel = () => new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

function CardHeader({ title, subtitle, link, linkLabel = 'View all' }) {
  return (
    <div className="card-header">
      <div>
        <h2 className="section-title">{title}</h2>
        {subtitle && <p className="section-subtitle">{subtitle}</p>}
      </div>
      {link && (
        <a className="card-link" href={buildHref(link)}>
          {linkLabel} <ArrowRight size={14} />
        </a>
      )}
    </div>
  );
}

function ListSkeleton({ rows = 3 }) {
  return (
    <div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="booking-item">
          <Skeleton width={52} height={50} radius={10} />
          <div className="stack gap-sm grow">
            <Skeleton width="40%" height={13} />
            <Skeleton width="60%" height={11} />
          </div>
        </div>
      ))}
    </div>
  );
}

function LoadError({ message, onRetry }) {
  return (
    <div className="row gap-md" style={{ padding: '1.25rem 1.5rem', color: 'var(--color-danger-text)' }}>
      <AlertCircle size={16} />
      <span className="text-sm grow">{message}</span>
      {onRetry && <button className="btn btn-secondary btn-sm" onClick={onRetry}>Retry</button>}
    </div>
  );
}

/* --------------------------------------------------------------------------
   Member overview
   -------------------------------------------------------------------------- */

function NextBooking({ booking }) {
  if (!booking) {
    return (
      <div className="hero-empty">
        <span className="icon-tile icon-tile-lg"><CalendarPlus size={22} /></span>
        <div className="grow">
          <h3 className="section-title">No upcoming reservations</h3>
          <p className="section-subtitle">Reserve a bay ahead of time and skip the search when you arrive.</p>
        </div>
        <a className="btn btn-primary" href={buildHref('book')}>
          <span>Book parking</span>
          <ArrowRight size={16} />
        </a>
      </div>
    );
  }

  const end = bookingEnd(booking);
  const active = bookingState(booking) === 'active';

  return (
    <div className="hero-card">
      <div className="row between wrap gap-md">
        <span className="hero-label">
          <CalendarCheck size={14} /> {active ? "You're parked now" : 'Your next reservation'}
        </span>
        <span className="hero-countdown">
          <Timer size={13} /> {active ? `Ends ${timeUntil(end)}` : `Starts ${timeUntil(booking.bookingDate)}`}
        </span>
      </div>
      <h2 className="hero-title">{booking.buildingName || booking.buildingNumber}</h2>
      <p className="hero-sub">{relativeDay(booking.bookingDate)} · {formatTimeRange(booking.bookingDate, end)}</p>

      <div className="hero-meta">
        <div className="hero-meta-item">
          <small>Slot</small>
          <strong className="mono">{booking.slotNumber}</strong>
        </div>
        <div className="hero-meta-item">
          <small>{active ? 'Until' : 'Time'}</small>
          <strong>{active ? formatTime(end) : formatTimeRange(booking.bookingDate, end)}</strong>
        </div>
        <div className="hero-meta-item">
          <small>Duration</small>
          <strong>{formatDuration(end - parseDate(booking.bookingDate))}</strong>
        </div>
      </div>

      <div className="row gap-sm wrap" style={{ marginTop: '1.5rem' }}>
        <a className="btn btn-light" href={buildHref('bookings')}>Manage booking</a>
        <a className="btn btn-glass" href={buildHref('book', { building: booking.buildingNumber })}>
          <Plus size={16} /> Book another
        </a>
      </div>
    </div>
  );
}

function QuickBook({ buildings, loading }) {
  const start = nextHalfHour();
  const [building, setBuilding] = useState('');
  const [date, setDate] = useState(toDateInput(start));
  const [time, setTime] = useState(toTimeInput(start));
  const [duration, setDuration] = useState('2');

  const selected = building || buildings[0]?.buildingNumber || '';

  return (
    <div className="card">
      <CardHeader title="Quick book" subtitle="Find an open bay in two clicks" />
      <form
        className="card-body"
        onSubmit={(e) => {
          e.preventDefault();
          navigate('book', { building: selected, date, time, duration });
        }}
      >
        <div className="input-group">
          <label className="input-label">Building</label>
          {loading ? (
            <Skeleton height={42} radius={10} />
          ) : (
            <select className="input-field" value={selected} onChange={e => setBuilding(e.target.value)} disabled={!buildings.length}>
              {buildings.length === 0 && <option value="">No buildings available</option>}
              {buildings.map(b => (
                <option key={b.buildingNumber} value={b.buildingNumber}>{b.buildingName}</option>
              ))}
            </select>
          )}
        </div>
        <div className="grid grid-2" style={{ gap: '0.75rem' }}>
          <div className="input-group">
            <label className="input-label">Date</label>
            <input type="date" className="input-field" value={date} min={toDateInput(new Date())} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="input-group">
            <label className="input-label">Start time</label>
            <input type="time" className="input-field" value={time} onChange={e => setTime(e.target.value)} />
          </div>
        </div>
        <div className="input-group">
          <label className="input-label">How long?</label>
          <select className="input-field" value={duration} onChange={e => setDuration(e.target.value)}>
            <option value="1">1 hour</option>
            <option value="2">2 hours</option>
            <option value="4">4 hours</option>
            <option value="8">8 hours</option>
            <option value="custom">Custom…</option>
          </select>
        </div>
        <button type="submit" className="btn btn-primary btn-block" disabled={!selected}>
          <span>Find a slot</span>
          <ArrowRight size={16} />
        </button>
      </form>
    </div>
  );
}

function RecentActivity({ notifications }) {
  const items = notifications.slice(0, 4);
  return (
    <div className="card">
      <CardHeader title="Recent activity" link="notifications" />
      {items.length === 0 ? (
        <div className="list-row text-sm secondary" style={{ padding: '1.25rem 1.5rem' }}>
          <Bell size={16} className="muted" />
          <span>Booking confirmations will show up here.</span>
        </div>
      ) : (
        items.map((n, i) => (
          <div key={n.bookingId ?? i} className="list-row" style={{ animation: `fadeIn 400ms ease ${i * 60}ms backwards` }}>
            <span className="icon-tile tone-success" style={{ width: 32, height: 32, borderRadius: '50%' }}>
              <CheckCircle2 size={16} />
            </span>
            <div className="grow">
              <div className="text-sm strong">Booking confirmed</div>
              <div className="text-xs secondary" style={{ marginTop: 2 }}>
                {n.buildingName || n.buildingNumber} · Slot {n.slotNumber}
              </div>
            </div>
            <span className="text-xs muted" style={{ whiteSpace: 'nowrap' }}>{timeAgo(n.timestamp)}</span>
          </div>
        ))
      )}
    </div>
  );
}

function MemberOverview({ user, notifications }) {
  const [bookings, setBookings] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const [b, bl] = await Promise.allSettled([api.bookings.mine(), api.buildings.getAll()]);
    if (b.status === 'fulfilled') setBookings(b.value);
    else setError(b.reason?.message || 'Could not load your bookings.');
    if (bl.status === 'fulfilled') setBuildings(bl.value);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  // Upcoming includes a stay that is in progress, which is shown first
  const upcoming = sortByDate(bookings.filter(isCurrent), 'asc');
  const activeCount = upcoming.filter(b => bookingState(b) === 'active').length;
  const past = bookings.filter(b => bookingState(b) === 'past');

  return (
    <div>
      <PageHeader
        eyebrow={todayLabel()}
        title={`${greeting()}, ${firstName(user)}`}
        subtitle="Here's what's coming up for your parking."
        actions={
          <a className="btn btn-primary" href={buildHref('book')}>
            <CalendarPlus size={17} />
            <span>Book parking</span>
          </a>
        }
      />

      <div className="grid grid-3 stagger mb-xl">
        <StatCard style={{ '--i': 0 }} label="Upcoming" value={upcoming.length} icon={<CalendarCheck size={20} />} tone="success" loading={loading}
          meta={activeCount ? `${activeCount} active now` : upcoming[0] ? <>Next: {relativeDay(upcoming[0].bookingDate)}, {formatTime(upcoming[0].bookingDate)}</> : 'Nothing scheduled'} />
        <StatCard style={{ '--i': 1 }} label="Completed" value={past.length} icon={<History size={20} />} loading={loading} meta="Past reservations" />
        <StatCard style={{ '--i': 2 }} label="Buildings" value={buildings.length} icon={<Building2 size={20} />} tone="info" loading={loading} meta="Available to book" />
      </div>

      <div className="layout-split">
        <div className="main">
          {loading ? <Skeleton height={220} radius={20} /> : <NextBooking booking={upcoming[0]} />}

          <div className="card" style={{ animation: 'riseIn 420ms var(--ease-out) 120ms backwards' }}>
            <CardHeader
              title="Upcoming reservations"
              subtitle={loading ? 'Loading…' : pluralize(upcoming.length, 'reservation')}
              link="bookings"
            />
            {loading ? (
              <ListSkeleton />
            ) : error ? (
              <LoadError message={error} onRetry={load} />
            ) : upcoming.length === 0 ? (
              <EmptyState icon={<CalendarCheck size={26} />} title="Nothing booked yet">
                When you reserve a slot it will appear here.
              </EmptyState>
            ) : (
              upcoming.slice(0, 5).map((b, i) => (
                <BookingItem key={b.id} booking={b} style={{ animation: `fadeIn 400ms ease ${i * 50}ms backwards` }} />
              ))
            )}
          </div>
        </div>

        <div className="side">
          <QuickBook buildings={buildings} loading={loading} />
          <RecentActivity notifications={notifications} />
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------------
   Admin overview
   -------------------------------------------------------------------------- */

const knownCount = (v) => (typeof v === 'number' && v >= 0 ? v : null);

function AdminOverview({ user, addToast }) {
  const [stats, setStats] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [slotsByBuilding, setSlotsByBuilding] = useState({});
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const [closing, setClosing] = useState(false);

  const load = async () => {
    setLoading(true);
    const [d, b, bl] = await Promise.allSettled([api.admin.getDashboard(), api.bookings.getAll(), api.buildings.getAll()]);
    const nextErrors = {};
    setStats(d.status === 'fulfilled' ? d.value : null);
    if (b.status === 'fulfilled') setBookings(b.value);
    else nextErrors.bookings = b.reason?.message || 'Could not load reservations.';

    const list = bl.status === 'fulfilled' ? bl.value : [];
    if (bl.status !== 'fulfilled') nextErrors.buildings = bl.reason?.message || 'Could not load buildings.';
    setBuildings(list);

    const slotResults = await Promise.allSettled(list.map(x => api.slots.getByBuilding(x.buildingNumber)));
    const map = {};
    list.forEach((x, i) => {
      map[x.buildingNumber] = slotResults[i].status === 'fulfilled' ? slotResults[i].value : null;
    });
    setSlotsByBuilding(map);
    setErrors(nextErrors);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleCloseExpired = async () => {
    setClosing(true);
    try {
      const res = await api.bookings.closeExpired();
      addToast(typeof res === 'string' ? res : 'Expired reservations closed', 'success');
      load();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setClosing(false);
    }
  };

  const allSlots = Object.values(slotsByBuilding).filter(Boolean).flat();
  const scheduled = allSlots.filter(s => s.availability?.fromDate && s.availability?.toDate).length;
  const upcoming = sortByDate(bookings.filter(b => bookingState(b) === 'upcoming'), 'asc');
  const activeNow = bookings.filter(b => bookingState(b) === 'active');
  const completed = bookings.length - upcoming.length - activeNow.length;
  const now = Date.now();
  const today = [...activeNow, ...upcoming].filter(b => relativeDay(b.bookingDate) === 'Today').length;
  const thisWeek = upcoming.filter(b => (parseDate(b.bookingDate)?.getTime() || 0) - now < 7 * 86400000).length;
  const recent = sortByDate(bookings, 'desc').slice(0, 6);

  const totalBookings = knownCount(stats?.totalBookings) ?? (errors.bookings ? null : bookings.length);
  const pct = (n, total) => `${total ? Math.round((n / total) * 100) : 0}%`;

  return (
    <div>
      <PageHeader
        eyebrow={todayLabel()}
        title={`${greeting()}, ${firstName(user)}`}
        subtitle="Here's how your parking network is doing."
        actions={
          <>
            <a className="btn btn-secondary" href={buildHref('slots')}>
              <SquareParking size={16} />
              <span>Manage slots</span>
            </a>
            <a className="btn btn-primary" href={buildHref('buildings', { new: 1 })}>
              <Plus size={17} />
              <span>Add building</span>
            </a>
          </>
        }
      />

      <div className="grid grid-4 stagger mb-xl">
        <StatCard style={{ '--i': 0 }} label="Users" value={knownCount(stats?.totalUsers)} icon={<Users size={20} />} tone="violet" loading={loading} meta={<a href={buildHref('users')} className="card-link" style={{ padding: 0, fontSize: '0.78rem' }}>Manage users <ArrowRight size={12} /></a>} />
        <StatCard style={{ '--i': 1 }} label="Buildings" value={errors.buildings ? null : buildings.length} icon={<Building2 size={20} />} loading={loading} meta={pluralize(buildings.length, 'site')} />
        <StatCard style={{ '--i': 2 }} label="Parking slots" value={allSlots.length} icon={<SquareParking size={20} />} tone="success" loading={loading} meta={`${scheduled} bookable`} />
        <StatCard style={{ '--i': 3 }} label="Reservations" value={totalBookings} icon={<CalendarCheck size={20} />} tone="warning" loading={loading} meta={activeNow.length ? `${activeNow.length} active · ${upcoming.length} upcoming` : `${upcoming.length} upcoming`} />
      </div>

      <div className="layout-split">
        <div className="main">
          <div className="card" style={{ animation: 'riseIn 420ms var(--ease-out) 120ms backwards' }}>
            <CardHeader title="Recent reservations" subtitle="Latest bookings across all buildings" link="reservations" />
            {loading ? (
              <ListSkeleton rows={4} />
            ) : errors.bookings ? (
              <LoadError message={errors.bookings} onRetry={load} />
            ) : recent.length === 0 ? (
              <EmptyState icon={<CalendarCheck size={26} />} title="No reservations yet">
                Reservations made by users will appear here.
              </EmptyState>
            ) : (
              recent.map((b, i) => (
                <BookingItem key={b.id} booking={b} showUser style={{ animation: `fadeIn 400ms ease ${i * 50}ms backwards` }} />
              ))
            )}
          </div>

          <div className="card" style={{ animation: 'riseIn 420ms var(--ease-out) 200ms backwards' }}>
            <CardHeader title="Buildings" subtitle="Slot coverage per site" link="buildings" />
            {loading ? (
              <ListSkeleton rows={2} />
            ) : errors.buildings ? (
              <LoadError message={errors.buildings} onRetry={load} />
            ) : buildings.length === 0 ? (
              <EmptyState icon={<Building2 size={26} />} title="No buildings yet"
                action={<a className="btn btn-primary" href={buildHref('buildings', { new: 1 })}><Plus size={16} /> Add building</a>}>
                Add your first site to start offering parking.
              </EmptyState>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Building</th>
                      <th>Slots</th>
                      <th style={{ width: '32%' }}>Bookable</th>
                      <th className="right"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {buildings.map((b, i) => {
                      const slots = slotsByBuilding[b.buildingNumber];
                      const total = slots ? slots.length : null;
                      const ok = slots ? slots.filter(s => s.availability?.fromDate).length : 0;
                      return (
                        <tr key={b.buildingNumber} style={{ '--i': i }}>
                          <td>
                            <div className="strong">{b.buildingName}</div>
                            <div className="text-xs muted row gap-xs" style={{ marginTop: 2 }}><MapPin size={12} />{b.town || b.area}</div>
                          </td>
                          <td className="strong">{total ?? '—'}</td>
                          <td>
                            <div className="row gap-sm">
                              <div className="meter grow"><span style={{ width: pct(ok, total), background: 'var(--color-success)' }} /></div>
                              <span className="text-xs secondary" style={{ minWidth: 34 }}>{total ? pct(ok, total) : '—'}</span>
                            </div>
                          </td>
                          <td className="right">
                            <a className="btn btn-ghost btn-sm" href={buildHref('slots', { building: b.buildingNumber })}>
                              Manage <ArrowRight size={14} />
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="side">
          <div className="card">
            <CardHeader title="Reservation status" />
            <div className="card-body" style={{ paddingTop: '1.1rem' }}>
              {loading ? (
                <Skeleton height={8} radius={99} />
              ) : (
                <div className="meter" role="img" aria-label={`${activeNow.length} active, ${upcoming.length} upcoming, ${completed} completed`}>
                  <span style={{ width: pct(activeNow.length, bookings.length), background: 'var(--color-info)' }} />
                  <span style={{ width: pct(upcoming.length, bookings.length), background: 'var(--color-success)' }} />
                  <span style={{ width: pct(completed, bookings.length), background: 'var(--text-muted)' }} />
                </div>
              )}
              <div style={{ marginTop: '0.75rem' }}>
                <div className="mini-stat"><span className="row gap-sm secondary"><span className="dot" style={{ color: 'var(--color-info)' }} />Active now</span><strong>{loading ? '—' : activeNow.length}</strong></div>
                <div className="mini-stat"><span className="row gap-sm secondary"><span className="dot" style={{ color: 'var(--color-success)' }} />Upcoming</span><strong>{loading ? '—' : upcoming.length}</strong></div>
                <div className="mini-stat"><span className="row gap-sm secondary"><span className="dot" style={{ color: 'var(--text-muted)' }} />Completed</span><strong>{loading ? '—' : completed}</strong></div>
                <div className="mini-stat"><span className="row gap-sm secondary"><Clock size={13} />Today</span><strong>{loading ? '—' : today}</strong></div>
                <div className="mini-stat"><span className="row gap-sm secondary"><CalendarCheck size={13} />Next 7 days</span><strong>{loading ? '—' : thisWeek}</strong></div>
              </div>
            </div>
          </div>

          <div className="card">
            <CardHeader title="Slot coverage" />
            <div className="card-body" style={{ paddingTop: '1.1rem' }}>
              {loading ? (
                <Skeleton height={40} />
              ) : allSlots.length === 0 ? (
                <p className="text-sm secondary">No slots configured yet.</p>
              ) : (
                <>
                  <div className="row between" style={{ marginBottom: '0.5rem' }}>
                    <span className="stat-value" style={{ fontSize: '1.6rem' }}>{pct(scheduled, allSlots.length)}</span>
                    <span className="text-xs muted">{scheduled} of {allSlots.length} bookable</span>
                  </div>
                  <div className="meter"><span style={{ width: pct(scheduled, allSlots.length), background: 'var(--accent)' }} /></div>
                  {allSlots.length - scheduled > 0 && (
                    <p className="text-sm secondary" style={{ marginTop: '0.85rem' }}>
                      {pluralize(allSlots.length - scheduled, 'slot')} {allSlots.length - scheduled === 1 ? 'has' : 'have'} no availability window and can't be booked.
                    </p>
                  )}
                </>
              )}
              <a className="btn btn-secondary btn-block btn-sm" style={{ marginTop: '1rem' }} href={buildHref('slots')}>Manage availability</a>
            </div>
          </div>

          <div className="card">
            <CardHeader title="Maintenance" />
            <div className="card-body" style={{ paddingTop: '1.1rem' }}>
              <p className="text-sm secondary">
                Reservations whose time has passed are closed automatically every minute. You can also close them now.
              </p>
              <button className="btn btn-secondary btn-block btn-sm" style={{ marginTop: '1rem' }} onClick={handleCloseExpired} disabled={closing}>
                {closing ? <Spinner size={14} /> : <Timer size={14} />}
                <span>{closing ? 'Closing…' : 'Close expired reservations'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OverviewView(props) {
  return props.admin ? <AdminOverview {...props} /> : <MemberOverview {...props} />;
}
