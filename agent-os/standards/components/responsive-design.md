# Responsive Design Pattern

Mobile-first design using Tailwind `sm:` breakpoint (640px):

```jsx
// Hide/show by screen size
<div className="sm:hidden">Mobile only</div>
<div className="hidden sm:block">Desktop only</div>

// Responsive layout
<div className="flex flex-col sm:flex-row gap-3">
  {/* Stacks on mobile, horizontal on desktop */}
</div>

// Responsive spacing
<div className="p-4 sm:p-6">...</div>

// Responsive text
<h3 className="text-sm sm:text-base font-medium">...</h3>

// Touch-friendly buttons (44px minimum)
<button className="min-w-[44px] sm:min-w-0 justify-center">...</button>
```

**Why mobile-first:** Easier to add complexity than remove it.

**Common patterns:**
- `hidden sm:block` / `sm:hidden` - conditional visibility
- `flex-col sm:flex-row` - stack to row layout
- `text-sm sm:text-base` - responsive typography
- `min-w-[44px]` - touch target minimum (mobile accessibility)

**Rules:**
- Start with mobile styles, add `sm:` for larger screens
- Use `sm:` (640px) as primary breakpoint, `lg:` (1024px) for sidebar
- Ensure 44px minimum touch targets on mobile

