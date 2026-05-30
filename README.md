# ThinkSignal

ThinkSignal is a live account intelligence agent for outbound sales teams. It turns a company name or industry into source-backed account briefs and personalized outreach emails using real-time web data.

## Problem

Sales reps need timely context before reaching out to accounts, but most enrichment workflows are either stale, manual, or too narrow. Static databases can miss recent funding, hiring, pricing, product, and competitor signals. Manual research across company sites, Google, LinkedIn, Crunchbase, and review pages slows down outbound and creates inconsistent messaging.

## Product

ThinkSignal gives a rep two workflows:

- Research one company by entering a company name and optional domain.
- Generate multiple accounts from an industry, then enrich each discovered company.

For every account, ThinkSignal returns:

- A structured company brief with description, headcount, founded date, funding, recent news, hiring trends, tech signals, competitors, and sales angle.
- A copy-ready outbound email that references a specific live signal.
- A visible source stream showing which live web sources were checked and what links supported the brief.

The result is a practical GTM workflow: find accounts, understand why now is a good time to reach out, and generate relevant outbound in seconds.

## How It Works

1. The user enters a company or industry.
2. Bright Data gathers live public web data from search results and company-related sources.
3. OpenAI extracts the most useful account signals from the raw source dump.
4. The UI renders the brief, email, generated companies, and source trail.
5. The user can switch account cards, copy an email, or regenerate with a different tone.

## Live Data Sources

ThinkSignal uses Bright Data to collect fresh public signals from:

- Company website and product pages
- Google search results for news, funding, pricing, and hiring
- LinkedIn company page discovery via web search
- Crunchbase public page discovery via web search
- Review and competitor pages such as G2 and Capterra
- Careers and engineering pages for hiring and tech signals

If a Web Unlocker zone is configured, the app can request pages directly. If not, it still works through SERP-backed discovery, which keeps the demo reliable with a single Bright Data SERP zone.

## Agent Behavior

ThinkSignal is designed to feel like an agent, not a form:

- It plans the run as steps: read target, search live web, inspect sources, synthesize brief, draft outreach.
- In industry mode, it first discovers candidate companies, then enriches each account.
- It exposes the source stream so users can trust where the claims came from.
- It lets users choose outreach tone: casual, direct, or executive.

## Tech Stack

- Next.js 14 App Router
- React 18
- Tailwind CSS
- Bright Data `/request` API with SERP-backed discovery
- OpenAI `gpt-4o` for structured synthesis and email generation
- Stateless API route architecture with no database

## Environment

Create `.env.local`:

```bash
OPENAI_API_KEY=
BRIGHTDATA_API_KEY=
BRIGHTDATA_SERP_ZONE=serp_api1
BRIGHTDATA_WEB_UNLOCKER_ZONE=
```

Alternative Bright Data variable names are also supported:

```bash
BRIGHT_DATA_API_KEY=
BRIGHT_DATA_SERP_ZONE=
BRIGHT_DATA_WEB_UNLOCKER_ZONE=
```

Do not commit `.env.local`. It is ignored by git.

## Run Locally

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

## API

### Single Company

`POST /api/enrich`

```json
{
  "mode": "account",
  "company": "Rippling",
  "domain": "rippling.com",
  "tone": "casual"
}
```

### Industry Batch

```json
{
  "mode": "industry",
  "industry": "HR and payroll software",
  "count": 3,
  "tone": "direct"
}
```

## Demo Script

1. Start with industry mode.
2. Enter `HR and payroll software`.
3. Generate 2-3 accounts.
4. Show that ThinkSignal discovers real companies, enriches each one, and creates separate outreach emails.
5. Click between generated company cards to show different briefs, signals, and source streams.
6. Copy one email and explain that the rep can use it immediately because it references current public data.

## Why This Matters

ThinkSignal replaces manual account research with a live, source-backed AI workflow. It gives sales teams fresher context than static enrichment tools, makes outbound more specific, and creates a clear audit trail from public web data to generated email.
