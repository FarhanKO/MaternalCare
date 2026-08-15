/**
 * Document Model — prescriptions and reports a mother photographs or uploads.
 *
 * Images can run to several megabytes, so the bytes go to disk under
 * data/uploads and only the metadata lives in SQLite. `taken_on` is the date
 * the document is *about* rather than when it was uploaded, because a mother
 * often photographs last week's prescription — the timeline reads by the
 * former.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('./../config/database');

const UPLOAD_DIR = path.join(__dirname, '..', 'data', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const KINDS = ['prescription', 'report'];
const MAX_BYTES = 5 * 1024 * 1024;

/** What a phone camera or a clinic scanner realistically produces. */
const MIME_EXT = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'application/pdf': 'pdf',
};

class DocumentError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

const pad = (n) => String(n).padStart(2, '0');
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const toDTO = (r) => ({
  id: String(r.id),
  patientId: String(r.user_id),
  kind: r.kind,
  title: r.title,
  note: r.note || undefined,
  originalName: r.original_name || undefined,
  mime: r.mime,
  size: r.size,
  takenOn: r.taken_on,
  uploadedAt: r.uploaded_at,
  uploadedBy: r.uploaded_by || 'mother',
  /** where the client fetches the bytes */
  url: `/api/documents/${r.id}/file`,
});

/** Pulls the payload out of a data: URL and checks it is something we accept. */
function decodeDataUrl(dataUrl) {
  const match = /^data:([^;,]+);base64,(.+)$/s.exec(String(dataUrl || ''));
  if (!match) throw new DocumentError('That file could not be read', 'BAD_PAYLOAD');

  const mime = match[1].toLowerCase();
  if (!MIME_EXT[mime]) {
    throw new DocumentError('Upload a photo (JPG, PNG, WEBP) or a PDF', 'BAD_TYPE');
  }

  const buffer = Buffer.from(match[2], 'base64');
  if (!buffer.length) throw new DocumentError('That file is empty', 'EMPTY');
  if (buffer.length > MAX_BYTES) {
    throw new DocumentError('Files must be 5 MB or smaller', 'TOO_LARGE');
  }
  return { mime, buffer };
}

module.exports = {
  KINDS,
  MAX_BYTES,
  DocumentError,

  /**
   * Store one document. `uploadedBy` records who added it so the mother can
   * tell her own photo from something the clinic filed for her.
   */
  create(userId, { kind, title, note, dataUrl, originalName, takenOn, uploadedBy = 'mother' }) {
    if (!KINDS.includes(kind)) throw new DocumentError(`Unknown document kind: ${kind}`, 'BAD_KIND');

    const { mime, buffer } = decodeDataUrl(dataUrl);
    const fileName = `${crypto.randomUUID()}.${MIME_EXT[mime]}`;
    fs.writeFileSync(path.join(UPLOAD_DIR, fileName), buffer);

    const date = /^\d{4}-\d{2}-\d{2}$/.test(takenOn || '') ? takenOn : todayISO();
    const label = String(title || '').trim()
      || (kind === 'prescription' ? 'Prescription' : 'Report');

    const info = db.prepare(`
      INSERT INTO documents
        (user_id, kind, title, note, file_name, original_name, mime, size, taken_on, uploaded_at, uploaded_by)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)
    `).run(userId, kind, label, (note || '').trim() || null, fileName,
      originalName || null, mime, buffer.length, date, new Date().toISOString(), uploadedBy);

    return this.find(Number(info.lastInsertRowid));
  },

  find(id) {
    const row = db.prepare('SELECT * FROM documents WHERE id = ?').get(id);
    return row ? toDTO(row) : null;
  },

  /** Newest first by the date the document is about. */
  forUser(userId, kind) {
    const sql = kind
      ? 'SELECT * FROM documents WHERE user_id = ? AND kind = ? ORDER BY taken_on DESC, id DESC'
      : 'SELECT * FROM documents WHERE user_id = ? ORDER BY taken_on DESC, id DESC';
    const rows = kind
      ? db.prepare(sql).all(userId, kind)
      : db.prepare(sql).all(userId);
    return rows.map(toDTO);
  },

  /** How many of each kind this patient has — drives the clinician's tab counts. */
  countsFor(userId) {
    const rows = db.prepare(
      'SELECT kind, COUNT(*) AS c FROM documents WHERE user_id = ? GROUP BY kind',
    ).all(userId);
    const out = { prescription: 0, report: 0 };
    for (const r of rows) out[r.kind] = r.c;
    return out;
  },

  /** Absolute path for streaming the bytes back, or null if the row is gone. */
  pathFor(id) {
    const row = db.prepare('SELECT file_name, mime FROM documents WHERE id = ?').get(id);
    if (!row) return null;
    const full = path.join(UPLOAD_DIR, row.file_name);
    return fs.existsSync(full) ? { path: full, mime: row.mime } : null;
  },

  /** Removing the row removes the file too — nothing orphaned on disk. */
  remove(id, userId) {
    const row = db.prepare('SELECT * FROM documents WHERE id = ? AND user_id = ?').get(id, userId);
    if (!row) return false;
    const full = path.join(UPLOAD_DIR, row.file_name);
    if (fs.existsSync(full)) fs.unlinkSync(full);
    db.prepare('DELETE FROM documents WHERE id = ?').run(id);
    return true;
  },
};
