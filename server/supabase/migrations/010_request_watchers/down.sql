ALTER TABLE users DROP COLUMN IF EXISTS auto_watch_on_vote;
ALTER TABLE users DROP COLUMN IF EXISTS auto_watch_on_comment;

DROP INDEX IF EXISTS idx_request_watchers_user;
DROP INDEX IF EXISTS idx_request_watchers_request;
DROP TABLE IF EXISTS request_watchers;
