/**
 * Moderation Model — reporting content, and acting on what gets reported.
 *
 * The board carried the line "Posts are moderated · clinician-reviewed" from
 * the day it was written, and nothing behind it was true: no report button, no
 * queue, no way to take anything down. That is a worse failure here than on a
 * general forum. The thing this exists to catch is a confident stranger
 * telling a pregnant woman that her prescription is unnecessary, and a mother
 * who believes the board is watched is more likely to act on what she reads.
 *
 * Two decisions worth stating:
 *
 * Clinicians moderate. The proposal puts reported content under an
 * administrator, and that portal does not exist yet — but the people best
 * placed to judge whether antenatal advice is dangerous are already in this
 * app with accounts, and leaving reports unread until an admin portal is built
 * would mean shipping the button without the promise behind it.
 *
 * Nothing is deleted. Upholding a report sets `hidden_at`. A removal that
 * destroys the evidence cannot be reviewed, appealed or explained to the
 * person who wrote it, and a comment that simply vanishes leaves a thread
 * that no longer reads as a conversation.
 */
const db = require('../config/db');

class ReportError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

/**
 * Why something is being reported.
 *
 * `medical-misinformation` is first and weighted heaviest because of what this
 * forum is. Elsewhere the worst outcome of bad advice is embarrassment; here
 * it is a woman stopping her labetalol because a stranger said it was unsafe.
 */
const REASONS = {
  'medical-misinformation': {
    label: 'Unsafe or false medical advice',
    hint: 'Telling someone to start, stop or change treatment, or a claim about pregnancy that is simply wrong.',
    weight: 3,
  },
  harassment: {
    label: 'Abusive, cruel or harassing',
    hint: 'Aimed at a person rather than at an idea.',
    weight: 2,
  },
  privacy: {
    label: 'Shares private details',
    hint: 'Someone else’s name, clinic, photograph or medical information.',
    weight: 2,
  },
  explicit: {
    label: 'Graphic or inappropriate',
    hint: 'Images or descriptions that do not belong on a public board.',
    weight: 2,
  },
  spam: {
    label: 'Spam or advertising',
    hint: 'Selling something, or the same message posted repeatedly.',
    weight: 1,
  },
  other: {
    label: 'Something else',
    hint: 'Tell us what is wrong with it and a clinician will read it.',
    weight: 1,
  },
};

/** Reports whose weight sums to this or more are shown as urgent. */
const URGENT_AT = 3;

const toReport = (r) => ({
  id: String(r.id),
  target: r.post_id ? 'post' : 'comment',
  postId: String(r.post_id ?? r.comment_post_id),
  commentId: r.comment_id ? String(r.comment_id) : null,
  reason: r.reason,
  reasonLabel: REASONS[r.reason]?.label ?? r.reason,
  detail: r.detail || '',
  state: r.state,
  createdAt: r.created_at,
  reporter: r.reporter_name || 'A member',
  reviewedAt: r.reviewed_at ?? null,
  reviewNote: r.review_note ?? null,
  /* the content itself, so a moderator never has to go looking for it */
  content: {
    author: r.content_author,
    role: r.content_role,
    title: r.content_title ?? null,
    body: r.content_body ?? '',
    image: r.image_file ? `/api/community/images/${r.image_file}` : null,
    hidden: Boolean(r.content_hidden_at),
  },
});

