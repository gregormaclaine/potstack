# Potstack

A personal poker session tracker. Log your sessions, track profits, manage players, and see stats broken down by player or group.

## Features

- Log poker sessions with buy-in, cash-out, location, notes, and players
- Track per-player results within a session
- Organise players into groups
- Dashboard with profit/loss charts over time
- Breakdowns page with win rates and stats per player and group
- Link your player entries to other users so shared sessions can be imported
- Session invites — accept a session logged by another user to add it to your own history
- Notifications for incoming invites and link requests
- User settings: currency, chart style, avatar

## Tech Stack

- [Next.js 16](https://nextjs.org) (App Router)
- [TypeScript](https://www.typescriptlang.org)
- [Tailwind CSS v4](https://tailwindcss.com)
- [Prisma v6](https://www.prisma.io) + PostgreSQL
- [NextAuth v5](https://authjs.dev) (credentials — username + password)
- [Recharts](https://recharts.org)

## Requirements

- Node.js 18+
- PostgreSQL database

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env.local` file in the project root:
   ```
   DATABASE_URL="postgresql://user:password@localhost:5432/potstack"
   AUTH_SECRET="a-random-secret-string"
   ```

3. Push the database schema:
   ```bash
   npx prisma db push
   ```

4. Generate the Prisma client:
   ```bash
   npx prisma generate
   ```

5. Start the dev server:
   ```bash
   npm run dev
   ```

The app runs at [http://localhost:3000](http://localhost:3000). Register an account on first use.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
