-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'employee' CHECK(role IN ('employee', 'admin')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Requests table
CREATE TABLE IF NOT EXISTS requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('bug', 'new_feature', 'optimization')),
  priority TEXT NOT NULL CHECK(priority IN ('low', 'medium', 'high')),
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'backlog', 'in_progress', 'completed', 'rejected', 'duplicate')),
  team TEXT DEFAULT 'Manufacturing' CHECK(team IN ('Manufacturing', 'Sales', 'Service', 'Energy')),
  region TEXT DEFAULT 'Global' CHECK(region IN ('EMEA', 'North America', 'APAC', 'Global')),
  business_problem TEXT,
  problem_size TEXT,
  business_expectations TEXT,
  expected_impact TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Activity log table for tracking admin actions
CREATE TABLE IF NOT EXISTS activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Attachments table
CREATE TABLE IF NOT EXISTS attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id INTEGER NOT NULL,
  filename TEXT NOT NULL,
  filepath TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE
);

-- Votes table (upvotes/likes)
CREATE TABLE IF NOT EXISTS votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('upvote', 'like')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(request_id, user_id, type)
);

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Admin read requests tracking (for "New" badge on unread requests)
CREATE TABLE IF NOT EXISTS admin_read_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id INTEGER NOT NULL,
  admin_id INTEGER NOT NULL,
  read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE,
  FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(request_id, admin_id)
);

-- Request tags table
CREATE TABLE IF NOT EXISTS request_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id INTEGER NOT NULL,
  tag TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE,
  UNIQUE(request_id, tag)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_requests_user_id ON requests(user_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_category ON requests(category);
CREATE INDEX IF NOT EXISTS idx_requests_created_at ON requests(created_at);
CREATE INDEX IF NOT EXISTS idx_votes_request_id ON votes(request_id);
CREATE INDEX IF NOT EXISTS idx_comments_request_id ON comments(request_id);
CREATE INDEX IF NOT EXISTS idx_admin_read_requests ON admin_read_requests(request_id, admin_id);
CREATE INDEX IF NOT EXISTS idx_request_tags_request_id ON request_tags(request_id);
