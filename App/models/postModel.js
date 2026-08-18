/**
 * Post Model — the community board.
 *
 * Replaces what the React client held in `useState`, where every post,
 * comment and image disappeared the moment the tab closed. Comments are rows
 * now rather than an integer count, which is why the old `replies` column
 * could never be read back.
 *
 * Images follow the same rule as documents: bytes on disk under data/uploads,
 * only the file name in the row. Base64 in a text column would bloat every
 * list query with data no list ever displays.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('../config/db');

const UPLOAD_DIR = path.join(__dirname, '..', 'data', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ROLES = ['mother', 'doctor'];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MIME_EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

