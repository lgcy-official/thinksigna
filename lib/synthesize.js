import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    brief: {
      type: "object",
      additionalProperties: false,
      properties: {
        name: { type: "string" },
        description: { type: "string" },
        headcount: { type: "string" },
        founded: { type: "string" },
        funding: { type: "string" },
        recentNews: {
          type: "array",
          items: { type: "string" },
          maxItems: 3
        },
        techSignals: {
          type: "array",
          items: { type: "string" },
          maxItems: 3
        },
        hiringTrends: { type: "string" },
        competitors: {
          type: "array",
          items: { type: "string" },
          maxItems: 3
        },
        salesAngle: { type: "string" }
      },
      required: [
        "name",
        "description",
        "headcount",
        "founded",
        "funding",
        "recentNews",
        "techSignals",
        "hiringTrends",
        "competitors",
        "salesAngle"
      ]
    },
    email: { type: "string" },
    confidence: {
      type: "string",
      enum: ["low", "medium", "high"]
    }
  },
  required: ["brief", "email", "confidence"]
};

const industryDiscoverySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    candidates: {
      type: "array",
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          domain: { type: "string" },
          reason: { type: "string" },
          evidence: { type: "string" }
        },
        required: ["name", "domain", "reason", "evidence"]
      }
    }
  },
  required: ["candidates"]
};

function trimInput(rawData) {
  return rawData.sourceText.slice(0, 18000);
}

export async function synthesizeIndustryCandidates(industry, rawData, count = 3) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key is missing.");
  }

  const safeCount = Math.min(Math.max(Number(count) || 3, 2), 3);
  const prompt = `
You are building a prospecting list for a B2B sales rep.

Industry: ${industry}
Target count: ${safeCount}

Rules:
- Use only the supplied Bright Data search dump.
- Return ${safeCount} real companies that fit the industry.
- Prioritize businesses with their own public website and public pricing, product, or customer pages.
- Avoid directories, publications, review sites, job boards, investor pages, and marketplaces as candidates.
- Domain must be only the company domain, without https:// or paths.
- Reason should explain why the company is relevant for this industry.
- Evidence should cite the visible search result or source signal used.
- If fewer than ${safeCount} strong candidates are visible, return the strongest visible candidates only.
- Return only valid JSON.

Bright Data discovery dump:
${trimInput(rawData)}
`.trim();

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content:
          "You extract source-grounded B2B account candidates from live web search results."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "industry_account_candidates",
        strict: true,
        schema: industryDiscoverySchema
      }
    }
  });

  const content = response.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("OpenAI returned an empty industry discovery response.");
  }

  const parsed = JSON.parse(content);

  return parsed.candidates
    .filter((candidate) => candidate.name && candidate.domain)
    .map((candidate) => ({
      ...candidate,
      domain: candidate.domain
        .replace(/^https?:\/\//, "")
        .replace(/^www\./, "")
        .replace(/\/.*$/, "")
        .trim()
    }))
    .slice(0, safeCount);
}

export async function synthesizeIntelligence(company, rawData, tone = "casual") {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key is missing.");
  }

  const prompt = `
You are a sales intelligence analyst. Synthesize a live account brief and a cold outreach email from the Bright Data source dump.

Company: ${company}
Domain: ${rawData.domain}
Email tone: ${tone}

Rules:
- Use only the supplied source dump.
- If a field is missing, write "Not found".
- Keep description to 2 sentences max.
- Recent news should be specific, dated when possible, and no more than 3 bullets.
- Tech signals should include product, cloud, engineering, security, integrations, or tooling signals when visible.
- Hiring trends should mention hiring activity, roles, or "Not found".
- The email must be under 150 words, casual but professional, and reference one specific signal from the brief.
- Return only valid JSON.

Bright Data source dump:
${trimInput(rawData)}
`.trim();

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content:
          "You produce concise, source-grounded sales intelligence for B2B account reps."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "account_enrichment",
        strict: true,
        schema
      }
    }
  });

  const content = response.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("OpenAI returned an empty response.");
  }

  return JSON.parse(content);
}
