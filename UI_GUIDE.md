# UI Guide - Intelligence Exchange

This comprehensive guide documents all UI patterns, layout structures, and design decisions for the Intelligence Exchange app. **Reference this guide whenever adding new features or components.**

## Table of Contents

1. [Layout Patterns](#layout-patterns)
2. [Component Structure](#component-structure)
3. [Typography](#typography)
4. [Colors & Theming](#colors--theming)
5. [Spacing System](#spacing-system)
6. [Common Components](#common-components)
7. [Responsive Design](#responsive-design)
8. [Accessibility](#accessibility)

---

## Layout Patterns

### Main View Containers

**Full-Width Views** (Use for dashboard-style views that need maximum screen real estate):
```tsx
<main className="flex-1 flex flex-col bg-brand-white px-2 py-2 md:px-3 md:py-3 pb-20 md:pb-4 w-full">
  {/* Content */}
</main>
```

**Examples**: Home view, Market Overview

**Constrained-Width Views** (Use for content-focused views that benefit from max-width):
```tsx
<main className="flex-1 flex flex-col bg-brand-white px-2 py-2 md:px-3 md:py-3 pb-20 md:pb-4 w-full max-w-8xl mx-auto">
  {/* Content */}
</main>
```

**Examples**: Watchlist, Drops, Education Hub, Analyst Dashboard

**Decision Rule**: 
- Use **full-width** for data-dense dashboards, market overviews, and views with complex layouts
- Use **constrained-width** for content-focused views, forms, and reading experiences

### Page Structure

Every main view should follow this structure:

```tsx
<main className="flex-1 flex flex-col bg-brand-white px-2 py-2 md:px-3 md:py-3 pb-20 md:pb-4 w-full">
  {/* Header Section */}
  <div className="mb-3 md:mb-4 pb-3 border-b border-brand-gray/30">
    <h1 className="text-lg md:text-xl font-heading font-normal text-brand-black mb-1 leading-tight">
      Page Title
    </h1>
    <p className="text-xs text-brand-black/70 leading-tight">
      Page description or subtitle
    </p>
  </div>

  {/* Main Content */}
  <div className="space-y-4 md:space-y-6">
    {/* Content sections */}
  </div>
</main>
```

### Mobile Bottom Padding

Always include `pb-20 md:pb-4` on main containers to account for the mobile bottom navigation:
- `pb-20`: Mobile bottom padding (80px for bottom nav)
- `md:pb-4`: Desktop bottom padding (16px, no bottom nav)

---

## Component Structure

### Section Headers

Standard section header pattern:

```tsx
<div className="mb-3 md:mb-4 pb-3 border-b border-brand-gray/30">
  <div className="flex items-center justify-between">
    <div>
      <h1 className="text-lg md:text-xl font-heading font-normal text-brand-black mb-1 leading-tight">
        Section Title
      </h1>
      <p className="text-xs text-brand-black/70 leading-tight">
        Optional description
      </p>
    </div>
    {/* Optional right-side content (counts, actions, etc.) */}
  </div>
</div>
```

### Cards/Panels

Standard card pattern:

```tsx
<div className="border border-brand-gray/30 bg-brand-white p-4 md:p-6">
  {/* Card content */}
</div>
```

For nested cards or subtle separation:

```tsx
<div className="border border-brand-gray/20 bg-brand-white p-3">
  {/* Subtle card content */}
</div>
```

### Grid Layouts

**2-Column Grid** (responsive):
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
  {/* Grid items */}
</div>
```

**3-Column Grid**:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Grid items */}
</div>
```

**4-Column Grid** (metrics):
```tsx
<div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
  {/* Metric cards */}
</div>
```

---

## Typography

### Font Families

- **`font-heading`**: Bebas Neue Pro - Use for large titles (text-xl and above), page headers
- **`font-body`**: Inter - Use for all body text, labels, descriptions
- **`font-mono`**: SF Mono - Use for numbers, prices, metrics, IDs
- **`font-decorative`**: Baskervville - Reserved for special decorative use

### Font Sizes

| Size | Pixels | Usage |
|------|--------|-------|
| `text-[9px]` | 9px | Tiny labels, metadata |
| `text-[10px]` | 10px | Small labels, captions |
| `text-xs` | 12px | Labels, metadata, small text |
| `text-sm` | 14px | Body text, buttons |
| `text-base` | 16px | Standard body text |
| `text-lg` | 18px | Subheadings, section titles |
| `text-xl` | 20px | Page titles |
| `text-2xl` | 24px | Large page titles |
| `text-3xl` | 30px | Hero titles |
| `text-4xl` | 36px | Large hero titles |

### Typography Patterns

**Page Title**:
```tsx
<h1 className="text-lg md:text-xl font-heading font-normal text-brand-black mb-1 leading-tight">
  Page Title
</h1>
```

**Section Heading**:
```tsx
<h2 className="text-sm md:text-base font-medium text-brand-black mb-1">
  Section Heading
</h2>
```

**Body Text**:
```tsx
<p className="text-xs text-brand-black/70 leading-tight">
  Body text content
</p>
```

**Metric/Number**:
```tsx
<p className="text-lg font-mono font-semibold text-brand-black">
  {value}
</p>
```

**Label**:
```tsx
<p className="text-[10px] text-brand-black/60 uppercase tracking-wide mb-0.5">
  Label Text
</p>
```

---

## Colors & Theming

### Brand Colors

| Color | Variable | Usage |
|-------|----------|-------|
| Brand Black | `brand-black` / `#0c0c0c` | Primary text, borders, buttons |
| Brand Gray | `brand-gray` / `#bec2c6` | Secondary borders, muted text |
| Brand White | `brand-white` / `#ffffff` | Backgrounds |
| Brand Yellow | `brand-yellow` / `#f7f126` | Accents (sparingly) |

### Color Opacity Variants

Use opacity variants for subtle borders and text:

- `border-brand-gray/20` - Subtle borders
- `border-brand-gray/30` - Standard borders
- `border-brand-gray/50` - Medium emphasis
- `text-brand-black/60` - Muted text
- `text-brand-black/70` - Secondary text
- `bg-brand-gray/5` - Subtle backgrounds
- `bg-brand-gray/10` - Light hover states

### Semantic Colors

**Positive/Success** (gains, increases):
- `text-green-600` - Text
- `bg-green-50` - Background
- `border-green-600` - Borders

**Negative/Error** (losses, decreases):
- `text-red-600` - Text
- `bg-red-50` - Background
- `border-red-600` - Borders

**Warning**:
- `text-yellow-600` - Text
- `bg-yellow-50` - Background
- `border-yellow-300` - Borders

**Info**:
- `text-blue-600` - Text
- `bg-blue-50` - Background

---

## Spacing System

### Padding Patterns

**Main Container Padding**:
```tsx
px-2 py-2 md:px-3 md:py-3
```
- Mobile: 8px horizontal, 8px vertical
- Desktop: 12px horizontal, 12px vertical

**Card Padding**:
```tsx
p-4 md:p-6
```
- Mobile: 16px
- Desktop: 24px

**Compact Card Padding**:
```tsx
p-3
```
- 12px all sides

### Gap Patterns

**Section Spacing**:
```tsx
space-y-4 md:space-y-6
```
- Mobile: 16px between sections
- Desktop: 24px between sections

**Grid Gaps**:
```tsx
gap-3 md:gap-4
```
- Mobile: 12px
- Desktop: 16px

**Flex Gaps**:
```tsx
gap-2  // 8px - tight spacing
gap-3  // 12px - standard spacing
gap-4  // 16px - comfortable spacing
```

### Margin Patterns

**Section Bottom Margin**:
```tsx
mb-3 md:mb-4  // 12px mobile, 16px desktop
mb-4 md:mb-6  // 16px mobile, 24px desktop
```

---

## Common Components

### Buttons

**Primary Button**:
```tsx
<button className="px-3 py-1.5 border border-brand-black bg-brand-black text-brand-white text-xs font-semibold uppercase tracking-wide hover:bg-brand-black/90 transition-colors">
  Button Text
</button>
```

**Secondary Button**:
```tsx
<button className="px-3 py-1.5 border border-brand-gray/30 bg-brand-white text-brand-black text-xs font-medium hover:border-brand-black hover:bg-brand-gray/10 transition-colors">
  Button Text
</button>
```

**Important**: Always include `style={{ borderRadius: '0px' }}` on buttons to maintain sharp corners.

### Input Fields

```tsx
<input
  className="w-full px-3 py-2 border border-brand-gray/30 bg-brand-white text-brand-black text-sm focus:outline-none focus:border-brand-black"
  style={{ borderRadius: '0px' }}
  placeholder="Enter text..."
/>
```

### Dividers

**Section Divider**:
```tsx
<div className="border-b border-brand-gray/30"></div>
```

**Subtle Divider**:
```tsx
<div className="border-b border-brand-gray/20"></div>
```

**Vertical Divider**:
```tsx
<div className="h-4 w-px bg-brand-gray/30"></div>
```

### Loading States

```tsx
<div className="flex items-center justify-center p-8">
  <div className="flex flex-col items-center gap-3">
    <svg className="w-6 h-6 animate-spin text-brand-black/60" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    <p className="text-sm text-brand-black/60">Loading...</p>
  </div>
</div>
```

### Empty States

```tsx
<div className="border border-brand-gray/30 p-8 text-center bg-brand-white">
  <svg className="w-12 h-12 mx-auto text-brand-black/30 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    {/* Icon */}
  </svg>
  <p className="text-sm font-medium text-brand-black mb-1.5 leading-tight">
    Empty State Title
  </p>
  <p className="text-xs text-brand-black/70 mb-4 leading-tight">
    Empty state description
  </p>
  <button className="px-3 py-1.5 border border-brand-black bg-brand-black text-brand-white text-xs font-medium hover:bg-brand-black/90 transition">
    Action Button
  </button>
</div>
```

### Error States

```tsx
<div className="border border-red-200 bg-red-50 p-6 text-center">
  <div className="inline-flex items-center justify-center w-12 h-12 bg-red-100 mb-3">
    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      {/* Error icon */}
    </svg>
  </div>
  <p className="text-sm font-medium text-red-800 mb-1.5 leading-tight">
    Error Title
  </p>
  <p className="text-xs text-red-600 mb-4 leading-tight">
    Error message
  </p>
  <button className="px-4 py-2 text-xs font-medium border border-red-600 bg-red-600 text-white hover:bg-red-700">
    Retry
  </button>
</div>
```

---

## Responsive Design

### Breakpoints

| Breakpoint | Width | Usage |
|------------|-------|-------|
| Mobile (default) | < 768px | Base styles |
| `md:` | ≥ 768px | Tablet and desktop |
| `lg:` | ≥ 1024px | Large desktop |
| `xl:` | ≥ 1280px | Extra large desktop |

### Responsive Patterns

**Mobile-First Approach**: Always design for mobile first, then add `md:` variants for larger screens.

**Common Responsive Patterns**:

```tsx
{/* Padding */}
className="px-2 md:px-3 py-2 md:py-3"

{/* Text Size */}
className="text-lg md:text-xl"

{/* Spacing */}
className="mb-3 md:mb-4"
className="gap-3 md:gap-4"

{/* Grid Columns */}
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"

{/* Display */}
className="hidden md:flex"
className="md:hidden"
```

---

## Accessibility

### Semantic HTML

- Use `<main>` for main content areas
- Use proper heading hierarchy (`h1` → `h2` → `h3`)
- Use `<button>` for interactive elements, not `<div>`
- Use `<nav>` for navigation

### ARIA Labels

```tsx
<button
  aria-label="Close modal"
  aria-expanded={isOpen}
  aria-controls="modal-content"
>
  Close
</button>
```

### Keyboard Navigation

- All interactive elements should be keyboard accessible
- Use `tabIndex` appropriately (avoid `tabIndex={-1}` unless necessary)
- Provide focus states: `focus:outline-none focus:border-brand-black`

### Screen Reader Support

```tsx
{/* Skip link */}
<a href="#main-content" className="skip-link">
  Skip to main content
</a>

{/* Live region for announcements */}
<div 
  role="status" 
  aria-live="polite" 
  aria-atomic="true"
  className="sr-only"
>
  {announcement}
</div>
```

---

## Design Principles

### 1. Sharp, Modern Aesthetic
- **No border radius**: Always use `borderRadius: '0px'` or `rounded-none`
- **Clean lines**: Sharp corners, straight edges
- **Minimal decoration**: Focus on content and functionality

### 2. Data Density
- Maximize information display without clutter
- Use compact spacing for data-heavy views
- Prioritize readability

### 3. Consistency
- Use the same patterns across similar components
- Maintain consistent spacing and typography
- Follow the established color system

### 4. Mobile-First
- Design for mobile screens first
- Ensure touch targets are at least 44x44px
- Test on actual mobile devices

### 5. Performance
- Use lazy loading for heavy components
- Optimize images and assets
- Minimize re-renders with proper React patterns

---

## Quick Reference Checklist

When adding a new view or component, ensure:

- [ ] Uses correct layout pattern (full-width vs constrained)
- [ ] Includes proper mobile bottom padding (`pb-20 md:pb-4`)
- [ ] Follows typography hierarchy
- [ ] Uses brand colors consistently
- [ ] Includes responsive breakpoints
- [ ] Has proper spacing (`px-2 py-2 md:px-3 md:py-3` for main, `p-4 md:p-6` for cards)
- [ ] No border radius (sharp corners)
- [ ] Accessible (semantic HTML, ARIA labels)
- [ ] Loading and error states included
- [ ] Empty states handled

---

## Examples

### Complete View Example

```tsx
import React from "react";

export const ExampleView: React.FC<{ data: any[] }> = ({ data }) => {
  return (
    <main className="flex-1 flex flex-col bg-brand-white px-2 py-2 md:px-3 md:py-3 pb-20 md:pb-4 w-full">
      {/* Header */}
      <div className="mb-4 pb-3 border-b border-brand-gray/30">
        <h1 className="text-lg md:text-xl font-heading font-normal text-brand-black mb-1 leading-tight">
          Example View
        </h1>
        <p className="text-xs text-brand-black/70 leading-tight">
          View description
        </p>
      </div>

      {/* Content */}
      {data.length === 0 ? (
        <div className="border border-brand-gray/30 p-8 text-center bg-brand-white">
          <p className="text-sm font-medium text-brand-black mb-1.5">
            No data available
          </p>
        </div>
      ) : (
        <div className="space-y-4 md:space-y-6">
          {data.map((item) => (
            <div key={item.id} className="border border-brand-gray/30 bg-brand-white p-4 md:p-6">
              {/* Item content */}
            </div>
          ))}
        </div>
      )}
    </main>
  );
};
```

---

**Last Updated**: 2024
**Maintained By**: Development Team
**Questions?** Reference existing components or ask the team.

