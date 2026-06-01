# Apuestas Mundial 2026 - Design Guidelines

## Brand & Style
The design system is engineered for a high-stakes, premium sports wagering environment. It blends the high-octane energy of a global sports broadcast with the precision and reliability of high-end fintech platforms. 

The aesthetic is rooted in **Modern Dark Minimalism** with **Glassmorphism** overlays. It utilizes deep, obsidian-like surfaces to make gold accents and vibrant status indicators pop, creating a "command center" feel. The emotional response should be one of exclusivity, urgency (for live events), and absolute technical confidence.

## Colors
This design system utilizes a high-contrast dark palette designed for readability under stadium lights or in low-light environments.

- **Primary (Gold):** `#ffd165` (main) or `#eab308` (container/gradient). Used for CTA buttons, active states, and critical information like winning odds.
- **Surface (Zinc-950/900):** The foundation of the UI. Zinc-950 serving as the global background (`#09090B` or `#131315`), while Zinc-900 (`#18181B` or `#201f22`) is used for elevated cards and navigation containers.
- **Glassmorphism:** Surfaces use an 80% opacity fill with a 12px backdrop blur to maintain depth without sacrificing legibility.
- **Status Indicators:** 
    - **Live/Pulse (Red):** Pulsating effects for active matches.
    - **Success (Emerald):** Confirmed bets and settled wins.
    - **Info (Blue):** Market analysis and betting tips.

## Typography
Typography is split into two functional roles:
1. **Interface & Editorial (Inter):** High-weight headings (Bold/Black) provide an authoritative broadcast feel. Body text remains clean and highly legible.
2. **Data & Metrics (JetBrains Mono):** All numerical data, including scores, odds, and leaderboard rankings, must use monospaced fonts. This ensures that changing numbers do not cause horizontal layout shifts (tabular figures) and maintains vertical alignment in odds tables.

**Mobile Scaling:** Display and Headline sizes scale down significantly on mobile to maximize data density on the bet slip and match lists.

## Layout & Spacing
The layout follows a **Fluid Grid** model optimized for PWA performance. 

- **Mobile:** A 4-column grid with 16px margins. Bottom-heavy navigation allows for one-handed operation.
- **Desktop:** A 12-column grid with a max-width of 1440px. The sidebar is fixed for quick navigation between leagues.
- **Spacing Rhythm:** Based on a 4px scale. Components (like odds buttons) use tight internal padding (8px x 12px) to maximize the amount of data visible on screen at once.

## Elevation & Depth
Depth is created through **Backdrop Blurs** and **Tonal Layering** rather than traditional heavy shadows.

1. **Level 0 (Base):** Zinc-950 (`#09090B` or `#131315`).
2. **Level 1 (Cards):** Zinc-900 (`#18181B` or `#201f22`) with 80% opacity and a 1px border (`#27272A`).
3. **Level 2 (Active/Live States):** Elements feature a subtle gold inner-glow and a diffuse outer-shadow (`0px 8px 24px rgba(234, 179, 8, 0.15)`).
4. **Level 3 (Modals/Overlays):** 100% Zinc-900 with a golden top-border (2px) to signal premium status.

## Shapes
The design system uses a **Soft (0.25rem)** roundedness approach to maintain a professional and technical edge. 

- **Small Components:** Checkboxes and small tags use 4px (`rounded-sm`).
- **Standard Components:** Buttons and Input fields use 8px (`rounded-lg`).
- **Large Components:** Main match cards and section containers use 12px (`rounded-xl`).
- **Special Case:** The active indicator in the bottom navigation uses a pill-shape for high visual contrast against the geometric grid.

## Components
- **Buttons:** Primary buttons feature a subtle linear gradient (Gold to Amber) and a 1px gold "shimmer" border. On hover/active, they emit a soft golden glow.
- **Match Cards:** Utilize glassmorphism. For "Live" matches, the card border pulses with a 1px Red/Gold gradient.
- **Odds Buttons:** Compact, using JetBrains Mono for the price. When a price changes, a temporary background flash (Green for up, Red for down) indicates the movement.
- **Input Fields:** Deep Zinc-950 fill with a 1px Zinc-800 border. Upon focus, the border transitions to Gold with a 4px blurred outer glow.
- **Scoreboard:** Digital-style display using JetBrains Mono. Team flags are circular and inset into the card design.
- **Bottom Navigation:** Fixed to the viewport bottom with a frosted glass background. The active state is a floating gold pill behind the icon.
- **Table Headers:** Use a semi-transparent frost effect with `backdrop-filter: blur(16px)` to ensure they remain legible as users scroll through long lists of betting markets.
