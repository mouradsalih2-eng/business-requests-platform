# AI Assistant (Anthropic Claude) — Shaping Notes

## Problem Statement

Admins need help making sense of large volumes of feature requests. Manual analysis of trends, priorities, and patterns is time-consuming and subjective.

## Key Decisions

### 1. AI Provider
- **Decision**: Anthropic Claude API
- **Model**: Claude Sonnet (balance of cost/speed/quality)
- **Rationale**: Best reasoning for analytical tasks, strong summarization

### 2. Access Control
- **Decision**: Admin-only feature
- Regular users do not see or access the AI assistant
- Prevents unnecessary API usage

### 3. Interface
- **Decision**: Chat-style interface in admin panel
- Sidebar panel or dedicated page
- Conversational interaction with request data context
- Suggested prompts for common tasks

### 4. Server Architecture
- **Decision**: Server-side proxy to Claude API
- API key stored server-side only (never exposed to client)
- Rate limiting on AI endpoint
- Streaming responses for better UX

### 5. Capabilities
- **Summarize requests**: "What are the top themes from last month's requests?"
- **Identify trends**: "What patterns do you see in feature requests?"
- **Suggest priorities**: "Which requests should we prioritize based on votes and business impact?"
- **Draft responses**: "Write a status update for request #123"
- **Compare requests**: "Are these requests duplicates or related?"

### 6. Context Strategy
- **Decision**: Pass relevant request data as context per query
- Time-filtered (e.g., last 30 days, last quarter)
- Include: title, description, votes, status, comments summary
- Truncate/summarize if context exceeds token limits
- Do NOT send sensitive user data (emails, passwords)

## Data Model

```sql
-- AI conversation history (optional, for continuity)
CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES auth.users(id),
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  tokens_used INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## API Endpoints

- `POST /api/ai/chat` — Send message, get AI response (streaming)
- `GET /api/ai/conversations` — List admin's conversations
- `GET /api/ai/conversations/:id` — Get conversation history
- `DELETE /api/ai/conversations/:id` — Delete conversation

## Environment Variables

- `ANTHROPIC_API_KEY` — Claude API key (server-side only)

## Files to Change

### Server
- `server/src/routes/ai.js` — New route file
- `server/src/index.js` — Mount AI routes

### Client
- `client/src/pages/AdminPanel.jsx` — Add AI tab/section
- `client/src/components/ai/AiChat.jsx` — Chat interface component
- `client/src/lib/api.js` — Add AI API methods

## Dependencies

None (can use Claude API directly)

## Effort Estimate

Large — API integration, streaming, chat UI, context management
