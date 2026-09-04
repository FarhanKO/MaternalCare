/**
 * Document Model — prescriptions and reports a mother photographs or uploads.
 *
 * Images can run to several megabytes, so the bytes go to disk under
 * data/uploads and only the metadata lives in the database. `taken_on` is the
 * date the document is *about* rather than when it was uploaded, because a
 * mother often photographs last week's prescription — the timeline reads by
 * the former.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('../config/db');

const UPLOAD_DIR = path.join(__dirname, '..', 'data', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const KINDS = ['prescription', 'report'];
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_TITLE = 160;
const MAX_NOTE = 2000;
const MAX_ORIGINAL_NAME = 255;
const MAX_UPLOADED_BY = 80;

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
  /** set when this document is the card evidencing a particular dose */
  vaccinationId: r.vaccination_id != null ? String(r.vaccination_id) : undefined,
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
  async create(userId, {
    kind, title, note, dataUrl, originalName, takenOn, uploadedBy = 'mother',
    vaccinationId = null,
  }) {
    if (!KINDS.includes(kind)) throw new DocumentError(`Unknown document kind: ${kind}`, 'BAD_KIND');

    const { mime, buffer } = decodeDataUrl(dataUrl);
    const date = /^\d{4}-\d{2}-\d{2}$/.test(takenOn || '') ? takenOn : todayISO();
    const label = String(title || '').trim();
    if (label.length > MAX_TITLE) throw new DocumentError('Document titles must be 160 characters or fewer', 'TOO_LONG');
    const noteText = String(note || '').trim();
    if (noteText.length > MAX_NOTE) throw new DocumentError('Document notes must be 2,000 characters or fewer', 'TOO_LONG');
    const original = String(originalName || '').trim();
    if (original.length > MAX_ORIGINAL_NAME) throw new DocumentError('File names must be 255 characters or fewer', 'TOO_LONG');
    const filer = String(uploadedBy || 'mother').trim();
    if (filer.length > MAX_UPLOADED_BY) throw new DocumentError('The uploader name is too long', 'TOO_LONG');

    // Validate every text field before creating a file, so rejected uploads
    // cannot leave unreferenced bytes behind in data/uploads.
    const fileName = `${crypto.randomUUID()}.${MIME_EXT[mime]}`;
    fs.writeFileSync(path.join(UPLOAD_DIR, fileName), buffer);

    const fallbackLabel = label
      || (kind === 'prescription' ? 'Prescription' : 'Report');

    const row = await db.insert(
      `INSERT INTO documents
         (user_id, kind, title, note, file_name, original_name, mime, size,
          taken_on, uploaded_at, uploaded_by, vaccination_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [userId, kind, fallbackLabel, noteText || null, fileName,
        original || null, mime, buffer.length, date,
        new Date().toISOString(), filer || 'mother',
        vaccinationId != null ? Number(vaccinationId) : null],
    );
    return toDTO(row);
  },

  /**
   * The cards attached to each of these vaccinations, keyed by dose id.
   *
   * One query for the whole list rather than one per dose — the vaccination
   * screen shows twelve of them at once.
   */
  async forVaccinations(ids) {
    if (!ids?.length) return new Map();
    const rows = await db.sql(
      `SELECT * FROM documents WHERE vaccination_id = ANY($1::int[])
       ORDER BY taken_on DESC, id DESC`,
      [ids.map(Number)],
    );
    const grouped = new Map();
    for (const r of rows) {
      const key = String(r.vaccination_id);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(toDTO(r));
    }
    return grouped;
  },

  async find(id) {
    const row = await db.one('SELECT * FROM documents WHERE id = $1', [id]);
    return row ? toDTO(row) : null;
  },

  /** Newest first by the date the document is about. */
  async forUser(userId, kind) {
    const rows = kind
      ? await db.sql(
        `SELECT * FROM documents WHERE user_id = $1 AND kind = $2
         ORDER BY taken_on DESC, id DESC`, [userId, kind],
      )
      : await db.sql(
        'SELECT * FROM documents WHERE user_id = $1 ORDER BY taken_on DESC, id DESC',
        [userId],
      );
    return rows.map(toDTO);
  },

  /** How many of each kind this patient has — drives the clinician's tabs. */
  async countsFor(userId) {
    const rows = await db.sql(
      'SELECT kind, count(*) AS c FROM documents WHERE user_id = $1 GROUP BY kind',
      [userId],
    );
    const out = { prescription: 0, report: 0 };
    for (const r of rows) out[r.kind] = r.c;
    return out;
  },

  /** Absolute path for streaming the bytes back, or null if the row is gone. */
  async pathFor(id) {
    const row = await db.one('SELECT file_name, mime FROM documents WHERE id = $1', [id]);
    if (!row) return null;
    const full = path.join(UPLOAD_DIR, row.file_name);
    return fs.existsSync(full) ? { path: full, mime: row.mime } : null;
  },

  /** Removing the row removes the file too — nothing orphaned on disk. */
  async remove(id, userId) {
    const row = await db.one(
      'DELETE FROM documents WHERE id = $1 AND user_id = $2 RETURNING file_name',
      [id, userId],
    );
    if (!row) return false;
    const full = path.join(UPLOAD_DIR, row.file_name);
    if (fs.existsSync(full)) fs.unlinkSync(full);
    return true;
  },
};
