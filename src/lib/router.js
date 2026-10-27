import { useEffect, useState } from 'react';

// Minimal hash router: "#/path?key=value". Hash URLs work from any static host without
// server-side rewrite rules, and give every page a shareable URL and working back button.

const readLocation = () => {
  const raw = window.location.hash.replace(/^#\/?/, '');
  const [path, query = ''] = raw.split('?');
  return { path: path.replace(/\/$/, ''), params: Object.fromEntries(new URLSearchParams(query)) };
};

export function buildHref(path, params) {
  const query = params
    ? new URLSearchParams(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
      ).toString()
    : '';
  return `#/${path}${query ? `?${query}` : ''}`;
}

export function navigate(path, params, { replace = false } = {}) {
  const next = buildHref(path, params);
  if (window.location.hash === next) return;
  if (replace) {
    window.history.replaceState(null, '', next);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    window.location.hash = next;
  }
}

export function useRoute() {
  const [route, setRoute] = useState(readLocation);
  useEffect(() => {
    const onChange = () => setRoute(readLocation());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}
