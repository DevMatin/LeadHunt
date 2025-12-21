# LeadHunt Worker

Separater Node.js Worker für Website-Crawling zur E-Mail-Extraktion.

## Setup

1. Installiere Dependencies:
```bash
npm install
```

2. Installiere Playwright Browser:
```bash
npx playwright install chromium
```

3. Erstelle `.env` Datei:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
WORKER_CONCURRENCY=2
PAGE_TIMEOUT_MS=30000
LOCK_EXPIRES_MINUTES=15
MAX_ATTEMPTS=3
```

## Entwicklung

```bash
npm run dev
```

## Production

```bash
npm run build
npm start
```

## Docker

Siehe `docker-compose.example.yml` und `Dockerfile`.

## Features

- Atomisches Job-Claiming via Postgres `FOR UPDATE SKIP LOCKED`
- Graceful Shutdown
- Retry-Policy mit Exponential Backoff
- Confidence-Scoring für gefundene E-Mails
- Rate Limiting (1 Request/Sekunde)

