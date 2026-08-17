# Context for Claude — Product Registration Project

## Project Overview
Next.js 16.2.11 app for a Dubai regulatory consultancy (productregistrationinuae.com). Stack: React 19, TypeScript, Tailwind CSS, MySQL, hosted on Hostinger. GitHub repo: Nextmove376/productregistration.

## What We Built (This Session)

### 1. Service Page Redesign (Phases 1-7)
Created reusable ServicePageLayout component with 12 sections: hero, breadcrumb, trust bar, overview, process steps, service grid, document checklist, pricing table, why choose us, case study, FAQ accordion, related services, sticky mobile CTA, final CTA. All 6 service pages rewritten with full SEO metadata, structured data (Service, BreadcrumbList, FAQPage schemas), canonical URLs, OpenGraph tags, and expanded content targeting UAE, Pakistan, India, Qatar, Bangladesh, Sri Lanka, UK, China markets.

**Files created:** components/services/ServicePageLayout.tsx, Breadcrumb.tsx, ProcessSteps.tsx, ServiceGrid.tsx, DocumentChecklist.tsx, PricingTable.tsx, WhyChooseUs.tsx, FAQAccordion.tsx, RelatedServices.tsx, StickyMobileCTA.tsx, MediaToast.tsx

**Files modified:** All pp/services/*/page.tsx, pp/services/page.tsx, pp/layout.tsx, pp/sitemap.ts, pp/robots.ts, 
ext.config.ts

### 2. Media Library Overhaul
Fixed 4 critical bugs and rebuilt the media system:

**Root causes fixed:**
- Ghost thumbnails after delete — [id]/route.ts didn't exist, DELETE silently failed
- Silent upload completion — no success feedback in UI
- Files not served in production — public/ enumerated at startup, runtime uploads invisible
- Schema mismatch — mime_type/	humbnail_path columns missing from DB

**Architecture changes:**
- Files now stored in uploads/ (project root, NOT public/) and served via pp/api/media/[...path]/route.ts with proper MIME types, cache headers (1yr immutable), security headers
- Magic byte validation in lib/media-validation.ts — JPEG, PNG, GIF, WebP, SVG, MP4, WebM, OGG
- CSRF protection, rate limiting (20 uploads/min), directory traversal prevention
- Foreign key safety check before delete (with ?force=true escape hatch)
- Upload progress via XHR, toast notifications, per-item delete loading states
- Video support (MP4, WebM, OGG)

**Files created:** pp/api/admin/media/[id]/route.ts, pp/api/media/[...path]/route.ts, lib/media-validation.ts, components/admin/MediaToast.tsx
**Files modified:** pp/api/admin/media/route.ts, pp/admin/media/page.tsx, scripts/migrate.ts, lib/api-auth.ts

### 3. CSRF Fix (Latest)
checkCsrf in lib/api-auth.ts was rejecting DELETE requests because browsers don't always send origin header for same-origin DELETEs. Fixed to allow requests with no origin/referer, and added referer fallback check. Added credentials: 'include' to frontend DELETE/PATCH fetches. Added extensive debug logging to DELETE handler.

## Current Status
- **Uploads:** Working
- **Deletes:** Still failing — user reports "Delete failed. Please try again." despite CSRF fix
- **Latest commits:** 993260 (CSRF fix), 1533e94 (error handling), e7b7718 (readme)
- **All commits pushed to GitHub**, Hostinger auto-deploys

## Pending Issues
1. **Delete still broken** — need to investigate further. Debug logging added to both frontend and backend. User needs to check browser console (F12) for actual error.
2. **SQL migration needed** — 3 ALTER TABLE statements for media table (mime_type, thumbnail_path, blur_data). User ran them in phpMyAdmin.
3. **Config:** sandbox_mode = "danger-full-access", pproval_policy = "never" in Codex config. Sandbox blocks HTTPS outbound (ICMP works). Git push times out due to credential manager — user must push manually from PowerShell.

## Key Config Files
- C:\Users\Moazzam Ali\.codex\config.toml — Codex config
- C:\data\productregistration-master\productregistration-master\ — project root
- Upload dir: C:\data\productregistration-master\uploads\
- DB: MySQL on Hostinger, tables: media, posts, services, team_members, submissions, pageviews, daily_stats, settings, admin_users, categories, menus
