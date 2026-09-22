import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle2, XCircle, RefreshCw, MessageSquare, Radio } from 'lucide-react';
import { api } from '../services/api';

export default function NotificationsView({ addToast }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const data = await api.notifications.getAll();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn(err);
      // Fallback sample notification if notification service returns empty
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  return (
    <div>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>
            System <span className="gradient-text">Notifications & Alerts</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Event-driven messaging dispatched asynchronously through Apache Kafka.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.8rem',
            color: 'var(--color-success)',
            background: 'var(--color-success-bg)',
            padding: '0.4rem 0.75rem',
            borderRadius: 'var(--radius-full)',
            border: '1px solid rgba(16, 185, 129, 0.3)'
          }}>
            <Radio size={14} className="animate-pulse" />
            <span>Kafka Consumer Active</span>
          </div>

          <button className="btn btn-secondary" onClick={fetchNotifications} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          Reading event logs from Notification Service...
        </div>
      ) : notifications.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3.5rem' }}>
          <Bell size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
          <h3>No Notifications Yet</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', maxWidth: '480px', margin: '0.5rem auto 0 auto' }}>
            When a user books or cancels a parking slot, the Availability Service produces an event to Kafka (<code>booking-events</code> topic), which is consumed and logged here.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {notifications.map((n, idx) => {
            const isConfirmed = n.eventType === 'BOOKING_CONFIRMED';
            return (
              <div 
                key={n.id || idx} 
                className="glass-card" 
                style={{
                  padding: '1.25rem 1.5rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '1rem',
                  borderLeft: `4px solid ${isConfirmed ? 'var(--color-success)' : 'var(--color-warning)'}`
                }}
              >
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: isConfirmed ? 'var(--color-success-bg)' : 'var(--color-warning-bg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isConfirmed ? 'var(--color-success)' : 'var(--color-warning)',
                  flexShrink: 0
                }}>
                  {isConfirmed ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <strong style={{ fontSize: '1rem' }}>{n.eventType || 'SYSTEM_EVENT'}</strong>
                      <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>Kafka</span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {n.timestamp ? new Date(n.timestamp).toLocaleString() : 'Just now'}
                    </span>
                  </div>

                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    {n.message || `Booking #${n.bookingId} processed for User #${n.userId}`}
                  </p>

                  <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.6rem' }}>
                    {n.buildingNumber && <span>Building: <strong style={{ color: 'var(--text-primary)' }}>{n.buildingNumber}</strong></span>}
                    {n.slotNumber && <span>Slot: <strong style={{ color: 'var(--text-primary)' }}>{n.slotNumber}</strong></span>}
                    {n.vehicleNumber && <span>Vehicle: <strong style={{ color: 'var(--text-primary)' }}>{n.vehicleNumber}</strong></span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
