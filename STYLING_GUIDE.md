# Styling Guide

This document outlines the centralized styling system for the Intelligence Exchange app.

## Design System

### Colors
- **Brand Black**: `#0c0c0c` - Primary text, borders, buttons
- **Brand Gray**: `#bec2c6` - Secondary borders, muted text
- **Brand White**: `#ffffff` - Backgrounds
- **Brand Yellow**: `#f7f126` - Accents (if needed)

### Typography

#### Font Families
- **Heading**: Bebas Neue Pro (for large titles, all-caps)
- **Body**: Inter (for all body text, labels - heavier weight for better readability at small sizes)
- **Decorative**: Baskervville (reserved for special use)
- **Monospace**: SF Mono (for numbers, prices, metrics - with tabular-nums for alignment)

#### Font Sizes
- `text-xs`: 12px - Small labels, metadata
- `text-sm`: 14px - Body text, buttons
- `text-base`: 16px - Standard body text
- `text-lg`: 18px - Subheadings
- `text-xl`: 20px - Section headings
- `text-2xl`: 24px - Page titles
- `text-3xl`: 30px - Hero titles
- `text-4xl`: 36px - Large hero titles

### Spacing
- Use Tailwind's spacing scale (4px increments)
- Common padding: `p-4 md:p-6` for sections
- Common gaps: `gap-2`, `gap-3`, `gap-4` for flex/grid

### Borders
- **Default**: `border-brand-gray/20` - Subtle borders
- **Active/Selected**: `border-brand-gray/50` - Medium emphasis
- **Hover**: `border-brand-black/70` - Interactive states
- **All borders**: `rounded-none` (no border radius)

## Reusable Components

### Buttons
```tsx
// Primary button
<button className="btn-primary">Save</button>

// Secondary button
<button className="btn-secondary">Cancel</button>
```

### Inputs
```tsx
<input className="input-base" placeholder="Enter text..." />
```

### Cards/Panels
```tsx
<div className="card-base section-padding">
  Content here
</div>
```

### Text Utilities
```tsx
<p className="text-label">Small label</p>
<p className="text-body-sm">Small body text</p>
<p className="text-body">Body text</p>
<h2 className="text-heading-sm">Small heading</h2>
<h1 className="text-heading">Section heading</h1>
<h1 className="text-heading-lg">Large heading</h1>
```

## Best Practices

1. **Always use brand colors**: Use `brand-black`, `brand-gray`, `brand-white` instead of generic colors
2. **Consistent borders**: Use `border-soft` or `border-active` utilities
3. **No border radius**: Keep `rounded-none` for the sharp, modern look
4. **Font consistency**: 
   - Use `font-heading` only for large titles (text-xl and above)
   - Use `font-body` for everything else
   - Avoid all-caps on small text (text-sm and below)
5. **Spacing consistency**: Use the same padding patterns across similar components
6. **Color coding**: 
   - Green (`text-green-500`) for positive/up trends
   - Red (`text-red-500`) for negative/down trends
   - Use opacity variants for softer borders (`/20`, `/50`, `/70`)

## File Structure

- **`src/index.css`**: Global styles, custom components, utilities
- **`tailwind.config.js`**: Design tokens, colors, fonts, spacing
- **Component files**: Use Tailwind classes, prefer reusable utilities from index.css

