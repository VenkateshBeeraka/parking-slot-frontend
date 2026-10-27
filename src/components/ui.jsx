import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { X, AlertTriangle, Loader2 } from 'lucide-react';

/* --------------------------------------------------------------------------
   Modal — animates in and out, closes on Escape / backdrop, locks scroll
   -------------------------------------------------------------------------- */

const EXIT_MS = 220;

export function Modal({ open, onClose, title, subtitle, icon, tone, size, footer, children, dismissible = true }) {
  const [rendered, setRendered] = useState(open);
  const [closing, setClosing] = useState(false);
  const contentRef = useRef(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = dismissible ? onClose : null;
  });

  useEffect(() => {
    if (open) {
      setRendered(true);
      setClosing(false);
    } else if (rendered) {
      setClosing(true);
      const t = setTimeout(() => {
        setRendered(false);
        setClosing(false);
      }, EXIT_MS);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (!rendered) return;
    document.body.classList.add('scroll-locked');
    const onKey = (e) => {
      if (e.key === 'Escape') closeRef.current?.();
    };
    window.addEventListener('keydown', onKey);
    const focusTarget = contentRef.current?.querySelector('input, select, textarea') || contentRef.current?.querySelector('.modal-footer .btn:last-child');
    focusTarget?.focus({ preventScroll: true });
    return () => {
      document.body.classList.remove('scroll-locked');
      window.removeEventListener('keydown', onKey);
    };
  }, [rendered]);

  if (!rendered) return null;

  return (
    <div
      className={`modal-overlay ${closing ? 'closing' : ''}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && dismissible) onClose?.();
      }}
    >
      <div
        ref={contentRef}
        className={`modal-content ${size ? `modal-${size}` : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
      >
        {(title || icon) && (
          <div className="modal-header">
            {icon && <div className={`icon-tile ${tone ? `tone-${tone}` : ''}`}>{icon}</div>}
            <div className="grow">
              {title && <h2 className="modal-title">{title}</h2>}
              {subtitle && <p className="modal-subtitle">{subtitle}</p>}
            </div>
            {dismissible && (
              <button type="button" className="btn btn-ghost btn-icon btn-sm modal-close" onClick={onClose} aria-label="Close">
                <X size={18} />
              </button>
            )}
          </div>
        )}
        {children}
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------------
   Confirm dialog — promise based replacement for window.confirm
   -------------------------------------------------------------------------- */

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState({ open: false });
  const resolver = useRef(null);

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      resolver.current = resolve;
      setState({ open: true, ...options });
    });
  }, []);

  const settle = (value) => {
    resolver.current?.(value);
    resolver.current = null;
    setState((s) => ({ ...s, open: false }));
  };

  const tone = state.tone || 'danger';

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        open={state.open}
        onClose={() => settle(false)}
        size="sm"
        tone={tone}
        icon={state.icon || <AlertTriangle size={20} />}
        title={state.title || 'Are you sure?'}
        subtitle={state.message}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => settle(false)}>
              {state.cancelText || 'Cancel'}
            </button>
            <button
              type="button"
              className={`btn ${tone === 'danger' ? 'btn-danger' : 'btn-primary'}`}
              onClick={() => settle(true)}
            >
              {state.confirmText || 'Confirm'}
            </button>
          </>
        }
      >
        <div style={{ height: '1.25rem' }} />
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) return async (opts) => window.confirm(opts?.message || opts?.title || 'Are you sure?');
  return ctx;
}

/* --------------------------------------------------------------------------
   Layout primitives
   -------------------------------------------------------------------------- */

export function PageHeader({ eyebrow, title, subtitle, actions }) {
  return (
    <div className="page-header">
      <div>
        {eyebrow && <div className="page-eyebrow">{eyebrow}</div>}
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="row gap-sm wrap">{actions}</div>}
    </div>
  );
}

export function EmptyState({ icon, title, children, action }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h3 className="empty-title">{title}</h3>
      {children && <p className="empty-text">{children}</p>}
      {action && <div style={{ marginTop: '1.25rem' }}>{action}</div>}
    </div>
  );
}

export function Skeleton({ width = '100%', height = 14, radius, style }) {
  return <div className="skeleton" style={{ width, height, borderRadius: radius, ...style }} />;
}

export function SkeletonCards({ count = 6, height = 180, className = 'grid grid-cards' }) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card card-pad stack gap-md" style={{ height }}>
          <div className="row gap-md">
            <Skeleton width={40} height={40} radius={10} />
            <div className="stack gap-sm grow">
              <Skeleton width="55%" height={14} />
              <Skeleton width="35%" height={11} />
            </div>
          </div>
          <Skeleton width="90%" height={11} />
          <Skeleton width="70%" height={11} />
          <div style={{ flex: 1 }} />
          <Skeleton height={32} radius={8} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonRows({ rows = 5, cols = 5 }) {
  return (
    <div className="stack" style={{ padding: '0.5rem 1.5rem 1rem' }}>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="row gap-lg" style={{ padding: '0.85rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} width={c === 0 ? 50 : `${100 / cols}%`} height={12} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function Spinner({ size = 16 }) {
  return <Loader2 size={size} className="spin" />;
}

/* --------------------------------------------------------------------------
   Animated numbers
   -------------------------------------------------------------------------- */

export function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    const end = Number(target) || 0;
    const start = fromRef.current;
    if (start === end) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      fromRef.current = end;
      setValue(end);
      return;
    }
    let raf;
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const v = Math.round(start + (end - start) * eased);
      setValue(v);
      if (p < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = end;
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      fromRef.current = end;
    };
  }, [target, duration]);

  return value;
}

export function StatCard({ label, value, icon, tone, meta, loading, style }) {
  const unknown = value === null || value === undefined;
  const display = useCountUp(loading || unknown ? 0 : value);
  return (
    <div className="card stat-card card-interactive" style={style}>
      <div className="row between">
        <span className="stat-label">{label}</span>
        <span className={`icon-tile ${tone ? `tone-${tone}` : ''}`}>{icon}</span>
      </div>
      {loading ? <Skeleton width={70} height={30} /> : <div className="stat-value" title={unknown ? 'Unavailable right now' : undefined}>{unknown ? '—' : display.toLocaleString()}</div>}
      {meta && <div className="stat-meta">{meta}</div>}
    </div>
  );
}

/* --------------------------------------------------------------------------
   Segmented control with sliding thumb
   -------------------------------------------------------------------------- */

export function Segmented({ options, value, onChange }) {
  const ref = useRef(null);
  const [thumb, setThumb] = useState({ x: 0, w: 0 });

  useEffect(() => {
    const el = ref.current?.querySelector('[aria-pressed="true"]');
    if (el) setThumb({ x: el.offsetLeft, w: el.offsetWidth });
  }, [value, options.length]);

  return (
    <div className="segmented" ref={ref}>
      <span className="segmented-thumb" style={{ width: thumb.w, transform: `translateX(${thumb.x - 3}px)`, left: 3 }} />
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export const initials = (str = '') =>
  str
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join('') || '?';
