# Move Roadmap to Sidebar — Shaping Notes

## Problem Statement

Roadmap is currently a tab within the Dashboard page. It deserves its own top-level navigation entry for better discoverability and cleaner separation from the request dashboard.

## Key Decisions

### 1. Navigation Placement
- **Decision**: Add "Roadmap" as a sidebar nav item
- **Route**: `/roadmap` (standalone page)
- **Icon**: Map or flag icon (consistent with existing sidebar style)

### 2. Dashboard Changes
- **Decision**: Remove Roadmap tab from Dashboard
- Dashboard focuses on requests only (All Requests, My Requests, Analytics tabs)
- No more tab switching to reach roadmap

### 3. Existing Functionality
- **Decision**: All current Roadmap Kanban features stay the same
- Drag-and-drop, status columns, sync with requests
- Just moving the component, not redesigning it

## Files to Change

- `client/src/components/layout/Sidebar.jsx` — Add Roadmap nav item
- `client/src/App.jsx` — Add `/roadmap` route
- `client/src/pages/Dashboard.jsx` — Remove Roadmap tab/content
- `client/src/pages/Roadmap.jsx` — New page wrapper (imports existing Kanban component)

## Dependencies

None

## Effort Estimate

Small — Navigation change, component relocation, no backend changes
