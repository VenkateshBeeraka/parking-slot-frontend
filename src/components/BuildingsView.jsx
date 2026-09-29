import React, { useState, useEffect } from 'react';
import { Building2, MapPin, Search, Plus, Car, Trash2, ArrowRight } from 'lucide-react';
import { api } from '../services/api';
import SignInPrompt from './SignInPrompt';

export default function BuildingsView({ user, onLoginClick, setActiveTab, setSelectedBuilding, addToast }) {
  const [buildings, setBuildings] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const [newBuilding, setNewBuilding] = useState({
    buildingNumber: '',
    buildingName: '',
    area: '',
    town: '',
    state: '',
    landmark: '',
    pincode: ''
  });

  const loadBuildings = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await api.buildings.getAll();
      setBuildings(Array.isArray(data) ? data : []);
    } catch (err) {
      addToast('Failed to load buildings from Building Service', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadBuildings();
    }
  }, [user]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      return loadBuildings();
    }
    setLoading(true);
    try {
      // Check if number (pincode)
      if (!isNaN(searchQuery.trim())) {
        const data = await api.buildings.getByPincode(parseInt(searchQuery.trim()));
        setBuildings(Array.isArray(data) ? data : []);
      } else {
        const data = await api.buildings.searchByName(searchQuery.trim());
        setBuildings(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      setBuildings([]);
      addToast('No buildings matched search query', 'info');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBuilding = async (e) => {
    e.preventDefault();
    try {
      await api.buildings.create({
        ...newBuilding,
        pincode: parseInt(newBuilding.pincode)
      });
      addToast('Building created successfully!', 'success');
      setShowAddModal(false);
      setNewBuilding({
        buildingNumber: '',
        buildingName: '',
        area: '',
        town: '',
        state: '',
        landmark: '',
        pincode: ''
      });
      loadBuildings();
    } catch (err) {
      addToast(err.message || 'Failed to create building', 'error');
    }
  };

  const handleDeleteBuilding = async (bldNum) => {
    if (!window.confirm(`Are you sure you want to delete building ${bldNum}?`)) return;
    try {
      await api.buildings.delete(bldNum);
      addToast(`Building ${bldNum} deleted`, 'success');
      loadBuildings();
    } catch (err) {
      addToast(err.message || 'Failed to delete building', 'error');
    }
  };

  if (!user) {
    return (
      <SignInPrompt 
        onLoginClick={onLoginClick}
        title="Buildings Catalog Locked"
        message="Accessing the campus buildings registry and slot availability requires an active session. Please sign in to explore buildings and their parking facilities."
      />
    );
  }

  return (
    <div>
      {/* View Header */}
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
            Building <span className="gradient-text">Catalog</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Explore commercial and residential buildings supported in the parking network.
          </p>
        </div>

        {user && user.role === 'ADMIN' && (
          <button 
            className="btn btn-primary"
            onClick={() => setShowAddModal(true)}
            id="btn-add-building"
          >
            <Plus size={18} />
            <span>Register New Building</span>
          </button>
        )}
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', maxWidth: '600px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            className="input-field" 
            style={{ paddingLeft: '2.75rem' }}
            placeholder="Search by building name or pincode (e.g. Cyber Towers or 500081)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button type="submit" className="btn btn-secondary">Search</button>
        {searchQuery && (
          <button type="button" className="btn btn-secondary" onClick={() => { setSearchQuery(''); loadBuildings(); }}>
            Reset
          </button>
        )}
      </form>

      {/* Building Cards Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          Loading buildings from Building Service...
        </div>
      ) : buildings.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <Building2 size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
          <h3>No Buildings Found</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            No buildings match your criteria or no buildings have been registered yet.
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: '1.5rem'
        }}>
          {buildings.map((b) => (
            <div key={b.id || b.buildingNumber} className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <span className="badge badge-primary" style={{ marginBottom: '0.4rem' }}>
                      {b.buildingNumber}
                    </span>
                    <h3 style={{ fontSize: '1.25rem', marginTop: '0.2rem' }}>{b.buildingName}</h3>
                  </div>
                  {user && user.role === 'ADMIN' && (
                    <button 
                      onClick={() => handleDeleteBuilding(b.buildingNumber)}
                      className="btn btn-sm"
                      style={{ background: 'rgba(239, 68, 68, 0.15)', color: 'var(--color-danger)', border: 'none' }}
                      title="Delete Building"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <MapPin size={16} color="var(--accent-primary)" />
                    <span>{b.area}, {b.town}, {b.state} - {b.pincode}</span>
                  </div>
                  {b.landmark && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', paddingLeft: '1.5rem' }}>
                      Landmark: {b.landmark}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
                <button 
                  className="btn btn-primary btn-sm"
                  style={{ flex: 1 }}
                  onClick={() => {
                    setSelectedBuilding(b.buildingNumber);
                    setActiveTab('slots');
                  }}
                >
                  <Car size={15} />
                  <span>View Parking Slots</span>
                </button>
                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setSelectedBuilding(b.buildingNumber);
                    setActiveTab('booking');
                  }}
                >
                  <span>Book Slot</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Building Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.3rem', marginBottom: '1rem' }}>Register New Building</h2>
            <form onSubmit={handleCreateBuilding}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="input-group">
                  <label className="input-label">Building Number / Code</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="e.g. BLD-303"
                    value={newBuilding.buildingNumber}
                    onChange={e => setNewBuilding({ ...newBuilding, buildingNumber: e.target.value })}
                    required
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Building Name</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="e.g. Infinity Tower"
                    value={newBuilding.buildingName}
                    onChange={e => setNewBuilding({ ...newBuilding, buildingName: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="input-group">
                  <label className="input-label">Area</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="e.g. Financial District"
                    value={newBuilding.area}
                    onChange={e => setNewBuilding({ ...newBuilding, area: e.target.value })}
                    required
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">City / Town</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="e.g. Hyderabad"
                    value={newBuilding.town}
                    onChange={e => setNewBuilding({ ...newBuilding, town: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="input-group">
                  <label className="input-label">State</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="e.g. Telangana"
                    value={newBuilding.state}
                    onChange={e => setNewBuilding({ ...newBuilding, state: e.target.value })}
                    required
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Postal Pincode</label>
                  <input 
                    type="number" 
                    className="input-field" 
                    placeholder="e.g. 500032"
                    value={newBuilding.pincode}
                    onChange={e => setNewBuilding({ ...newBuilding, pincode: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Landmark</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="e.g. Opposite Wave Rock"
                  value={newBuilding.landmark}
                  onChange={e => setNewBuilding({ ...newBuilding, landmark: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Building</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
