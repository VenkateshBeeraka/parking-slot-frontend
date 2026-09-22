import React, { useState, useEffect } from 'react';
import { Car, Layers, Plus, CalendarCheck, CheckCircle2, XCircle, Trash2, Building2 } from 'lucide-react';
import { api } from '../services/api';

export default function SlotsView({ user, selectedBuilding, setSelectedBuilding, setActiveTab, setBookingSlot, addToast }) {
  const [buildings, setBuildings] = useState([]);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const [newSlot, setNewSlot] = useState({
    buildingNumber: '',
    slotNumber: '',
    floorNumber: 1,
    division: 'A'
  });

  // Load building list for selector
  useEffect(() => {
    api.buildings.getAll()
      .then(bList => {
        const list = Array.isArray(bList) ? bList : [];
        setBuildings(list);
        if (!selectedBuilding && list.length > 0) {
          setSelectedBuilding(list[0].buildingNumber);
        }
      })
      .catch(err => console.error(err));
  }, []);

  // Load slots when selectedBuilding changes
  useEffect(() => {
    if (!selectedBuilding) return;
    setLoading(true);
    api.slots.getByBuilding(selectedBuilding)
      .then(sList => {
        setSlots(Array.isArray(sList) ? sList : []);
      })
      .catch(err => {
        setSlots([]);
        addToast(`No slots loaded for ${selectedBuilding}`, 'info');
      })
      .finally(() => setLoading(false));
  }, [selectedBuilding]);

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
      // Refresh slots
      const refreshed = await api.slots.getByBuilding(selectedBuilding);
      setSlots(Array.isArray(refreshed) ? refreshed : []);
    } catch (err) {
      addToast(err.message || 'Failed to create slot', 'error');
    }
  };

  const handleDeleteSlot = async (slotNumber) => {
    if (!window.confirm(`Delete slot ${slotNumber} from ${selectedBuilding}?`)) return;
    try {
      await api.slots.delete(selectedBuilding, slotNumber);
      addToast(`Slot ${slotNumber} removed`, 'success');
      const refreshed = await api.slots.getByBuilding(selectedBuilding);
      setSlots(Array.isArray(refreshed) ? refreshed : []);
    } catch (err) {
      addToast(err.message || 'Failed to delete slot', 'error');
    }
  };

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
            Interactive floor maps and slot configurations powered by Slot Service.
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
                <span>Available</span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'var(--color-danger)' }}></span>
                <span>Reserved / Scheduled</span>
              </span>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '1.25rem'
          }}>
            {slots.map(s => (
              <div 
                key={s.id || s.slotNumber} 
                className="glass-card"
                style={{
                  padding: '1.25rem',
                  borderTop: '4px solid var(--accent-primary)',
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
                    {user && user.role === 'ADMIN' && (
                      <button
                        onClick={() => handleDeleteSlot(s.slotNumber)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                        title="Delete Slot"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Floor Level:</span>
                      <strong style={{ color: 'var(--text-primary)' }}>Floor {s.floorNumber}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Division:</span>
                      <strong style={{ color: 'var(--text-primary)' }}>Wing {s.division}</strong>
                    </div>
                  </div>
                </div>

                <button
                  className="btn btn-secondary btn-sm"
                  style={{ width: '100%' }}
                  onClick={() => {
                    setBookingSlot(s.slotNumber);
                    setActiveTab('booking');
                  }}
                >
                  <CalendarCheck size={14} />
                  <span>Check Availability / Book</span>
                </button>
              </div>
            ))}
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
    </div>
  );
}
