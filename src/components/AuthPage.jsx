import React, { useState } from 'react';
import {
  Lock,
  Mail,
  User,
  MapPin,
  Eye,
  EyeOff,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Car,
  Clock,
  CalendarCheck,
  Bell,
  Check,
  Sun,
  Moon
} from 'lucide-react';
import { api } from '../services/api';
import { Segmented, Spinner } from './ui';

// Mirrors the auth service's password rule
const PASSWORD_PATTERN = /^(?=.*\d)(?=.*[A-Za-z])[A-Za-z0-9]{8,20}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const FEATURES = [
  { icon: Clock, title: 'Live availability', text: 'See which bays are open for the exact time you need.' },
  { icon: CalendarCheck, title: 'Reserve in seconds', text: 'Pick a building, a time and a bay — done.' },
  { icon: Bell, title: 'Instant confirmations', text: 'Get notified the moment your bay is reserved.' }
];

const LOT = ['taken', 'taken', 'open', 'taken', 'empty', 'taken'];

const EMPTY_FORM = { name: '', email: '', password: '', city: '' };

export default function AuthPage({ notice, onAuthenticated, addToast, theme, onToggleTheme }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState(EMPTY_FORM);
  const [touched, setTouched] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isRegister = mode === 'register';

  const set = (key) => (e) => {
    setForm(prev => ({ ...prev, [key]: e.target.value }));
    if (error) setError(null);
  };
  const touch = (key) => () => setTouched(prev => ({ ...prev, [key]: true }));

  const rules = [
    { ok: form.password.length >= 8 && form.password.length <= 20, label: '8–20 characters' },
    { ok: /[A-Za-z]/.test(form.password) && /\d/.test(form.password), label: 'A letter and a number' },
    { ok: form.password.length > 0 && /^[A-Za-z0-9]+$/.test(form.password), label: 'Letters and numbers only' }
  ];

  const fieldErrors = {
    name: isRegister && !form.name.trim() ? 'Enter your name' : null,
    email: !EMAIL_PATTERN.test(form.email.trim()) ? 'Enter a valid email address' : null,
    password: !form.password
      ? 'Enter your password'
      : isRegister && !PASSWORD_PATTERN.test(form.password)
        ? 'Password does not meet the requirements'
        : null,
    city: isRegister && !form.city.trim() ? 'Enter your city' : null
  };
  const visibleError = (key) => (touched[key] ? fieldErrors[key] : null);

  const switchMode = (next) => {
    setMode(next);
    setError(null);
    setTouched({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const keys = isRegister ? ['name', 'email', 'password', 'city'] : ['email', 'password'];
    setTouched(Object.fromEntries(keys.map(k => [k, true])));
    if (keys.some(k => fieldErrors[k])) return;

    setLoading(true);
    setError(null);
    const email = form.email.trim();

    try {
      if (isRegister) {
        await api.auth.register({
          name: form.name.trim(),
          email,
          password: form.password,
          city: form.city.trim()
        });
      }

      let res;
      try {
        res = await api.auth.login({ email, password: form.password });
      } catch (err) {
        // Don't reveal whether the email exists
        throw new Error(err.status && err.status < 500 ? 'Incorrect email or password.' : err.message);
      }
      if (!res?.jwt) throw new Error('Sign-in failed. Please try again.');

      await onAuthenticated({ jwt: res.jwt, email });
      if (isRegister) addToast('Your account is ready. Welcome to ParkPulse!', 'success');
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <aside className="auth-aside">
        <div className="brand" style={{ cursor: 'default' }}>
          <span className="brand-mark">P</span>
          <span className="brand-name">ParkPulse</span>
        </div>

        <div style={{ marginTop: 'auto', paddingTop: '3rem' }}>
          <h1 className="auth-headline" style={{ animation: 'riseIn 520ms var(--ease-out) backwards' }}>
            Parking that's ready before you arrive.
          </h1>
          <p className="auth-lede" style={{ animation: 'riseIn 520ms var(--ease-out) 80ms backwards' }}>
            Find an open bay, reserve it for the time you need, and drive straight in.
          </p>
          <div className="auth-features">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="auth-feature" style={{ '--i': i }}>
                  <span className="auth-feature-icon"><Icon size={18} /></span>
                  <div>
                    <strong>{f.title}</strong>
                    <span>{f.text}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lot" aria-hidden="true">
          {LOT.map((state, i) => (
            <div key={i} className={`bay ${state}`} style={{ '--i': i }}>
              {state === 'taken' && <Car size={22} />}
              {state === 'open' && 'OPEN'}
            </div>
          ))}
        </div>
      </aside>

      <main className="auth-main">
        <div className="auth-card">
          <div className="row between" style={{ marginBottom: '0.5rem' }}>
            <div className="brand auth-mobile-brand" style={{ marginBottom: 0 }}>
              <span className="brand-mark">P</span>
              <span className="brand-name">ParkPulse</span>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-icon"
              onClick={onToggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
              style={{ marginLeft: 'auto' }}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>

          <h2 style={{ fontSize: '1.6rem', fontWeight: 700, marginTop: '1rem' }}>
            {isRegister ? 'Create your account' : 'Welcome back'}
          </h2>
          <p className="secondary" style={{ marginTop: '0.35rem' }}>
            {isRegister ? 'Start reserving parking in under a minute.' : 'Sign in to manage your parking.'}
          </p>

          <div style={{ margin: '1.5rem 0' }}>
            <Segmented
              value={mode}
              onChange={switchMode}
              options={[{ value: 'login', label: 'Sign in' }, { value: 'register', label: 'Create account' }]}
            />
          </div>

          {notice && !error && (
            <div className="callout callout-warning" style={{ marginBottom: '1rem' }}>
              <AlertTriangle size={16} />
              <span>{notice}</span>
            </div>
          )}

          {error && (
            <div className="callout callout-danger" style={{ marginBottom: '1rem' }} key={error} role="alert">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="form-swap" key={mode} noValidate>
            {isRegister && (
              <div className="input-group">
                <label className="input-label" htmlFor="input-name">Full name</label>
                <div className="input-wrap">
                  <User size={16} className="input-icon" />
                  <input
                    id="input-name"
                    className={`input-field ${visibleError('name') ? 'invalid' : ''}`}
                    placeholder="Jane Doe"
                    value={form.name}
                    onChange={set('name')}
                    onBlur={touch('name')}
                    autoComplete="name"
                    autoFocus
                  />
                </div>
                {visibleError('name') && <span className="field-error">{visibleError('name')}</span>}
              </div>
            )}

            <div className="input-group">
              <label className="input-label" htmlFor="input-email">Email</label>
              <div className="input-wrap">
                <Mail size={16} className="input-icon" />
                <input
                  id="input-email"
                  type="email"
                  className={`input-field ${visibleError('email') ? 'invalid' : ''}`}
                  placeholder="you@company.com"
                  value={form.email}
                  onChange={set('email')}
                  onBlur={touch('email')}
                  autoComplete="email"
                  autoFocus={!isRegister}
                />
              </div>
              {visibleError('email') && <span className="field-error">{visibleError('email')}</span>}
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="input-password">Password</label>
              <div className="input-wrap">
                <Lock size={16} className="input-icon" />
                <input
                  id="input-password"
                  type={showPassword ? 'text' : 'password'}
                  className={`input-field ${visibleError('password') ? 'invalid' : ''}`}
                  placeholder={isRegister ? 'Create a password' : 'Your password'}
                  value={form.password}
                  onChange={set('password')}
                  onBlur={touch('password')}
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  style={{ paddingRight: '2.75rem' }}
                />
                <button
                  type="button"
                  className="btn btn-ghost btn-icon btn-sm input-action"
                  onClick={() => setShowPassword(s => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {isRegister ? (
                <div className="password-rules">
                  {rules.map(r => (
                    <span key={r.label} className={`rule ${r.ok ? 'ok' : ''}`}>
                      {r.ok ? <Check size={12} strokeWidth={3} /> : <span className="dot" style={{ width: 5, height: 5 }} />}
                      {r.label}
                    </span>
                  ))}
                </div>
              ) : (
                visibleError('password') && <span className="field-error">{visibleError('password')}</span>
              )}
            </div>

            {isRegister && (
              <div className="input-group">
                <label className="input-label" htmlFor="input-city">City</label>
                <div className="input-wrap">
                  <MapPin size={16} className="input-icon" />
                  <input
                    id="input-city"
                    className={`input-field ${visibleError('city') ? 'invalid' : ''}`}
                    placeholder="Hyderabad"
                    value={form.city}
                    onChange={set('city')}
                    onBlur={touch('city')}
                    autoComplete="address-level2"
                  />
                </div>
                {visibleError('city') && <span className="field-error">{visibleError('city')}</span>}
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-lg btn-block" style={{ marginTop: '0.5rem' }} disabled={loading} id="btn-submit-auth">
              {loading ? (
                <><Spinner size={17} /><span>{isRegister ? 'Creating account…' : 'Signing in…'}</span></>
              ) : (
                <><span>{isRegister ? 'Create account' : 'Sign in'}</span><ArrowRight size={17} /></>
              )}
            </button>
          </form>

          <p className="text-sm secondary" style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            {isRegister ? 'Already have an account? ' : 'New to ParkPulse? '}
            <button type="button" className="link-btn" onClick={() => switchMode(isRegister ? 'login' : 'register')}>
              {isRegister ? 'Sign in' : 'Create an account'}
            </button>
          </p>
        </div>
      </main>
    </div>
  );
}
