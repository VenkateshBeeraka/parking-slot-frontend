import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarPlus,
  Building2,
  Check,
  ArrowRight,
  MapPin,
  AlertTriangle,
  SquareParking,
  CalendarCheck,
  Layers
} from 'lucide-react';
import { api } from '../services/api';
import { navigate, buildHref } from '../lib/router';
import {
  toDateInput,
  toTimeInput,
  nextHalfHour,
  parseDate,
  dateToApi,
  formatRange,
  formatDuration,
  MAX_DURATION_MS
} from '../lib/format';
import { PageHeader, EmptyState, Skeleton, Spinner, Modal, Segmented } from './ui';

const DURATIONS = [
  { value: '1', label: '1 hr' },
  { value: '2', label: '2 hrs' },
  { value: '4', label: '4 hrs' },
  { value: '8', label: '8 hrs' },
  { value: 'custom', label: 'Custom' }
];

export default function BookingView({ params, addToast, refreshNotifications }) {
  const start = nextHalfHour();
  const [buildings, setBuildings] = useState([]);
  const [buildingsLoading, setBuildingsLoading] = useState(true);
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [openSlots, setOpenSlots] = useState([]);
  const [availLoading, setAvailLoading] = useState(false);
  const [date, setDate] = useState(params.date || toDateInput(start));
  const [time, setTime] = useState(params.time || toTimeInput(start));
  const [duration, setDuration] = useState(DURATIONS.some(d => d.value === params.duration) ? params.duration : '2');
  // Seeds the custom end fields (e.g. when arriving from Quick book with "Custom")
  const initialEnd = new Date((parseDate(`${params.date || toDateInput(start)} ${params.time || toTimeInput(start)}`) || start).getTime() + 2 * 3600000);
  const [endDate, setEndDate] = useState(toDateInput(initialEnd));
  const [endTime, setEndTime] = useState(toTimeInput(initialEnd));
  const [selectedSlot, setSelectedSlot] = useState(params.slot || '');
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const building = params.building || buildings[0]?.buildingNumber || '';
  const currentBuilding = buildings.find(b => b.buildingNumber === building);

  const setBuilding = (value) => {
    setSelectedSlot('');
    navigate('book', { building: value }, { replace: true });
  };

  useEffect(() => {
    api.buildings.getAll()
      .then(setBuildings)
      .catch(err => addToast(err.message, 'error'))
      .finally(() => setBuildingsLoading(false));
  }, []);

  useEffect(() => {
    if (!building) return;
    setSlotsLoading(true);
    api.slots.getByBuilding(building)
      .then(setSlots)
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [building]);

  const startAt = parseDate(`${date} ${time}`);
  const endAt = duration === 'custom'
    ? parseDate(`${endDate} ${endTime}`)
    : startAt && new Date(startAt.getTime() + Number(duration) * 3600000);
  const periodMs = startAt && endAt ? endAt.getTime() - startAt.getTime() : 0;
  const inPast = startAt && startAt.getTime() < Date.now();
  const endInvalid = !endAt || periodMs <= 0;
  const tooLong = periodMs > MAX_DURATION_MS;
  const periodValid = startAt && !inPast && !endInvalid && !tooLong;

  const changeDuration = (value) => {
    // Start the custom end from whatever the current period ends at
    if (value === 'custom' && endAt) {
      setEndDate(toDateInput(endAt));
      setEndTime(toTimeInput(endAt));
    }
    setDuration(value);
  };

  const loadAvailability = () => {
    if (!building || !startAt || !endAt || endInvalid || tooLong) return;
    setAvailLoading(true);
    api.availability.getOpenSlots(building, dateToApi(startAt), dateToApi(endAt))
      .then(setOpenSlots)
      .catch(() => setOpenSlots([]))
      .finally(() => setAvailLoading(false));
  };

  useEffect(() => {
    loadAvailability();
  }, [building, date, time, duration, endDate, endTime]);

  const isOpen = (slotNumber) => openSlots.some(s => String(s).trim().toLowerCase() === String(slotNumber).trim().toLowerCase());
  const slotState = (s) => {
    if (!s.availability?.fromDate) return 'unscheduled';
    return isOpen(s.slotNumber) ? 'open' : 'taken';
  };

  const byFloor = useMemo(() => {
    const groups = {};
    slots.forEach(s => {
      const key = s.floorNumber ?? '—';
      (groups[key] = groups[key] || []).push(s);
    });
    return Object.entries(groups).sort(([a], [b]) => String(a).localeCompare(String(b), undefined, { numeric: true }));
  }, [slots]);

  const openCount = slots.filter(s => slotState(s) === 'open').length;
  const selected = slots.find(s => s.slotNumber === selectedSlot);
  const selectedUnavailable = selected && periodValid && !availLoading && slotState(selected) !== 'open';
  const canSubmit = !!building && !!selected && periodValid && !selectedUnavailable && !submitting;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await api.bookings.create(building, selectedSlot, dateToApi(startAt), dateToApi(endAt));
      setConfirmed({
        building: currentBuilding?.buildingName || building,
        slot: selectedSlot,
        floor: selected?.floorNumber,
        start: startAt,
        end: endAt
      });
      setConfirmOpen(true);
      setSelectedSlot('');
      loadAvailability();
      setTimeout(() => refreshNotifications?.(), 1500);
    } catch (err) {
      addToast(err.message, 'error');
      loadAvailability();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow={<><CalendarPlus size={13} /> Reserve</>}
        title="Book parking"
        subtitle="Choose a building and how long you'll stay, then pick an open bay."
      />

      <div className="grid grid-booking">
        <form onSubmit={handleSubmit} className="card stack" style={{ animation: 'riseIn 420ms var(--ease-out) backwards', alignSelf: 'start' }}>
          <div className="card-header">
            <div className="row gap-md">
              <span className="icon-tile"><CalendarPlus size={18} /></span>
              <div>
                <h2 className="section-title">Where and when</h2>
                <p className="section-subtitle">Availability updates as you change these</p>
              </div>
            </div>
          </div>

          <div className="card-body">
            <div className="input-group">
              <label className="input-label">Building</label>
              {buildingsLoading ? (
                <Skeleton height={42} radius={10} />
              ) : (
                <div className="input-wrap">
                  <Building2 size={16} className="input-icon" />
                  <select className="input-field" value={building} onChange={e => setBuilding(e.target.value)} disabled={!buildings.length}>
                    {buildings.length === 0 && <option value="">No buildings available</option>}
                    {buildings.map(b => (
                      <option key={b.buildingNumber} value={b.buildingNumber}>{b.buildingName}</option>
                    ))}
                  </select>
                </div>
              )}
              {currentBuilding && (
                <span className="input-hint row gap-xs"><MapPin size={12} />{[currentBuilding.area, currentBuilding.town].filter(Boolean).join(', ')}</span>
              )}
            </div>

            <div className="grid grid-2" style={{ gap: '0.75rem' }}>
              <div className="input-group">
                <label className="input-label">Date</label>
                <input type="date" className="input-field" value={date} min={toDateInput(new Date())} onChange={e => setDate(e.target.value)} required />
              </div>
              <div className="input-group">
                <label className="input-label">Start time</label>
                <input type="time" className={`input-field ${inPast ? 'invalid' : ''}`} value={time} onChange={e => setTime(e.target.value)} required />
              </div>
            </div>
            {inPast && <div className="field-error" style={{ marginTop: '-0.5rem', marginBottom: '1rem' }}>Choose a start time in the future.</div>}

            <div className="input-group">
              <label className="input-label">How long?</label>
              <Segmented value={duration} onChange={changeDuration} options={DURATIONS} />
            </div>

            {duration === 'custom' && (
              <div className="grid grid-2 form-swap" style={{ gap: '0.75rem' }}>
                <div className="input-group">
                  <label className="input-label">End date</label>
                  <input type="date" className={`input-field ${endInvalid || tooLong ? 'invalid' : ''}`} value={endDate} min={date} onChange={e => setEndDate(e.target.value)} required />
                </div>
                <div className="input-group">
                  <label className="input-label">End time</label>
                  <input type="time" className={`input-field ${endInvalid || tooLong ? 'invalid' : ''}`} value={endTime} onChange={e => setEndTime(e.target.value)} required />
                </div>
              </div>
            )}
            {duration === 'custom' && endInvalid && endDate && endTime && (
              <div className="field-error" style={{ marginTop: '-0.5rem', marginBottom: '1rem' }}>The end must be after the start.</div>
            )}
            {tooLong && <div className="field-error" style={{ marginTop: '-0.5rem', marginBottom: '1rem' }}>A booking can be at most 7 days long.</div>}

            <div className="window-box stack gap-sm">
              <div className="text-xs muted" style={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Your reservation</div>
              <div className="row between text-sm"><span className="secondary">Building</span><span className="strong">{currentBuilding?.buildingName || '—'}</span></div>
              <div className="row between text-sm">
                <span className="secondary">Slot</span>
                <span className={selectedSlot ? 'strong mono' : 'muted'} key={selectedSlot} style={{ animation: 'popIn 260ms var(--ease-spring)' }}>
                  {selectedSlot ? `${selectedSlot}${selected?.floorNumber ? ` · Level ${selected.floorNumber}` : ''}` : 'Pick a slot'}
                </span>
              </div>
              <div className="row between text-sm"><span className="secondary">When</span><span className="strong" style={{ textAlign: 'right' }}>{startAt && !endInvalid ? formatRange(startAt, endAt) : '—'}</span></div>
              <div className="row between text-sm"><span className="secondary">Duration</span><span className="strong">{!endInvalid ? formatDuration(periodMs) : '—'}</span></div>
            </div>

            {selectedUnavailable && (
              <div className="callout callout-warning" style={{ marginTop: '0.85rem' }}>
                <AlertTriangle size={16} />
                <span>{selectedSlot} isn't free for that whole period. Pick another slot or change the time.</span>
              </div>
            )}
          </div>

          <div className="card-footer" style={{ padding: '1rem 1.5rem' }}>
            <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={!canSubmit}>
              {submitting ? <><Spinner size={17} /> Confirming…</> : <><span>Confirm reservation</span><ArrowRight size={17} /></>}
            </button>
          </div>
        </form>

        <div className="card stack" style={{ animation: 'riseIn 420ms var(--ease-out) 80ms backwards' }}>
          <div className="card-header">
            <div className="row gap-md">
              <span className="icon-tile tone-success"><SquareParking size={18} /></span>
              <div>
                <h2 className="section-title">Choose a slot</h2>
                <p className="section-subtitle">{currentBuilding?.buildingName || 'Select a building'}</p>
              </div>
            </div>
            {!availLoading && !slotsLoading && slots.length > 0 && (
              <span className="badge badge-success" key={`${openCount}-${date}-${time}`} style={{ animation: 'popIn 260ms var(--ease-spring)' }}>
                {openCount} of {slots.length} open
              </span>
            )}
          </div>

          <div className="card-body" style={{ flex: 1 }}>
            {slotsLoading || buildingsLoading ? (
              <div className="slot-picker">
                {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} height={78} radius={10} />)}
              </div>
            ) : !building ? (
              <EmptyState icon={<Building2 size={26} />} title="No buildings available">
                There are no buildings to book in yet.
              </EmptyState>
            ) : slots.length === 0 ? (
              <EmptyState icon={<SquareParking size={26} />} title="No slots in this building"
                action={<a className="btn btn-secondary" href={buildHref('buildings')}>Browse other buildings</a>}>
                This building doesn't offer any parking slots yet.
              </EmptyState>
            ) : (
              <>
                <div className="stack gap-lg" key={`${building}-${date}-${time}`}>
                  {byFloor.map(([floor, list]) => (
                    <div key={floor}>
                      <div className="form-section-label" style={{ marginTop: 0 }}><Layers size={13} /> Level {floor}</div>
                      <div className="slot-picker" style={{ maxHeight: 'none' }}>
                        {list.map((s, i) => {
                          const state = availLoading ? 'loading' : slotState(s);
                          const isSelected = selectedSlot === s.slotNumber;
                          return (
                            <button
                              type="button"
                              key={s.slotNumber}
                              className={`slot-option ${isSelected ? 'selected' : ''}`}
                              style={{ '--i': i }}
                              disabled={state !== 'open'}
                              onClick={() => setSelectedSlot(s.slotNumber)}
                              aria-pressed={isSelected}
                            >
                              {isSelected && <span className="check"><Check size={12} strokeWidth={3} /></span>}
                              <span className="mono strong text-sm">{s.slotNumber}</span>
                              <span className="text-xs muted">Wing {s.division || '—'}</span>
                              {state === 'loading' ? (
                                <Skeleton width={44} height={16} radius={99} />
                              ) : (
                                <span
                                  className={`badge ${state === 'open' ? 'badge-success' : state === 'taken' ? 'badge-danger' : 'badge-neutral'}`}
                                  style={{ fontSize: '0.65rem', padding: '0.1rem 0.45rem' }}
                                >
                                  {state === 'open' ? 'Open' : state === 'taken' ? 'Unavailable' : 'Not offered'}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="legend" style={{ marginTop: '1.25rem' }}>
                  <span><i style={{ background: 'var(--color-success)' }} /> Open</span>
                  <span><i style={{ background: 'var(--color-danger)' }} /> Booked or outside hours</span>
                  <span><i style={{ background: 'var(--text-muted)' }} /> Not offered</span>
                  <span><i style={{ background: 'var(--accent)' }} /> Selected</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} size="sm">
        {confirmed && (
          <>
            <div className="modal-body" style={{ textAlign: 'center', paddingTop: '2rem' }}>
              <div className="success-check">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h2 className="modal-title">You're booked!</h2>
              <p className="modal-subtitle">Your bay is reserved. You can manage it from My bookings.</p>
              <div className="window-box stack gap-sm" style={{ marginTop: '1.25rem', textAlign: 'left' }}>
                <div className="row between text-sm"><span className="secondary">Building</span><span className="strong">{confirmed.building}</span></div>
                <div className="row between text-sm"><span className="secondary">Slot</span><span className="strong mono">{confirmed.slot}{confirmed.floor ? ` · Level ${confirmed.floor}` : ''}</span></div>
                <div className="row between text-sm"><span className="secondary">When</span><span className="strong">{formatRange(confirmed.start, confirmed.end)}</span></div>
                <div className="row between text-sm"><span className="secondary">Duration</span><span className="strong">{formatDuration(confirmed.end - confirmed.start)}</span></div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setConfirmOpen(false)}>Book another</button>
              <a className="btn btn-primary" href={buildHref('bookings')} onClick={() => setConfirmOpen(false)}>
                <CalendarCheck size={16} /> View my bookings
              </a>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
