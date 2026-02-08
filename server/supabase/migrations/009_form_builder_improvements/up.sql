-- Soft-disable for custom fields (preserves data, hides from form + display)
ALTER TABLE project_custom_fields ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN DEFAULT true;

-- Admin-configurable analytics breakdowns
ALTER TABLE project_form_config ADD COLUMN IF NOT EXISTS analytics_fields JSONB;
