import React, { useEffect, useRef, useState } from 'react';
import { Menu, Bell, Sun, Moon, ChevronDown, ChevronRight, UserRound, CalendarCheck, LogOut } from 'lucide-react';
import { buildHref, navigate } from '../lib/router';
import { initials } from './ui';

export default function Topbar({ crumbs, user, admin, unreadCount, theme, onToggleTheme, onOpenMenu, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e) => {
      if (!menuRef.current?.contains(e.target)) setMenuOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const go = (path) => {
    setMenuOpen(false);
    navigate(path);
  };

  return (
    <header className="topbar">
      <button className="btn btn-ghost btn-icon menu-toggle" onClick={onOpenMenu} aria-label="Open navigation">
        <Menu size={20} />
      </button>

      <nav className="breadcrumb" aria-label="Breadcrumb">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <React.Fragment key={`${c.label}-${i}`}>
              {i > 0 && <ChevronRight size={14} />}
              {last ? (
                <span className="current" key={c.label}>{c.label}</span>
              ) : c.path ? (
                <a href={buildHref(c.path)} className="secondary">{c.label}</a>
              ) : (
                <span>{c.label}</span>
              )}
            </React.Fragment>
          );
        })}
      </nav>

      <div className="topbar-actions">
        <button
          className="btn btn-ghost btn-icon"
          onClick={onToggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
        >
          <span key={theme} style={{ display: 'inline-flex', animation: 'popIn 300ms var(--ease-spring)' }}>
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </span>
        </button>

        <a
          href={buildHref('notifications')}
          className="btn btn-ghost btn-icon"
          style={{ position: 'relative' }}
          aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'}
          title="Notifications"
        >
          <Bell size={18} />
          {unreadCount > 0 && <span className="icon-dot" key={unreadCount} />}
        </a>

        <div style={{ position: 'relative', marginLeft: '0.25rem' }} ref={menuRef}>
          <button
            className="avatar-btn"
            onClick={() => setMenuOpen(o => !o)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="Account menu"
            id="btn-user-menu"
          >
            <span className="avatar">{initials(user.name || user.email)}</span>
            <ChevronDown size={14} style={{ marginRight: 4, transition: 'transform 200ms', transform: menuOpen ? 'rotate(180deg)' : 'none' }} />
          </button>

          {menuOpen && (
            <div className="dropdown" role="menu">
              <div className="dropdown-header">
                <div className="strong text-sm">{user.name || user.email}</div>
                <div className="text-xs muted" style={{ marginTop: 2 }}>{user.email}</div>
                <span className={`badge ${admin ? 'badge-violet' : 'badge-success'}`} style={{ marginTop: '0.55rem' }}>
                  {admin ? 'Administrator' : 'Member'}
                </span>
              </div>
              <button className="dropdown-item" role="menuitem" onClick={() => go('account')}>
                <UserRound size={16} /> Account settings
              </button>
              <button className="dropdown-item" role="menuitem" onClick={() => go('bookings')}>
                <CalendarCheck size={16} /> My bookings
              </button>
              <button
                className="dropdown-item danger"
                role="menuitem"
                onClick={() => { setMenuOpen(false); onLogout(); }}
                id="btn-logout"
              >
                <LogOut size={16} /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
