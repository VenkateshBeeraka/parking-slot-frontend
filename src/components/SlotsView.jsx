import React, { useState, useEffect } from 'react';
import { 
  Car, 
  Layers, 
  Plus, 
  CalendarCheck, 
  CheckCircle2, 
  XCircle, 
  Trash2, 
  Building2,
  Calendar,
  Clock,
  Settings2
} from 'lucide-react';
import { api } from '../services/api';
import SignInPrompt from './SignInPrompt';

export default function SlotsView({ user, onLoginClick, selectedBuilding, setSelectedBuilding, setActiveTab, setBookingSlot, addToast }) {
  const [buildings, setBuildings] = useState([]);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Slot Availability Schedule Modal State
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [targetSlot, setTargetSlot] = useState(null);
  const todayStr = new Date().toISOString().split('T')[0];
  const [fromDate, setFromDate] = useState(todayStr);
  const [fromTime, setFromTime] = useState('00:00');
  const [toDate, setToDate] = useState('2026-12-31');
  const [toTime, setToTime] = useState('23:59');
  const [savingSchedule, setSavingSchedule] = useState(false);

  const [newSlot, setNewSlot] = useState({
    buildingNumber: '',
    slotNumber: '',
    floorNumber: 1,
    division: 'A'
  });

  // Load building list for selector
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
      .catch(err => console.error(err));
  }, [user]);

  // Load slots when selectedBuilding changes
  const loadSlots = async () => {
    if (!user || !selectedBuilding) return;
    setLoading(true);
    try {
      const sList = await api.slots.getByBuilding(selectedBuilding);
      setSlots(Array.isArray(sList) ? sList : []);
    } catch (err) {
      setSlots([]);
      addToast(`No slots loaded for ${selectedBuilding}`, 'info');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && selectedBuilding) {
      loadSlots();
    }
  }, [selectedBuilding, user]);

  const handleCreateSlot = async (e) => {
    e.preventDefault();
    try {
      await api.slots.create({
        ...newSlot,
        buildingNumber: selectedBuilding,
        floorNumber: parseInt(newSlot.floorNumber)
      });
      addToast(`Slot ${newSlot.slotNumber} created!`, 'success');
      setShowAddModal(false);
      setNewSlot({
        buildingNumber: selectedBuilding,
        slotNumber: '',
        floorNumber: 1,
        division: 'A'
      });
      loadSlots();
    } catch (err) {
      addToast(err.message || 'Failed to create slot', 'error');
    }
  };

  const handleDeleteSlot = async (slotNumber) => {
    if (!window.confirm(`Delete slot ${slotNumber} from ${selectedBuilding}?`)) return;
    try {
      await api.slots.delete(selectedBuilding, slotNumber);
      addToast(`Slot ${slotNumber} removed`, 'success');
      loadSlots();
    } catch (err) {
      addToast(err.message || 'Failed to delete slot', 'error');
    }
  };

  const openScheduleModal = (slot) => {
    setTargetSlot(slot);
    if (slot.availability && slot.availability.fromDate && slot.availability.toDate) {
      const f = new Date(slot.availability.fromDate);
      const t = new Date(slot.availability.toDate);
      if (!isNaN(f.getTime())) {
        setFromDate(f.toISOString().split('T')[0]);
        setFromTime(f.toTimeString().slice(0, 5));
      }
      if (!isNaN(t.getTime())) {
        setToDate(t.toISOString().split('T')[0]);
        setToTime(t.toTimeString().slice(0, 5));
      }
    } else {
      setFromDate(todayStr);
      setFromTime('00:00');
      setToDate('2026-12-31');
      setToTime('23:59');
    }
    setShowScheduleModal(true);
  };

  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    if (!targetSlot) return;
    setSavingSchedule(true);
    try {
      const fromDateTime = `${fromDate} ${fromTime.length === 5 ? fromTime + ':00' : fromTime}`;
      const toDateTime = `${toDate} ${toTime.length === 5 ? toTime + ':00' : toTime}`;

      await api.availability.setSlotAvailability(selectedBuilding, targetSlot.slotNumber, {
        fromDate: fromDateTime,
        toDate: toDateTime,
        bookings: targetSlot.availability ? targetSlot.availability.bookings : []
      });

      addToast(`Availability schedule updated for Slot ${targetSlot.slotNumber}!`, 'success');
      setShowScheduleModal(false);
      loadSlots();
    } catch (err) {
      addToast(err.message || 'Failed to update slot schedule', 'error');
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleRemoveSchedule = async () => {
    if (!targetSlot) return;
    if (!window.confirm(`Remove availability schedule for Slot ${targetSlot.slotNumber}?`)) return;
    setSavingSchedule(true);
    try {
      await api.availability.removeSlotAvailability(selectedBuilding, targetSlot.slotNumber);
      addToast(`Removed schedule for Slot ${targetSlot.slotNumber}`, 'success');
      setShowScheduleModal(false);
      loadSlots();
    } catch (err) {
      addToast(err.message || 'Failed to remove schedule', 'error');
    } finally {
      setSavingSchedule(false);
    }
  };

  const formatDateTimeDisplay = (val) => {
    if (!val) return 'N/A';
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return String(val);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return String(val);
    }
  };

  if (!user) {
    return (
      <SignInPrompt 
        onLoginClick={onLoginClick}
        title="Parking Slot Grid Locked"
        message="Interactive floor maps and slot schedules are secured. Please sign in to view available spots and manage parking slot availability."
      />
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>
            Parking <span className="gradient-text">Slot Grid</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Interactive floor maps, slot configurations, and date-time availability schedules.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {user && user.role === 'ADMIN' && (
            <button 
              className="btn btn-primary"
              onClick={() => {
                setNewSlot(prev => ({ ...prev, buildingNumber: selectedBuilding }));
                setShowAddModal(true);
              }}
              id="btn-add-slot"
            >
              <Plus size={18} />
              <span>Add New Slot</span>
            </button>
          )}
        </div>
      </div>

      {/* Building Selector Bar */}
      <div className="glass-card" style={{ padding: '1rem 1.5rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>
          <Building2 size={18} color="var(--accent-primary)" />
          <span>Active Building:</span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', flex: 1 }}>
          {buildings.map(b => (
            <button
              key={b.buildingNumber}
              onClick={() => setSelectedBuilding(b.buildingNumber)}
              className={`btn btn-sm ${selectedBuilding === b.buildingNumber ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.45rem 0.85rem' }}
            >
              <span>{b.buildingName}</span>
              <span style={{ opacity: 0.75, fontSize: '0.75rem' }}>({b.buildingNumber})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Visual Slot Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          Loading slot layouts from Slot Service...
        </div>
      ) : slots.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <Car size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
          <h3>No Parking Slots Registered</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            There are currently no slots configured for building <strong>{selectedBuilding}</strong>.
          </p>
          {user && user.role === 'ADMIN' && (
            <button 
              className="btn btn-primary" 
              style={{ marginTop: '1.25rem' }}
              onClick={() => setShowAddModal(true)}
            >
              <Plus size={16} />
              <span>Create First Slot</span>
            </button>
          )}
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Showing <strong>{slots.length}</strong> configured slot(s)
            </div>
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'var(--color-success)' }}></span>
                <span>Configured Window</span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'var(--color-warning)' }}></span>
                <span>No Schedule Set</span>
              </span>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1.25rem'
          }}>
            {slots.map(s => {
              const hasAvail = s.availability && s.availability.fromDate && s.availability.toDate;

              return (
                <div 
                  key={s.id || s.slotNumber} 
                  className="glass-card"
                  style={{
                    padding: '1.25rem',
                    borderTop: `4px solid ${hasAvail ? 'var(--color-success)' : 'var(--color-warning)'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>
                        {s.slotNumber}
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        {user && user.role === 'ADMIN' && (
                          <button
                            onClick={() => openScheduleModal(s)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', padding: '2px' }}
                            title="Configure Date/Time Schedule"
                          >
                            <Settings2 size={16} />
                          </button>
                        )}
                        {user && user.role === 'ADMIN' && (
                          <button
                            onClick={() => handleDeleteSlot(s.slotNumber)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                            title="Delete Slot"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Floor Level:</span>
                        <strong style={{ color: 'var(--text-primary)' }}>Floor {s.floorNumber}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Division:</span>
                        <strong style={{ color: 'var(--text-primary)' }}>Wing {s.division}</strong>
                      </div>
                    </div>

                    {/* Availability Schedule Info */}
                    <div style={{
                      padding: '0.65rem 0.75rem',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      marginBottom: '1rem',
                      fontSize: '0.78rem'
                    }}>
                      <div style={{ color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Clock size={12} />
                        <span>Availability Window:</span>
                      </div>
                      {hasAvail ? (
                        <div style={{ color: 'var(--text-primary)', lineHeight: 1.4 }}>
                          <div><strong style={{ color: 'var(--color-success)' }}>From:</strong> {formatDateTimeDisplay(s.availability.fromDate)}</div>
                          <div><strong style={{ color: 'var(--color-info)' }}>To:</strong> {formatDateTimeDisplay(s.availability.toDate)}</div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--color-warning)' }}>No schedule configured</span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ flex: 1 }}
                      onClick={() => {
                        setBookingSlot(s.slotNumber);
                        setActiveTab('booking');
                      }}
                    >
                      <CalendarCheck size={14} />
                      <span>Book Slot</span>
                    </button>
                    {user && user.role === 'ADMIN' && (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => openScheduleModal(s)}
                        title="Set Schedule"
                        style={{ padding: '0.4rem 0.6rem' }}
                      >
                        <Clock size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Slot Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.3rem', marginBottom: '1rem' }}>Create Slot in {selectedBuilding}</h2>
            <form onSubmit={handleCreateSlot}>
              <div className="input-group">
                <label className="input-label">Slot Identifier / Number</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="e.g. SLOT-A101"
                  value={newSlot.slotNumber}
                  onChange={e => setNewSlot({ ...newSlot, slotNumber: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="input-group">
                  <label className="input-label">Floor Level</label>
                  <input 
                    type="number" 
                    className="input-field" 
                    placeholder="1"
                    value={newSlot.floorNumber}
                    onChange={e => setNewSlot({ ...newSlot, floorNumber: e.target.value })}
                    required
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Division / Wing</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="e.g. A or North"
                    value={newSlot.division}
                    onChange={e => setNewSlot({ ...newSlot, division: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Slot</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Configure Slot Availability Schedule Modal */}
      {showScheduleModal && targetSlot && (
        <div className="modal-overlay" onClick={() => setShowScheduleModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
              <Clock size={22} color="var(--accent-primary)" />
              <h2 style={{ fontSize: '1.3rem' }}>Availability Schedule: {targetSlot.slotNumber}</h2>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Set exact start and end date with time for slot availability in building <strong>{selectedBuilding}</strong>.
            </p>

            <form onSubmit={handleSaveSchedule}>
              <div style={{ marginBottom: '1rem' }}>
                <strong style={{ fontSize: '0.85rem', color: 'var(--color-success)', display: 'block', marginBottom: '0.4rem' }}>
                  Available From (Date & Time)
                </strong>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="input-group">
                    <label className="input-label">Start Date</label>
                    <input 
                      type="date"
                      className="input-field"
                      value={fromDate}
                      onChange={e => setFromDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Start Time</label>
                    <input 
                      type="time"
                      className="input-field"
                      value={fromTime}
                      onChange={e => setFromTime(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <strong style={{ fontSize: '0.85rem', color: 'var(--color-info)', display: 'block', marginBottom: '0.4rem' }}>
                  Available Until (Date & Time)
                </strong>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="input-group">
                    <label className="input-label">End Date</label>
                    <input 
                      type="date"
                      className="input-field"
                      value={toDate}
                      onChange={e => setToDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">End Time</label>
                    <input 
                      type="time"
                      className="input-field"
                      value={toTime}
                      onChange={e => setToTime(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                {targetSlot.availability ? (
                  <button 
                    type="button" 
                    className="btn btn-danger btn-sm" 
                    onClick={handleRemoveSchedule}
                    disabled={savingSchedule}
                  >
                    Remove Schedule
                  </button>
                ) : <div />}

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowScheduleModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={savingSchedule}>
                    {savingSchedule ? 'Saving Window...' : 'Save Schedule Window'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
