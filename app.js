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
// Vite dev server origin — the React client during development
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// documents arrive as base64 data URLs, which inflate ~4/3 over the 5 MB cap
app.use(express.json({ limit: '12mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/vendor/chartjs', express.static(path.join(__dirname, 'node_modules', 'chart.js', 'dist')));

// Allow the Vite dev server to call the API during development
app.use('/api', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', CLIENT_ORIGIN);
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
