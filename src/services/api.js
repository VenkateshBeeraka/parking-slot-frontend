import axios from 'axios';

// Base URL of the API gateway, configured per environment (see .env.example).
// Empty means same origin, e.g. when the app is served behind the gateway or a reverse proxy.
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

const TOKEN_KEY = 'parkpulse_jwt';
const USER_KEY = 'parkpulse_user';

const decodeToken = (token) => {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
};

export const authStorage = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  setToken: (token) => localStorage.setItem(TOKEN_KEY, token),
  removeToken: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
  getUser: () => {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY));
    } catch {
      return null;
    }
  },
  setUser: (user) => localStorage.setItem(USER_KEY, JSON.stringify(user)),
  getClaims: () => {
    const token = localStorage.getItem(TOKEN_KEY);
    return token ? decodeToken(token) : null;
  },
  // True when there is no usable token: missing, unreadable, or past its expiry
  isSessionExpired: () => {
    const claims = authStorage.getClaims();
    if (!claims) return true;
    return typeof claims.exp === 'number' && claims.exp * 1000 <= Date.now();
  }
};

export { decodeToken };

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' }
});

apiClient.interceptors.request.use((config) => {
  const token = authStorage.getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const expireSession = (message) => {
  authStorage.removeToken();
  window.dispatchEvent(new CustomEvent('auth:expired', { detail: { message } }));
};

// Turns the different error shapes the services return (plain strings, Spring ProblemDetail,
// validation maps, default error JSON) into one readable message.
const extractMessage = (error) => {
  const status = error.response?.status;
  const data = error.response?.data;

  if (!error.response) {
    return error.code === 'ECONNABORTED'
      ? 'The server took too long to respond. Please try again.'
      : "We couldn't reach the server. Check your connection and try again.";
  }

  if (typeof data === 'string' && data.trim() && !data.trim().startsWith('<')) return data.trim();

  if (data && typeof data === 'object') {
    if ('status' in data || 'title' in data) {
      if (data.detail && !String(data.detail).startsWith('No static resource')) return data.detail;
      if (data.message) return data.message;
    } else {
      if (data.message) return data.message;
      // Field validation errors: { field: "message", ... }
      const fieldMessages = Object.values(data).filter((v) => typeof v === 'string');
      if (fieldMessages.length) return fieldMessages.join(' ');
    }
  }

  if (status === 403) return "You don't have permission to do that.";
  if (status === 404) return "We couldn't find what you were looking for.";
  if (status >= 500) return 'Something went wrong on our side. Please try again in a moment.';
  return 'Request failed. Please try again.';
};

apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';
    const isAuthCall = url.includes('/login') || url.includes('/register');

    // The services answer 403 both for "not allowed" and for a missing/expired token,
    // so only treat it as a session problem when the stored token is actually unusable.
    if (!isAuthCall && authStorage.getToken() && (status === 401 || (status === 403 && authStorage.isSessionExpired()))) {
      expireSession('Your session has expired. Please sign in again.');
    }

    const err = new Error(extractMessage(error));
    err.status = status;
    return Promise.reject(err);
  }
);

const enc = encodeURIComponent;

// The slot service uses `floornumber` / `divisionNo`; the UI uses `floorNumber` / `division`.
const normalizeSlot = (s) => ({
  ...s,
  floorNumber: s.floorNumber ?? s.floornumber,
  division: s.division ?? s.divisionNo
});

const asList = (data) => (Array.isArray(data) ? data : []);

export const api = {
  auth: {
    login: (credentials) => apiClient.post('/login', credentials),
    register: (userData) => apiClient.post('/register', userData)
  },

  users: {
    getAll: () => apiClient.get('/users').then(asList),
    getById: (id) => apiClient.get(`/users/${id}`),
    update: (id, data) => apiClient.put(`/users/${id}`, data),
    delete: (id) => apiClient.delete(`/users/${id}`),
    getCount: () => apiClient.get('/users/count')
  },

  buildings: {
    getAll: () => apiClient.get('/buildings').then(asList),
    getByPincode: (pin) => apiClient.get(`/buildings/${enc(pin)}`).then(asList),
    searchByName: (name) => apiClient.get(`/buildings/search/${enc(name)}`).then(asList),
    create: (data) => apiClient.post('/building', data),
    update: (bldNum, data) => apiClient.put(`/building/${enc(bldNum)}`, data),
    delete: (bldNum) => apiClient.delete(`/building/${enc(bldNum)}`)
  },

  slots: {
    getByBuilding: (bldNum) => apiClient.get(`/slots/${enc(bldNum)}`).then((d) => asList(d).map(normalizeSlot)),
    create: (bldNum, { slotNumber, floorNumber, division }) =>
      apiClient.post(`/slot/${enc(bldNum)}`, { slotNumber, floornumber: String(floorNumber), divisionNo: division }),
    delete: (bldNum, slotNum) => apiClient.delete(`/slot/${enc(bldNum)}/${enc(slotNum)}`)
  },

  availability: {
    // Slot numbers free for the whole period; times are "yyyy-MM-dd HH:mm:ss"
    getOpenSlots: (bldNum, start, end) =>
      apiClient.get(`/availability/${enc(bldNum)}`, { params: { date: start, endDate: end } }).then(asList),
    setSlotWindow: (bldNum, slotNum, data) => apiClient.post(`/availability/${enc(bldNum)}/${enc(slotNum)}`, data),
    removeSlotWindow: (bldNum, slotNum) => apiClient.delete(`/availability/${enc(bldNum)}/${enc(slotNum)}`)
  },

  bookings: {
    create: (bldNum, slotNum, start, end) =>
      apiClient.post(`/booking/${enc(bldNum)}/${enc(slotNum)}`, {}, { params: { date: start, endDate: end } }),
    cancel: (id) => apiClient.delete(`/booking/${id}`),
    mine: () => apiClient.get('/booking/my').then(asList),
    getAll: () => apiClient.get('/booking/all').then(asList),
    getCount: () => apiClient.get('/booking/count'),
    closeExpired: () => apiClient.post('/booking/close-expired')
  },

  admin: {
    getDashboard: () => apiClient.get('/admin/dashboard')
  },

  notifications: {
    mine: () => apiClient.get('/notifications/my').then(asList),
    getAll: () => apiClient.get('/notifications/recent').then(asList)
  },

  health: {
    check: () => apiClient.get('/actuator/health', { timeout: 5000 })
  }
};

export default api;
