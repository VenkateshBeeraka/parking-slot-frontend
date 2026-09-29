import axios from 'axios';

const GATEWAY_URL = 'http://localhost:8765';

export const authStorage = {
  getToken: () => localStorage.getItem('parkpulse_jwt'),
  setToken: (token) => localStorage.setItem('parkpulse_jwt', token),
  removeToken: () => {
    localStorage.removeItem('parkpulse_jwt');
    localStorage.removeItem('parkpulse_user');
  },
  getUser: () => {
    try {
      return JSON.parse(localStorage.getItem('parkpulse_user'));
    } catch {
      return null;
    }
  },
  setUser: (user) => localStorage.setItem('parkpulse_user', JSON.stringify(user))
};

// 1. Create Axios Instance
export const apiClient = axios.create({
  baseURL: GATEWAY_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 2. Request Interceptor: Inject JWT token into Authorization header
apiClient.interceptors.request.use(
  (config) => {
    const token = authStorage.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 3. Response Interceptor: Extract data and handle errors centrally
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';

    // If 401 Unauthorized or 403 Forbidden occurs with an existing token on a protected endpoint,
    // clear the stale credentials and notify the application to prompt the user to sign in
    if ((status === 401 || status === 403) && !url.includes('/login') && !url.includes('/register')) {
      const existingToken = authStorage.getToken();
      if (existingToken) {
        console.warn(`[Axios] Session invalid or expired (${status}) on ${url}. Clearing stale token.`);
        authStorage.removeToken();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('auth:expired', {
              detail: {
                status,
                url,
                message: status === 403
                  ? 'Your session has expired or permissions were denied. Please sign in again.'
                  : 'Your session has expired. Please sign in again.'
              }
            })
          );
        }
      }
    }

    const message =
      error.response?.data?.message ||
      (typeof error.response?.data === 'string' && error.response.data.trim() ? error.response.data : null) ||
      error.message ||
      'Request failed';

    return Promise.reject(new Error(message));
  }
);

// Helper for any flexible manual calls
export async function request(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  let data = options.data !== undefined ? options.data : options.body;
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      // keep raw string if not JSON
    }
  }

  return apiClient.request({
    url: path,
    method,
    data,
    headers: options.headers,
    params: options.params
  });
}

export const api = {
  // 1. Auth Service
  auth: {
    login: (credentials) => apiClient.post('/login', credentials),
    register: (userData) => apiClient.post('/register', userData)
  },

  // 2. User Service
  users: {
    getAll: () => apiClient.get('/users'),
    getById: (id) => apiClient.get(`/users/${id}`),
    update: (id, data) => apiClient.put(`/users/${id}`, data),
    delete: (id) => apiClient.delete(`/users/${id}`),
    getCount: () => apiClient.get('/users/count')
  },

  // 3. Building Service
  buildings: {
    getAll: () => apiClient.get('/buildings'),
    getByPincode: (pin) => apiClient.get(`/buildings/${pin}`),
    searchByName: (name) => apiClient.get(`/buildings/search/${encodeURIComponent(name)}`),
    create: (data) => apiClient.post('/building', data),
    update: (bldNum, data) => apiClient.put(`/building/${bldNum}`, data),
    delete: (bldNum) => apiClient.delete(`/building/${bldNum}`)
  },

  // 4. Slot Service
  slots: {
    getByBuilding: (bldNum) => apiClient.get(`/slots/${bldNum}`),
    create: (data) => apiClient.post('/slot', data),
    update: (bldNum, slotNum, data) => apiClient.put(`/slot/${bldNum}/${slotNum}`, data),
    delete: (bldNum, slotNum) => apiClient.delete(`/slot/${bldNum}/${slotNum}`)
  },

  // 5. Availability & Booking Service
  availability: {
    getByBuildingAndDate: (bldNum, dateTime) => 
      apiClient.get(`/availability/${encodeURIComponent(bldNum)}`, {
        params: { date: dateTime }
      }),
    setSlotAvailability: (bldNum, slotNum, data) => 
      apiClient.post(`/availability/${encodeURIComponent(bldNum)}/${encodeURIComponent(slotNum)}`, data),
    removeSlotAvailability: (bldNum, slotNum) => 
      apiClient.delete(`/availability/${encodeURIComponent(bldNum)}/${encodeURIComponent(slotNum)}`)
  },
  bookings: {
    create: (bldNum, slotNum, dateTime, data = {}) => 
      apiClient.post(`/booking/${encodeURIComponent(bldNum)}/${encodeURIComponent(slotNum)}`, data, {
        params: { date: dateTime }
      }),
    cancel: (id) => apiClient.delete(`/booking/${id}`),
    getById: (id) => apiClient.get(`/booking/${id}`),
    getAll: () => apiClient.get('/booking/all'),
    getCount: () => apiClient.get('/booking/count'),
    closeExpired: () => apiClient.post('/booking/close-expired')
  },

  // 6. Admin Service
  admin: {
    getDashboard: () => apiClient.get('/admin/dashboard')
  },

  // 7. Notification Service
  notifications: {
    getAll: () => apiClient.get('/notifications/recent'),
    getStatus: () => apiClient.get('/notifications/status'),
    sendTest: (data) => apiClient.post('/notifications/test', data)
  },

  // 8. Observability & Health
  health: {
    checkGateway: () => apiClient.get('/actuator/health')
  }
};

export default api;
