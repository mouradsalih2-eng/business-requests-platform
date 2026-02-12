-- Add show_category and show_priority toggles (previously only in client, now persisted)
ALTER TABLE project_form_config ADD COLUMN IF NOT EXISTS show_category BOOLEAN DEFAULT true;
ALTER TABLE project_form_config ADD COLUMN IF NOT EXISTS show_priority BOOLEAN DEFAULT true;

-- Store built-in field overrides (label, required) as JSON
-- Example: { "category": { "label": "Type", "required": false }, "priority": { "label": "Urgency" } }
ALTER TABLE project_form_config ADD COLUMN IF NOT EXISTS field_overrides JSONB DEFAULT '{}'::jsonb;
