-- ============================================================
-- 007: Custom Request Forms (3 Levels)
-- ============================================================

-- Level 1+2: Project form config (field visibility + custom option lists)
CREATE TABLE project_form_config (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  show_team BOOLEAN DEFAULT true,
  show_region BOOLEAN DEFAULT true,
  show_business_problem BOOLEAN DEFAULT true,
  show_problem_size BOOLEAN DEFAULT true,
  show_business_expectations BOOLEAN DEFAULT true,
  show_expected_impact BOOLEAN DEFAULT true,
  custom_categories JSONB,
  custom_priorities JSONB,
  custom_teams JSONB,
  custom_regions JSONB,
  custom_statuses JSONB,
  UNIQUE (project_id)
);

-- Level 3: Custom field definitions
CREATE TABLE project_custom_fields (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  label TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN (
    'text','textarea','select','multi_select','number','date','checkbox','rating','url','user_picker'
  )),
  options JSONB,
  is_required BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  visibility TEXT DEFAULT 'all' CHECK (visibility IN ('all', 'admin_only')),
  UNIQUE (project_id, name)
);

-- Level 3: Custom field values per request
CREATE TABLE request_custom_field_values (
  id SERIAL PRIMARY KEY,
  request_id INTEGER NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  field_id INTEGER NOT NULL REFERENCES project_custom_fields(id) ON DELETE CASCADE,
  value_text TEXT,
  value_number NUMERIC,
  value_boolean BOOLEAN,
  value_date DATE,
  value_json JSONB,
  UNIQUE (request_id, field_id)
);

-- Remove hard-coded CHECK constraints (validation moves to app layer)
ALTER TABLE requests DROP CONSTRAINT IF EXISTS requests_category_check;
ALTER TABLE requests DROP CONSTRAINT IF EXISTS requests_priority_check;
ALTER TABLE requests DROP CONSTRAINT IF EXISTS requests_team_check;
ALTER TABLE requests DROP CONSTRAINT IF EXISTS requests_region_check;

-- Create default form config for existing default project
INSERT INTO project_form_config (project_id)
  SELECT id FROM projects WHERE slug = 'default';

-- Indexes
CREATE INDEX idx_project_form_config_project ON project_form_config(project_id);
CREATE INDEX idx_project_custom_fields_project ON project_custom_fields(project_id);
CREATE INDEX idx_request_custom_field_values_request ON request_custom_field_values(request_id);
