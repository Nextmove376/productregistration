# Deployment Guide — Hostinger Business

## Prerequisites

- Hostinger Business plan (2 vCPU, 3 GB RAM)
- Node.js 24.x enabled in hPanel
- MySQL database created in hPanel
- Domain pointed to Hostinger

---

## 1. Create MySQL Database

In hPanel → Databases → MySQL:

1. Create a new database (e.g., `u123456789_nextmove`)
2. Create a database user with full privileges
3. Note down: host, port, database name, user, password

---

## 2. Set Environment Variables

In hPanel → Advanced → Environment Variables:

```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=u123456789_admin
DB_PASSWORD=your_secure_password
DB_NAME=u123456789_nextmove

# Auth (generate a random 32+ char string)
AUTH_SECRET=your_random_secret_at_least_32_chars_long

# SMTP (Hostinger email)
MAIL_HOST=smtp.hostinger.com
MAIL_PORT=465
MAIL_USER=noreply@productregistrationinuae.com
MAIL_PASSWORD=your_email_password
MAIL_TO=hello@nextmoveservices.ae

# Cron (generate a random string)
CRON_SECRET=your_cron_secret

# IP hashing (optional, defaults to AUTH_SECRET)
IP_SALT=your_ip_salt
```

---

## 3. Deploy via Git

In hPanel → Git:

1. Connect your repository
2. Set deployment path to `~/site`
3. Set build command:
   ```bash
   cd site && npm ci && npm run build && npm prune --omit=dev
   ```
4. Set startup file: `.next/standalone/server.js`

---

## 4. Initialize Database

SSH into the server and run:

```bash
cd ~/site
npm run db:migrate
npm run db:admin -- --email your@email.com --name "Your Name" --role admin
```

---

## 5. Seed Default Settings

```bash
npm run db:seed
```

---

## 6. Configure Cron Jobs

In hPanel → Cron Jobs:

### Scheduled post publishing + stats rollup (every 15 minutes):
```
*/15 * * * * curl -s "https://productregistrationinuae.com/api/cron?key=YOUR_CRON_SECRET"
```

---

## 7. Upload Directory

Create the uploads directory for media:

```bash
mkdir -p ~/site/public/uploads
```

FTP-uploaded images to `public/uploads/` will persist across deploys.

---

## 8. SSL & Security

Hostinger provides free SSL. Ensure:
- SSL is enabled in hPanel
- Force HTTPS is enabled
- The HSTS header is already configured in `next.config.ts`

---

## 9. Verify Deployment

1. Visit `https://productregistrationinuae.com`
2. Check `/admin/login` — login with the admin credentials you created
3. Submit a test enquiry via `/contact`
4. Check `/admin/submissions` for the test enquiry
5. Check `/admin/analytics` for tracking data

---

## File Structure

```
site/
├── app/
│   ├── admin/          # Admin panel pages
│   ├── api/            # API routes
│   ├── blog/           # Blog pages
│   ├── contact/        # Contact page
│   ├── services/       # Service pages (dynamic)
│   ├── team/           # Team page (dynamic)
│   ├── layout.tsx      # Root layout
│   ├── page.tsx        # Homepage
│   ├── sitemap.ts      # Dynamic sitemap
│   ├── robots.ts       # Robots.txt
│   └── globals.css     # Global styles
├── components/
│   ├── admin/          # Admin components
│   ├── landing/        # Landing page sections
│   ├── layout/         # Header, Footer
│   ├── sections/       # Page sections
│   └── widgets/        # Contact widgets
├── lib/
│   ├── api-auth.ts     # Auth guards + rate limiting
│   ├── auth.ts         # Login/logout/session
│   ├── db.ts           # MySQL pool
│   ├── mail.ts         # SMTP email
│   ├── request-context.ts  # IP/UA parsing
│   ├── sanitize.ts     # DOMPurify
│   ├── session.ts      # JWT (jose)
│   └── settings.ts     # Site settings
├── public/
│   ├── images/         # Static images
│   ├── logos/          # Partner logos
│   └── uploads/        # User uploads (persists)
├── scripts/
│   ├── create-admin.ts # Create admin user
│   └── migrate.ts      # Database migration
├── next.config.ts      # Next.js config
└── package.json
```

---

## Troubleshooting

### Database connection fails
- Verify DB_HOST, DB_USER, DB_PASSWORD, DB_NAME in hPanel env vars
- Ensure the database user has full privileges

### Email not sending
- Check MAIL_USER and MAIL_PASSWORD
- Test SMTP in admin Settings page

### Admin login not working
- Run `npm run db:admin` to create/reset admin user
- Check AUTH_SECRET is set and at least 32 characters

### Pages not updating
- Check if ISR revalidation is working
- Manually trigger revalidation if needed
