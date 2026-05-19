# Pawra — Project Context

## What This Is
Pawra is Lebanon's first pet services super-app. Built solo using Expo + Supabase. Dual-role: Pet Owner and Service Provider get entirely different experiences in one binary.

## Tech Stack
- **Frontend:** Expo SDK 54, React Native 0.81, React 19, TypeScript, expo-router (see Architecture — used as host, not for file-based routing)
- **Backend:** Supabase — PostgreSQL + PostGIS, Row-Level Security, Realtime, Edge Functions (Deno)
- **Auth:** Supabase Auth — Phone OTP, Lebanese +961 numbers; session persisted via AsyncStorage
- **Maps:** Google Maps via `react-native-maps` (iOS + Android keys in `app.json` env)
- **AI:** Anthropic Claude API powers the in-app assistant "Pawla" (via `pawla-chat` edge function; key in `EXPO_PUBLIC_ANTHROPIC_KEY`)
- **Notifications:** In-app banner + notif center (no push yet). WhatsApp Cloud API still planned. Sound via `expo-av` (`assets/sounds/ping.wav`), haptics via `expo-haptics`.
- **Payments:** Cash on Delivery + Whish Money (live via `whish-payment` / `whish-webhook` edge functions). Tap Payments still planned.
- **Other Expo modules:** expo-image-picker, expo-location, expo-linear-gradient, expo-linking
- **Builds:** EAS Build & Submit

## Hard Constraints
- **NO Stripe.** Doesn't work in Lebanon.
- **Always allow manual map pin placement.** GPS jamming is active in parts of Lebanon. Every location flow has a draggable pin fallback.
- **No street addresses.** Location = dropped pin on Google Maps only. The `addresses` table stores pin coords + a label, not a parsed street address.
- **Two user roles, two apps.** Owner and Provider share auth + a binary but render disjoint UI trees. Don't accidentally cross-wire screens.

## Architecture (read before adding screens)
**The app is state-driven, not route-driven, despite expo-router being installed.**

- `app/_layout.tsx` wraps everything in `AppProvider` (the global state from `lib/AppContext.tsx`).
- `app/index.tsx` is THE app — it reads `role`, `ownerTab`/`providerTab`, and a dozen `*Open` flags from `useApp()` and conditionally renders the right screen + any open sheets/modals.
- New screens are added as components under `components/owner/` or `components/provider/` and wired into `app/index.tsx` + `AppContext` (add an `xOpen` flag and setter). **Do not create new routes under `app/` for normal screens** — that's not how this app works.
- Sheets/modals are the dominant UI pattern. All open-state lives in `AppContext` so anything (notif tap, deep link, etc.) can open anything.

`lib/AppContext.tsx` is the single source of truth for: session, user, role, pets, providers, bookings, orders, cart, addresses, payment methods, paw points, notifs, chat target, every sheet's open state. It is large by design — don't fragment it without a clear reason.

## What's Built
Far past Phase 0. Currently in MVP polish / launch prep.

**Owner side:** onboarding + profile setup, home, browse (by category), saved/favorites, activity feed, shop (multi-vendor), pet profiles + health records, service bookings (single + multi-line + recurring), order checkout (cart + COD + Whish), reviews + ratings, in-app chat, emergency vet finder, lost pet alerts + reporting, Paw Points loyalty system, referral codes (personal + promo), payment methods, address management, multiple selectable themes with dark mode.

**Provider side:** onboarding, inbox (incoming bookings + orders), schedule, services editor, weekly hours editor, shop manager, add/edit products, decline-reason flow, auto-accept rules, ID verification, payout setup, analytics, profile.

**Backend:** 36 SQL migrations covering all of the above + RLS hardening + immutable ownership. 4 edge functions: `pawla-chat` (AI), `whish-payment` + `whish-webhook` (payments), `notify-id-verification` (ID review).

**Admin:** lightweight static page at `admin/index.html` (separate from the mobile app).

## Project Structure
- `/app` — expo-router host. Only `_layout.tsx` and `index.tsx`. **Don't add screen files here.**
- `/components` — UI. `owner/*` and `provider/*` hold the screens + sheets for each role. Top-level files are shared (Icon, primitives, ChatSheet, NotifBanner, NotifCenterSheet, Onboarding).
- `/lib` — Supabase client (`supabase.ts`), all DB queries (`db.ts`), auth, global state (`AppContext.tsx`), and helpers (date, distance, hours, badges, transitions, feedback, notifTexts, bookingLabels, pickPhoto, storage, whish).
- `/constants` — `theme.ts` (palettes), `data.ts` (category/type maps), `providerSetup.ts`.
- `/types` — shared TS types (`index.ts`, `pawla.ts`).
- `/supabase` — `migrations/` (numbered SQL) and `functions/` (Deno edge fns).
- `/assets` — icons, splash, `sounds/ping.wav`.
- `/brand-kit` + `BRAND_KIT.md` — brand assets and guidelines (consult before touching colors, logos, copy tone).
- `/admin` — static admin web tool.
- `/scripts` — one-off node scripts (e.g. `generate-ping.js`).

## MCPs Connected
- Supabase MCP
- GitHub MCP
- Expo MCP

## Conventions
- **TypeScript everywhere.** No plain JS files (except the one-off node script).
- **All Supabase queries go through `lib/db.ts`.** `lib/supabase.ts` only exports the configured client — don't call `supabase.from(...)` directly from components. If a query is missing, add it to `db.ts`.
- **All global UI state goes through `AppContext`.** Don't introduce a parallel store.
- **Never hardcode credentials.** Use `.env` and `EXPO_PUBLIC_*` vars (read via `process.env.EXPO_PUBLIC_*`).
- **Every screen handles loading, error, and empty states.**
- **Theme-aware styling.** Read `T` (theme tokens) from `usePawraTheme()` — don't hardcode colors. Dark mode must work.
- **Manual pin always available** wherever location is involved (see Hard Constraints).
- **Migrations are append-only, numbered (`00NN_description.sql`).** Don't edit historical migrations; add a new one.
