// Date helpers. The services exchange wall-clock times as "yyyy-MM-dd HH:mm:ss" (no zone),
// and some endpoints return ISO strings with an offset; both are handled here.

const WALL_CLOCK = /^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2})(?::(\d{2}))?(?:\.\d+)?)?$/;

export function parseDate(value) {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === 'number') return new Date(value);
  const str = String(value).trim();
  const m = str.match(WALL_CLOCK);
  // Treat zone-less values as local time (new Date("yyyy-MM-dd") would assume UTC)
  const d = m ? new Date(`${m[1]}T${m[2] || '00:00'}:${m[3] || '00'}`) : new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

const pad = (n) => String(n).padStart(2, '0');

export const toDateInput = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const toTimeInput = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

// "yyyy-MM-dd" + "HH:mm" -> "yyyy-MM-dd HH:mm:ss" as expected by the API
export const toApiDateTime = (date, time) => `${date} ${time && time.length === 5 ? `${time}:00` : time || '00:00:00'}`;

// Next half hour from now, used as the default booking time
export function nextHalfHour(from = new Date()) {
  const d = new Date(from);
  d.setSeconds(0, 0);
  d.setMinutes(d.getMinutes() < 30 ? 30 : 60);
  return d;
}

export function formatDateTime(value, opts = {}) {
  const d = parseDate(value);
  if (!d) return '—';
  return d.toLocaleString(undefined, {
    weekday: opts.weekday ? 'short' : undefined,
    month: 'short',
    day: 'numeric',
    year: opts.year === false || d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

export function formatDate(value, opts = {}) {
  const d = parseDate(value);
  if (!d) return '—';
  return d.toLocaleDateString(undefined, {
    weekday: opts.weekday ? 'long' : undefined,
    month: opts.month || 'short',
    day: 'numeric',
    year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric'
  });
}

export function formatTime(value) {
  const d = parseDate(value);
  if (!d) return '—';
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function timeAgo(value) {
  const d = parseDate(value);
  if (!d) return '';
  const s = Math.round((Date.now() - d.getTime()) / 1000);
  if (s < 45) return 'Just now';
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  if (s < 7 * 86400) return `${Math.round(s / 86400)}d ago`;
  return formatDate(d);
}

// "in 2h 15m", "in 3 days", "now"
export function timeUntil(value) {
  const d = parseDate(value);
  if (!d) return '';
  const mins = Math.round((d.getTime() - Date.now()) / 60000);
  if (mins <= 0) return 'now';
  if (mins < 60) return `in ${mins} min`;
  if (mins < 24 * 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `in ${h}h${m ? ` ${m}m` : ''}`;
  }
  const days = Math.round(mins / (24 * 60));
  return `in ${days} day${days === 1 ? '' : 's'}`;
}

export function relativeDay(value) {
  const d = parseDate(value);
  if (!d) return '';
  const today = new Date();
  const start = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((start(d) - start(today)) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return formatDate(d, { weekday: true });
}

/* --------------------------------------------------------------------------
   Domain helpers
   -------------------------------------------------------------------------- */

export const isAdmin = (user) => String(user?.role || '').toUpperCase() === 'ADMIN';

// Bookings created before end times existed are treated as lasting one hour
export const DEFAULT_DURATION_MS = 60 * 60 * 1000;
export const MAX_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export function bookingEnd(booking) {
  const end = parseDate(booking?.endDate);
  if (end) return end;
  const start = parseDate(booking?.bookingDate);
  return start ? new Date(start.getTime() + DEFAULT_DURATION_MS) : null;
}

// upcoming: before the start · active: between start and end · past: after the end (or closed)
export function bookingState(booking, now = Date.now()) {
  if (String(booking?.status || '').toUpperCase() === 'CLOSED') return 'past';
  const start = parseDate(booking?.bookingDate)?.getTime();
  const end = bookingEnd(booking)?.getTime();
  if (start && now < start) return 'upcoming';
  if (end && now < end) return 'active';
  return 'past';
}

// Upcoming or currently active, i.e. still relevant to the driver
export const isCurrent = (booking) => bookingState(booking) !== 'past';

export function formatDuration(ms) {
  if (!ms || ms <= 0) return '—';
  const totalMin = Math.round(ms / 60000);
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const mins = totalMin % 60;
  const parts = [];
  if (days) parts.push(`${days} day${days === 1 ? '' : 's'}`);
  if (hours) parts.push(`${hours} hr${hours === 1 ? '' : 's'}`);
  if (mins && !days) parts.push(`${mins} min`);
  return parts.join(' ') || '—';
}

const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

// "10:00 – 13:00", or "22:00 – Sat 08:00" when the stay runs past midnight
export function formatTimeRange(startValue, endValue) {
  const start = parseDate(startValue);
  const end = parseDate(endValue);
  if (!start) return '—';
  if (!end) return formatTime(start);
  const endText = sameDay(start, end)
    ? formatTime(end)
    : `${end.toLocaleDateString(undefined, { weekday: 'short' })} ${formatTime(end)}`;
  return `${formatTime(start)} – ${endText}`;
}

// "Fri 30 Oct, 10:00 – 13:00"
export function formatRange(startValue, endValue) {
  const start = parseDate(startValue);
  if (!start) return '—';
  const day = start.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  return `${day}, ${formatTimeRange(start, endValue)}`;
}

// "yyyy-MM-dd HH:mm:ss" for a Date, as expected by the API
export const dateToApi = (d) => `${toDateInput(d)} ${toTimeInput(d)}:00`;

export const sortByDate = (list, dir = 'asc') =>
  [...list].sort((a, b) => {
    const da = parseDate(a.bookingDate)?.getTime() || 0;
    const db = parseDate(b.bookingDate)?.getTime() || 0;
    return dir === 'asc' ? da - db : db - da;
  });

export const pluralize = (n, word, plural = `${word}s`) => `${n} ${n === 1 ? word : plural}`;
