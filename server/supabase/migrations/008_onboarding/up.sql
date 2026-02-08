-- 008_onboarding: Force password change, project branding, form builder enhancements

-- Phase 1: Force password change on first login
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false;

-- Phase 1: Project branding
ALTER TABLE projects ADD COLUMN IF NOT EXISTS icon TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Phase 3: Form builder enhancements
ALTER TABLE project_form_config ADD COLUMN IF NOT EXISTS field_order JSONB;
ALTER TABLE project_form_config ADD COLUMN IF NOT EXISTS card_fields JSONB;

ALTER TABLE project_custom_fields ADD COLUMN IF NOT EXISTS show_on_card BOOLEAN DEFAULT false;
ALTER TABLE project_custom_fields ADD COLUMN IF NOT EXISTS icon TEXT;
ALTER TABLE project_custom_fields ADD COLUMN IF NOT EXISTS color TEXT;
