# Feature Flags System - Shaping Notes

## Problem Statement

During MVP testing, we need the ability to enable/disable features without code deployments. This allows:
- Gradual rollout of new features
- A/B testing different configurations
- Quick disabling of problematic features
- Testing core experience without advanced features

## Key Decisions

### 1. Flag Storage
- **Decision**: Database table (not environment variables)
- **Rationale**: Allows runtime toggle without restart, admin UI control

### 2. Default State
- **Decision**: All flags enabled by default (1)
- **Rationale**: Existing behavior preserved, opt-out model

### 3. API Access
- **Decision**: GET is public, PATCH is admin-only
- **Rationale**: Client needs to check flags on load, only admins modify

### 4. Server-side Enforcement
- **Decision**: Roadmap routes check flag via middleware
- **Rationale**: Prevents direct API access when feature disabled

### 5. Client-side Pattern
- **Decision**: Context provider with `useFeatureFlag(name)` hook
- **Rationale**: Consistent pattern, React-native approach

## Out of Scope (Future)

- User-specific flags (targeting)
- Percentage rollouts
- Flag audit history
- API for flag creation/deletion
