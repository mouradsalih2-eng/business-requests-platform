# Design System

Reference for all UI components, tokens, and patterns used across the Business Requests Platform.

## Color Tokens

### Brand Colors
| Token | Light Mode | Dark Mode | Usage |
|-------|-----------|-----------|-------|
| Primary | `#4F46E5` | `#6366F1` | Buttons, active states, links |
| Primary Hover | `#4338CA` | `#818CF8` | Button hover states |
| Primary Active | `#3730A3` | `#6366F1` | Button pressed state |
| Danger | `red-600` | `red-500` | Destructive actions |
| Like Active | `#E11D48` | `#F43F5E` | Active like button |

### Surface Colors (Dark Mode Hex Tokens)
| Token | Value | Usage |
|-------|-------|-------|
| `--bg-primary` | `#010409` | Page background |
| `--bg-secondary` | `#0D1117` | Card/sidebar background |
| `--bg-tertiary` | `#161B22` | Elevated surfaces, modals |
| `--bg-surface` | `#21262D` | Hover states, input backgrounds |
| `--bg-overlay` | `#2D333B` | Tooltips, dropdowns |
| `--border-default` | `#30363D` | Default borders |
| `--border-muted` | `#484F58` | Hover borders |
| `--text-primary` | `#E6EDF3` | Primary text |
| `--text-secondary` | `#8B949E` | Secondary text, labels |
| `--text-muted` | `#6E7681` | Muted text, timestamps |
| `--text-disabled` | `#484F58` | Disabled text |

### Light Mode
Uses Tailwind `neutral-*` scale:
- Background: `white`, `neutral-50`
- Borders: `neutral-100`, `neutral-200`
- Text: `neutral-900`, `neutral-600`, `neutral-500`, `neutral-400`

## Typography

- **Page titles**: `text-lg font-semibold`
- **Section headings**: `text-sm font-medium uppercase tracking-wider` (muted color)
- **Card titles**: `text-sm sm:text-base font-medium`
- **Body text**: `text-sm`
- **Labels**: `text-xs font-medium`
- **Badges**: `text-xs font-medium`

## Components

### Request Card (`RequestCard.jsx`)
The primary content unit. Key traits:
- `bg-white dark:bg-[#161B22]` with `border-neutral-100 dark:border-[#30363D]` border
- `rounded-lg` corners, `p-4 sm:p-5` padding
- Hover: `hover:border-neutral-200 dark:hover:border-[#484F58] hover:shadow-sm`
- Active press: `active:scale-[0.99] active:bg-neutral-50 dark:active:bg-[#21262D]`
- Transition: `transition-all duration-300 ease-out`
- Footer border: `border-t border-neutral-100 dark:border-[#30363D]`

### Badges
All badges use `inline-flex items-center` with `rounded-md` or `rounded`:
- **Status**: Semantic colors (amber=in_progress, green=completed, red=rejected)
- **Category**: Icon + label, neutral background `bg-neutral-100 dark:bg-[#21262D]`
- **Priority**: Color-coded (low=neutral, medium=amber, high=red)
- **Team**: Indigo tint `bg-indigo-50 dark:bg-[#6366F1]/15`
- **Region**: Purple tint `bg-purple-50 dark:bg-purple-500/15`

### Buttons (`Button.jsx`)
Variants:
- **Primary**: `bg-[#4F46E5] dark:bg-[#6366F1] text-white`
- **Secondary**: `bg-white dark:bg-[#21262D]` with border
- **Ghost**: Text only, hover background
- **Danger**: `bg-red-600 dark:bg-red-500 text-white`

Sizes: `sm` (px-3 py-1.5 text-xs), `md` (px-4 py-2 text-sm), `lg` (px-6 py-2.5 text-sm)

All buttons: `rounded-lg transition-all duration-200` with focus ring `focus:ring-2 focus:ring-[#4F46E5]/30`

### Vote/Like Buttons (inline on cards)
- Upvote active: `bg-[#4F46E5] dark:bg-[#6366F1] text-white`
- Like active: `bg-[#E11D48] dark:bg-[#F43F5E] text-white`
- Inactive: `bg-neutral-100 dark:bg-[#21262D] text-neutral-500 dark:text-[#8B949E]`
- Hover (inactive): `hover:bg-neutral-200 dark:hover:bg-[#2D333B]`
- Animation: `scale-125 -translate-y-0.5` on vote, 300ms duration
- Size: `px-2.5 sm:px-2 py-1.5 sm:py-1 rounded-lg sm:rounded text-xs font-medium`

### Comment Count
- Static (not interactive): `text-neutral-400 dark:text-[#6E7681]`
- Chat bubble icon + count

### Toggle Switch
- Track: `w-9 h-5 rounded-full`
- Thumb: `w-3.5 h-3.5 bg-white rounded-full`
- Active: `bg-[#4F46E5] dark:bg-[#6366F1]`
- Inactive: `bg-neutral-300 dark:bg-[#30363D]`
- Thumb position: `translate-x-[18px]` (on) / `translate-x-[3px]` (off)

### Form Inputs
- `w-full px-3 py-2 border border-neutral-200 dark:border-[#30363D] rounded-lg`
- Background: `bg-white dark:bg-[#0D1117]` or `bg-white dark:bg-[#161B22]`
- Text: `text-neutral-900 dark:text-[#E6EDF3] text-sm`
- Focus: `focus:outline-none focus:border-[#4F46E5]` or `focus:ring-2 focus:ring-[#4F46E5]/30`

### Cards / Containers
- Section card: `bg-white dark:bg-[#161B22]` or `bg-white dark:bg-[#21262D]`
- Border: `border border-neutral-200 dark:border-[#30363D]`
- Rounded: `rounded-xl` (section), `rounded-lg` (content)
- Inner surface: `bg-neutral-50 dark:bg-[#0D1117]` for nested areas

### Admin Tab Bar
- Container: `overflow-x-auto` for horizontal scroll on mobile
- Active tab: `border-b-2 border-[#4F46E5] dark:border-[#6366F1] text-[#4F46E5] dark:text-[#818CF8]`
- Inactive tab: `text-neutral-500 dark:text-[#8B949E] hover:text-neutral-900 dark:hover:text-[#E6EDF3]`
- Tab text: `text-sm font-medium whitespace-nowrap`

## Micro-Interactions

### Transitions
- Default: `transition-colors duration-200` or `transition-all duration-200`
- Card hover: `transition-all duration-300 ease-out`
- Side sheet: `transition-transform duration-300 ease-in-out`

### Animations
- Vote bounce: `scale-125 -translate-y-0.5` for 300ms
- Position change: `ring-2 ring-green-200 dark:ring-green-500/30` (up) / `ring-amber-200` (down)
- Archive exit: 300ms fade-out before removal
- Unread glow: `shadow-[0_0_12px_rgba(99,102,241,0.2)] ring-1 ring-[#4F46E5]/20`

### Hover Tooltips (Desktop Only)
- Show after 300ms delay
- `bg-neutral-900 dark:bg-[#2D333B]` with arrow
- `text-white dark:text-[#E6EDF3] text-xs rounded-lg`
- Hidden on mobile: `hidden sm:block`

## Responsive Patterns

- Cards: `p-4 sm:p-5` padding increase
- Buttons: `min-w-[44px] sm:min-w-0` touch targets on mobile
- Badge hiding: Priority hidden on mobile `hidden sm:inline-flex`
- Status: Dot on mobile, badge on desktop
- Sidebar: Slide-out on mobile (`lg:hidden`), always visible on desktop (`hidden lg:block`)
- Tab bar: Horizontal scroll on mobile with `whitespace-nowrap`
