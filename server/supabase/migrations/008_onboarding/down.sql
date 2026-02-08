-- Revert 008_onboarding

ALTER TABLE project_custom_fields DROP COLUMN IF EXISTS color;
ALTER TABLE project_custom_fields DROP COLUMN IF EXISTS icon;
ALTER TABLE project_custom_fields DROP COLUMN IF EXISTS show_on_card;

ALTER TABLE project_form_config DROP COLUMN IF EXISTS card_fields;
ALTER TABLE project_form_config DROP COLUMN IF EXISTS field_order;

ALTER TABLE projects DROP COLUMN IF EXISTS logo_url;
ALTER TABLE projects DROP COLUMN IF EXISTS icon;

ALTER TABLE users DROP COLUMN IF EXISTS must_change_password;
