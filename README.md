# Account Enrichment Agent

Real-time account enrichment for sales teams. Enter a company name and optional domain, then the app collects live public web signals with Bright Data and uses OpenAI to synthesize a company brief and outreach email.

## Stack

- Next.js 14 App Router
- Tailwind CSS
- Bright Data `/request` API
- OpenAI `gpt-4o`

## Environment

The app reads either naming style for Bright Data keys:

```bash
OPENAI_API_KEY=
BRIGHTDATA_API_KEY=
BRIGHTDATA_SERP_ZONE=serp_api1
BRIGHTDATA_WEB_UNLOCKER_ZONE=
```

It also supports the existing names:

```bash
BRIGHT_DATA_API_KEY=
BRIGHT_DATA_SERP_ZONE=
BRIGHT_DATA_WEB_UNLOCKER_ZONE=
```

If no Web Unlocker zone is configured, the app uses SERP-backed discovery for website, LinkedIn, and Crunchbase signals so the demo still runs with a single Bright Data zone.

## Run

```bash
npm install
npm run dev
```

Open the URL printed by Next.js.

## API

`POST /api/enrich`

```json
{
  "company": "Rippling",
  "domain": "rippling.com",
  "tone": "casual"
}
```

Response:

```json
{
  "brief": {
    "name": "Rippling",
    "description": "...",
    "headcount": "...",
    "founded": "...",
    "funding": "...",
    "recentNews": ["..."],
    "techSignals": ["..."],
    "hiringTrends": "...",
    "competitors": ["..."],
    "salesAngle": "..."
  },
  "email": "...",
  "confidence": "high"
}
```
