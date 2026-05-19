# Pawra — Brand Kit
**Extracted:** May 6, 2026 | **App Version:** 1.0.0 | **Location:** Beirut, Lebanon

> This document is the single source of truth for Pawra's visual identity.
> All hex codes, font specs, and file paths are taken directly from the live codebase.

---

## 1. BRAND IDENTITY

### Name
**Pawra** — stylised lowercase in all wordmark uses.

### Taglines
| Use | Copy |
|---|---|
| **Hero / primary** | "Lebanon's home for pet care." |
| **Sub-headline** | "Walks, vets, grooming and supplies — booked in one tap." |
| **Full one-liner** | "Lebanon's first and only pet services super-app." |
| **Owner value prop** | "Book services, shop supplies, keep their passport." |
| **Provider value prop** | "Receive bookings, sell products, manage your schedule." |
| **AI assistant** | "Your pet concierge · always online." |
| **Location stamp** | "Version 1.0.0 · Beirut, Lebanon" |
 
**Source files:**
- `components/Onboarding.tsx:135` — hero copy
- `components/owner/PawlaChat.tsx:23` — "first and only" line
- `components/owner/SettingsSheet.tsx:172` — location stamp

### Brand Voice
- Warm, direct, Lebanon-native
- Emotion-led for owners ("your pet", "their passport")
- Efficiency-led for providers ("manage your schedule", "receive bookings")
- No corporate jargon — conversational, like a knowledgeable local friend

---

## 2. COLORS

**Active default theme: `lbci` (LBCI Lebanon)**
Source file: `constants/theme.ts`

### Primary Palette (light mode — production default)

| Token | Hex | Variable | Used for |
|---|---|---|---|
| **Navy** | `#1A3A6E` | `brand` | Primary CTA buttons, active tabs, links, key UI elements |
| **Navy Tint** | `#D8E2F0` | `brandSoft` | Chip backgrounds, selected state fills, tag backgrounds |
| **Navy Dark** | `#0C1A35` | `brandInk` | Text printed on navy surfaces |
| **Red** | `#D42B2B` | `accent` | Emergency, alerts, badges, destructive actions |
| **Red Tint** | `#FADDDD` | `accentSoft` | Error/alert background fills |
| **Background** | `#F5F7FA` | `bg` | Screen background (off-white, very slight cool tint) |
| **Raised BG** | `#FFFFFF` | `bgRaised` | Modals, bottom sheets, cards lifted off the page |
| **Surface** | `#FFFFFF` | `surface` | Card and list item backgrounds |
| **Surface Alt** | `#EDF0F5` | `surfaceAlt` | Input backgrounds, secondary surfaces, skeleton loaders |
| **Ink (Primary)** | `#0C1A35` | `ink` | Body text, headlines, icons (near-black navy tint) |
| **Ink (Secondary)** | `#3A4E6E` | `inkSoft` | Supporting text, subtitles, metadata |
| **Ink (Muted)** | `#7A8EA8` | `inkMuted` | Placeholders, disabled states, helper labels |
| **Hairline** | `rgba(12,26,53,0.09)` | `hairline` | Card borders, dividers, separators |
| **Success** | `#2E7D55` | `success` | Confirmed status, completed badges, positive indicators |
| **Warning** | `#C97A3A` | `warn` | Caution states, pre-order indicators |
| **Danger** | `#D42B2B` | `danger` | Errors, destructive button states (matches accent in this theme) |

### Color Combinations for Marketing

| Combination | Foreground | Background | Use |
|---|---|---|---|
| **Primary CTA** | `#FFFFFF` | `#1A3A6E` | Buttons, pills |
| **Alert / Emergency** | `#FFFFFF` | `#D42B2B` | Emergency banner, danger states |
| **On-screen headline** | `#0C1A35` | `#F5F7FA` | Hero text on app background |
| **Card content** | `#0C1A35` | `#FFFFFF` | Text inside cards |
| **Muted label** | `#7A8EA8` | `#FFFFFF` | Secondary metadata on white |
| **Confirmed badge** | `#FFFFFF` | `#2E7D55` | Status chips |

### Dark Mode (lbci dark — automatically applied)

| Token | Hex |
|---|---|
| `bg` | `#070D1A` |
| `bgRaised` | `#0D1628` |
| `surface` | `#121F38` |
| `surfaceAlt` | `#192848` |
| `ink` | `#EBF0FA` |
| `inkSoft` | `#A0B0CC` |
| `inkMuted` | `#607090` |
| `brand` (lightened) | `#5080C8` |
| `accent` | `#E84444` |
| `success` | `#4CAF84` |

---

## 3. TYPOGRAPHY

Source file: `constants/theme.ts` (lines 352–356)

### Font Stack

| Role | Value | What it renders as |
|---|---|---|
| **Primary sans** | `'System'` | iOS: **SF Pro** · Android: **Roboto** |
| **Wordmark / logo** | `'Georgia'` | Georgia (serif) — used only for the "pawra" wordmark at 44pt |
| **Monospace** | `'Menlo'` | Menlo — internal/debug only, not in production UI |

