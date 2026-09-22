import React, { useState } from 'react';
import { X, Lock, Mail, User, Shield, Sparkles, AlertCircle } from 'lucide-react';
import { api, authStorage } from '../services/api';

export default function AuthModal({ isOpen, onClose, onLoginSuccess, addToast }) {
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'ADMIN',
    city: 'Hyderabad',
    buildings: []
  });

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleDemoLogin = (email, password) => {
    setFormData(prev => ({ ...prev, email, password }));
    submitLogin({ email, password });
  };

  const submitLogin = async (credentials) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.auth.login(credentials);
      if (res && res.jwt) {
        authStorage.setToken(res.jwt);
        // Decode payload from JWT
        let role = 'ADMIN';
        try {
          const payload = JSON.parse(atob(res.jwt.split('.')[1]));
          if (payload.role) role = payload.role;
        } catch (e) {
          console.error(e);
        }

        const userData = {
          email: credentials.email,
          role: role,
          name: credentials.email.split('@')[0],
          buildings: res.listBuildings || []
        };
        authStorage.setUser(userData);
        addToast('Successfully authenticated via API Gateway!', 'success');
        onLoginSuccess(userData);
        onClose();
      } else {
        throw new Error('Invalid response from Auth Service');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check credentials.');
      addToast(err.message || 'Authentication error', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (isRegister) {
      try {
        await api.auth.register({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role,
          city: formData.city,
          buildings: []
        });
        addToast('Registration successful! Logging you in...', 'success');
        // Immediately login
        await submitLogin({ email: formData.email, password: formData.password });
      } catch (err) {
        setError(err.message || 'Registration failed.');
        addToast(err.message || 'Registration failed', 'error');
        setLoading(false);
      }
    } else {
      await submitLogin({ email: formData.email, password: formData.password });
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem' }}>{isRegister ? 'Create Account' : 'Welcome Back'}</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              Stateless JWT authentication with Spring Cloud Gateway
            </p>
          </div>
          <button 
            onClick={onClose} 
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Demo Fast Fill */}
        {!isRegister && (
          <div style={{
            background: 'rgba(99, 102, 241, 0.1)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            borderRadius: 'var(--radius-md)',
            padding: '0.85rem',
            marginBottom: '1.25rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600, color: '#A5B4FC', marginBottom: '0.5rem' }}>
              <Sparkles size={16} />
              <span>Quick Test Credentials</span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button 
                type="button" 
                className="btn btn-secondary btn-sm"
                onClick={() => handleDemoLogin('admin@parking.com', 'admin123')}
                disabled={loading}
                id="btn-demo-admin"
              >
                Admin (admin@parking.com)
              </button>
            </div>
          </div>
        )}

        {error && (
          <div style={{
            background: 'var(--color-danger-bg)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '0.75rem 1rem',
            color: 'var(--color-danger)',
            fontSize: '0.85rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {isRegister && (
            <>
              <div className="input-group">
                <label className="input-label">Full Name</label>
                <input 
                  type="text" 
                  name="name"
                  className="input-field"
                  placeholder="e.g. John Doe"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="input-group">
                  <label className="input-label">Role</label>
                  <select 
                    name="role"
                    className="input-field"
                    value={formData.role}
                    onChange={handleChange}
                  >
                    <option value="ADMIN">ADMIN</option>
                    <option value="USER">USER</option>
                  </select>
                </div>

                <div className="input-group">
                  <label className="input-label">City</label>
                  <input 
                    type="text" 
                    name="city"
                    className="input-field"
                    placeholder="e.g. Hyderabad"
                    value={formData.city}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
            </>
          )}

          <div className="input-group">
            <label className="input-label">Email Address</label>
            <input 
              type="email" 
              name="email"
              className="input-field"
              placeholder="user@example.com"
              value={formData.email}
              onChange={handleChange}
              required
              id="input-email"
            />
          </div>

          <div className="input-group">
            <label className="input-label">Password</label>
            <input 
              type="password" 
              name="password"
              className="input-field"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              required
              id="input-password"
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', marginTop: '0.5rem' }}
            disabled={loading}
            id="btn-submit-auth"
          >
            {loading ? 'Authenticating...' : isRegister ? 'Register & Sign In' : 'Sign In'}
          </button>
        </form>

        {/* Toggle Mode */}
        <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          {isRegister ? 'Already have an account? ' : "Don't have an account yet? "}
          <button
            type="button"
            onClick={() => { setIsRegister(!isRegister); setError(null); }}
            style={{ background: 'transparent', border: 'none', color: 'var(--accent-primary)', fontWeight: 600, cursor: 'pointer' }}
          >
            {isRegister ? 'Sign In' : 'Register now'}
          </button>
        </div>
      </div>
    </div>
  );
}
