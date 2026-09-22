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

async function request(path, options = {}) {
  const url = `${GATEWAY_URL}${path}`;
  const token = authStorage.getToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers
  };

  const config = {
    ...options,
    headers
  };

  try {
    const response = await fetch(url, config);

    if (response.status === 401) {
      // Token might be expired
      console.warn('Unauthorized request to', path);
    }

    const contentType = response.headers.get('content-type');
    let data;
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      const errorMsg = typeof data === 'object' && data.message 
        ? data.message 
        : typeof data === 'string' && data.length > 0 
          ? data 
          : `HTTP ${response.status}: ${response.statusText}`;
      throw new Error(errorMsg);
    }

    return data;
  } catch (err) {
    console.error(`API Error on ${path}:`, err);
    throw err;
  }
}

export const api = {
  // 1. Auth Service
  auth: {
    login: (credentials) => request('/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    }),
    register: (userData) => request('/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    })
  },

  // 2. User Service
  users: {
    getAll: () => request('/users'),
    getById: (id) => request(`/users/${id}`),
    update: (id, data) => request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
    delete: (id) => request(`/users/${id}`, {
      method: 'DELETE'
    }),
    getCount: () => request('/users/count')
  },

  // 3. Building Service
  buildings: {
    getAll: () => request('/buildings'),
    getByPincode: (pin) => request(`/buildings/${pin}`),
    searchByName: (name) => request(`/buildings/search/${encodeURIComponent(name)}`),
    create: (data) => request('/building', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    update: (bldNum, data) => request(`/building/${bldNum}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
    delete: (bldNum) => request(`/building/${bldNum}`, {
      method: 'DELETE'
    })
  },

  // 4. Slot Service
  slots: {
    getByBuilding: (bldNum) => request(`/slots/${bldNum}`),
    create: (data) => request('/slot', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    update: (bldNum, slotNum, data) => request(`/slot/${bldNum}/${slotNum}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
    delete: (bldNum, slotNum) => request(`/slot/${bldNum}/${slotNum}`, {
      method: 'DELETE'
    })
  },

  // 5. Availability & Booking Service
  availability: {
    getByBuildingAndDate: (bldNum, date) => request(`/availability/${bldNum}/${date}`),
    setAvailability: (data) => request('/availability', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  },
  bookings: {
    create: (bldNum, slotNum, date, data = {}) => request(`/booking/${bldNum}/${slotNum}/${date}`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    cancel: (id) => request(`/booking/${id}`, {
      method: 'DELETE'
    }),
    getById: (id) => request(`/booking/${id}`),
    getAll: () => request('/booking/all'),
    getCount: () => request('/booking/count')
  },

  // 6. Admin Service
  admin: {
    getDashboard: () => request('/admin/dashboard')
  },

  // 7. Notification Service
  notifications: {
    getAll: () => request('/notifications/recent'),
    getStatus: () => request('/notifications/status'),
    sendTest: (data) => request('/notifications/test', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  },

  // 8. Observability & Health
  health: {
    checkGateway: () => request('/actuator/health')
  }
};