**No custom fonts are loaded.** The app intentionally relies on the native system font for crisp rendering at all sizes on both platforms.

### Font Weights in Use

| Weight | Value | Where |
|---|---|---|
| Regular | `400` | Body copy, descriptions, metadata |
| Semi-bold | `600` | Labels, pill text, section headers |
| Bold | `700` | Headlines, card titles, prices, CTA buttons |
| Extra-bold | (none) | — |

### Type Scale (from components)

| Size | Weight | Usage |
|---|---|---|
| 44pt | 600 | Wordmark "pawra" (Georgia serif) |
| 32pt | 700 | Screen title (e.g., "Shop") |
| 30pt | 700 | Major section header |
| 22pt | 700 | KPI values, large metric numbers |
| 17pt | 700 | Card primary title |
| 15pt | 400–600 | Body text, form fields |
| 14pt | 700 | Prices, button labels |
| 13pt | 400–600 | Subtitle, secondary body |
| 12pt | 600 | Metadata, timestamps |
| 11pt | 600–700 | Badges, chips, uppercase labels |
| 10pt | 700 | Micro-labels (uppercase, letter-spaced) |

### Arabic / RTL
No separate Arabic font is loaded. If Arabic support is added, the system font (SF Arabic on iOS, Noto Naskh on Android) will apply automatically.

---

## 4. LOGO & WORDMARK

### Wordmark
The wordmark is **rendered in-app as text**, not a raster image:
- Text: `pawra` (lowercase)
- Font: `Georgia` (serif)
- Weight: `600`
- Size: `44pt` in onboarding; scales down elsewhere
- Color: `T.ink` (`#0C1A35` on light, `#EBF0FA` on dark)

**There is no separate SVG wordmark file in the repository.** For marketing materials, recreate using: `Georgia`, 600 weight, lowercase, `#0C1A35` on light or `#FFFFFF` on dark.

### App Icon

| File | Path | Size | Format | Use |
|---|---|---|---|---|
| `icon.png` | `assets/icon.png` | 1024×1024 | PNG | iOS App Store, primary |
| `adaptive-icon.png` | `assets/adaptive-icon.png` | 1024×1024 | PNG | Android (foreground layer) |
| `splash-icon.png` | `assets/splash-icon.png` | 1024×1024 | PNG | Splash screen centered image |
| `favicon.png` | `assets/favicon.png` | 48×48 | PNG | Web favicon |

All icon files copied to `/brand-kit/` — see Section 7.

---

## 5. PRODUCT SCREENSHOTS — MARKETING ONE-PAGER

These are the 4 screens identified for the provider one-pager. File paths and navigation are listed so you can capture them manually (see Section 7 for simulator commands).

### Screen 1: Provider Inbox — Incoming Booking
**Shows:** Booking card with pet name, service type, date/time, owner name, accept/decline actions.

| | |
|---|---|
| **Component** | `components/provider/Inbox.tsx` |
| **Navigation** | Launch app as provider → Inbox tab (first tab) |
| **What to show** | A booking card in `pending` status with pet info visible. Use the demo booking data. |
| **Screenshot file** | `brand-kit/screenshots/01-provider-inbox.png` |

### Screen 2: Provider Public Profile (Owner View)
**Shows:** Hero image, service list, hours, star rating, book button — as an owner sees it.

| | |
|---|---|
| **Component** | `components/owner/ProviderDetail.tsx` |
| **Navigation** | Launch app as owner → Browse tab → tap any provider card |
| **What to show** | Full provider sheet: bio, categories, hours, ratings panel. |
| **Screenshot file** | `brand-kit/screenshots/02-provider-profile-owner-view.png` |

### Screen 3: Owner Home Screen
**Shows:** Emergency vet glowing red button, "Book a service" category row, "Near you" providers.

| | |
|---|---|
| **Component** | `components/owner/Home.tsx` |
| **Navigation** | Launch app as owner → Home tab (default landing screen) |
| **What to show** | Scroll to show emergency banner + service category icons + first provider cards. |
| **Screenshot file** | `brand-kit/screenshots/03-owner-home.png` |

### Screen 4: Provider Analytics Dashboard
**Shows:** KPI cards (revenue, completion rate, avg order), 7-day bar chart, booking status donut.

| | |
|---|---|
| **Component** | `components/provider/Analytics.tsx` |
| **Navigation** | Launch app as provider → Profile tab → scroll down to analytics section |
| **What to show** | Full analytics block with populated KPIs and charts. |
| **Screenshot file** | `brand-kit/screenshots/04-provider-analytics.png` |

---

## 6. BRAND ASSETS — FILE INDEX

### `/brand-kit/logo/`
| File | Description | Size |
|---|---|---|
| `icon-1024.png` | App icon (iOS primary) | 1024×1024 px |
| `icon-android-1024.png` | Adaptive icon foreground layer (Android) | 1024×1024 px |
| `favicon-48.png` | Web favicon | 48×48 px |

