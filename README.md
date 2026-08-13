# NextMove Services — Product Registration UAE

A production-ready CMS for a Dubai regulatory consultancy, built with Next.js 16, React 19, MySQL 8, and Tailwind CSS 4.

## Tech Stack

- **Framework:** Next.js 16.2.11 App Router
- **Frontend:** React 19, Tailwind CSS 4, Lucide Icons
- **Backend:** MySQL 8, mysql2, jose (JWT), bcryptjs
- **Email:** Nodemailer (SMTP)
- **Hosting:** Hostinger Business (2 vCPU / 3 GB RAM)

## Quick Start

```bash
# Install dependencies
npm ci

# Set up environment variables
cp .env.example .env
# Edit .env with your database and SMTP credentials

# Run database migrations
npm run db:migrate

# Seed default data
npm run db:seed

# Create admin user
npm run db:admin -- --email admin@example.com --name "Admin" --role admin

# Start development server
npm run dev
```

## Environment Variables

Create a `.env` file with the following (never commit values):

```
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=...
DB_PASSWORD=...
DB_NAME=...
AUTH_SECRET=<32+ random characters>
MAIL_HOST=smtp.hostinger.com
MAIL_PORT=465
MAIL_USER=...
MAIL_PASSWORD=...
MAIL_TO=...
CRON_SECRET=<long random string>
IP_SALT=<optional secret>
```

## Database Scripts

```bash
npm run db:migrate    # Create/update tables
npm run db:seed       # Seed default settings, services, menus
npm run db:admin      # Create/reset admin user
```

## Build & Deploy (Hostinger)

```bash
npm ci
npm run build
# Standalone output is at .next/standalone/
# Startup: node .next/standalone/server.js
```

## Cron Jobs

Set up in hPanel:

1. **Daily stats rollup** (nightly): `GET /api/cron/rollup?secret=YOUR_CRON_SECRET`
2. **Scheduled post publishing** (every 15 min): `GET /api/cron/publish?secret=YOUR_CRON_SECRET`

## Project Structure

```
app/
  admin/           Admin CMS pages
  api/             API route handlers
  blog/            Public blog (MySQL-powered)
  services/        Dynamic services (DB-driven)
  team/            Team page (DB-driven)
  contact/         Contact form with email
  sitemap.ts       Dynamic sitemap
  robots.ts        Robots.txt
  llms.txt/        AI crawler info
components/
  admin/           Admin UI components
  layout/          Header, Footer
  widgets/         WhatsApp, Phone, ContactForm
lib/
  db.ts            MySQL connection pool
  auth.ts          JWT auth (jose)
  api-auth.ts      Auth guards, CSRF, rate limiting
  sanitize.ts      DOMPurify sanitizer
  mail.ts          Nodemailer email
  settings.ts      Cached settings
  tracker.ts       Pageview tracking
scripts/
  migrate.ts       Database migration
  seed.ts          Default data seeding
  create-admin.ts  Admin user creation
```

## Admin Panel

Access at `/admin/login`. Features:

- **Dashboard:** Real KPIs from DB
- **Blog:** CRUD with draft/published/scheduled status
- **Team:** Member management with photos
- **Services:** Dynamic service pages
- **Submissions:** Contact form inbox with status tracking
- **Media:** File upload library
- **Analytics:** Self-hosted pageview analytics
- **Settings:** Typed site settings forms
- **Menus:** Navigation management

## Security

- JWT httpOnly cookies (jose)
- bcrypt password hashing
- Login lockout (5 attempts / 15 min)
- CSRF origin checks
- Rate limiting on login/contact
- DOMPurify rich text sanitization
- Security headers (HSTS, CSP, X-Frame-Options)
- Parameterized MySQL queries

## License

Proprietary — NextMove Services
