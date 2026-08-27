/**
 * MaternalCare+ — application entry point (MVC architecture)
 *   Models      → /models       (data access + domain logic, SQLite-backed)
 *   Views       → /views        (EJS templates)  +  /frontend (React client)
 *   Controllers → /controllers  (request handling, wired via /routes)
 *
 * Two View layers share one Model layer:
 *   • routes/web.js → server-rendered EJS pages
 *   • routes/api.js → JSON consumed by the React SPA in /frontend
 */
const express = require('express');
const path = require('path');
const routes = require('./routes/web');
const apiRoutes = require('./routes/api');

const session = require('./middleware/session');

const app = express();
const PORT = process.env.PORT || 3000;
// Vite dev origins: the mother/clinician client (5173) and the guardian
// companion app (5174). Override with a comma-separated CLIENT_ORIGIN.
const CLIENT_ORIGINS = (process.env.CLIENT_ORIGIN
  || 'http://localhost:5173,http://localhost:5174').split(',').map((s) => s.trim());

// The guardian app has to be opened on a real phone to test install,
// vibration and audio, so in development a private-network origin on either
// dev port is allowed too. Set CLIENT_ORIGIN in production to switch this off.
const LAN_DEV = /^http:\/\/(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)[\d.]+:(5173|5174)$/;

function allowedOrigin(origin) {
  if (!origin) return null;
  if (CLIENT_ORIGINS.includes(origin)) return origin;
  if (!process.env.CLIENT_ORIGIN && LAN_DEV.test(origin)) return origin;
  return null;
}

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// documents arrive as base64 data URLs, which inflate ~4/3 over the 5 MB cap
app.use(express.json({ limit: '12mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/vendor/chartjs', express.static(path.join(__dirname, 'node_modules', 'chart.js', 'dist')));

// Allow the Vite dev server to call the API during development
app.use('/api', (req, res, next) => {
  const origin = allowedOrigin(req.headers.origin);
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Vary', 'Origin');
  }
  // the session lives in a cookie, and a cross-origin fetch will neither send
  // nor store one without this — the dev server is a different origin
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  // the report download reads the filename off this header; without exposing it
  // a cross-origin fetch cannot see it and every report saves under one name
  res.header('Access-Control-Expose-Headers', 'Content-Disposition');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

/*
 * Resolve the session before anything else looks at a request. It never
 * rejects — it only answers "who is this" — so the sign-in page and the
 * marketing site still render for nobody in particular.
 */
app.use(session.attach());

app.use('/api', apiRoutes);
app.use(routes);

// 404
app.use((req, res) => res.status(404).render('404', { page: '' }));

// Global error handler middleware
app.use((err, req, res, next) => {
  console.error('[server error]', err);
  if (req.originalUrl.startsWith('/api')) {
    return res.status(err.status || 500).json({
      error: err.message || 'Internal Server Error',
    });
  }
  res.status(err.status || 500).render('404', { page: '', error: err.message });
});

const server = app.listen(PORT, () => {
  console.log(`\n  MaternalCare+ running →  http://localhost:${PORT}\n`);
});

/*
 * Why the process is made to say something before it goes.
 *
 * Node ends the process on an unhandled promise rejection, and an Express app
 * is almost nothing but promises. Left alone it exits with no output at all:
 * the server is simply gone between one request and the next. A browser can
 * only see a connection that refused, so it reports "Failed to fetch" - which
 * reads like a fault in the page, and sends whoever is debugging into the
 * wrong half of the codebase. These handlers cost nothing, and mean a crash
 * always leaves a reason behind it.
 */
server.on('error', (err) => {
  console.error('');
  if (err.code === 'EADDRINUSE') {
    console.error(`  [fatal] port ${PORT} is already in use - another copy of the`);
    console.error('          server is probably still running. Stop it, or set PORT.');
  } else {
    console.error('  [fatal] the server could not start:', err.message);
  }
  console.error('');
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('');
  console.error('  [fatal] unhandled promise rejection - the server is stopping:');
  console.error(reason instanceof Error ? reason.stack : reason);
  console.error('');
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('');
  console.error('  [fatal] uncaught exception - the server is stopping:');
  console.error(err.stack || err.message);
  console.error('');
  process.exit(1);
});
