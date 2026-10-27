import React, { useState, useEffect, useMemo } from 'react';
import {
  Layers,
  Plus,
  CalendarPlus,
  Trash2,
  Building2,
  Clock,
  Settings2,
  CalendarRange,
  CalendarOff,
  SquareParking,
  Car,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';
import { navigate, buildHref } from '../lib/router';
import { parseDate, toDateInput, toTimeInput, toApiDateTime, formatDateTime, formatTime, formatRange, bookingState, bookingEnd, sortByDate, pluralize } from '../lib/format';
import { Modal, PageHeader, EmptyState, SkeletonCards, Spinner, Skeleton, useConfirm } from './ui';

const inMonths = (n) => {
  const d = new Date();
  d.setMonth(d.getMonth() + n);
  return d;
};

const EMPTY_SLOT = { slotNumber: '', floorNumber: '1', division: 'A' };

export default function SlotsView({ admin, params, addToast }) {
  const confirm = useConfirm();
  const [buildings, setBuildings] = useState([]);
  const [buildingsLoading, setBuildingsLoading] = useState(true);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [floorFilter, setFloorFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [showAddModal, setShowAddModal] = useState(false);
  const [savingSlot, setSavingSlot] = useState(false);
  const [newSlot, setNewSlot] = useState(EMPTY_SLOT);

  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [targetSlot, setTargetSlot] = useState(null);
  const [fromDate, setFromDate] = useState('');
  const [fromTime, setFromTime] = useState('00:00');
  const [toDate, setToDate] = useState('');
  const [toTime, setToTime] = useState('23:59');
  const [savingSchedule, setSavingSchedule] = useState(false);

  const building = params.building || buildings[0]?.buildingNumber || '';
  const currentBuilding = buildings.find(b => b.buildingNumber === building);

  const selectBuilding = (value) => {
    setFloorFilter('all');
    navigate('slots', { building: value }, { replace: true });
  };

  useEffect(() => {
    api.buildings.getAll()
      .then(setBuildings)
      .catch(err => addToast(err.message, 'error'))
      .finally(() => setBuildingsLoading(false));
  }, []);

  const loadSlots = async () => {
    if (!building) return;
    setLoading(true);
    setError(null);
    try {
      setSlots(await api.slots.getByBuilding(building));
    } catch (err) {
      setSlots([]);
      if (err.status !== 404) setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSlots();
  }, [building]);

  const handleCreateSlot = async (e) => {
    e.preventDefault();
    setSavingSlot(true);
    try {
      await api.slots.create(building, newSlot);
      addToast(`Slot ${newSlot.slotNumber} added to ${currentBuilding?.buildingName || building}`, 'success');
      setShowAddModal(false);
      setNewSlot(EMPTY_SLOT);
      loadSlots();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSavingSlot(false);
    }
  };

  const handleDeleteSlot = async (slotNumber) => {
    const ok = await confirm({
      title: `Delete slot ${slotNumber}?`,
      message: 'The slot and its availability window will be removed. Existing reservations for it may be affected.',
      confirmText: 'Delete slot'
    });
    if (!ok) return;
    try {
      await api.slots.delete(building, slotNumber);
      addToast(`Slot ${slotNumber} deleted`, 'success');
      loadSlots();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const openScheduleModal = (slot) => {
    setTargetSlot(slot);
    const f = parseDate(slot.availability?.fromDate);
    const t = parseDate(slot.availability?.toDate);
    setFromDate(toDateInput(f || new Date()));
    setFromTime(f ? toTimeInput(f) : '00:00');
    setToDate(toDateInput(t || inMonths(3)));
    setToTime(t ? toTimeInput(t) : '23:59');
    setShowScheduleModal(true);
  };

  const windowInvalid = fromDate && toDate && toApiDateTime(toDate, toTime) <= toApiDateTime(fromDate, fromTime);

  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    if (!targetSlot || windowInvalid) return;
    setSavingSchedule(true);
    try {
      await api.availability.setSlotWindow(building, targetSlot.slotNumber, {
        fromDate: toApiDateTime(fromDate, fromTime),
        toDate: toApiDateTime(toDate, toTime)
      });
      addToast(`Availability updated for slot ${targetSlot.slotNumber}`, 'success');
      setShowScheduleModal(false);
      loadSlots();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleRemoveSchedule = async () => {
    if (!targetSlot) return;
    const slotNumber = targetSlot.slotNumber;
    setShowScheduleModal(false);
    const ok = await confirm({
      title: 'Remove availability window?',
      message: `Slot ${slotNumber} won't be bookable until a new window is set.`,
      confirmText: 'Remove window'
    });
    if (!ok) {
      setShowScheduleModal(true);
      return;
    }
    try {
      await api.availability.removeSlotWindow(building, slotNumber);
      addToast(`Availability removed for slot ${slotNumber}`, 'success');
      loadSlots();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const hasWindow = (s) => !!(s.availability?.fromDate && s.availability?.toDate);
  const floors = useMemo(
    () => [...new Set(slots.map(s => s.floorNumber).filter(f => f !== undefined && f !== null && f !== ''))]
      .sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true })),
    [slots]
  );
  const visibleSlots = slots.filter(s =>
    (floorFilter === 'all' || String(s.floorNumber) === String(floorFilter)) &&
    (statusFilter === 'all' || (statusFilter === 'bookable' ? hasWindow(s) : !hasWindow(s)))
  );
  const scheduledCount = slots.filter(hasWindow).length;

  return (
    <div>
      <PageHeader
        eyebrow={<><SquareParking size={13} /> {admin ? 'Inventory' : 'Parking'}</>}
        title={currentBuilding ? currentBuilding.buildingName : 'Parking slots'}
        subtitle={
          currentBuilding
            ? `${[currentBuilding.area, currentBuilding.town].filter(Boolean).join(', ')} · ${admin ? 'Manage slots and when they can be booked.' : 'Slots and when they can be booked.'}`
            : 'Slots and availability for each building.'
        }
        actions={
          <>
            <a className="btn btn-secondary" href={buildHref('book', { building })}>
              <CalendarPlus size={16} />
              <span>Book here</span>
            </a>
            {admin && (
              <button className="btn btn-primary" onClick={() => setShowAddModal(true)} disabled={!building} id="btn-add-slot">
                <Plus size={18} />
                <span>Add slot</span>
              </button>
            )}
          </>
        }
      />

      <div className="card card-pad-sm mb-lg">
        <div className="row gap-md" style={{ marginBottom: '0.75rem' }}>
          <Building2 size={16} style={{ color: 'var(--accent-text)' }} />
          <span className="text-sm strong">Building</span>
        </div>
        {buildingsLoading ? (
          <div className="row gap-sm">
            {[120, 150, 110].map((w, i) => <Skeleton key={i} width={w} height={36} radius={999} />)}
          </div>
        ) : buildings.length === 0 ? (
          <div className="text-sm muted">No buildings yet.</div>
        ) : (
          <div className="chip-row">
            {buildings.map(b => (
              <button
                key={b.buildingNumber}
                onClick={() => selectBuilding(b.buildingNumber)}
                className={`chip ${building === b.buildingNumber ? 'active' : ''}`}
              >
                <span>{b.buildingName}</span>
                <span className="chip-code">{b.buildingNumber}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {loading || buildingsLoading ? (
        <SkeletonCards count={8} height={250} className="grid grid-slots" />
      ) : error ? (
        <div className="card">
          <EmptyState icon={<AlertCircle size={28} />} title="Couldn't load slots"
            action={<button className="btn btn-secondary" onClick={loadSlots}>Try again</button>}>
            {error}
          </EmptyState>
        </div>
      ) : slots.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Car size={28} />}
            title="No slots in this building"
            action={admin && (
              <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                <Plus size={16} />
                <span>Add first slot</span>
              </button>
            )}
          >
            {admin ? 'Add slots so people can start booking here.' : "This building doesn't offer parking slots yet."}
          </EmptyState>
        </div>
      ) : (
        <div>
          <div className="row between wrap gap-md" style={{ marginBottom: '1rem' }}>
            <div className="row gap-sm wrap">
              <span className="badge badge-neutral">{pluralize(slots.length, 'slot')}</span>
              <span className="badge badge-success">{scheduledCount} bookable</span>
              {slots.length - scheduledCount > 0 && (
                <span className="badge badge-warning">{slots.length - scheduledCount} without a window</span>
              )}
            </div>
            <div className="row gap-sm wrap">
              {admin && (
                <select
                  className="input-field"
                  style={{ height: 34, width: 'auto', fontSize: '0.82rem' }}
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  aria-label="Filter by availability"
                >
                  <option value="all">All slots</option>
                  <option value="bookable">Bookable</option>
                  <option value="unscheduled">Without a window</option>
                </select>
              )}
              {floors.length > 1 && (
                <div className="row gap-sm">
                  <Layers size={15} className="muted" />
                  <select
                    className="input-field"
                    style={{ height: 34, width: 'auto', fontSize: '0.82rem' }}
                    value={floorFilter}
                    onChange={e => setFloorFilter(e.target.value)}
                    aria-label="Filter by level"
                  >
                    <option value="all">All levels</option>
                    {floors.map(f => <option key={f} value={f}>Level {f}</option>)}
                  </select>
                </div>
              )}
            </div>
          </div>

          {visibleSlots.length === 0 ? (
            <div className="card">
              <EmptyState icon={<SquareParking size={26} />} title="No slots match these filters"
                action={<button className="btn btn-secondary" onClick={() => { setFloorFilter('all'); setStatusFilter('all'); }}>Clear filters</button>} />
            </div>
          ) : (
            <div className="grid grid-slots stagger" key={`${building}-${floorFilter}-${statusFilter}`}>
              {visibleSlots.map((s, i) => {
                const scheduled = hasWindow(s);
                const slotBookings = s.availability?.bookings || [];
                const inUse = slotBookings.find(b => bookingState(b) === 'active');
                const nextBooking = sortByDate(slotBookings.filter(b => bookingState(b) === 'upcoming'), 'asc')[0];
                const tone = scheduled ? 'var(--color-success)' : 'var(--color-warning)';

                return (
                  <div key={s.id || s.slotNumber} className="card card-interactive slot-card" style={{ '--i': i, '--slot-tone': tone }}>
                    <div className="card-pad-sm stack gap-md" style={{ flex: 1 }}>
                      <div className="row gap-md">
                        <div className="slot-bay"><Car size={20} /></div>
                        <div className="grow">
                          <div className="slot-number">{s.slotNumber}</div>
                          {inUse ? (
                            <span className="badge badge-info" style={{ marginTop: 4 }}>
                              <span className="dot dot-live" />
                              In use until {formatTime(bookingEnd(inUse))}
                            </span>
                          ) : (
                            <span className={`badge ${scheduled ? 'badge-success' : 'badge-warning'}`} style={{ marginTop: 4 }}>
                              <span className="dot" />
                              {scheduled ? 'Free now' : 'No window set'}
                            </span>
                          )}
                        </div>
                        {admin && (
                          <div className="row" style={{ alignSelf: 'flex-start', marginRight: -6 }}>
                            <button
                              onClick={() => openScheduleModal(s)}
                              className="btn btn-ghost btn-icon btn-sm"
                              title="Set availability"
                              aria-label={`Set availability for ${s.slotNumber}`}
                            >
                              <Settings2 size={15} />
                            </button>
                            <button
                              onClick={() => handleDeleteSlot(s.slotNumber)}
                              className="btn btn-ghost btn-icon btn-sm"
                              title="Delete slot"
                              aria-label={`Delete ${s.slotNumber}`}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        )}
                      </div>

                      <dl className="kv">
                        <dt>Level</dt>
                        <dd>{s.floorNumber ?? '—'}</dd>
                        <dt>Wing</dt>
                        <dd>{s.division ?? '—'}</dd>
                        {admin && scheduled && (
                          <>
                            <dt>Next booking</dt>
                            <dd className="text-xs" style={{ alignSelf: 'center' }}>{nextBooking ? formatRange(nextBooking.bookingDate, bookingEnd(nextBooking)) : 'None'}</dd>
                          </>
                        )}
                      </dl>

                      <div className="window-box">
                        <div className="row gap-xs muted text-xs" style={{ marginBottom: '0.45rem' }}>
                          <Clock size={12} />
                          <span>Bookable between</span>
                        </div>
                        {scheduled ? (
                          <div className="timeline">
                            <div className="timeline-item" style={{ '--tl-color': 'var(--color-success)' }}>
                              {formatDateTime(s.availability.fromDate)}
                            </div>
                            <div className="timeline-item" style={{ '--tl-color': 'var(--color-info)' }}>
                              {formatDateTime(s.availability.toDate)}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--color-warning-text)' }}>
                            {admin ? 'Set a window to make this slot bookable' : 'Not available for booking yet'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="card-footer">
                      {admin && !scheduled ? (
                        <button className="btn btn-secondary btn-sm grow" onClick={() => openScheduleModal(s)}>
                          <CalendarRange size={14} />
                          <span>Set availability</span>
                        </button>
                      ) : (
                        <a
                          className={`btn btn-primary btn-sm grow ${scheduled ? '' : 'disabled'}`}
                          href={scheduled ? buildHref('book', { building, slot: s.slotNumber }) : undefined}
                          aria-disabled={!scheduled}
                          style={scheduled ? undefined : { opacity: 0.5, pointerEvents: 'none' }}
                        >
                          <CalendarPlus size={14} />
                          <span>Book this slot</span>
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <Modal
        open={showAddModal}
        onClose={() => !savingSlot && setShowAddModal(false)}
        icon={<Plus size={20} />}
        tone="success"
        title="Add parking slot"
        subtitle={<>New slot in <strong className="strong">{currentBuilding?.buildingName || building}</strong></>}
      >
        <form onSubmit={handleCreateSlot}>
          <div className="modal-body">
            <div className="input-group">
              <label className="input-label">Slot number</label>
              <input
                type="text"
                className="input-field mono"
                placeholder="A-103"
                value={newSlot.slotNumber}
                onChange={e => setNewSlot({ ...newSlot, slotNumber: e.target.value })}
                required
              />
              <span className="input-hint">Shown to drivers, e.g. the number painted on the bay</span>
            </div>
            <div className="grid grid-2" style={{ gap: '0.75rem' }}>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">Level</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="1"
                  value={newSlot.floorNumber}
                  onChange={e => setNewSlot({ ...newSlot, floorNumber: e.target.value })}
                  required
                />
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">Wing</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="A"
                  value={newSlot.division}
                  onChange={e => setNewSlot({ ...newSlot, division: e.target.value })}
                  required
                />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)} disabled={savingSlot}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={savingSlot}>
              {savingSlot ? <><Spinner /> Saving…</> : 'Add slot'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={showScheduleModal && !!targetSlot}
        onClose={() => !savingSchedule && setShowScheduleModal(false)}
        icon={<CalendarRange size={20} />}
        title={<>Availability · <span className="mono">{targetSlot?.slotNumber}</span></>}
        subtitle="People can book this slot for any time inside this window."
      >
        <form onSubmit={handleSaveSchedule}>
          <div className="modal-body">
            <div className="form-section-label" style={{ color: 'var(--color-success-text)' }}>
              <span className="dot" /> From
            </div>
            <div className="grid grid-2" style={{ gap: '0.75rem' }}>
              <div className="input-group">
                <label className="input-label">Start date</label>
                <input type="date" className="input-field" value={fromDate} onChange={e => setFromDate(e.target.value)} required />
              </div>
              <div className="input-group">
                <label className="input-label">Start time</label>
                <input type="time" className="input-field" value={fromTime} onChange={e => setFromTime(e.target.value)} required />
              </div>
            </div>

            <div className="form-section-label" style={{ color: 'var(--color-info-text)' }}>
              <span className="dot" /> Until
            </div>
            <div className="grid grid-2" style={{ gap: '0.75rem' }}>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">End date</label>
                <input type="date" className={`input-field ${windowInvalid ? 'invalid' : ''}`} value={toDate} min={fromDate} onChange={e => setToDate(e.target.value)} required />
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">End time</label>
                <input type="time" className={`input-field ${windowInvalid ? 'invalid' : ''}`} value={toTime} onChange={e => setToTime(e.target.value)} required />
              </div>
            </div>
            {windowInvalid && <div className="field-error" style={{ marginTop: '0.6rem' }}>The end must be after the start.</div>}
          </div>

          <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
            {targetSlot?.availability ? (
              <button type="button" className="btn btn-danger-soft" onClick={handleRemoveSchedule} disabled={savingSchedule}>
                <CalendarOff size={15} />
                <span>Remove</span>
              </button>
            ) : <span />}
            <div className="row gap-sm">
              <button type="button" className="btn btn-secondary" onClick={() => setShowScheduleModal(false)} disabled={savingSchedule}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={savingSchedule || windowInvalid}>
                {savingSchedule ? <><Spinner /> Saving…</> : 'Save window'}
              </button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
