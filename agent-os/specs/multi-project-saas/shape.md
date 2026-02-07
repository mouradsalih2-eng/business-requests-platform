# Multi-Project SaaS Platform + Custom Request Forms — Shaping Notes

## Problem Statement

Transform from single-tenant application to multi-tenant SaaS where:
- Multiple organizations can have their own request boards
- Users can participate in multiple projects
- Super admins can manage the entire platform
- Each project has a customizable request form

## Key Decisions

### 1. Role Hierarchy
- **Decision**: Three-tier: Super Admin > Admin > User
- **Structure**:
  - **Super Admin**: Platform-wide access, manages all projects
  - **Admin**: Project-level admin, manages their project(s)
  - **User**: Standard user within project(s)
- **Rationale**: Clean separation of platform vs project management

### 2. Membership Model
- **Decision**: Users and Admins can belong to multiple projects
- **Rationale**: Real-world users often work across teams/products
- **Implementation**: Junction table `user_projects(user_id, project_id, role)`

### 3. SSO Integration
- **Decision**: Google OAuth + Microsoft OAuth via Supabase Auth
- **Phase 1**: Google + Microsoft social login
- **Phase 2**: Enterprise SAML/OIDC per project (if needed)
- **Account linking**: By email address to prevent duplicates
- **Password always available**: Fallback for SSO issues

### 4. Project Configuration — Custom Request Forms

Each project gets a fully customizable request form with 3 levels of customization.

#### Level 1 — Toggle Default Fields

Project admins can enable/disable any built-in field:
- Category (bug / new_feature / optimization)
- Priority (low / medium / high)
- Team, Region
- Business Problem, Problem Size, Business Expectations, Expected Impact
- Attachments

**Title is always required and visible (non-configurable).**

#### Level 2 — Customize Field Options

Admins can modify the options within default fields:
- Custom priority levels (e.g., Critical / High / Medium / Low / Nice-to-have)
- Custom categories (e.g., Feature / Bug / Improvement / Integration / UX)
- Custom team names (replace Manufacturing / Sales / Service / Energy)
- Custom region names (replace EMEA / North America / APAC / Global)
- Custom status workflow stages

#### Level 3 — Create Custom Fields

Admins add new fields from a type library:

| Type | Description | Example Use |
|------|-------------|-------------|
| Short text | Single-line input | Customer name, Reference ID |
| Long text | Textarea | Acceptance criteria, Use case |
| Single select | Dropdown with custom options | Source (Sales/Support/Internal), Tier |
| Multi-select | Multiple choices | Affected modules, Target personas |
| Number | Numeric input | Revenue impact ($), Users affected |
| Date | Date picker | Requested deadline, Target quarter |
| Checkbox | Boolean toggle | Urgent flag, Requires approval |
| Rating | 1-5 stars or scale | Business value, Technical complexity |
| URL | Link input | Reference doc, Design mockup |
| User | User picker from project members | Assigned PM, Stakeholder |

#### Field Visibility Control

- Each field has a `visibility` setting: `submitter` or `admin_only`
- **Max 4-5 fields visible to submitters** (to keep the form simple)
- Remaining fields are admin-only (visible on request detail for admins)
- Title is always required and visible (non-configurable)
- Admin sees ALL fields; submitter sees only fields marked `submitter`

### 5. Project Creation
- **Decision**: Self-service with approval workflow
- **Flow**:
  1. User requests new project via registration form
  2. Super admin reviews and approves
  3. Requester becomes project admin
- **Rationale**: Balance growth with quality control

### 6. URL Strategy
- **Decision**: Single domain with project selector
- **Format**: `app.domain.com` with project switcher in header
- **Alternatives Rejected**:
  - Subdomains (`project.domain.com`) — DNS complexity
  - Path-based (`domain.com/project/`) — routing complexity
- **Rationale**: Simpler deployment, easier project switching

### 7. Multi-Tenant Database
- **Decision**: Shared tables with tenant_id (project_id)
- **Alternatives Rejected**:
  - Separate databases per tenant — operational overhead
  - Schema-per-tenant — migration complexity
- **Rationale**: Simple, cost-effective, sufficient isolation via RLS

### 8. Cross-Project Analytics
- **Decision**: Super admin dashboard with aggregated metrics
- **Metrics**:
  - Total requests across projects
  - Request volume trends
  - User engagement by project
  - Most active projects
- **Rationale**: Platform health visibility for super admins

## Data Model

### New Tables

```sql
-- Projects
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'pending_approval')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User-Project membership
CREATE TABLE user_projects (
  user_id UUID REFERENCES auth.users(id),
  project_id UUID REFERENCES projects(id),
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, project_id)
);

-- Per-project configuration for default fields
CREATE TABLE project_field_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  field_key TEXT NOT NULL,        -- e.g., 'category', 'priority', 'team', 'region', etc.
  enabled BOOLEAN DEFAULT true,
  visibility TEXT DEFAULT 'submitter' CHECK (visibility IN ('submitter', 'admin_only')),
  display_order INTEGER DEFAULT 0,
  options_json JSONB,             -- custom options overriding defaults
  UNIQUE (project_id, field_key)
);

-- Admin-created custom fields per project
CREATE TABLE project_custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'short_text', 'long_text', 'single_select', 'multi_select',
    'number', 'date', 'checkbox', 'rating', 'url', 'user'
  )),
  options_json JSONB,             -- for select types: [{value, label}]; for rating: {min, max}
  required BOOLEAN DEFAULT false,
  visibility TEXT DEFAULT 'admin_only' CHECK (visibility IN ('submitter', 'admin_only')),
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- EAV storage for custom field values
CREATE TABLE custom_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES requests(id) ON DELETE CASCADE,
  field_id UUID REFERENCES project_custom_fields(id) ON DELETE CASCADE,
  value_text TEXT,
  value_number NUMERIC,
  value_date DATE,
  value_json JSONB,               -- for multi-select, arrays, etc.
  UNIQUE (request_id, field_id)
);
```

### Modified Tables

```sql
-- Add project_id to existing tables
ALTER TABLE requests ADD COLUMN project_id UUID REFERENCES projects(id);
ALTER TABLE activity_log ADD COLUMN project_id UUID REFERENCES projects(id);
ALTER TABLE roadmap_items ADD COLUMN project_id UUID REFERENCES projects(id);

-- Add super_admin role to users
-- (In Supabase, handled via user metadata or a separate super_admins table)
```

## UI Changes

### Header/Navigation
- Project selector dropdown (shows current project name)
- Quick-switch between projects
- Super admin indicator badge

### Request Form (Dynamic)
- Renders based on project field config
- Submitters see only `visibility: 'submitter'` fields (max 4-5)
- Admins see all fields
- Custom fields rendered by type with appropriate input widgets

### Project Settings (Admin)
- **Fields tab**: Toggle default fields, customize options, create custom fields
- **Members tab**: Invite users, manage roles
- **General tab**: Project name, description, slug

### Super Admin Dashboard
- Project list management
- Pending project approvals
- Platform-wide analytics

## Out of Scope (Future)

- Custom branding per project
- Project-level billing
- API rate limiting per project
- Project archival/deletion workflow
- Data export per project

## Dependencies

- Supabase Migration (for scalable database, RLS, auth)

## Effort Estimate

XL — Multi-tenant architecture, dynamic forms, new UI flows, data migration
