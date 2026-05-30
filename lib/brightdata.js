const BRIGHT_DATA_ENDPOINT = "https://api.brightdata.com/request";

function getBrightDataToken() {
  return process.env.BRIGHTDATA_API_KEY || process.env.BRIGHT_DATA_API_KEY || "";
}

function getSerpZone() {
  return process.env.BRIGHTDATA_SERP_ZONE || process.env.BRIGHT_DATA_SERP_ZONE || "serp_api1";
}

function getWebUnlockerZone() {
  return (
    process.env.BRIGHTDATA_WEB_UNLOCKER_ZONE ||
    process.env.BRIGHT_DATA_WEB_UNLOCKER_ZONE ||
    process.env.BRIGHT_DATA_UNLOCKER_ZONE ||
    process.env.BRIGHTDATA_UNLOCKER_ZONE ||
    ""
  );
}

function safeSlug(value) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function compactText(value, maxLength = 5000) {
  if (!value) {
    return "";
  }

  const text = String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function isGoogleUrl(url) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    return hostname === "google.com" || hostname.endsWith(".google.com");
  } catch {
    return false;
  }
}

function extractSearchResults(markdown) {
  if (!markdown) {
    return [];
  }

  const results = [];
  const seen = new Set();
  const titleLinkPattern = /###\s+([^\n]+)[\s\S]*?\]\((https?:\/\/[^)\s]+)\)/g;
  let match;

  while ((match = titleLinkPattern.exec(markdown)) !== null) {
    const title = match[1].replace(/\*\*/g, "").trim();
    const url = match[2].replace(/[),.;]+$/, "");

    if (!url || seen.has(url) || isGoogleUrl(url)) {
      continue;
    }

    seen.add(url);
    results.push({
      title: title || url,
      url,
      snippet: ""
    });
  }

  return results.slice(0, 8);
}

async function brightDataRequest({ url, zone, label, kind }) {
  const token = getBrightDataToken();

  if (!token) {
    throw new Error("Bright Data API key is missing.");
  }

  const startedAt = Date.now();
  const response = await fetch(BRIGHT_DATA_ENDPOINT, {
    method: "POST",
    cache: "no-store",
    signal: AbortSignal.timeout(30000),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      zone,
      url,
      format: "json",
      method: "GET",
      country: "us",
      data_format: "markdown"
    })
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`${label} failed (${response.status}): ${text.slice(0, 300)}`);
  }

  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = { body: text };
  }

  const upstreamStatus = payload.status_code || response.status;

  if (upstreamStatus >= 400) {
    throw new Error(`${label} upstream failed (${upstreamStatus}): ${text.slice(0, 300)}`);
  }

  const body = payload.body || payload.html || payload.content || text;

  return {
    label,
    kind,
    url,
    zone,
    statusCode: upstreamStatus,
    elapsedMs: Date.now() - startedAt,
    text: compactText(body),
    results: kind === "serp" ? extractSearchResults(body) : []
  };
}

async function settle(label, task) {
  try {
    return await task;
  } catch (error) {
    return {
      label,
      kind: "error",
      url: "",
      zone: "",
      statusCode: 0,
      elapsedMs: 0,
      text: "",
      results: [],
      error: error.message
    };
  }
}

export function inferDomain(company, domain) {
  if (domain) {
    return domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
  }

  return `${company.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`;
}

