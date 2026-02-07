# Component Folder Organization

Components organized by type with shared primitives separated:

```
/components/
├── /ui           # Reusable primitives (Button, Input, Badge, Modal)
├── /requests     # Feature-specific (RequestCard, RequestList)
├── /layout       # Page structure (Header, Sidebar, Layout)
├── /social       # Social features (CommentSection, VoteButtons)
├── /settings     # Settings features
└── /auth         # Auth features
```

**Why feature-driven:** Keeps feature logic isolated while sharing primitives across features.

**Rules:**
- Primitives in `/ui` - components used across multiple features
- Feature components in named folders - components specific to one feature
- One component per file, named after component
- Tests in `__tests__` folder or colocated `.test.jsx` files

