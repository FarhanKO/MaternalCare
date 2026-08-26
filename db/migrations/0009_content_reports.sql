-- Reporting and moderation for the community board.
--
-- The board has told mothers "Posts are moderated" and "moderated and
-- clinician-reviewed" since it was written. Nothing moderated anything: there
-- was no way to report a post, no queue, and no way to remove one. On a
-- maternal health forum that is not a cosmetic gap — the specific harm this
-- feature exists to catch is a confident stranger telling a pregnant woman to
-- stop taking something.
--
-- `hidden_at` rather than DELETE, on both posts and comments. A removal that
-- destroys the evidence cannot be reviewed, appealed or explained, and a
-- comment that vanishes leaves a thread that no longer makes sense.

ALTER TABLE posts          ADD COLUMN IF NOT EXISTS hidden_at     TIMESTAMPTZ;
ALTER TABLE posts          ADD COLUMN IF NOT EXISTS hidden_reason TEXT;
ALTER TABLE post_comments  ADD COLUMN IF NOT EXISTS hidden_at     TIMESTAMPTZ;
ALTER TABLE post_comments  ADD COLUMN IF NOT EXISTS hidden_reason TEXT;

CREATE TABLE IF NOT EXISTS content_reports (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  -- exactly one of these is set; the CHECK below is what enforces it
  post_id     INTEGER REFERENCES posts(id)         ON DELETE CASCADE,
  comment_id  INTEGER REFERENCES post_comments(id) ON DELETE CASCADE,

  -- null when the reporter's account is later removed: the report still
  -- counts, because the content is either against the rules or it is not
  reporter_id INTEGER REFERENCES users(id) ON DELETE SET NULL,

  reason      TEXT NOT NULL CHECK (reason IN (
                'medical-misinformation', 'harassment', 'privacy',
                'spam', 'explicit', 'other')),
  detail      TEXT,

  state       TEXT NOT NULL DEFAULT 'open'
                CHECK (state IN ('open', 'upheld', 'dismissed')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  reviewed_at   TIMESTAMPTZ,
  reviewed_by   INTEGER REFERENCES doctors(id) ON DELETE SET NULL,
  review_note   TEXT,

  CONSTRAINT content_reports_one_target
    CHECK ((post_id IS NULL) <> (comment_id IS NULL))
);

-- One report per person per item. Someone who feels strongly does not get a
-- louder vote by pressing the button twice, and the count is what drives
-- priority in the queue.
CREATE UNIQUE INDEX IF NOT EXISTS content_reports_post_reporter_key
  ON content_reports (post_id, reporter_id)
  WHERE post_id IS NOT NULL AND reporter_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS content_reports_comment_reporter_key
  ON content_reports (comment_id, reporter_id)
  WHERE comment_id IS NOT NULL AND reporter_id IS NOT NULL;

-- the queue reads open reports oldest-first, so it gets its own index
CREATE INDEX IF NOT EXISTS content_reports_open_idx
  ON content_reports (state, created_at)
  WHERE state = 'open';
