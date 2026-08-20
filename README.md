# Barta (thesis-barter-app)

Barta is a peer-to-peer marketplace for barter, digital art trade, and community engagement. Users post items, services, or digital art they're willing to trade, browse or search other members' posts, and negotiate trades directly. Trades, reviews, direct messages, and moderation (reports/appeals) are all first-class parts of the app.

## Stack

- **Client**: React 19, MUI 9 (Emotion for styling), bundled with Webpack 5 and Babel 8, TypeScript throughout.
- **Server**: Express 5, Socket.IO for realtime (DMs, notifications), Passport with Google OAuth for auth.
- **Database**: PostgreSQL via Prisma 7 (`@prisma/client`, `@prisma/adapter-pg`).
- **Media**: AWS S3, uploaded via presigned URLs (`@aws-sdk/client-s3`, `s3-request-presigner`).
- **Moderation**: Google Gemini (`@google/genai`) screens user-submitted content asynchronously via a job queue; screening is fail-closed by design — an unresolved verdict (exhausted retries, or a mid-confidence score) never auto-approves, it files for human review instead. See [Architecture](#architecture) below.
- **Runtime**: `tsx` executes TypeScript directly in dev, no separate compile step. The project is ESM (`"type": "module"`); relative imports need an explicit `.js` extension even when the source file is `.ts` — e.g. `import router from './routes/router.js'` for a file that's actually `router.ts`. This is how Node's ESM resolver works, not a typo.

## Setup

1. `npm install`
2. Copy `config/.env.example` to `config/.env` and fill in the values (see [Environment variables](#environment-variables) below).
3. Set up a local Postgres database (see [Local database setup](#local-database-setup) below).
4. `npx prisma migrate dev` — applies migrations to your local database and generates the Prisma client.
5. `npx tsx server/scripts/createSystemUser.ts` — appended to migrate script - seeds the system user that automated screening/moderation actions get attributed to. It's an upsert, safe to re-run. With the system user, `SCREEN_CONTENT` will not work properly.
6. `npm run dev:server` — starts the server via `tsx watch`, restarting on file changes.
7. `npm run build` — bundles the client with Webpack.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev:server` | Runs the server with `tsx watch`, restarting on save. |
| `npm start` | Runs the server once, no watch mode. |
| `npm run build` | Bundles the client via Webpack. |
| `npm run lint` | Runs ESLint with `--fix` across the repo. |
| `npm run typecheck` | Runs `tsc --noEmit` — type-checks without emitting output. |
| `npm run migrate` | `prisma migrate dev` followed by `prisma generate` and then `tsx server/scripts/createSystemUser.ts`. |

## Environment variables

Copy `config/.env.example` to `config/.env` and set each of these:

| Variable | Purpose |
|---|---|
| `MODE` | `development` or `production` — controls Webpack's build mode. |
| `DATABASE_URL` | Postgres connection string. Local setups need your own OS username in the URL — see below. |
| `CLIENT_URL` | The client's origin URL. Required — omitting it causes WebSocket connection errors. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_CALLBACK_URL` | Google OAuth credentials for sign-in (Passport). |
| `SESSION_SECRET` | Signs the Express session cookie. Use a long random string; don't reuse across environments. |
| `GEMINI_API_KEY` | Google Gemini API key, used for content moderation screening. |
| `AWS_REGION` / `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_S3_BUCKET_NAME` | Credentials and bucket for S3 media uploads. |
| `SKIP_SCREENING` | `true` or `false`. Set `true` locally to skip Gemini calls during development and avoid burning API quota; set `false` when testing moderation or deploying. |

## Local database setup

These steps use a real local Postgres install, not Prisma's `prisma dev` local proxy — the proxy returned connection errors (`P1017`) in testing, possibly tied to its SQLite-backed experimental server rather than a config issue on our end. Unconfirmed; flag it if you hit the same error.

**macOS (Homebrew):**

1. `brew install postgresql@15` (skip if already installed), then `brew services start postgresql@15`.
2. `createdb thesis_barter_dev`
3. Set `DATABASE_URL` in `config/.env`:
   ```
   DATABASE_URL="postgresql://<your-mac-username>@localhost:5432/thesis_barter_dev"
   ```
   Run `whoami` if you're unsure of your username. Homebrew's Postgres doesn't create a shared `postgres` superuser the way Linux installs do — it creates a role matching your OS username instead. Leaving the username off the connection string produces a `P1010` access-denied error.
4. `npx prisma migrate dev` to apply the schema.

**Linux / Windows:** not yet verified by anyone on the team — the steps above are Homebrew-specific and won't translate directly. If you're setting up on either platform, please note what worked here once you've got it running, so the next teammate doesn't start from zero.

## Architecture

A few decisions in this codebase are deliberate and should be understood before changing related code:

- **Async screening is fail-closed.** Posts, trade offers, trade requests, and reviews all carry an `isPendingScreening` flag. Content is held pending while Gemini screening runs via a background job queue (`Job` model). A clear verdict (high-confidence violation or clearly clean) resolves automatically; anything else (i.e., a mid-confidence score, or the job exhausting its retries) stays `isPendingScreening: true` until a moderator resolves it. Screening never silently approves; it either resolves the content or hands it to a human.
- **`Report` is one polymorphic model, not one table per reportable type.** A single `Report` row can point at a `Post`, `User`, `Message`, `TradeOffer`, `Review`, or `TradeRequest` via nullable foreign keys plus a `targetType` enum, rather than separate `PostReport`/`UserReport`/etc. tables.
- **A system user exists** (`User.isSystem`) to attribute automated actions, like content removed by the screening job, to something other than a real moderator's account.

## Links

- [Prisma client generation](https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/generating-prisma-client)
- [npm ci](https://docs.npmjs.com/cli/v10/commands/npm-ci)
- [package-lock.json](https://docs.npmjs.com/cli/v10/configuring-npm/package-lock-json)

See `CONTRIBUTING.md` for the branch/commit workflow and `STYLEGUIDE.md` for code conventions.
