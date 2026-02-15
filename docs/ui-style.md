# Favor Portal UI Style Guide

## Color Palette (80/15/5 Rule)

### Canvas (80%)
| Token | Hex | Usage |
|-------|-----|-------|
| `bg-[#FFFEF9]` | Cream | Page backgrounds |
| `bg-[#FAF9F6]` | Warm white | Section backgrounds, empty states |
| `bg-[#F5F3EF]` | Soft beige | Cards, subtle containers |
| `bg-white` | White | Card surfaces |

### Accent (15%)
| Token | Hex | Usage |
|-------|-----|-------|
| `text-[#2b4d24]` / `bg-[#2b4d24]` | Deep Green | Primary buttons, active states, icons |
| `text-[#8b957b]` | Sage | Secondary accents, labels |
| `border-[#c5ccc2]` | Light Sage | Hover borders |
| `border-[#e5e5e0]` | Border | Default borders |

### Highlight (5% max)
| Token | Hex | Usage |
|-------|-----|-------|
| `text-[#e1a730]` | Gold | Special moments only |
| `text-[#a36d4c]` | Terracotta | Earthy emphasis |

### Text
| Token | Hex | Usage |
|-------|-----|-------|
| `text-[#1a1a1a]` | Charcoal | Headlines, primary text |
| `text-[#333333]` | Dark Gray | Body text |
| `text-[#666666]` | Medium Gray | Secondary text, descriptions |
| `text-[#999999]` | Light Gray | Captions, metadata, breadcrumbs |

## Typography

- **Headlines**: `font-serif` (Cormorant Garamond) - used on all `<h1>`-`<h6>` and section titles
- **Body/UI**: `font-sans` (Montserrat) - default for all body text, buttons, labels

### Type Scale
| Element | Class | Weight |
|---------|-------|--------|
| Page title | `font-serif text-3xl font-semibold` | 600 |
| Section title | `font-serif text-2xl font-semibold` | 600 |
| Card title | `font-serif text-lg font-semibold` | 600 |
| Body | `text-sm` (14px) or `text-base` (16px) | 300-400 |
| Caption | `text-xs` (12px) | 400 |
| Micro | `text-[10px]` | 400-500 |

## Spacing

- Page padding: `px-4 sm:px-6` (16px / 24px)
- Max content width: `max-w-6xl` (1152px)
- Section spacing: `space-y-10` or `space-y-12` between major sections
- Card padding: `p-5` or `p-6`
- Grid gaps: `gap-4` (16px) for cards, `gap-3` (12px) for compact lists

## Components

### SectionHeader
```tsx
import { SectionHeader } from "@/components/portal/section-header";

<SectionHeader
  title="Section Title"
  subtitle="Optional description"
  href="/link"        // Optional "View All" link
  linkText="View All" // Customize link text
/>
```

### EmptyState
```tsx
import { EmptyState } from "@/components/portal/empty-state";
import { Heart } from "lucide-react";

<EmptyState
  icon={Heart}
  title="No items yet"
  description="A helpful message about what to do."
  actionLabel="Get Started"
  actionHref="/path"
/>
```

### ModuleTile
```tsx
import { ModuleTile } from "@/components/portal/module-tile";

<ModuleTile
  title="Giving"
  description="Track gifts and download receipts."
  icon="Heart"        // String key matching lucide icon map
  href="/giving"
  badge="12 gifts"    // Optional status badge
  onClick={() => {}}  // Optional click handler (overrides href)
/>
```

Available icon keys: `Heart`, `GraduationCap`, `TrendingUp`, `User`, `Settings`, `MessageCircle`

### NewsCard
```tsx
import { NewsCard } from "@/components/portal/news-card";

<NewsCard item={newsItem} />               // Full card with image area
<NewsCard item={newsItem} variant="compact" /> // Compact list item
```

### NewsCarousel
```tsx
import { NewsCarousel } from "@/components/portal/news-carousel";

<NewsCarousel items={NEWS_FEED} />
```

### GiveNowDialog
```tsx
import { GiveNowDialog } from "@/components/portal/give-now-dialog";

<GiveNowDialog
  onGiftComplete={() => refreshData()}
  trigger={<Button>Give Now</Button>}  // Optional custom trigger
/>
```

Multi-step flow: Amount -> Frequency/Designation -> Confirm -> Receipt with download.

### ContactSupportDialog
```tsx
import { ContactSupportDialog } from "@/components/portal/contact-support-dialog";

<ContactSupportDialog
  trigger={<Button>Contact</Button>}  // Optional custom trigger
/>
```

Includes form submission and ticket history view.

## Button Variants

| Variant | Usage | Example |
|---------|-------|---------|
| Primary | Main actions | `bg-[#2b4d24] hover:bg-[#1a3a15]` |
| Outline | Secondary actions | `variant="outline"` |
| Ghost | Tertiary / inline links | `variant="ghost" text-[#2b4d24]` |

## Card Styles

- Default: `border-[#e5e5e0]` border, white background
- Hover: `hover:border-[#c5ccc2] hover:shadow-sm`
- Muted: `bg-[#FAF9F6]` background for info cards
- Green gradient: `bg-gradient-to-br from-[#2b4d24] to-[#3d6633]` for impact/hero cards

## Adding a New Module Tile

1. Add entry to `MODULE_TILES` array in `lib/portal-mock-data.ts`
2. If using a new icon, add it to `ICON_MAP` in `components/portal/module-tile.tsx`
3. The tile will appear automatically on the Portal Home grid
4. Create the destination page under `app/(portal)/your-module/page.tsx`
5. Add the route to `NAV_ITEMS` in `components/portal/portal-shell.tsx` for the drawer menu

## Layout Rules

- No permanent sidebar. Navigation lives in a sheet/drawer triggered by the menu button.
- Content is constrained to `max-w-6xl` and centered.
- All pages use breadcrumb navigation at the top.
- The layout works well at 900px and 1100px iframe widths.
- The top bar is compact (h-14) to minimize vertical space consumption in iframes.
