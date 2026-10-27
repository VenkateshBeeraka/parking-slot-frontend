import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X, WifiOff, ShieldAlert } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import AuthPage from './components/AuthPage';
import OverviewView from './components/OverviewView';
import BookingView from './components/BookingView';
import MyBookingsView from './components/MyBookingsView';
import BuildingsView from './components/BuildingsView';
import SlotsView from './components/SlotsView';
import NotificationsView from './components/NotificationsView';
import AccountView from './components/AccountView';
import ReservationsView from './components/ReservationsView';
import UsersView from './components/UsersView';
import { ConfirmProvider, EmptyState } from './components/ui';
import { api, authStorage, decodeToken } from './services/api';
import { useRoute, navigate } from './lib/router';
import { isAdmin, parseDate } from './lib/format';

const TOAST_DURATION = 4500;
const TOAST_ICONS = { success: CheckCircle2, error: XCircle, warning: AlertTriangle, info: Info };

const PAGES = {
  overview: { title: 'Overview', component: OverviewView },
  book: { title: 'Book parking', component: BookingView },
  bookings: { title: 'My bookings', component: MyBookingsView },
  buildings: { title: 'Buildings', component: BuildingsView },
  notifications: { title: 'Notifications', component: NotificationsView },
  account: { title: 'Account', component: AccountView },
  slots: { title: 'Parking slots', section: 'Manage', component: SlotsView },
  reservations: { title: 'Reservations', section: 'Manage', admin: true, component: ReservationsView },
  users: { title: 'Users', section: 'Manage', admin: true, component: UsersView }
};

const safeGet = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const safeSet = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // storage unavailable
  }
};

const getInitialTheme = () => {
  const saved = safeGet('parkpulse_theme');
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
};

const getInitialUser = () => {
  const user = authStorage.getUser();
  if (!user || authStorage.isSessionExpired()) {
    authStorage.removeToken();
    return null;
  }
  return user;
};

const seenKey = (user) => `parkpulse_notifications_seen_${user?.id ?? 'anon'}`;

