import React from 'react';
import { Lock, LogIn, Sparkles } from 'lucide-react';

export default function SignInPrompt({ onLoginClick, title = 'Authentication Required', message }) {
  return (
    <div className="glass-card" style={{
      textAlign: 'center',
      padding: '3.5rem 2rem',
      maxWidth: '620px',
      margin: '2rem auto',
      border: '1px solid rgba(99, 102, 241, 0.25)',
      background: 'rgba(17, 24, 39, 0.85)',
      boxShadow: 'var(--shadow-card)'
    }}>
      <div style={{
        width: '64px',
        height: '64px',
        borderRadius: '50%',
        background: 'rgba(99, 102, 241, 0.15)',
        border: '1px solid rgba(99, 102, 241, 0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 1.5rem auto',
        boxShadow: 'var(--accent-glow)'
      }}>
        <Lock size={30} color="#818CF8" />
      </div>

      <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.75rem' }}>
        {title}
      </h2>

      <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '2rem', fontSize: '0.95rem' }}>
        {message || 'This section requires an active authentication session with Spring Cloud Gateway. Please sign in to view and manage live data.'}
      </p>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <button 
          className="btn btn-primary"
          onClick={onLoginClick}
          style={{ padding: '0.85rem 2rem', fontSize: '1rem' }}
          id="btn-prompt-signin"
        >
          <LogIn size={18} />
          <span>Sign In to Continue</span>
        </button>
      </div>

      <div style={{
        marginTop: '2rem',
        padding: '0.85rem',
        background: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 'var(--radius-md)',
        border: '1px dashed var(--border-subtle)',
        fontSize: '0.82rem',
        color: 'var(--text-muted)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem'
      }}>
        <Sparkles size={16} color="#A5B4FC" />
        <span>Quick Test Admin: <strong>admin@parking.com</strong> / <strong>admin123</strong></span>
      </div>
    </div>
  );
}
