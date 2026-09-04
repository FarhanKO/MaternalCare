/**
 * Content Model — the reading list behind the server-rendered pages.
 *
 * Community posts moved to postModel when the React board needed comments,
 * images and roles that this shape could not hold.
 */
const db = require('../config/db');

module.exports = {
  async articles(category) {
    if (category && category !== 'All') {
      return db.sql('SELECT * FROM articles WHERE category = $1 ORDER BY id', [category]);
    }
    return db.sql('SELECT * FROM articles ORDER BY id');
  },

  async articleCategories() {
    const rows = await db.sql('SELECT DISTINCT category FROM articles ORDER BY category');
    return rows.map((r) => r.category);
  },

  async posts() {
    return db.sql('SELECT * FROM posts ORDER BY created_at DESC, id DESC');
  },

  async addPost({ author, topic, title, body }) {
    await db.run(
      `INSERT INTO posts (author, role, topic, title, body, hearts, clinician_answered, created_at)
       VALUES ($1, 'mother', $2, $3, $4, 0, FALSE, now())`,
      [author, topic ?? null, title, body ?? null],
    );
  },
};
