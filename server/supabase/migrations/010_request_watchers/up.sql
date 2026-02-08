-- F7: Subscribe/Watch Requests
-- Allows users to watch requests and receive future notifications

CREATE TABLE IF NOT EXISTS request_watchers (
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  request_id INTEGER REFERENCES requests(id) ON DELETE CASCADE,
  auto_subscribed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, request_id)
);

CREATE INDEX idx_request_watchers_request ON request_watchers(request_id);
CREATE INDEX idx_request_watchers_user ON request_watchers(user_id);

-- User preferences for auto-watch behavior
ALTER TABLE users ADD COLUMN IF NOT EXISTS auto_watch_on_comment BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS auto_watch_on_vote BOOLEAN DEFAULT false;
