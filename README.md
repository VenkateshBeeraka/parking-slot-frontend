# ParkPulse — web app

React + Vite frontend for the parking slot booking platform. It talks to the backend only through the API gateway.

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
```

The dev server reads `.env.development`, which points at the gateway started by `docker compose` (`http://localhost:8765`).

## Configuration

| Variable | Purpose |
| --- | --- |
| `VITE_API_BASE_URL` | Base URL of the API gateway. Leave empty to call the same origin the app is served from (recommended in production, behind the gateway or a reverse proxy). |

Copy `.env.example` to `.env.production.local` (or set the variable in your CI) before `npm run build`.

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — production build into `dist/`
- `npm run preview` — serve the production build locally
- `npm run lint` — run oxlint

## Structure

- `src/App.jsx` — session handling, routing and the app shell
- `src/lib/router.js` — hash-based routing (`#/bookings`, `#/slots?building=BLD-101`), works on any static host
- `src/lib/format.js` — date and booking helpers
- `src/services/api.js` — API client; normalises backend responses and error messages
- `src/components/` — pages (`*View.jsx`), the sign-in page, sidebar/topbar and shared UI in `ui.jsx`

Members see Overview, Book parking, My bookings, Buildings and Notifications. Administrators additionally get Parking slots, Reservations and Users.
