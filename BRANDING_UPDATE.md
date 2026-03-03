# Sentria Branding Integration

## What Was Done

Successfully integrated the official Sentria logo and symbol throughout the webapp.

---

## Files Added

### Logo Files (in `/public/`)
1. **`sentria-logo.svg`** - Full logo with text (1795.45 × 587.99 px)
   - Used in: Header (desktop), SignInModal
   - Clean, modern wordmark with distinctive "S" symbol

2. **`sentria-symbol.svg`** - Standalone "S" symbol (442.34 × 587.99 px)
   - Used in: Favicon, mobile header
   - Perfect for small spaces and app icons

---

## Updated Components

### 1. **index.html**
```html
<!-- Favicon -->
<link rel="icon" type="image/svg+xml" href="/sentria-symbol.svg" />

<!-- Page title -->
<title>Sentria - Intelligence for Secondary Markets</title>

<!-- Meta description -->
<meta name="description" content="Sentria - Intelligence for secondary markets. Market data aggregation and price discovery for limited-edition assets." />

<!-- Theme color -->
<meta name="theme-color" content="#000000" />
```

**Changes:**
- ✅ Favicon now uses Sentria symbol
- ✅ Title updated to match thesis language
- ✅ Meta description refined
- ✅ Theme color added for mobile browsers

---

### 2. **Header.tsx**

**Desktop View:**
- Full `sentria-logo.svg` displayed (height: 24px)
- Clean, professional look
- Hover opacity effect maintained

**Mobile View:**
- `sentria-symbol.svg` (32px × 32px) next to text
- "Sentria" text + "Market Intelligence" subtitle
- Compact layout for small screens

```tsx
{/* Desktop */}
<img src="/sentria-logo.svg" alt="Sentria" className="hidden md:block h-6" />

{/* Mobile */}
<div className="md:hidden flex items-center gap-2">
  <img src="/sentria-symbol.svg" alt="Sentria" className="h-8 w-8" />
  <div>
    <h1>Sentria</h1>
    <p>Market Intelligence</p>
  </div>
</div>
```

---

### 3. **SignInModal.tsx**

**Added logo at top of modal:**
- Full logo (`sentria-logo.svg`) centered above "Sign In" heading
- Height: 32px
- Creates professional, branded authentication experience

```tsx
{/* Logo */}
<div className="flex justify-center mb-6">
  <img src="/sentria-logo.svg" alt="Sentria" className="h-8" />
</div>
```

---

### 4. **dist/index.html**

Updated production build file with same changes:
- Sentria symbol favicon
- Updated title and meta tags
- Logo files copied to dist folder

---

## Visual Hierarchy

### Primary Branding Locations:
1. **Browser Tab** → Symbol (favicon)
2. **Header Desktop** → Full logo
3. **Header Mobile** → Symbol + Text
4. **Sign-In Modal** → Full logo

### Color Scheme:
- Logo color: Black (`#000000`)
- Background: White (`#FFFFFF`)
- Matches existing design system perfectly

---

## Logo Specifications

### Full Logo (`sentria-logo.svg`)
- **Aspect Ratio:** ~3:1 (wide)
- **Best Use:** Headers, hero sections, wide spaces
- **Min Width:** 100px (for legibility)
- **Recommended Heights:** 24px (header), 32px (modals), 48px (hero)

### Symbol (`sentria-symbol.svg`)
- **Aspect Ratio:** ~3:4 (tall)
- **Best Use:** Favicons, app icons, small spaces, mobile
- **Min Size:** 16px × 16px (favicon)
- **Recommended Sizes:** 32px, 64px, 128px, 256px

---

## Brand Identity

### Typography in Logo:
- Custom geometric sans-serif
- Bold, modern, technical aesthetic
- Distinctive "S" symbol with angular design
- "entria" in clean, sans-serif type

### Visual Personality:
- **Professional** - Clean lines, geometric shapes
- **Technical** - Terminal-inspired, data-focused
- **Modern** - Contemporary design language
- **Bold** - Strong presence, confident

### Alignment with Thesis:
The logo's **clean, institutional aesthetic** perfectly supports your positioning as:
- "Intelligence layer for secondary markets"
- "Bloomberg Terminal for resale"
- Professional market infrastructure (not consumer marketplace)

---

## File Locations

```
/public/
  ├── sentria-logo.svg      ← Full logo
  └── sentria-symbol.svg    ← Symbol/icon

/dist/
  ├── sentria-logo.svg      ← Production copy
  └── sentria-symbol.svg    ← Production copy

/src/components/
  ├── Header.tsx            ← Updated with logo
  └── SignInModal.tsx       ← Updated with logo

/index.html                 ← Updated favicon & title
/dist/index.html            ← Updated favicon & title
```

---

## Testing Checklist

### Browser Tab / Favicon
- [ ] Favicon displays correctly in Chrome
- [ ] Favicon displays correctly in Safari
- [ ] Favicon displays correctly in Firefox
- [ ] Bookmark icon shows Sentria symbol

### Header
- [ ] Desktop shows full logo (not cut off)
- [ ] Mobile shows symbol + text
- [ ] Logo is clickable → returns to home
- [ ] Hover effect works

### Sign-In Modal
- [ ] Logo appears centered at top
- [ ] Logo is proportional (not stretched)
- [ ] Works on mobile and desktop

### Production Build
- [ ] Logo files exist in dist folder
- [ ] Build command includes logo files
- [ ] Production deployment shows correct branding

---

## Next Steps (Optional)

### Future Enhancements:
1. **Progressive Web App (PWA)**
   - Add various icon sizes (192px, 512px)
   - Create `manifest.json` with Sentria branding
   - Enable "Add to Home Screen" with proper icons

2. **Social Media Meta Tags**
   - Open Graph image (og:image) with logo
   - Twitter Card with logo
   - Better social sharing appearance

3. **Loading Screen**
   - Add Sentria logo to initial load state
   - Animated symbol for loading indicator

4. **404/Error Pages**
   - Branded error states with logo

5. **Email Templates**
   - Use logo in magic link emails
   - Branded email footer

---

## Brand Guidelines (Quick Reference)

### Logo Usage:
✅ **DO:**
- Use on white or very light backgrounds
- Maintain aspect ratio
- Ensure minimum size requirements
- Keep adequate clearspace

❌ **DON'T:**
- Stretch or distort logo
- Use on busy backgrounds
- Change logo colors (always black)
- Rotate or skew logo

### When to Use Full Logo vs Symbol:
- **Full Logo:** Headers, modals, landing pages, desktop
- **Symbol:** Favicons, mobile headers, tight spaces, app icons

---

## Summary

Sentria's branding is now professionally integrated throughout the webapp:
- ✅ Consistent favicon across all pages
- ✅ Professional header with logo
- ✅ Branded sign-in experience
- ✅ Production-ready files
- ✅ Mobile-optimized layouts
- ✅ Aligned with thesis positioning

The clean, technical aesthetic reinforces your positioning as **intelligence infrastructure** for secondary markets — not a consumer marketplace, but a professional market tool.

