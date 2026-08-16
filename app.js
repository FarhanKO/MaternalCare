/**
 * MaternityCare+ — application entry point (MVC architecture)
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
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use('/api', apiRoutes);
app.use(routes);

// 404
app.use((req, res) => res.status(404).render('404', { page: '' }));

app.listen(PORT, () => {
  console.log(`\n  MaternityCare+ running →  http://localhost:${PORT}\n`);
});
