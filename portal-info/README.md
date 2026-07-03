# Lucille's Legacy Client Portal

A standalone MVP client portal for Lucille's Legacy financial services. It is designed to be linked from an existing GoDaddy website with a `Client Portal` button while the portal itself can be deployed separately on Vercel.

## What is included

- Next.js, React, Tailwind CSS
- Supabase-ready authentication helper
- Client login and forgot password pages
- Client dashboard
- Messages
- Document upload UI
- Service status trackers for tax, credit, bookkeeping, and life insurance
- Appointments
- Billing placeholders
- Resources
- Profile editor
- Admin dashboard with client, document, message, and billing tools
- Lucille's Legacy logo asset in `public/lucilles-legacy-logo.png`
- Supabase SQL schema with Row Level Security policies

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Demo access

The portal works in demo mode until Supabase keys are added.

- Email: `client@example.com`
- Password: `portal123`

Use the Client/Admin switch inside the portal to preview both roles.

## Connect Supabase

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL Editor.
3. Create a private Storage bucket named `client-documents`.
4. Copy `.env.example` to `.env.local`.
5. Add your Supabase URL and anon key:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Deploy to Vercel

1. Push this folder to GitHub.
2. Import the repo in Vercel.
3. Add the same environment variables in Vercel.
4. Deploy.

## Connect to GoDaddy

For GoDaddy Website Builder, add a button or navigation item named `Client Portal` and link it to your Vercel portal URL.

Recommended options:

- `https://your-portal.vercel.app`
- `https://portal.yourdomain.com`

For a subdomain, create a DNS `CNAME` record in GoDaddy:

- Host: `portal`
- Points to: your Vercel CNAME target

Then add `portal.yourdomain.com` as a domain inside Vercel.

## Before using real client data

This MVP is structured for Supabase, but the screens currently use demo data. Before going live with real client information, connect each page to Supabase queries and verify:

- Auth sessions
- Client-only data access
- Admin-only data access
- Private document storage
- Password reset email settings
- Production domain and SSL
