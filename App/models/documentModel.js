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