export async function gatherRawData(company, domain) {
  const normalizedDomain = inferDomain(company, domain);
  const homepageUrl = `https://${normalizedDomain}`;
  const slug = safeSlug(company);
  const serpZone = getSerpZone();
  const webZone = getWebUnlockerZone();
  const hasWebUnlocker = Boolean(webZone);

  const tasks = [
    settle(
      "Company website",
      hasWebUnlocker
        ? brightDataRequest({
            label: "Company website",
            kind: "page",
            zone: webZone,
            url: homepageUrl
          })
        : brightDataRequest({
            label: "Company website",
            kind: "serp",
            zone: serpZone,
            url: `https://www.google.com/search?q=${encodeURIComponent(
              `site:${normalizedDomain} ${company} product company about`
            )}`
          })
    ),
    settle(
      "Recent news and funding",
      brightDataRequest({
        label: "Recent news and funding",
        kind: "serp",
        zone: serpZone,
        url: `https://www.google.com/search?q=${encodeURIComponent(
          `${company} company news funding hiring 2026 2025`
        )}`
      })
    ),
    settle(
      "LinkedIn company page",
      hasWebUnlocker
        ? brightDataRequest({
            label: "LinkedIn company page",
            kind: "page",
            zone: webZone,
            url: `https://www.linkedin.com/company/${slug}`
          })
        : brightDataRequest({
            label: "LinkedIn company page",
            kind: "serp",
            zone: serpZone,
            url: `https://www.google.com/search?q=${encodeURIComponent(
              `site:linkedin.com/company ${company} company headcount hiring posts`
            )}`
          })
    ),
    settle(
      "Crunchbase public page",
      hasWebUnlocker
        ? brightDataRequest({
            label: "Crunchbase public page",
            kind: "page",
            zone: webZone,
            url: `https://www.crunchbase.com/organization/${slug}`
          })
        : brightDataRequest({
            label: "Crunchbase public page",
            kind: "serp",
            zone: serpZone,
            url: `https://www.google.com/search?q=${encodeURIComponent(
              `site:crunchbase.com/organization ${company} funding investors founded`
            )}`
          })
    ),
    settle(
      "Review and competitor signals",
      brightDataRequest({
        label: "Review and competitor signals",
        kind: "serp",
        zone: serpZone,
        url: `https://www.google.com/search?q=${encodeURIComponent(
          `${company} G2 Capterra reviews competitors category`
        )}`
      })
    ),
    settle(
      "Hiring and tech signals",
      brightDataRequest({
        label: "Hiring and tech signals",
        kind: "serp",
        zone: serpZone,
        url: `https://www.google.com/search?q=${encodeURIComponent(
          `${company} careers engineering hiring tech stack`
        )}`
      })
    )
  ];

  const sources = await Promise.all(tasks);

  return {
    company,
    domain: normalizedDomain,
    homepageUrl,
    sources,
    sourceText: sources
      .map((source) => {
        const resultText = source.results
          ?.map((result) => `- ${result.title}: ${result.url}`)
          .join("\n");

        return [
          `--- ${source.label} ---`,
          `URL: ${source.url || "Not available"}`,
          source.error ? `Error: ${source.error}` : "",
          resultText || "",
          source.text || ""
        ]
          .filter(Boolean)
          .join("\n");
      })
      .join("\n\n")
  };
}

export async function discoverIndustryCompanies(industry, count = 3) {
  const serpZone = getSerpZone();
  const safeCount = Math.min(Math.max(Number(count) || 3, 2), 3);
  const queries = [
    `${industry} companies public pricing B2B software`,
    `best ${industry} companies pricing page customers`
  ];

  const sources = await Promise.all(
    queries.map((query, index) =>
      settle(
        index === 0 ? "Industry company discovery" : "Pricing signal discovery",
        brightDataRequest({
          label: index === 0 ? "Industry company discovery" : "Pricing signal discovery",
          kind: "serp",
          zone: serpZone,
          url: `https://www.google.com/search?q=${encodeURIComponent(query)}`
        })
      )
    )
  );

  return {
    industry,
    count: safeCount,
    sources,
    sourceText: sources
      .map((source) => {
        const resultText = source.results
          ?.map((result) => `- ${result.title}: ${result.url}`)
          .join("\n");

        return [
          `--- ${source.label} ---`,
          `URL: ${source.url || "Not available"}`,
          source.error ? `Error: ${source.error}` : "",
          resultText || "",
          source.text || ""
        ]
          .filter(Boolean)
          .join("\n");
      })
      .join("\n\n")
  };
}

export function summarizeSourceStatus(rawData) {
  return rawData.sources.map((source) => ({
    label: source.label,
    kind: source.kind,
    url: source.url,
    zone: source.zone,
    status: source.error ? "failed" : "ok",
    statusCode: source.statusCode,
    elapsedMs: source.elapsedMs,
    error: source.error || "",
    results: source.results?.slice(0, 5) || []
  }));
}
