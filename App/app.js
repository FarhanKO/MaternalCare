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

