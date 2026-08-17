/**
 * User Model — the account, and the profile details attached to it.
 *
 * Name, photo and bio used to live only in React state, so every edit was
 * lost on refresh and the doctor never saw the same name the mother did.
 * They are columns now. The photo follows the documents rule: bytes on disk,
 * file name in the row.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('../config/db');

const UPLOAD_DIR = path.join(__dirname, '..', 'data', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const MAX_AVATAR_BYTES = 3 * 1024 * 1024;
const MIME_EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const MAX_BIO = 280;

module.exports = {
  async find(id) {
    return db.one('SELECT * FROM users WHERE id = $1', [id]);
  },

  async current() {
    // Demo session: the seeded mother account
    return db.one("SELECT * FROM users WHERE role = 'mother' ORDER BY id LIMIT 1");
  },

  /** Life stage drives which reading and news the client shows. */
  STAGES: ['pregnant', 'new-mother', 'parent', 'planning', 'general'],

  async setStage(id, stage) {
    if (!this.STAGES.includes(stage)) throw new Error(`Unknown stage: ${stage}`);
    await db.run('UPDATE users SET stage = $2 WHERE id = $1', [id, stage]);
    return this.find(id);
  },

  /** Shape the client reads — the avatar as a URL, not a raw file name. */
  async profile(id) {
    const u = await this.find(id);
    if (!u) return null;
    return {
      id: String(u.id),
      name: u.name,
      stage: u.stage,
      bio: u.bio || '',
      avatar: u.avatar_file ? `/api/profile/avatar/${u.avatar_file}` : null,
      bloodGroup: u.blood_group || null,
      age: u.age ?? null,
      emergencyNumber: u.emergency_number || '999',
    };
  },

  async setName(id, name) {
    const label = String(name || '').trim();
    if (!label) throw new Error('A name cannot be empty');
    if (label.length > 60) throw new Error('That name is too long');
    await db.run('UPDATE users SET name = $2 WHERE id = $1', [id, label]);
    return this.profile(id);
  },

  async setBio(id, bio) {
    const text = String(bio ?? '').trim();
    if (text.length > MAX_BIO) throw new Error(`A bio must be ${MAX_BIO} characters or fewer`);
    await db.run('UPDATE users SET bio = $2 WHERE id = $1', [id, text]);
    return this.profile(id);
  },

  /** `dataUrl` null removes the photo and falls back to initials. */
  async setAvatar(id, dataUrl) {
    const current = await this.find(id);
    const previous = current?.avatar_file;

    if (dataUrl === null || dataUrl === '') {
      await db.run('UPDATE users SET avatar_file = NULL WHERE id = $1', [id]);
      if (previous) this.removeFile(previous);
      return this.profile(id);
    }

    const match = /^data:([^;,]+);base64,(.+)$/s.exec(String(dataUrl || ''));
    if (!match) throw new Error('That photo could not be read');
    const mime = match[1].toLowerCase();
    if (!MIME_EXT[mime]) throw new Error('Use a JPG, PNG or WEBP photo');

    const buffer = Buffer.from(match[2], 'base64');
    if (!buffer.length) throw new Error('That photo is empty');
    if (buffer.length > MAX_AVATAR_BYTES) throw new Error('Photos must be 3 MB or smaller');

    const fileName = `${crypto.randomUUID()}.${MIME_EXT[mime]}`;
    fs.writeFileSync(path.join(UPLOAD_DIR, fileName), buffer);
    await db.run('UPDATE users SET avatar_file = $2 WHERE id = $1', [id, fileName]);

    // replacing a photo should not leave the old one on disk forever
    if (previous) this.removeFile(previous);
    return this.profile(id);
  },

  /** Editable clinical basics shown on the profile panel. */
  async setDetails(id, { bloodGroup, age }) {
    if (bloodGroup !== undefined) {
      await db.run('UPDATE users SET blood_group = $2 WHERE id = $1',
        [id, String(bloodGroup).trim() || null]);
    }
    if (age !== undefined) {
      const n = Number(age);
      if (!Number.isFinite(n) || n < 10 || n > 70) throw new Error('That age looks wrong');
      await db.run('UPDATE users SET age = $2 WHERE id = $1', [id, n]);
    }
    return this.profile(id);
  },

  avatarPath(fileName) {
    if (!/^[\w.-]+$/.test(fileName)) return null;   // no traversal
    const full = path.join(UPLOAD_DIR, fileName);
    return fs.existsSync(full) ? full : null;
  },

  removeFile(fileName) {
    const full = this.avatarPath(fileName);
    if (full) { try { fs.unlinkSync(full); } catch { /* already gone */ } }
  },

  async emergencyContacts(userId) {
    return db.sql('SELECT * FROM emergency_contacts WHERE user_id = $1 ORDER BY id', [userId]);
  },
};
