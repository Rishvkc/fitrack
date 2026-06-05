# CutTrack

Personal fitness momentum dashboard for a timed weight cut. Aggregates daily data from Apple Health (via iOS Shortcuts), displays progress against a goal curve, and delivers a narrative AI coach brief each morning.

## Quick start

```bash
npm install
cp .env.example .env.local
# Edit .env.local with your keys

# Initialize local SQLite database
curl -X POST http://localhost:3000/api/init

npm run dev
```

Open [http://localhost:3000](http://localhost:3000), configure settings, and start logging.

## Environment variables

| Variable | Description |
|----------|-------------|
| `TURSO_DATABASE_URL` | Turso DB URL (`file:local.db` for local dev) |
| `TURSO_AUTH_TOKEN` | Turso auth token (production only) |
| `SHORTCUT_SECRET` | Bearer token for `/api/log` POST from Shortcuts |
| `ANTHROPIC_API_KEY` | Anthropic API key for coach briefs |

## Apple Shortcuts setup

**Shortcut name:** CutTrack Daily Log

**Trigger:** Personal Automation → Time of Day → 7:00 AM → Run Immediately

1. Find Health Samples — Body Mass — Last 1 Day (limit 1, newest first)
2. Find Health Samples — Dietary Energy Consumed — Last 1 Day (sum)
3. Find Health Samples — Active Energy — Last 1 Day (sum)
4. Find Health Samples — Resting Energy — Last 1 Day (sum)
5. Dictionary: `date`, `weight_lbs`, `calories_consumed`, `active_calories`, `resting_calories`
6. Get Contents of URL — POST to `https://<your-url>/api/log`
   - Header: `Authorization: Bearer <SHORTCUT_SECRET>`
   - Content-Type: `application/json`

## Deploy to Vercel

1. Push to GitHub and import in Vercel
2. Create a [Turso](https://turso.tech) database and add env vars
3. Run `POST /api/init` once after deploy to create tables
4. Update your Shortcut URL to the Vercel domain

## API routes

- `POST /api/log` — Upsert daily log (Shortcut, bearer auth)
- `GET /api/log` — All log entries
- `GET /api/log/:date` — Single entry
- `PATCH /api/log/:date` — Manual override
- `GET /api/settings` — Current settings
- `POST /api/settings` — Save settings
- `POST /api/coach` — Generate/return coach brief
