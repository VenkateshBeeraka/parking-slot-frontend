import React from 'react';
import { 
  Car, 
  Building2, 
  CalendarCheck, 
  ShieldAlert, 
  Bell, 
  LayoutDashboard, 
  LogIn, 
  LogOut, 
  Activity,
  UserCheck
} from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, user, onLoginClick, onLogout, isHealthy, notificationCount }) {
  return (
    <header style={{
      borderBottom: '1px solid var(--border-subtle)',
      background: 'rgba(11, 15, 25, 0.85)',
      backdropFilter: 'blur(16px)',
      position: 'sticky',
      top: 0,
      zIndex: 50
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '0.85rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem'
      }}>
        {/* Brand */}
        <div 
          onClick={() => setActiveTab('dashboard')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}
        >
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--accent-gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--accent-glow)'
          }}>
            <Car size={24} color="#FFF" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
                Park<span className="gradient-text">Pulse</span>
              </span>
              <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>Cloud Gateway</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <span style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: isHealthy ? 'var(--color-success)' : 'var(--color-danger)',
                boxShadow: isHealthy ? '0 0 8px var(--color-success)' : 'none'
              }}></span>
              <span>{isHealthy ? 'Gateway Connected (8765)' : 'Connecting...'}</span>
            </div>
          </div>
        </div>

        {/* Nav Tabs */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(255, 255, 255, 0.03)', padding: '0.35rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
          <button 
            className={`btn btn-sm ${activeTab === 'dashboard' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('dashboard')}
            id="nav-dashboard-tab"
          >
            <LayoutDashboard size={16} />
            <span>Dashboard</span>
          </button>

          <button 
            className={`btn btn-sm ${activeTab === 'buildings' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('buildings')}
            id="nav-buildings-tab"
          >
            <Building2 size={16} />
            <span>Buildings</span>
          </button>

          <button 
            className={`btn btn-sm ${activeTab === 'slots' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('slots')}
            id="nav-slots-tab"
          >
            <Car size={16} />
            <span>Parking Slots</span>
          </button>

          <button 
            className={`btn btn-sm ${activeTab === 'booking' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('booking')}
            id="nav-booking-tab"
          >
            <CalendarCheck size={16} />
            <span>Bookings</span>
          </button>

          <button 
            className={`btn btn-sm ${activeTab === 'admin' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('admin')}
            id="nav-admin-tab"
          >
            <ShieldAlert size={16} />
            <span>Admin</span>
          </button>

          <button 
            className={`btn btn-sm ${activeTab === 'notifications' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('notifications')}
            id="nav-notifications-tab"
            style={{ position: 'relative' }}
          >
            <Bell size={16} />
            <span>Alerts</span>
            {notificationCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                background: 'var(--color-danger)',
                color: '#FFF',
                fontSize: '0.65rem',
                fontWeight: 700,
                borderRadius: 'var(--radius-full)',
                padding: '0.1rem 0.35rem',
                minWidth: '16px',
                textAlign: 'center'
              }}>
                {notificationCount}
              </span>
            )}
          </button>
        </nav>

        {/* User Status / Login */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{user.name || user.email}</div>
                <span className={`badge ${user.role === 'ADMIN' ? 'badge-danger' : 'badge-success'}`}>
                  {user.role || 'USER'}
                </span>
              </div>
              <button 
                className="btn btn-secondary btn-sm" 
                onClick={onLogout}
                title="Sign out"
                id="btn-logout"
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <button 
              className="btn btn-primary btn-sm" 
              onClick={onLoginClick}
              id="btn-open-login"
            >
              <LogIn size={16} />
              <span>Sign In / Demo</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
