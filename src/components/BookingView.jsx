import React, { useState, useEffect } from 'react';
import { CalendarCheck, Calendar, Clock, Car, Check, X, Trash2, Building2, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

export default function BookingView({ user, selectedBuilding, setSelectedBuilding, bookingSlot, setBookingSlot, addToast }) {
  const todayStr = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(todayStr);
  const [buildings, setBuildings] = useState([]);
  const [slots, setSlots] = useState([]);
  const [availabilityList, setAvailabilityList] = useState([]);
  const [activeBookings, setActiveBookings] = useState([]);
  const [loadingAvail, setLoadingAvail] = useState(false);
  const [loadingBookings, setLoadingBookings] = useState(false);

  // Booking Form State
  const [vehicleNumber, setVehicleNumber] = useState('KA-01-AB-1234');
  const [submitting, setSubmitting] = useState(false);

  // Load buildings
  useEffect(() => {
    api.buildings.getAll()
      .then(bList => {
        const list = Array.isArray(bList) ? bList : [];
        setBuildings(list);
        if (!selectedBuilding && list.length > 0) {
          setSelectedBuilding(list[0].buildingNumber);
        }
      })
      .catch(console.error);
  }, []);

  // Load slots for selected building
  useEffect(() => {
    if (!selectedBuilding) return;
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
  }, [selectedBuilding]);

  // Load availability
  const checkAvailability = async () => {
    if (!selectedBuilding || !date) return;
    setLoadingAvail(true);
    try {
      const data = await api.availability.getByBuildingAndDate(selectedBuilding, date);
      setAvailabilityList(Array.isArray(data) ? data : []);
    } catch (err) {
      setAvailabilityList([]);
    } finally {
      setLoadingAvail(false);
    }
  };

  // Load active bookings
  const loadBookings = async () => {
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
    checkAvailability();
  }, [selectedBuilding, date]);

  useEffect(() => {
    loadBookings();
  }, []);

  const handleBookSlot = async (e) => {
    e.preventDefault();
    if (!selectedBuilding || !bookingSlot || !date) {
      addToast('Please select a building, slot, and date.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        vehicleNumber: vehicleNumber || 'AP-09-XY-9999',
        userId: user ? user.id || 1 : 1
      };
      await api.bookings.create(selectedBuilding, bookingSlot, date, payload);
      addToast(`Slot ${bookingSlot} successfully booked for ${date}!`, 'success');
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

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>
          Slot <span className="gradient-text">Reservations & Availability</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
          Real-time calendar scheduling powered by Availability & Booking Microservice.
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

        {/* Live Availability Status for Date */}
        <div className="glass-card" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Clock size={22} color="var(--color-success)" />
              <h2 style={{ fontSize: '1.3rem' }}>Schedule Availability</h2>
            </div>
            <span className="badge badge-primary">{date}</span>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Showing availability status for building <strong>{selectedBuilding}</strong> on <strong>{date}</strong>.
          </p>

          {loadingAvail ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              Querying Availability Service...
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

      {/* Active Bookings Table */}
      <div className="glass-card" style={{ padding: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.3rem' }}>Active Parking Bookings</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              All reservations registered in the database. Notifications are broadcasted over Kafka.
            </p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={loadBookings}>
            Refresh Table
          </button>
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
                  <th style={{ padding: '0.75rem 1rem' }}>Date</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Vehicle</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeBookings.map(b => (
                  <tr key={b.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>#{b.id}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>{b.buildingNumber || (b.slot && b.slot.building ? b.slot.building.buildingNumber : null) || selectedBuilding}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span className="badge badge-primary">{b.slotNumber || (b.slot ? b.slot.slotNumber : null) || `#${b.id}`}</span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>{b.bookingDate ? new Date(b.bookingDate).toISOString().split('T')[0] : (b.date || 'N/A')}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>{b.vehicleNumber || 'N/A'}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span className="badge badge-success">{b.status || 'CONFIRMED'}</span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                      <button
                        className="btn btn-danger btn-sm"
                        style={{ padding: '0.3rem 0.65rem' }}
                        onClick={() => handleCancelBooking(b.id)}
                      >
                        <Trash2 size={13} />
                        <span>Cancel</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
