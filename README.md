# ProfitLens

ProfitLens is a Thai-language MVP web app for owners who run multiple small businesses and need a fast view of real profit, cash on hand, receivables, and payables.

## Features

- Real email/password accounts — each user's data is private to their account
- Dashboard across all businesses or one selected business
- Add, edit, and delete businesses
- Add, edit, and delete transactions
- Transaction types for income, cost, expense, owner contribution, owner withdrawal, and transfer
- Transaction status for received, pending receive, paid, and pending pay
- Shared expense allocation across multiple businesses by percentage
- Monthly and business filters
- Basic reports for monthly profit, business comparison, and top expenses
- Postgres persistence via Drizzle ORM — data survives across devices and browsers

## Setup

1. Copy `.env.example` to `.env.local` and fill in:
   - `DATABASE_URL` — a Postgres connection string. Provision one via Vercel: **Storage → Create Database → Postgres**, then copy the pooled connection string.
   - `AUTH_SECRET` — a random secret for signing session cookies: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
2. Install dependencies and apply the database schema:

```bash
npm install
npm run db:migrate
```

On Windows PowerShell, use `npm.cmd` instead of `npm`.

## Run Locally

```bash
npm run dev
```

Then open `http://localhost:3000/` and sign up for an account.

## Build

```bash
npm run build
```

## Database

Schema lives in `db/schema.ts`. After changing it:

```bash
npm run db:generate   # writes a reviewable migration into drizzle/
npm run db:migrate    # applies it to DATABASE_URL
npm run db:studio     # browse the database
```

Any deploy that changes the schema needs `npm run db:migrate` run manually against the production database — there is no automatic pre-deploy migration step.
