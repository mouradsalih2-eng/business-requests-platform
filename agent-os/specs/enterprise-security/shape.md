# Enterprise Security & Encryption - Shaping Notes

## Problem Statement

Enterprise customers have security requirements beyond standard web application practices:
- Compliance certifications (SOC 2, GDPR, HIPAA)
- Data protection for sensitive business information
- Audit trails for accountability
- Data residency for regulatory compliance

## What Supabase Provides (Baseline)

Already covered by Supabase Migration (Feature 3):
- **Encryption at rest**: AES-256 for PostgreSQL data
- **Encryption in transit**: TLS 1.2+ for all connections
- **Storage encryption**: Encrypted file storage
- **Access controls**: Row Level Security (RLS)
- **SOC 2 Type II**: Supabase is certified

## Key Decisions

### 1. Field-Level Encryption Scope
- **Decision**: Encrypt sensitive text fields only
- **Encrypt**:
  - `requests.description` - may contain confidential strategy
  - `comments.content` - internal discussions
  - `attachments` - already encrypted via Supabase Storage
- **Don't Encrypt** (needed for search/filter):
  - `requests.title` - needed for search
  - Status, category, priority, timestamps
  - User emails (needed for auth lookup)
- **Rationale**: Balance security with functionality

### 2. Encryption Algorithm
- **Decision**: AES-256-GCM (authenticated encryption)
- **Rationale**:
  - Industry standard
  - Provides integrity verification
  - Well-supported in Node.js crypto

### 3. Key Management
- **Decision**: Per-project encryption keys stored in environment/secrets manager
- **Structure**:
  ```
  Platform Master Key (env var)
    └── Project Key (derived per project)
         └── Encrypts project data
  ```
- **Key Rotation**: Support rotating keys with re-encryption job
- **Rationale**: Isolation between projects, manageable key count

### 4. Searchable Encryption
- **Decision**: Encrypted fields not directly searchable
- **Workaround**:
  - Full-text search on titles (unencrypted)
  - Filter by metadata fields (unencrypted)
  - Decrypt and search in application layer (expensive, limited)
- **Future**: Consider searchable encryption schemes if needed
- **Rationale**: True searchable encryption is complex; defer until required

### 5. Audit Logging
- **Decision**: Enhance existing activity_log for compliance
- **Log Events**:
  - All data access (read/write)
  - Authentication events
  - Permission changes
  - Admin actions
  - Data exports
- **Retention**: Configurable per project (default 2 years)
- **Format**: Structured JSON for SIEM integration

### 6. Data Residency
- **Decision**: Leverage Supabase regions
- **Options**:
  - US (default)
  - EU (GDPR)
  - Other regions as Supabase adds them
- **Implementation**: Project-level config, affects Supabase project selection
- **Rationale**: Supabase handles infrastructure; we configure per project

## Technical Implementation

### Encryption Service
```javascript
// server/src/services/encryption.js
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

export function encrypt(plaintext, projectKey) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, projectKey, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const authTag = cipher.getAuthTag();

  // Return IV + AuthTag + Ciphertext
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

export function decrypt(encryptedData, projectKey) {
  const [ivB64, authTagB64, ciphertext] = encryptedData.split(':');

  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, projectKey, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
```

### Key Derivation
```javascript
// Derive project-specific key from master key
export function deriveProjectKey(masterKey, projectId) {
  return crypto.pbkdf2Sync(
    masterKey,
    `project-${projectId}`,
    100000,
    32,
    'sha256'
  );
}
```

### Usage in Routes
```javascript
// Creating a request
const encryptedDescription = encrypt(description, projectKey);
await supabase.from('requests').insert({
  title, // unencrypted for search
  description: encryptedDescription,
  // ...
});

// Reading a request
const { data } = await supabase.from('requests').select();
data.description = decrypt(data.description, projectKey);
```

### Enhanced Audit Log Schema
```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id INTEGER,
  user_id INTEGER,
  event_type TEXT NOT NULL, -- 'read', 'write', 'delete', 'auth', 'export'
  resource_type TEXT, -- 'request', 'comment', 'user'
  resource_id TEXT,
  action TEXT, -- specific action taken
  ip_address INET,
  user_agent TEXT,
  metadata JSONB, -- additional context
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for compliance queries
CREATE INDEX audit_log_project_date ON audit_log(project_id, created_at);
CREATE INDEX audit_log_user ON audit_log(user_id, created_at);
```

## Project Settings (Admin)

```javascript
// Project security configuration
{
  encryption: {
    enabled: true,
    fields: ['description', 'comments']
  },
  audit: {
    enabled: true,
    retentionDays: 730, // 2 years
    logReads: true // log data access, not just writes
  },
  dataResidency: 'eu' // 'us', 'eu', etc.
}
```

## Compliance Documentation

Create documentation for enterprise sales:
- Security whitepaper
- Data processing agreement (DPA) template
- Penetration test results (annual)
- SOC 2 inheritance from Supabase
- GDPR compliance statement

## Migration Strategy

For existing projects enabling encryption:
1. Enable encryption in project settings
2. Background job encrypts existing data
3. Mark migration complete
4. New data encrypted automatically

## Performance Considerations

- Encryption/decryption adds ~1-2ms per field
- Batch decrypt for list views
- Cache decrypted data in memory (short TTL)
- Don't encrypt high-volume, low-sensitivity data

## Out of Scope (Future)

- Client-side encryption (E2E)
- Hardware Security Modules (HSM)
- Bring Your Own Key (BYOK)
- Custom compliance certifications
- Third-party security audits

## Dependencies

- **Required**: Supabase Migration (Feature 3)
- **Optional**: Multi-Project SaaS (for per-project keys)

## Effort Estimate

Medium - Encryption service + audit logging + documentation
