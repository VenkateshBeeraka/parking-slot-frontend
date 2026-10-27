import React, { useEffect, useState } from 'react';
import { CalendarCheck, CalendarPlus, RefreshCw, History, AlertCircle, Info } from 'lucide-react';
import { api } from '../services/api';
import { buildHref } from '../lib/router';
import { bookingState, bookingEnd, isCurrent, sortByDate, formatRange, timeUntil, pluralize } from '../lib/format';
import { PageHeader, EmptyState, Segmented, Skeleton, useConfirm } from './ui';
import BookingItem from './BookingItem';

export default function MyBookingsView({ addToast }) {
  const confirm = useConfirm();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('upcoming');
  const [cancellingId, setCancellingId] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setBookings(await api.bookings.mine());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCancel = async (b) => {
    const ok = await confirm({
      title: 'Cancel this reservation?',
      message: `${b.buildingName || b.buildingNumber}, slot ${b.slotNumber} on ${formatRange(b.bookingDate, bookingEnd(b))}. The slot will be released for others.`,
      confirmText: 'Cancel reservation',
      cancelText: 'Keep it'
    });
    if (!ok) return;
    setCancellingId(b.id);
    try {
      await api.bookings.cancel(b.id);
      setBookings(prev => prev.filter(x => x.id !== b.id));
      addToast('Reservation cancelled', 'success');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setCancellingId(null);
    }
  };

  // "Upcoming" tab includes stays that are in progress right now
  const upcoming = sortByDate(bookings.filter(isCurrent), 'asc');
  const active = upcoming.filter(b => bookingState(b) === 'active');
  const past = sortByDate(bookings.filter(b => bookingState(b) === 'past'), 'desc');
  const cancellable = upcoming.length - active.length;
  const list = tab === 'upcoming' ? upcoming : past;
  const next = upcoming[0];

  const buildingCounts = bookings.reduce((acc, b) => {
    const key = b.buildingName || b.buildingNumber;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const favourite = Object.entries(buildingCounts).sort((a, b) => b[1] - a[1])[0];

  return (
    <div>
      <PageHeader
        eyebrow={<><CalendarCheck size={13} /> Reservations</>}
        title="My bookings"
        subtitle="Your upcoming and past parking reservations."
        actions={
          <>
            <button className="btn btn-secondary" onClick={load} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'spin' : ''} />
              <span>Refresh</span>
            </button>
            <a className="btn btn-primary" href={buildHref('book')}>
              <CalendarPlus size={17} />
              <span>Book parking</span>
            </a>
          </>
        }
      />

      <div className="layout-split">
        <div className="main">
          <div className="card">
            <div className="card-header">
              <Segmented
                value={tab}
                onChange={setTab}
                options={[
                  { value: 'upcoming', label: `Upcoming ${loading ? '' : upcoming.length}` },
                  { value: 'past', label: `Past ${loading ? '' : past.length}` }
                ]}
              />
            </div>

            {loading ? (
              <div>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="booking-item">
                    <Skeleton width={52} height={50} radius={10} />
                    <div className="stack gap-sm grow">
                      <Skeleton width="35%" height={13} />
                      <Skeleton width="55%" height={11} />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <EmptyState icon={<AlertCircle size={26} />} title="Couldn't load your bookings"
                action={<button className="btn btn-secondary" onClick={load}>Try again</button>}>
                {error}
              </EmptyState>
            ) : list.length === 0 ? (
              tab === 'upcoming' ? (
                <EmptyState icon={<CalendarPlus size={26} />} title="No upcoming reservations"
                  action={<a className="btn btn-primary" href={buildHref('book')}>Book parking</a>}>
                  Reserve a slot ahead of time so it's waiting for you.
                </EmptyState>
              ) : (
                <EmptyState icon={<History size={26} />} title="No past reservations">
                  Completed reservations will be listed here.
                </EmptyState>
              )
            ) : (
              <div key={tab}>
                {list.map((b, i) => (
                  <BookingItem
                    key={b.id}
                    booking={b}
                    onCancel={handleCancel}
                    cancelling={cancellingId === b.id}
                    style={{ animation: `fadeIn 400ms ease ${Math.min(i, 10) * 40}ms backwards` }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="side">
          <div className="card">
            <div className="card-header"><h2 className="section-title">Summary</h2></div>
            <div className="card-body" style={{ paddingTop: '0.5rem', paddingBottom: '0.75rem' }}>
              <div className="mini-stat"><span className="secondary">Active now</span><strong>{loading ? '—' : active.length}</strong></div>
              <div className="mini-stat"><span className="secondary">Upcoming</span><strong>{loading ? '—' : upcoming.length - active.length}</strong></div>
              <div className="mini-stat"><span className="secondary">Completed</span><strong>{loading ? '—' : past.length}</strong></div>
              <div className="mini-stat"><span className="secondary">Total</span><strong>{loading ? '—' : bookings.length}</strong></div>
              {favourite && (
                <div className="mini-stat"><span className="secondary">Most used</span><strong className="text-sm" style={{ textAlign: 'right' }}>{favourite[0]}</strong></div>
              )}
            </div>
          </div>

          {next && (
            <div className="card card-pad-sm" style={{ background: 'var(--accent-soft)', borderColor: 'color-mix(in srgb, var(--accent) 25%, transparent)' }}>
              <div className="text-xs strong" style={{ color: 'var(--accent-text)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{bookingState(next) === 'active' ? `Parked now · ends ${timeUntil(bookingEnd(next))}` : `Next up · starts ${timeUntil(next.bookingDate)}`}</div>
              <div className="strong" style={{ marginTop: '0.4rem' }}>{next.buildingName || next.buildingNumber}</div>
              <div className="text-sm secondary">Slot <span className="mono">{next.slotNumber}</span> · {formatRange(next.bookingDate, bookingEnd(next))}</div>
            </div>
          )}

          <div className="callout">
            <Info size={16} />
            <span>
              You can cancel a reservation any time before it starts
              {cancellable > 0 ? ` — ${pluralize(cancellable, 'reservation')} can still be cancelled.` : '.'} Bookings end automatically when their time is up.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
