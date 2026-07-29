# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start the Next.js dev server (http://localhost:3000)
- `npm run build` — production build (also echoes `NEXT_PUBLIC_FIREBASE_APP_ID` for Vercel build logs, see `package.json`)
- `npm run start` — serve the production build
- `npm run lint` — run ESLint (flat config in `eslint.config.mjs`, extends `eslint-config-next` core-web-vitals + typescript)

There is no test suite configured in this repo.

## Architecture

Next.js 16 App Router site, TypeScript, Tailwind CSS v4, deployed on Vercel with the domain (`thegogfather.com`) fronted via Vercel DNS (see `README.md` for the AWS Route 53 → Vercel nameserver handoff).

**Data layer:** Firebase (Firestore + Auth) is the only backend, wired up client-side (`'use client'`) in both [app/page.tsx](app/page.tsx) and [app/admin/page.tsx](app/admin/page.tsx). Each file independently defines its own `getFirebaseConfig()` / `useFirebase()` — there is no shared `lib/firebase.ts` yet, so config resolution logic is duplicated and must be kept in sync manually if changed.

Firebase config resolution priority (in `getFirebaseConfig`):
1. `NEXT_PUBLIC_FIREBASE_*` env vars (Vercel) — primary path for this deployment.
2. `window.__firebase_config` / `__app_id` / `__initial_auth_token` globals — a legacy "Canvas" preview environment fallback, not used in normal Vercel operation.
3. Falls back to `appId: 'default-app-id'` with an empty config, which surfaces as a visible error state on both pages.

All content is stored in Firestore under `artifacts/${appId}/public/data/{collection}`, where `appId` is derived from `NEXT_PUBLIC_FIREBASE_PROJECT_ID` (sanitized to `[a-zA-Z0-9_-]`). Collections: `photos`, `videos`, `music`, `art`, `blog`, each ordered by `timestamp` (Firestore `Timestamp`) via `onSnapshot` real-time listeners.

**Public site** ([app/page.tsx](app/page.tsx)): single-page site reading all five collections read-only, rendering hero/operations/music/art/blog/links/videos/photo-gallery sections. Photos are grouped by year/month client-side (`groupPhotosByDate`); one photo can be flagged `isFeatured` and is pulled out for a hero treatment.

**Admin** ([app/admin/page.tsx](app/admin/page.tsx)): gated by real Firebase email/password auth (`signInWithEmailAndPassword`) — unlike the public page, it does *not* fall back to anonymous auth, and forces `inMemoryPersistence` so admin sessions don't survive a refresh. Admin users must be created manually in the Firebase console (no self-serve signup). Provides CRUD forms for all five collections, generic `handleAddItem` for creates, `handleDelete` for deletes, and a dedicated `handleFeaturePhoto` that unsets any other featured photo before setting the new one (a manual transaction via `Promise.all`, not a Firestore batch/transaction).

Both pages treat Firestore permission-denied errors as user-facing config problems (they render "Update rules" / "check Firestore Security Rules" messages) rather than swallowing them — preserve that pattern if you touch the data-fetching hooks.

## Product direction

This site is the landing hub for thegogfather.com; individual projects are intended to live as subpages/subpaths off this root app. One planned subproject is a recipe-suggestion app (recipes drawn from shows like Anthony Bourdain's) that also recommends where to buy ingredients within a given distance/budget constraint — not yet started, no code exists for it.