module.exports = {
  ReportError,
  REASONS,
  URGENT_AT,

  /** The reason list the client renders, in the order it should be offered. */
  reasons() {
    return Object.entries(REASONS).map(([key, r]) => ({
      key, label: r.label, hint: r.hint,
    }));
  },

  /**
   * File a report against a post or a comment.
   *
   * Idempotent per person: pressing the button twice is not two reports, so
   * one determined member cannot manufacture the count that drives priority.
   */
  async report({
    postId, commentId, reporterId, reason, detail,
  }) {
    if (!REASONS[reason]) throw new ReportError('Choose a reason for the report', 'BAD_REASON');
    if (!postId === !commentId) {
      throw new ReportError('Report either a post or a comment', 'BAD_TARGET');
    }

    const table = postId ? 'posts' : 'post_comments';
    const id = postId || commentId;
    if (!await db.one(`SELECT 1 FROM ${table} WHERE id = $1`, [id])) {
      throw new ReportError('That content no longer exists', 'NOT_FOUND');
    }

    const existing = await db.one(
      `SELECT id FROM content_reports
        WHERE reporter_id = $1
          AND ${postId ? 'post_id' : 'comment_id'} = $2`,
      [reporterId ?? null, id],
    );
    if (existing) throw new ReportError('You have already reported this', 'ALREADY_REPORTED');

    const row = await db.insert(
      `INSERT INTO content_reports (post_id, comment_id, reporter_id, reason, detail)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [postId ?? null, commentId ?? null, reporterId ?? null, reason,
        String(detail || '').trim().slice(0, 500) || null],
    );

    return { id: String(row.id), state: row.state, reason: row.reason };
  },

  /**
   * The moderation queue.
   *
   * One query with both possible targets joined, because a queue that needs a
   * follow-up query per row is a queue nobody keeps open.
   */
  async queue({ state = 'open', limit = 50 } = {}) {
    const rows = await db.sql(
      `SELECT r.*,
              u.name AS reporter_name,
              COALESCE(p.author, c.author)         AS content_author,
              COALESCE(p.role, c.role)             AS content_role,
              p.title                              AS content_title,
              COALESCE(p.body, c.body)             AS content_body,
              p.image_file,
              COALESCE(p.hidden_at, c.hidden_at)   AS content_hidden_at,
              c.post_id                            AS comment_post_id
         FROM content_reports r
         LEFT JOIN users         u ON u.id = r.reporter_id
         LEFT JOIN posts         p ON p.id = r.post_id
         LEFT JOIN post_comments c ON c.id = r.comment_id
        WHERE ($1 = 'all' OR r.state = $1)
        ORDER BY r.created_at ASC
        LIMIT $2`,
      [state, limit],
    );

    const reports = rows.map(toReport);

    /*
     * Group by the thing reported rather than by report. Three people
     * reporting one post is one decision for a moderator, not three, and
     * seeing them together is what makes the pattern legible.
     */
    const groups = new Map();
    for (const r of reports) {
      const key = `${r.target}:${r.commentId ?? r.postId}`;
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          target: r.target,
          postId: r.postId,
          commentId: r.commentId,
          content: r.content,
          reports: [],
          weight: 0,
        });
      }
      const g = groups.get(key);
      g.reports.push(r);
      g.weight += REASONS[r.reason]?.weight ?? 1;
    }

    return [...groups.values()]
      .map((g) => ({ ...g, urgent: g.weight >= URGENT_AT }))
      // urgent first, then whatever has been waiting longest
      .sort((a, b) => Number(b.urgent) - Number(a.urgent)
        || new Date(a.reports[0].createdAt) - new Date(b.reports[0].createdAt));
  },

  async openCount() {
    const row = await db.one("SELECT count(*) AS c FROM content_reports WHERE state = 'open'");
    return row.c;
  },

  /**
   * A moderator's decision on everything reported against one item.
   *
   * `uphold` hides the content and closes every open report against it;
   * `dismiss` closes them and leaves it standing. Both write who decided and
   * why, because a moderation log that does not say who is not a log.
   */
  async resolve({
    target, id, action, note, reviewerId,
  }) {
    if (!['uphold', 'dismiss'].includes(action)) {
      throw new ReportError('A decision is either uphold or dismiss', 'BAD_ACTION');
    }
    if (!['post', 'comment'].includes(target)) {
      throw new ReportError('Unknown target', 'BAD_TARGET');
    }

    const table = target === 'post' ? 'posts' : 'post_comments';
    const column = target === 'post' ? 'post_id' : 'comment_id';

    if (!await db.one(`SELECT 1 FROM ${table} WHERE id = $1`, [id])) {
      throw new ReportError('That content no longer exists', 'NOT_FOUND');
    }

    const reason = String(note || '').trim().slice(0, 500) || null;

    return db.tx(async (t) => {
      const closed = await t.run(
        `UPDATE content_reports
            SET state = $2, reviewed_at = now(), reviewed_by = $3, review_note = $4
          WHERE ${column} = $1 AND state = 'open'`,
        [id, action === 'uphold' ? 'upheld' : 'dismissed', reviewerId ?? null, reason],
      );

      if (action === 'uphold') {
        await t.run(
          `UPDATE ${table} SET hidden_at = now(), hidden_reason = $2 WHERE id = $1`,
          [id, reason],
        );
      } else {
        // dismissing also un-hides, so a decision can be reversed
        await t.run(
          `UPDATE ${table} SET hidden_at = NULL, hidden_reason = NULL WHERE id = $1`,
          [id],
        );
      }

      return { target, id: String(id), action, reportsClosed: closed };
    });
  },

  /**
   * Which of these posts the given member has already reported, so the button
   * can say so instead of failing when she presses it.
   */
  async reportedBy(reporterId, postIds) {
    if (!reporterId || !postIds.length) return new Set();
    const rows = await db.sql(
      `SELECT p.id AS post_id, c.id AS comment_id
         FROM content_reports r
         LEFT JOIN posts p         ON p.id = r.post_id
         LEFT JOIN post_comments c ON c.id = r.comment_id
        WHERE r.reporter_id = $1
          AND (r.post_id = ANY($2::int[]) OR c.post_id = ANY($2::int[]))`,
      [reporterId, postIds.map(Number)],
    );
    const out = new Set();
    for (const r of rows) {
      if (r.post_id) out.add(`post:${r.post_id}`);
      if (r.comment_id) out.add(`comment:${r.comment_id}`);
    }
    return out;
  },
};
