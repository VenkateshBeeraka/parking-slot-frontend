import React from 'react';
import { Clock, Trash2, Building2, User } from 'lucide-react';
import { parseDate, relativeDay, bookingState, bookingEnd, formatTimeRange, timeUntil } from '../lib/format';
import { Spinner } from './ui';

export function BookingStatus({ booking }) {
  const state = bookingState(booking);
  if (state === 'active') return <span className="badge badge-info"><span className="dot dot-live" />Active now</span>;
  if (state === 'upcoming') return <span className="badge badge-success"><span className="dot" />Upcoming</span>;
  return <span className="badge badge-neutral">Completed</span>;
}

export function DateBlock({ value, past }) {
  const d = parseDate(value);
  return (
    <div className={`date-block ${past ? 'past' : ''}`} aria-hidden="true">
      <span className="m">{d ? d.toLocaleDateString(undefined, { month: 'short' }) : '—'}</span>
      <span className="d">{d ? d.getDate() : '—'}</span>
    </div>
  );
}

export default function BookingItem({ booking, onCancel, cancelling, showUser, style }) {
  const state = bookingState(booking);
  const end = bookingEnd(booking);

  return (
    <div className="booking-item" style={{ ...style, opacity: cancelling ? 0.55 : 1 }}>
      <DateBlock value={booking.bookingDate} past={state === 'past'} />

      <div className="grow">
        <div className="row gap-sm wrap">
          <span className="strong">{booking.buildingName || booking.buildingNumber || 'Building'}</span>
          <span className="badge badge-primary mono">{booking.slotNumber || '—'}</span>
        </div>
        <div className="row gap-md wrap text-sm secondary" style={{ marginTop: 4 }}>
          <span className="row gap-xs">
            <Clock size={13} className="muted" />
            {relativeDay(booking.bookingDate)} · {formatTimeRange(booking.bookingDate, end)}
          </span>
          {state === 'upcoming' && (
            <span className="text-xs" style={{ color: 'var(--accent-text)', fontWeight: 600 }}>starts {timeUntil(booking.bookingDate)}</span>
          )}
          {state === 'active' && (
            <span className="text-xs" style={{ color: 'var(--color-info-text)', fontWeight: 600 }}>ends {timeUntil(end)}</span>
          )}
          {showUser && booking.userName && (
            <span className="row gap-xs"><User size={13} className="muted" />{booking.userName}</span>
          )}
          {!booking.buildingName && booking.buildingNumber && (
            <span className="row gap-xs"><Building2 size={13} className="muted" />{booking.buildingNumber}</span>
          )}
        </div>
      </div>

      <div className="row gap-sm">
        <span className="hide-sm"><BookingStatus booking={booking} /></span>
        {onCancel && state === 'upcoming' && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => onCancel(booking)}
            disabled={cancelling}
            aria-label={`Cancel booking for ${booking.slotNumber}`}
            title="Cancel booking"
          >
            {cancelling ? <Spinner size={14} /> : <Trash2 size={14} />}
            <span className="hide-sm">Cancel</span>
          </button>
        )}
      </div>
    </div>
  );
}
