import React, { useState, useEffect } from 'react';
import { Building2, MapPin, Search, Plus, SquareParking, Trash2, ArrowRight, X, Landmark, Hash, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { navigate, buildHref } from '../lib/router';
import { pluralize } from '../lib/format';
import { Modal, PageHeader, EmptyState, SkeletonCards, Spinner, useConfirm } from './ui';

const EMPTY_BUILDING = {
  buildingNumber: '',
  buildingName: '',
  area: '',
  town: '',
  state: '',
  landmark: '',
  pincode: ''
};

export default function BuildingsView({ admin, params, addToast }) {
  const confirm = useConfirm();
  const [buildings, setBuildings] = useState([]);
  const [slotStats, setSlotStats] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(admin && !!params.new);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [newBuilding, setNewBuilding] = useState(EMPTY_BUILDING);

  const loadSlotStats = async (list) => {
    const results = await Promise.allSettled(list.map(b => api.slots.getByBuilding(b.buildingNumber)));
    const stats = {};
    list.forEach((b, i) => {
      if (results[i].status === 'fulfilled') {
        const slots = results[i].value;
        stats[b.buildingNumber] = { total: slots.length, bookable: slots.filter(s => s.availability?.fromDate).length };
      }
    });
    setSlotStats(stats);
  };

  const showResults = (list) => {
    setBuildings(list);
    loadSlotStats(list);
  };

  const loadBuildings = async () => {
    setLoading(true);
    setError(null);
    setActiveQuery('');
    try {
      showResults(await api.buildings.getAll());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBuildings();
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return loadBuildings();
    setLoading(true);
    setError(null);
    setActiveQuery(q);
    try {
      showResults(/^\d+$/.test(q) ? await api.buildings.getByPincode(q) : await api.buildings.searchByName(q));
    } catch (err) {
      // The service answers 404 when nothing matches
      if (err.status === 404) setBuildings([]);
      else setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    loadBuildings();
  };

  const closeAddModal = () => {
    if (saving) return;
    setShowAddModal(false);
    if (params.new) navigate('buildings', null, { replace: true });
  };

  const handleCreateBuilding = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.buildings.create({ ...newBuilding, pincode: parseInt(newBuilding.pincode, 10) });
      addToast(`${newBuilding.buildingName} added`, 'success');
      setShowAddModal(false);
      setNewBuilding(EMPTY_BUILDING);
      if (params.new) navigate('buildings', null, { replace: true });
      loadBuildings();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBuilding = async (b) => {
    const ok = await confirm({
      title: `Delete ${b.buildingName}?`,
      message: 'The building and all of its parking slots will be removed. This cannot be undone.',
      confirmText: 'Delete building'
    });
    if (!ok) return;
    setDeleting(b.buildingNumber);
    try {
      await api.buildings.delete(b.buildingNumber);
      addToast(`${b.buildingName} deleted`, 'success');
      loadBuildings();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setDeleting(null);
    }
  };

  const setField = (key) => (e) => setNewBuilding({ ...newBuilding, [key]: e.target.value });

  return (
    <div>
      <PageHeader
        eyebrow={<><Building2 size={13} /> Locations</>}
        title="Buildings"
        subtitle={admin ? 'Sites in your parking network.' : 'Find a building and see its parking.'}
        actions={admin && (
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)} id="btn-add-building">
            <Plus size={18} />
            <span>Add building</span>
          </button>
        )}
      />

      <div className="card card-pad-sm mb-lg">
        <form onSubmit={handleSearch} className="row gap-sm wrap">
          <div className="input-wrap grow" style={{ minWidth: 240 }}>
            <Search size={17} className="input-icon" />
            <input
              type="text"
              className="input-field"
              placeholder="Search by building name or pincode"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingRight: searchQuery ? '2.5rem' : undefined }}
              aria-label="Search buildings"
            />
            {searchQuery && (
              <button type="button" className="btn btn-ghost btn-icon btn-sm input-action" onClick={clearSearch} aria-label="Clear search">
                <X size={15} />
              </button>
            )}
          </div>
          <button type="submit" className="btn btn-secondary">Search</button>
        </form>
      </div>

      {!loading && !error && (
        <div className="text-sm secondary" style={{ marginBottom: '1rem' }}>
          {activeQuery
            ? <>{pluralize(buildings.length, 'result')} for <strong className="strong">“{activeQuery}”</strong></>
            : pluralize(buildings.length, 'building')}
        </div>
      )}

      {loading ? (
        <SkeletonCards count={6} height={220} />
      ) : error ? (
        <div className="card">
          <EmptyState icon={<AlertCircle size={28} />} title="Couldn't load buildings"
            action={<button className="btn btn-secondary" onClick={loadBuildings}>Try again</button>}>
            {error}
          </EmptyState>
        </div>
      ) : buildings.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Building2 size={28} />}
            title={activeQuery ? 'No matching buildings' : 'No buildings yet'}
            action={
              activeQuery ? (
                <button className="btn btn-secondary" onClick={clearSearch}>Clear search</button>
              ) : admin ? (
                <button className="btn btn-primary" onClick={() => setShowAddModal(true)}><Plus size={16} /> Add first building</button>
              ) : null
            }
          >
            {activeQuery ? 'Try a different name or pincode.' : 'Buildings will appear here once they are added.'}
          </EmptyState>
        </div>
      ) : (
        <div className="grid grid-cards stagger">
          {buildings.map((b, i) => {
            const stats = slotStats[b.buildingNumber];
            return (
              <div
                key={b.id || b.buildingNumber}
                className="card card-interactive stack"
                style={{ '--i': i, opacity: deleting === b.buildingNumber ? 0.5 : 1 }}
              >
                <div className="card-pad stack gap-md" style={{ flex: 1 }}>
                  <div className="row gap-md" style={{ alignItems: 'flex-start' }}>
                    <span className="icon-tile icon-tile-lg"><Building2 size={22} /></span>
                    <div className="grow">
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 650 }}>{b.buildingName}</h3>
                      <div className="text-sm secondary" style={{ marginTop: 2 }}>{[b.area, b.town].filter(Boolean).join(', ')}</div>
                    </div>
                    {admin && (
                      <button
                        onClick={() => handleDeleteBuilding(b)}
                        className="btn btn-ghost btn-icon btn-sm"
                        title="Delete building"
                        aria-label={`Delete ${b.buildingName}`}
                        disabled={deleting === b.buildingNumber}
                      >
                        {deleting === b.buildingNumber ? <Spinner size={15} /> : <Trash2 size={15} />}
                      </button>
                    )}
                  </div>

                  <div className="stack gap-xs text-sm secondary">
                    <div className="row gap-sm" style={{ alignItems: 'flex-start' }}>
                      <MapPin size={15} style={{ color: 'var(--accent-text)', marginTop: 3, flexShrink: 0 }} />
                      <span>{[b.state, b.pincode].filter(Boolean).join(' · ')}</span>
                    </div>
                    {b.landmark && (
                      <div className="row gap-sm text-xs muted">
                        <Landmark size={14} style={{ flexShrink: 0 }} />
                        <span>{b.landmark}</span>
                      </div>
                    )}
                  </div>

                  <div className="row gap-sm wrap" style={{ marginTop: 'auto' }}>
                    {stats ? (
                      <>
                        <span className="badge badge-neutral"><SquareParking size={12} /> {pluralize(stats.total, 'slot')}</span>
                        {stats.total > 0 && <span className="badge badge-success">{stats.bookable} bookable</span>}
                      </>
                    ) : (
                      <span className="badge badge-neutral">Loading slots…</span>
                    )}
                  </div>
                </div>

                <div className="card-footer">
                  <a className="btn btn-secondary btn-sm grow" href={buildHref('slots', { building: b.buildingNumber })}>
                    <SquareParking size={15} />
                    <span>{admin ? 'Manage slots' : 'View slots'}</span>
                  </a>
                  <a className="btn btn-primary btn-sm grow" href={buildHref('book', { building: b.buildingNumber })}>
                    <span>Book here</span>
                    <ArrowRight size={14} />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={showAddModal}
        onClose={closeAddModal}
        icon={<Building2 size={20} />}
        title="Add building"
        subtitle="Register a new site in the parking network."
        size="lg"
      >
        <form onSubmit={handleCreateBuilding}>
          <div className="modal-body">
            <div className="form-section-label"><Hash size={13} /> Identity</div>
            <div className="grid grid-2" style={{ gap: '0.75rem' }}>
              <div className="input-group">
                <label className="input-label">Building code</label>
                <input type="text" className="input-field mono" placeholder="BLD-303" value={newBuilding.buildingNumber} onChange={setField('buildingNumber')} required />
                <span className="input-hint">A unique code used to identify the building</span>
              </div>
              <div className="input-group">
                <label className="input-label">Building name</label>
                <input type="text" className="input-field" placeholder="Infinity Tower" value={newBuilding.buildingName} onChange={setField('buildingName')} required />
              </div>
            </div>

            <div className="form-section-label"><MapPin size={13} /> Location</div>
            <div className="grid grid-2" style={{ gap: '0.75rem' }}>
              <div className="input-group">
                <label className="input-label">Area</label>
                <input type="text" className="input-field" placeholder="Financial District" value={newBuilding.area} onChange={setField('area')} required />
              </div>
              <div className="input-group">
                <label className="input-label">City / town</label>
                <input type="text" className="input-field" placeholder="Hyderabad" value={newBuilding.town} onChange={setField('town')} required />
              </div>
              <div className="input-group">
                <label className="input-label">State</label>
                <input type="text" className="input-field" placeholder="Telangana" value={newBuilding.state} onChange={setField('state')} required />
              </div>
              <div className="input-group">
                <label className="input-label">Pincode</label>
                <input type="text" inputMode="numeric" pattern="\d{6}" title="6-digit pincode" className="input-field" placeholder="500032" value={newBuilding.pincode} onChange={setField('pincode')} required />
              </div>
            </div>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Landmark</label>
              <input type="text" className="input-field" placeholder="Opposite Wave Rock" value={newBuilding.landmark} onChange={setField('landmark')} required />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={closeAddModal} disabled={saving}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <><Spinner /> Saving…</> : 'Save building'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
