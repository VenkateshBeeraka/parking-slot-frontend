import React from 'react';
import {
  LayoutDashboard,
  CalendarPlus,
  CalendarCheck,
  Building2,
  Bell,
  SquareParking,
  ClipboardList,
  Users,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { buildHref } from '../lib/router';
import { initials } from './ui';

export const NAV_SECTIONS = [
  {
    items: [
      { path: 'overview', label: 'Overview', icon: LayoutDashboard },
      { path: 'book', label: 'Book parking', icon: CalendarPlus },
      { path: 'bookings', label: 'My bookings', icon: CalendarCheck },
      { path: 'buildings', label: 'Buildings', icon: Building2 },
      { path: 'notifications', label: 'Notifications', icon: Bell, badge: 'notifications' }
    ]
  },
  {
    label: 'Manage',
    admin: true,
    items: [
      { path: 'slots', label: 'Parking slots', icon: SquareParking },
      { path: 'reservations', label: 'Reservations', icon: ClipboardList },
      { path: 'users', label: 'Users', icon: Users }
    ]
  }
];

export default function Sidebar({ activePath, user, admin, unreadCount, collapsed, onToggleCollapse, onNavigate }) {
  let index = 0;

  return (
    <aside className="sidebar" aria-label="Main navigation">
      <div className="sidebar-brand">
        <a className="brand" href={buildHref('overview')} onClick={onNavigate} aria-label="ParkPulse home">
          <span className="brand-mark">P</span>
          <span className="brand-name">ParkPulse</span>
        </a>
      </div>

      <nav className="sidebar-nav">
        {NAV_SECTIONS.filter(s => !s.admin || admin).map((section, si) => (
          <React.Fragment key={si}>
            {section.label && <div className="nav-section-label">{section.label}</div>}
            {section.items.map(item => {
              const Icon = item.icon;
              const active = activePath === item.path;
              const badge = item.badge === 'notifications' && unreadCount > 0 ? unreadCount : null;
              const i = index++;
              return (
                <a
                  key={item.path}
                  href={buildHref(item.path)}
                  className={`nav-item ${active ? 'active' : ''}`}
                  aria-current={active ? 'page' : undefined}
                  title={collapsed ? item.label : undefined}
                  onClick={onNavigate}
                  style={{ animation: `fadeSlide 360ms var(--ease-out) ${i * 30}ms backwards` }}
                >
                  <Icon size={18} />
                  <span className="nav-label">{item.label}</span>
                  {badge && <span className="nav-badge" key={badge}>{badge > 99 ? '99+' : badge}</span>}
                </a>
              );
            })}
          </React.Fragment>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button
          type="button"
          className="nav-item collapse-toggle"
          onClick={onToggleCollapse}
          title={collapsed ? 'Expand sidebar' : undefined}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{ marginBottom: '0.35rem' }}
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          <span className="nav-label">Collapse</span>
        </button>
        <a
          href={buildHref('account')}
          className={`sidebar-user ${activePath === 'account' ? 'active' : ''}`}
          onClick={onNavigate}
          title={collapsed ? 'Account' : undefined}
        >
          <span className="avatar">{initials(user.name || user.email)}</span>
          <span className="sidebar-user-text">
            <span className="sidebar-user-name" style={{ display: 'block' }}>{user.name || user.email}</span>
            <span className="sidebar-user-email" style={{ display: 'block' }}>{admin ? 'Administrator' : user.email}</span>
          </span>
        </a>
      </div>
    </aside>
  );
}