export default function App() {
  const { path, params } = useRoute();
  const [user, setUser] = useState(getInitialUser);
  const [authNotice, setAuthNotice] = useState(null);
  const [isOnline, setIsOnline] = useState(true);
  const [toasts, setToasts] = useState([]);
  const [theme, setTheme] = useState(getInitialTheme);
  const [collapsed, setCollapsed] = useState(() => safeGet('parkpulse_sidebar') === 'collapsed');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [lastSeen, setLastSeen] = useState(0);

  const admin = isAdmin(user);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    safeSet('parkpulse_theme', theme);
  }, [theme]);

  useEffect(() => {
    safeSet('parkpulse_sidebar', collapsed ? 'collapsed' : 'expanded');
  }, [collapsed]);

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.map(t => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 240);
  }, []);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev.slice(-3), { id, message, type }]);
    setTimeout(() => dismissToast(id), TOAST_DURATION);
  }, [dismissToast]);

  // Connectivity: only surfaced when something is wrong
  useEffect(() => {
    const check = () => api.health.check().then(() => setIsOnline(true)).catch(() => setIsOnline(false));
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, []);

  const refreshNotifications = useCallback(() => {
    if (!user) return Promise.resolve([]);
    return api.notifications.mine()
      .then(list => {
        setNotifications(list);
        return list;
      })
      .catch(() => []);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setLastSeen(Number(safeGet(seenKey(user))) || 0);
    refreshNotifications();
    const interval = setInterval(refreshNotifications, 30000);
    return () => clearInterval(interval);
  }, [user, refreshNotifications]);

  const markNotificationsSeen = useCallback(() => {
    const now = Date.now();
    setLastSeen(now);
    safeSet(seenKey(user), String(now));
  }, [user]);

  const unreadCount = notifications.filter(n => (parseDate(n.timestamp)?.getTime() || 0) > lastSeen).length;

  // Session expiry signalled by the API client
  useEffect(() => {
    const handleExpired = (e) => {
      setUser(null);
      setAuthNotice(e.detail?.message || 'Your session has expired. Please sign in again.');
    };
    window.addEventListener('auth:expired', handleExpired);
    return () => window.removeEventListener('auth:expired', handleExpired);
  }, []);

  // Sign out automatically when the token's lifetime ends while the app is open
  useEffect(() => {
    if (!user) return;
    const exp = authStorage.getClaims()?.exp;
    if (!exp) return;
    const ms = exp * 1000 - Date.now();
    const t = setTimeout(() => {
      authStorage.removeToken();
      setUser(null);
      setAuthNotice('Your session has expired. Please sign in again.');
    }, Math.max(0, Math.min(ms, 2147483000)));
    return () => clearTimeout(t);
  }, [user]);

  // Close the mobile drawer on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [path]);

  const handleAuthenticated = async ({ jwt, email }) => {
    const claims = decodeToken(jwt) || {};
    authStorage.setToken(jwt);
    let profile = null;
    try {
      if (claims.id != null) profile = await api.users.getById(claims.id);
    } catch {
      // Fall back to what the token tells us
    }
    const nextUser = {
      id: claims.id,
      email: profile?.email || email,
      name: profile?.name || email.split('@')[0],
      city: profile?.city || '',
      role: profile?.role || claims.role || 'USER'
    };
    authStorage.setUser(nextUser);
    setAuthNotice(null);
    setUser(nextUser);
  };

  const handleUserUpdate = (patch) => {
    setUser(prev => {
      const next = { ...prev, ...patch };
      authStorage.setUser(next);
      return next;
    });
  };

  const handleLogout = () => {
    authStorage.removeToken();
    setUser(null);
    setNotifications([]);
    setAuthNotice(null);
    navigate('overview', null, { replace: true });
    addToast('You have been signed out.', 'info');
  };

  const toastLayer = (
    <div className="toast-container" aria-live="polite">
      {toasts.map(t => {
        const Icon = TOAST_ICONS[t.type] || Info;
        return (
          <div key={t.id} className={`toast toast-${t.type} ${t.leaving ? 'leaving' : ''}`} role="status">
            <Icon size={18} className="toast-icon" />
            <span>{t.message}</span>
            <button className="toast-close" onClick={() => dismissToast(t.id)} aria-label="Dismiss">
              <X size={15} />
            </button>
            <span className="toast-progress" style={{ animationDuration: `${TOAST_DURATION}ms` }} />
          </div>
        );
      })}
    </div>
  );

  const offlineBanner = !isOnline && (
    <div className="offline-banner" role="status">
      <WifiOff size={15} />
      <span>We can't reach the server right now. Some information may be out of date — retrying automatically.</span>
    </div>
  );

  if (!user) {
    return (
      <>
        {offlineBanner}
        <AuthPage
          notice={authNotice}
          onAuthenticated={handleAuthenticated}
          addToast={addToast}
          theme={theme}
          onToggleTheme={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))}
        />
        {toastLayer}
      </>
    );
  }

  const pageKey = PAGES[path] ? path : 'overview';
  const page = PAGES[pageKey];
  const blocked = page.admin && !admin;
  const Page = page.component;
  // Members reach the slot list from a building, so show it under Buildings for them
  const memberSlots = pageKey === 'slots' && !admin;
  const activePath = memberSlots ? 'buildings' : pageKey;
  const crumbs = memberSlots
    ? [{ label: 'Buildings', path: 'buildings' }, { label: params.building || page.title }]
    : [...(page.section ? [{ label: page.section }] : []), { label: page.title, path: pageKey }];

  return (
    <ConfirmProvider>
      <div className={`shell ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        <Sidebar
          activePath={activePath}
          user={user}
          admin={admin}
          unreadCount={unreadCount}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed(c => !c)}
          onNavigate={() => setMobileOpen(false)}
        />
        <div className="sidebar-backdrop" onClick={() => setMobileOpen(false)} />

        <div className="main-area">
          <Topbar
            crumbs={crumbs}
            user={user}
            admin={admin}
            unreadCount={unreadCount}
            theme={theme}
            onToggleTheme={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))}
            onOpenMenu={() => setMobileOpen(true)}
            onLogout={handleLogout}
          />
          {offlineBanner}

          <main className="content">
            {/* Keyed so each page change replays the entrance animation */}
            <div className="page" key={pageKey}>
              {blocked ? (
                <div className="card" style={{ maxWidth: 560, margin: '3rem auto' }}>
                  <EmptyState
                    icon={<ShieldAlert size={28} />}
                    title="You don't have access to this page"
                    action={<a className="btn btn-primary" href="#/overview">Back to overview</a>}
                  >
                    This area is only available to administrators.
                  </EmptyState>
                </div>
              ) : (
                <Page
                  user={user}
                  admin={admin}
                  params={params}
                  addToast={addToast}
                  notifications={notifications}
                  lastSeen={lastSeen}
                  refreshNotifications={refreshNotifications}
                  markNotificationsSeen={markNotificationsSeen}
                  onUserUpdate={handleUserUpdate}
                  onLogout={handleLogout}
                />
              )}
            </div>
          </main>
        </div>
      </div>
      {toastLayer}
    </ConfirmProvider>
  );
}
