-- ============================================================
-- 007: Revert Custom Request Forms
-- ============================================================

DROP INDEX IF EXISTS idx_request_custom_field_values_request;
DROP INDEX IF EXISTS idx_project_custom_fields_project;
DROP INDEX IF EXISTS idx_project_form_config_project;

DROP TABLE IF EXISTS request_custom_field_values;
DROP TABLE IF EXISTS project_custom_fields;
DROP TABLE IF EXISTS project_form_config;

-- Restore CHECK constraints
ALTER TABLE requests ADD CONSTRAINT requests_category_check
  CHECK (category IN ('bug', 'new_feature', 'optimization'));
ALTER TABLE requests ADD CONSTRAINT requests_priority_check
  CHECK (priority IN ('low', 'medium', 'high'));
ALTER TABLE requests ADD CONSTRAINT requests_team_check
  CHECK (team IN ('Manufacturing', 'Sales', 'Service', 'Energy'));
ALTER TABLE requests ADD CONSTRAINT requests_region_check
  CHECK (region IN ('EMEA', 'North America', 'APAC', 'Global'));
