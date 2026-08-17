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

class PostError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

/** "2 h ago" — the community reads in relative time, not timestamps. */
function ago(iso) {
  const secs = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (secs < 60) return 'just now';
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins} m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} h ago`;
  const days = Math.round(hrs / 24);
  return days < 7 ? `${days} d ago` : `${Math.round(days / 7)} w ago`;
}

const toComment = (c) => ({
  id: String(c.id),
  author: c.author,
  role: c.role,
  body: c.body,
  ago: ago(c.created_at),
});

function toPost(p, comments) {
  return {
    id: String(p.id),
    author: p.author,
    role: p.role || 'mother',
    week: p.week ?? undefined,
    topic: p.topic || undefined,
    title: p.title,
    body: p.body || '',
    image: p.image_file ? `/api/community/images/${p.image_file}` : undefined,
    hearts: p.hearts ?? 0,
    clinicianAnswered: Boolean(p.clinician_answered),
    ago: ago(p.created_at),
    comments,
  };
}

/** Pulls the payload out of a data: URL and checks it is an image we accept. */
function decodeImage(dataUrl) {
  const match = /^data:([^;,]+);base64,(.+)$/s.exec(String(dataUrl || ''));
  if (!match) throw new PostError('That image could not be read', 'BAD_IMAGE');
  const mime = match[1].toLowerCase();
  if (!MIME_EXT[mime]) throw new PostError('Use a JPG, PNG or WEBP image', 'BAD_TYPE');
  const buffer = Buffer.from(match[2], 'base64');
  if (!buffer.length) throw new PostError('That image is empty', 'EMPTY');
  if (buffer.length > MAX_IMAGE_BYTES) throw new PostError('Images must be 5 MB or smaller', 'TOO_LARGE');
  return { mime, buffer };
}

module.exports = {
  PostError,
  MAX_IMAGE_BYTES,

  /** Comments for a set of posts, fetched in one query rather than per post. */
  async commentsFor(postIds) {
    if (!postIds.length) return new Map();
    const rows = await db.sql(
      `SELECT * FROM post_comments WHERE post_id = ANY($1::int[])
       ORDER BY created_at ASC, id ASC`,
      [postIds.map(Number)],
    );

    const grouped = new Map(postIds.map((id) => [Number(id), []]));
    for (const r of rows) grouped.get(r.post_id)?.push(toComment(r));
    return grouped;
  },

  /**
   * Newest first. `limit`/`offset` drive the community's "load more" so the
   * client never pulls the whole board at once.
   */
  async all({ limit = 20, offset = 0, topic } = {}) {
    const filtered = topic && topic !== 'All';
    const rows = filtered
      ? await db.sql(
        `SELECT * FROM posts WHERE topic = $3
         ORDER BY created_at DESC, id DESC LIMIT $1 OFFSET $2`,
        [limit, offset, topic],
      )
      : await db.sql(
        'SELECT * FROM posts ORDER BY created_at DESC, id DESC LIMIT $1 OFFSET $2',
        [limit, offset],
      );

    const comments = await this.commentsFor(rows.map((r) => r.id));
    return rows.map((p) => toPost(p, comments.get(p.id) ?? []));
  },

  async count(topic) {
    const row = topic && topic !== 'All'
      ? await db.one('SELECT count(*) AS c FROM posts WHERE topic = $1', [topic])
      : await db.one('SELECT count(*) AS c FROM posts');
    return row.c;
  },

  async find(id) {
    const row = await db.one('SELECT * FROM posts WHERE id = $1', [id]);
    if (!row) return null;
    const comments = await this.commentsFor([row.id]);
    return toPost(row, comments.get(row.id) ?? []);
  },

  async create(userId, { author, role = 'mother', week, topic, title, body, imageDataUrl }) {
    const heading = String(title || '').trim();
    if (!heading) throw new PostError('A post needs a title', 'NO_TITLE');
    if (!ROLES.includes(role)) throw new PostError(`Unknown role: ${role}`, 'BAD_ROLE');

    let imageFile = null;
    if (imageDataUrl) {
      const { mime, buffer } = decodeImage(imageDataUrl);
      imageFile = `${crypto.randomUUID()}.${MIME_EXT[mime]}`;
      fs.writeFileSync(path.join(UPLOAD_DIR, imageFile), buffer);
    }

    const row = await db.insert(
      `INSERT INTO posts (user_id, author, role, week, topic, title, body, image_file,
                          hearts, clinician_answered, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,0,FALSE,now()) RETURNING *`,
      [userId ?? null, String(author || 'A mother').trim(), role,
        Number.isFinite(week) ? week : null, (topic || '').trim() || null,
        heading, (body || '').trim() || null, imageFile],
    );
    return toPost(row, []);
  },

  async comment(postId, userId, { author, role = 'mother', body }) {
    const text = String(body || '').trim();
    if (!text) throw new PostError('A comment cannot be empty', 'EMPTY');
    if (!await db.one('SELECT 1 FROM posts WHERE id = $1', [postId])) {
      throw new PostError('That post no longer exists', 'NOT_FOUND');
    }

    await db.tx(async (t) => {
      await t.run(
        `INSERT INTO post_comments (post_id, user_id, author, role, body, created_at)
         VALUES ($1,$2,$3,$4,$5,now())`,
        [postId, userId ?? null, String(author || 'A mother').trim(), role, text],
      );
      // a clinician replying is what marks a question as answered
      if (role === 'doctor') {
        await t.run('UPDATE posts SET clinician_answered = TRUE WHERE id = $1', [postId]);
      }
    });

    return this.find(postId);
  },

  /** Toggling is the client's business; the model just applies the delta. */
  async heart(postId, delta = 1) {
    await db.run(
      'UPDATE posts SET hearts = GREATEST(0, hearts + $2) WHERE id = $1',
      [postId, delta],
    );
    return this.find(postId);
  },

  /** Absolute path for streaming a post image back. */
  imagePath(fileName) {
    if (!/^[\w.-]+$/.test(fileName)) return null;   // no traversal
    const full = path.join(UPLOAD_DIR, fileName);
    return fs.existsSync(full) ? full : null;
  },
};
