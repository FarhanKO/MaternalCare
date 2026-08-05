const db = require('../config/database');

module.exports = {
  articles(category) {
    if (category && category !== 'All')
      return db.prepare('SELECT * FROM articles WHERE category = ? ORDER BY id').all(category);
    return db.prepare('SELECT * FROM articles ORDER BY id').all();
  },
  articleCategories() {
    return db.prepare('SELECT DISTINCT category FROM articles ORDER BY category').all().map(r => r.category);
  },
  posts() {
    return db.prepare('SELECT * FROM posts ORDER BY id').all();
  },
  addPost({ author, tag, title, body }) {
    db.prepare(`INSERT INTO posts (author, tag, title, body, replies, likes, time_ago)
                VALUES (?,?,?,?,0,0,'just now')`).run(author, tag, title, body);
  },
  hospitals() {
    return db.prepare('SELECT * FROM hospitals ORDER BY distance_km ASC').all();
  },
};
