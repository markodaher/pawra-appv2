# Pawra — Project Context

## What This Is
Pawra is Lebanon's first pet services super-app. Built solo using Expo + Supabase.

## Tech Stack
- Frontend: Expo SDK 55, React Native, TypeScript, Expo Router (file-based navigation)
- Backend: Supabase — PostgreSQL + PostGIS, Row-Level Security, Realtime, Edge Functions
- Auth: Supabase Auth — Phone OTP, Lebanese +961 numbers
- Maps: Google Maps via react-native-maps
- Notifications: Meta WhatsApp Cloud API (NOT push notifications as primary)
- Payments: Cash on Delivery (MVP) → Tap Payments + Whish Money (post-MVP)
- Builds: EAS Build & Submit

## Hard Constraints
- NO Stripe. It doesn't work in Lebanon.
- Always allow manual map pin placement. GPS jamming is active in parts of Lebanon.
- No street addresses. Location = dropped pin on Google Maps only.
- Two user roles: Pet Owner and Service Provider. Different experiences entirely.

## MCPs Connected
- Supabase MCP
- GitHub MCP  
- Expo MCP

## Project Structure
- /app — Expo Router screens (file-based)
- /components — shared UI components
- /lib — Supabase client, helpers
- /assets — images, icons

## Current Phase
Phase 0 — scaffolding complete. Moving to Phase 1: Auth + Profiles.

## Conventions
- TypeScript everywhere. No plain JS files.
- All Supabase queries go through /lib/supabase.ts
- Never hardcode credentials. Use .env and Expo's env system.
- Every screen must handle: loading state, error state, empty state.
