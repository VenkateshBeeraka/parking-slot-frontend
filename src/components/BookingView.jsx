import React, { useState, useEffect } from 'react';
import { 
  CalendarCheck, 
  Clock, 
  Check, 
  X, 
  Trash2, 
  RefreshCw, 
  Lock, 
  Timer 
} from 'lucide-react';
import { api } from '../services/api';
import SignInPrompt from './SignInPrompt';

export default function BookingView({ user, onLoginClick, selectedBuilding, setSelectedBuilding, bookingSlot, setBookingSlot, addToast }) {
  const todayStr = new Date().toISOString().split('T')[0];
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const defaultTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

  const [date, setDate] = useState(todayStr);
  const [time, setTime] = useState(defaultTime);
  const [buildings, setBuildings] = useState([]);
  const [slots, setSlots] = useState([]);
  const [availabilityList, setAvailabilityList] = useState([]);
  const [activeBookings, setActiveBookings] = useState([]);
  const [loadingAvail, setLoadingAvail] = useState(false);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [runningExpiryCheck, setRunningExpiryCheck] = useState(false);

  // Booking Form State
  const [vehicleNumber, setVehicleNumber] = useState('KA-01-AB-1234');
  const [submitting, setSubmitting] = useState(false);

  // Helper to format Date + Time string for backend API
  const getFullDateTime = () => {
    const formattedTime = time ? (time.length === 5 ? `${time}:00` : time) : '00:00:00';
    return `${date} ${formattedTime}`;
  };

  // Helper to nicely display date & time
  const formatDisplayDateTime = (val) => {
    if (!val) return 'N/A';
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return String(val);
      return d.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    } catch {
      return String(val);
    }
  };

  // Load buildings
  useEffect(() => {
    if (!user) return;
    api.buildings.getAll()
      .then(bList => {
        const list = Array.isArray(bList) ? bList : [];
        setBuildings(list);
        if (!selectedBuilding && list.length > 0) {
          setSelectedBuilding(list[0].buildingNumber);
        }
      })
      .catch(console.error);
  }, [user]);

  // Load slots for selected building
  useEffect(() => {
    if (!user || !selectedBuilding) return;
    api.slots.getByBuilding(selectedBuilding)
      .then(sList => {
        const list = Array.isArray(sList) ? sList : [];
        setSlots(list);
        if (list.length > 0) {
          if (!bookingSlot || !list.some(s => s.slotNumber === bookingSlot)) {
            setBookingSlot(list[0].slotNumber);
          }
        } else {
          setBookingSlot('');
        }
      })
      .catch(console.error);
  }, [selectedBuilding, user]);

  // Load availability with date and time
  const checkAvailability = async () => {
    if (!user || !selectedBuilding || !date) return;
    setLoadingAvail(true);
    try {
      const fullDateTime = getFullDateTime();
      const data = await api.availability.getByBuildingAndDate(selectedBuilding, fullDateTime);
      setAvailabilityList(Array.isArray(data) ? data : []);
    } catch (err) {
      setAvailabilityList([]);
    } finally {
      setLoadingAvail(false);
    }
  };

  // Load active bookings
  const loadBookings = async () => {
    if (!user) return;
    setLoadingBookings(true);
    try {
      const bList = await api.bookings.getAll();
      setActiveBookings(Array.isArray(bList) ? bList : []);
    } catch (err) {
      setActiveBookings([]);
    } finally {
      setLoadingBookings(false);
    }
  };

  useEffect(() => {
    if (user && selectedBuilding && date) {
      checkAvailability();
    }
  }, [selectedBuilding, date, time, user]);

  useEffect(() => {
    if (user) {
      loadBookings();
    }
  }, [user]);

  const handleBookSlot = async (e) => {
    e.preventDefault();
    if (!selectedBuilding || !bookingSlot || !date || !time) {
      addToast('Please select a building, slot, date, and time.', 'error');
      return;
    }

    const fullDateTime = getFullDateTime();
    const targetDate = new Date(`${date}T${time.length === 5 ? time + ':00' : time}`);
    if (targetDate.getTime() < Date.now()) {
      addToast('Cannot reserve a slot for a past date and time.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        vehicleNumber: vehicleNumber || 'AP-09-XY-9999',
        userId: user ? user.id || 1 : 1
      };
      await api.bookings.create(selectedBuilding, bookingSlot, fullDateTime, payload);
      addToast(`Slot ${bookingSlot} successfully booked for ${date} at ${time}!`, 'success');
      checkAvailability();
      loadBookings();
    } catch (err) {
      addToast(err.message || 'Failed to book parking slot', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm(`Cancel reservation #${bookingId}?`)) return;
    try {
      await api.bookings.cancel(bookingId);
      addToast(`Reservation #${bookingId} cancelled successfully`, 'success');
      checkAvailability();
      loadBookings();
    } catch (err) {
      addToast(err.message || 'Failed to cancel reservation', 'error');
    }
  };

  const handleTriggerExpiryCheck = async () => {
    setRunningExpiryCheck(true);
    try {
      const res = await api.bookings.closeExpired();
      addToast(typeof res === 'string' ? res : 'Scheduler check completed: expired bookings marked as CLOSED', 'success');
      loadBookings();
      checkAvailability();
    } catch (err) {
      addToast(err.message || 'Failed to trigger expiration check', 'error');
    } finally {
      setRunningExpiryCheck(false);
    }
  };

  if (!user) {
    return (
      <SignInPrompt 
        onLoginClick={onLoginClick}
        title="Slot Reservation Locked"
        message="Check live slot availability, reserve parking spots, and manage active booking schedules by signing in to your account."
      />
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>
          Slot <span className="gradient-text">Reservations & Availability</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
          Real-time calendar scheduling with exact date & time powered by Availability & Booking Microservice.
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
        gap: '2rem',
        marginBottom: '2.5rem'
      }}>
        {/* Booking Card */}
        <div className="glass-card" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
            <CalendarCheck size={22} color="var(--accent-primary)" />
            <h2 style={{ fontSize: '1.3rem' }}>Reserve a Parking Slot</h2>
          </div>

          <form onSubmit={handleBookSlot}>
            <div className="input-group">
              <label className="input-label">Select Building</label>
              <select 
                className="input-field"
                value={selectedBuilding}
                onChange={e => setSelectedBuilding(e.target.value)}
              >
                {buildings.map(b => (
                  <option key={b.buildingNumber} value={b.buildingNumber}>
                    {b.buildingName} ({b.buildingNumber})
                  </option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label className="input-label">Select Slot</label>
              <select 
                className="input-field"
                value={bookingSlot}
                onChange={e => setBookingSlot(e.target.value)}
              >
                {slots.length === 0 && <option value="">No slots available in this building</option>}
                {slots.map(s => (
                  <option key={s.slotNumber} value={s.slotNumber}>
                    {s.slotNumber} (Floor {s.floorNumber}, Wing {s.division})
                  </option>
                ))}
              </select>
            </div>

            {/* Date and Time Inputs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="input-group">
                <label className="input-label">Reservation Date</label>
                <input 
                  type="date" 
                  className="input-field"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  min={todayStr}
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label">Reservation Time</label>
                <input 
                  type="time" 
                  className="input-field"
                  value={time}
                  onChange={e => setTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Vehicle Registration #</label>
              <input 
                type="text" 
                className="input-field"
                placeholder="e.g. MH-02-CD-5678"
                value={vehicleNumber}
                onChange={e => setVehicleNumber(e.target.value)}
                required
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', marginTop: '0.5rem' }}
              disabled={submitting || slots.length === 0}
            >
              {submitting ? 'Confirming Reservation...' : 'Confirm & Reserve Slot'}
            </button>
          </form>
        </div>

        {/* Live Availability Status for Date & Time */}
        <div className="glass-card" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Clock size={22} color="var(--color-success)" />
              <h2 style={{ fontSize: '1.3rem' }}>Schedule Availability</h2>
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              <span className="badge badge-primary">{date}</span>
              <span className="badge badge-primary">{time}</span>
            </div>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Live slot availability for building <strong>{selectedBuilding}</strong> at <strong>{date} {time}</strong>:
          </p>

          {loadingAvail ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              Querying Availability Service for {date} {time}...
            </div>
          ) : slots.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              No slots configured in this building yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '280px', overflowY: 'auto' }}>
              {slots.map(s => {
                const isAvailable = Array.isArray(availabilityList) && availabilityList.some(item => {
                  if (typeof item === 'string') return item.trim().toLowerCase() === s.slotNumber.trim().toLowerCase();
                  if (item && typeof item === 'object') return item.slotNumber === s.slotNumber && item.available !== false;
                  return false;
                });

                return (
                  <div 
                    key={s.slotNumber}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem 1rem',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)'
                    }}
                  >
                    <div>
                      <strong>{s.slotNumber}</strong>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                        (Floor {s.floorNumber}, {s.division})
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span className={`badge ${isAvailable ? 'badge-success' : 'badge-danger'}`}>
                        {isAvailable ? 'Available' : 'Booked'}
                      </span>
                      {isAvailable && (
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                          onClick={() => setBookingSlot(s.slotNumber)}
                        >
                          Select
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Scheduler Info Callout */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.9rem 1.25rem',
        background: 'rgba(99, 102, 241, 0.08)',
        border: '1px solid rgba(99, 102, 241, 0.2)',
        borderRadius: 'var(--radius-md)',
        marginBottom: '1.5rem',
        fontSize: '0.85rem',
        color: 'var(--text-secondary)'
      }}>
        <Timer size={20} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
        <div>
          <strong style={{ color: 'var(--text-primary)' }}>Automated Booking Expiry Scheduler:</strong> An active Spring Boot scheduler runs in the background every 60s. Whenever a slot booking time crosses the current present time, its status is automatically updated to <span className="badge badge-neutral" style={{ padding: '0.1rem 0.45rem', fontSize: '0.7rem' }}>CLOSED</span>.
        </div>
      </div>

      {/* Active Bookings Table */}
      <div className="glass-card" style={{ padding: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h2 style={{ fontSize: '1.3rem' }}>Parking Reservations Directory</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              All registered reservations with precise date-time stamps.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              className="btn btn-secondary btn-sm" 
              onClick={handleTriggerExpiryCheck}
              disabled={runningExpiryCheck}
              title="Trigger background scheduler check now"
            >
              <RefreshCw size={13} className={runningExpiryCheck ? 'animate-spin' : ''} />
              <span>{runningExpiryCheck ? 'Checking...' : 'Run Expiry Check'}</span>
            </button>
            <button className="btn btn-secondary btn-sm" onClick={loadBookings} disabled={loadingBookings}>
              <RefreshCw size={13} className={loadingBookings ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {loadingBookings ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            Loading bookings from Availability Service...
          </div>
        ) : activeBookings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            No active reservations found. Create your first booking above!
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>ID</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Building</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Slot</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Booking Date & Time</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Vehicle</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeBookings.map(b => {
                  const isClosed = b.status && b.status.toUpperCase() === 'CLOSED';
                  const isCancelled = b.status && b.status.toUpperCase() === 'CANCELLED';

                  return (
                    <tr key={b.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>#{b.id}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        {b.buildingNumber || (b.slot && b.slot.building ? b.slot.building.buildingNumber : null) || selectedBuilding}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span className="badge badge-primary">
                          {b.slotNumber || (b.slot ? b.slot.slotNumber : null) || `#${b.id}`}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                          {formatDisplayDateTime(b.bookingDate || b.date)}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>{b.vehicleNumber || 'N/A'}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        {isClosed ? (
                          <span className="badge badge-neutral">
                            <Lock size={11} />
                            <span>CLOSED</span>
                          </span>
                        ) : isCancelled ? (
                          <span className="badge badge-danger">
                            <X size={11} />
                            <span>CANCELLED</span>
                          </span>
                        ) : (
                          <span className="badge badge-success">
                            <Check size={11} />
                            <span>{b.status || 'CONFIRMED'}</span>
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                        {isClosed ? (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Closed / Past
                          </span>
                        ) : (
                          <button
                            className="btn btn-danger btn-sm"
                            style={{ padding: '0.3rem 0.65rem' }}
                            onClick={() => handleCancelBooking(b.id)}
                            title="Cancel booking"
                          >
                            <Trash2 size={13} />
                            <span>Cancel</span>
                          </button>
                        )}
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
  );
}
