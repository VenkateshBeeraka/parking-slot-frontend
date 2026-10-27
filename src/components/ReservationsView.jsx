import React, { useEffect, useState } from 'react';
import { ClipboardList, RefreshCw, Timer, Search, Download, Calendar, AlertCircle, Inbox, SquareParking } from 'lucide-react';
import { api } from '../services/api';
import { bookingState, bookingEnd, sortByDate, formatRange, formatDuration, parseDate, dateToApi, relativeDay, pluralize } from '../lib/format';
import { PageHeader, EmptyState, Segmented, SkeletonRows, StatCard, Spinner, initials } from './ui';
import { BookingStatus } from './BookingItem';

const toCsv = (rows) => {
  const header = ['Booking ID', 'User', 'Email', 'Building', 'Building code', 'Slot', 'Start', 'End', 'Status'];
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const label = { upcoming: 'Upcoming', active: 'Active', past: 'Completed' };
  const lines = rows.map(b => [
    b.id, b.userName, b.userEmail, b.buildingName, b.buildingNumber, b.slotNumber, b.bookingDate,
    dateToApi(bookingEnd(b)), label[bookingState(b)]
  ].map(esc).join(','));
  return [header.map(esc).join(','), ...lines].join('\n');
};

export default function ReservationsView({ addToast }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('upcoming');
  const [query, setQuery] = useState('');
  const [closing, setClosing] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setBookings(await api.bookings.getAll());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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

  const upcoming = bookings.filter(b => bookingState(b) === 'upcoming');
  const active = bookings.filter(b => bookingState(b) === 'active');
  const completed = bookings.length - upcoming.length - active.length;
  const today = [...active, ...upcoming].filter(b => relativeDay(b.bookingDate) === 'Today');
  const q = query.trim().toLowerCase();
  const filtered = sortByDate(
    bookings.filter(b =>
      (filter === 'all' || bookingState(b) === filter) &&
      (!q || [b.userName, b.userEmail, b.buildingName, b.buildingNumber, b.slotNumber, b.id].some(v => String(v ?? '').toLowerCase().includes(q)))
    ),
    filter === 'past' ? 'desc' : 'asc'
  );

  const exportCsv = () => {
    const blob = new Blob([toCsv(filtered)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reservations-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader
        eyebrow={<><ClipboardList size={13} /> Manage</>}
        title="Reservations"
        subtitle="Every booking across all buildings."
        actions={
          <>
            <button className="btn btn-secondary" onClick={handleCloseExpired} disabled={closing} title="Mark reservations whose time has passed as completed">
              {closing ? <Spinner size={15} /> : <Timer size={16} />}
              <span>Close expired</span>
            </button>
            <button className="btn btn-secondary" onClick={load} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'spin' : ''} />
              <span>Refresh</span>
            </button>
          </>
        }
      />

      <div className="grid grid-3 stagger mb-lg">
        <StatCard style={{ '--i': 0 }} label="Active now" value={error ? null : active.length} icon={<SquareParking size={20} />} tone="info" loading={loading} meta="Bays in use right now" />
        <StatCard style={{ '--i': 1 }} label="Upcoming" value={error ? null : upcoming.length} icon={<Calendar size={20} />} tone="success" loading={loading} meta={`${today.length} today`} />
        <StatCard style={{ '--i': 2 }} label="All time" value={error ? null : bookings.length} icon={<ClipboardList size={20} />} loading={loading} meta={`${completed} completed`} />
      </div>

      <div className="card">
        <div className="card-header">
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'active', label: `Active ${active.length}` },
              { value: 'upcoming', label: `Upcoming ${upcoming.length}` },
              { value: 'past', label: `Completed ${completed}` },
              { value: 'all', label: `All ${bookings.length}` }
            ]}
          />
          <div className="row gap-sm wrap">
            <div className="input-wrap" style={{ width: 260, maxWidth: '100%' }}>
              <Search size={15} className="input-icon" />
              <input className="input-field" style={{ height: 36 }} placeholder="Search user, building or slot" value={query} onChange={e => setQuery(e.target.value)} aria-label="Search reservations" />
            </div>
            <button className="btn btn-secondary btn-sm" style={{ height: 36 }} onClick={exportCsv} disabled={!filtered.length}>
              <Download size={14} /> Export
            </button>
          </div>
        </div>

        {loading && bookings.length === 0 ? (
          <SkeletonRows rows={6} cols={5} />
        ) : error ? (
          <EmptyState icon={<AlertCircle size={26} />} title="Couldn't load reservations"
            action={<button className="btn btn-secondary" onClick={load}>Try again</button>}>
            {error}
          </EmptyState>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<Inbox size={26} />} title={q ? 'No matching reservations' : 'No reservations here'}>
            {q ? 'Try a different search.' : 'Reservations will appear here as people book.'}
          </EmptyState>
        ) : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Booked by</th>
                    <th>Building</th>
                    <th>Slot</th>
                    <th>When</th>
                    <th>Duration</th>
                    <th>Status</th>
                    <th className="right">ID</th>
                  </tr>
                </thead>
                <tbody key={`${filter}-${q}`}>
                  {filtered.map((b, i) => (
                    <tr key={b.id} style={{ '--i': Math.min(i, 15) }}>
                      <td>
                        <div className="row gap-md">
                          <span className="avatar">{initials(b.userName || b.userEmail || '?')}</span>
                          <div style={{ minWidth: 0 }}>
                            <div className="strong">{b.userName || 'Unknown user'}</div>
                            <div className="text-xs secondary">{b.userEmail || '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="strong">{b.buildingName || b.buildingNumber}</div>
                        <div className="text-xs muted mono">{b.buildingNumber}</div>
                      </td>
                      <td><span className="badge badge-primary mono">{b.slotNumber}</span></td>
                      <td className="secondary">{formatRange(b.bookingDate, bookingEnd(b))}</td>
                      <td className="secondary">{formatDuration(bookingEnd(b) - parseDate(b.bookingDate))}</td>
                      <td><BookingStatus booking={b} /></td>
                      <td className="right mono muted">#{b.id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="card-footer text-xs muted" style={{ padding: '0.75rem 1.5rem' }}>
              Showing {pluralize(filtered.length, 'reservation')}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