### `/brand-kit/icons/`
| File | Description | Size |
|---|---|---|
| `app-icon-1024.png` | App icon — full resolution for marketing | 1024×1024 px |
| `splash-icon-1024.png` | Splash screen centerpiece image | 1024×1024 px |
| `adaptive-icon-android-1024.png` | Android adaptive icon | 1024×1024 px |

### `/brand-kit/screenshots/`
Folder is pre-created. Capture the 4 screens above and save as:
```
01-provider-inbox.png
02-provider-profile-owner-view.png
03-owner-home.png
04-provider-analytics.png
```
See Section 7 for exact simulator commands.

---

## 7. HOW TO CAPTURE SCREENSHOTS

The app must be running in the iOS Simulator or on a device. The screenshots cannot be taken automatically by tooling — follow these steps:

### Prerequisites
```bash
# Start the dev server
cd /Users/koo/Desktop/pawra-appv2
npx expo start

# In another terminal, open the iOS Simulator
open -a Simulator
```

### Screenshot commands (iOS Simulator)
After navigating to each screen, run:
```bash
# 01 — Provider Inbox
xcrun simctl io booted screenshot ~/Desktop/pawra-appv2/brand-kit/screenshots/01-provider-inbox.png

# 02 — Provider Profile (Owner View)
xcrun simctl io booted screenshot ~/Desktop/pawra-appv2/brand-kit/screenshots/02-provider-profile-owner-view.png

# 03 — Owner Home Screen
xcrun simctl io booted screenshot ~/Desktop/pawra-appv2/brand-kit/screenshots/03-owner-home.png

# 04 — Provider Analytics
xcrun simctl io booted screenshot ~/Desktop/pawra-appv2/brand-kit/screenshots/04-provider-analytics.png
```

### Navigation paths to each screen
1. **Provider Inbox:** Log in as a provider → the Inbox tab is the first tab. A booking in `pending` state shows the full card with accept/decline.
2. **Provider Profile (Owner view):** Log in as owner → Browse tab → tap any provider card → the full `ProviderDetail` sheet opens.
3. **Owner Home:** Log in as owner → Home tab is the landing screen. No navigation needed.
4. **Provider Analytics:** Log in as provider → Profile tab (last tab) → scroll down past the profile card to the analytics section.

---

## 8. DESIGN SYSTEM TOKENS — QUICK REFERENCE

Copy-paste this for any design tool (Figma, Sketch, Adobe XD):

```
/* Pawra · LBCI Theme · Light Mode */

--color-brand:        #1A3A6E;   /* Navy — primary */
--color-brand-soft:   #D8E2F0;   /* Navy tint */
--color-brand-ink:    #0C1A35;   /* Text on navy */
--color-accent:       #D42B2B;   /* Red — alerts/emergency */
--color-accent-soft:  #FADDDD;   /* Red tint */
--color-success:      #2E7D55;   /* Green */
--color-warn:         #C97A3A;   /* Amber */
--color-danger:       #D42B2B;   /* Red (same as accent) */

--color-bg:           #F5F7FA;   /* Page background */
--color-bg-raised:    #FFFFFF;   /* Modals, sheets */
--color-surface:      #FFFFFF;   /* Cards */
--color-surface-alt:  #EDF0F5;   /* Inputs, secondary surfaces */

--color-ink:          #0C1A35;   /* Primary text */
--color-ink-soft:     #3A4E6E;   /* Secondary text */
--color-ink-muted:    #7A8EA8;   /* Placeholder, disabled */
--color-hairline:     rgba(12, 26, 53, 0.09);   /* Borders */

--font-sans:          'SF Pro' (iOS) / 'Roboto' (Android) / system-ui (web);
--font-serif:         'Georgia';   /* Wordmark only */
--font-wordmark:      Georgia, 600, lowercase, #0C1A35;
```

---

## 9. NOTES FOR MARKETING DESIGNERS

1. **The wordmark is the word "pawra" in lowercase Georgia serif** — not an icon. Pair it with the paw-print app icon for logo lockup.
2. **Navy (`#1A3A6E`) is your hero color.** Use it for backgrounds, headlines, and CTAs. It reads as authoritative and trustworthy — appropriate for a service marketplace where people are handing over their pets.
3. **Red (`#D42B2B`) is strictly for urgency.** In the app it's used for the 24/7 emergency vet button and error states. Do not dilute it by using it decoratively.
4. **The background (`#F5F7FA`) is not white.** It's a very slightly cool off-white. Don't substitute pure `#FFFFFF` as the page background — it breaks the visual hierarchy between the page and cards.
5. **No custom fonts are bundled.** The app uses native system fonts (SF Pro on iOS). For print/web materials, use **Inter** or **SF Pro** as the closest match to the app's visual tone.
6. **The app icon and splash are 1024×1024 PNG.** They are colormap (indexed-color) PNGs — export as full RGB if you need to composite them.
