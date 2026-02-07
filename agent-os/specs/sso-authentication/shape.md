# SSO Authentication - Shaping Notes

## Problem Statement

Current auth is email/password only. Enterprise customers need:
- Single Sign-On with corporate identity providers
- Social login for easier onboarding
- Reduced password management burden

## Key Decisions

### 1. Implementation Approach
- **Decision**: Use Supabase Auth configuration
- **Rationale**:
  - Already migrating to Supabase (Feature 3)
  - Built-in OAuth providers
  - Enterprise SSO support
  - No additional auth code needed

### 2. OAuth Providers
- **Phase 1**: Google, Microsoft (most common)
- **Phase 2**: Enterprise SAML/OIDC

### 3. User Flow

#### Social Login (Google/Microsoft)
1. User clicks "Sign in with Google/Microsoft"
2. Redirect to OAuth provider
3. User authenticates
4. Redirect back with token
5. Supabase creates/links user account
6. User in app with session

#### Enterprise SAML/OIDC
1. User enters work email
2. System detects enterprise domain
3. Redirect to corporate IdP
4. Authenticate via corporate SSO
5. SAML assertion/OIDC token returned
6. User in app with session

### 4. Account Linking
- **Decision**: Link by email address
- **Rationale**:
  - User with same email via password and Google = same account
  - Prevents duplicate accounts
- **Edge case**: Handle email changes in IdP

### 5. Required vs Optional
- **Decision**: Password auth always available
- **Rationale**:
  - Fallback for SSO issues
  - Personal accounts without corporate SSO
  - Per-project: can require SSO

## Supabase Configuration

### Google OAuth
```javascript
// supabase dashboard or config
{
  provider: 'google',
  options: {
    redirectTo: 'https://app.domain.com/auth/callback'
  }
}
```

### Microsoft OAuth
```javascript
{
  provider: 'azure',
  options: {
    scopes: 'email profile'
  }
}
```

### Enterprise SAML (per project)
```javascript
// Project-specific SAML config
{
  provider: 'saml',
  options: {
    metadata_url: 'https://corp.okta.com/app/.../sso/saml/metadata',
    attribute_mapping: {
      email: 'NameID',
      name: 'displayName'
    }
  }
}
```

## UI Changes

### Login Page
```
[Sign in with Google]
[Sign in with Microsoft]
─── or ───
[Email input]
[Password input]
[Sign In button]
```

### Project Settings (Admin)
- Enable/disable SSO providers
- Configure enterprise SAML/OIDC
- Require SSO for project (disable password)

## Security Considerations

- Token validation on server-side
- Secure session handling
- MFA enforcement option (via IdP)
- Session timeout configuration

## Out of Scope (Future)

- MFA management within app
- Custom OAuth providers
- JIT user provisioning
- SCIM user sync
- Session revocation dashboard

## Dependencies

- **Required**: Supabase Migration (Feature 3)

## Effort Estimate

Small-Medium - Mostly configuration, UI updates for login
