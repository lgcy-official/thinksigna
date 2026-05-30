import {
  discoverIndustryCompanies,
  gatherRawData,
  summarizeSourceStatus
} from "@/lib/brightdata";
import {
  synthesizeIndustryCandidates,
  synthesizeIntelligence
} from "@/lib/synthesize";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

function clampBatchCount(value) {
  return Math.min(Math.max(Number(value) || 3, 2), 3);
}

async function enrichAccount({ company, domain, tone, generatedAt }) {
  const rawData = await gatherRawData(company, domain);
  const result = await synthesizeIntelligence(company, rawData, tone);

  return {
    ...result,
    meta: {
      generatedAt,
      domain: rawData.domain,
      sources: summarizeSourceStatus(rawData)
    }
  };
}

export async function POST(request) {
  try {
    const body = await request.json();
    const mode = body.mode === "industry" ? "industry" : "account";
    const company = body.company?.trim();
    const domain = body.domain?.trim();
    const industry = body.industry?.trim();
    const count = clampBatchCount(body.count);
    const tone = body.tone?.trim() || "casual";
    const generatedAt = new Date().toISOString();

    if (mode === "industry") {
      if (!industry) {
        return Response.json({ error: "industry required" }, { status: 400 });
      }

      const discoveryRaw = await discoverIndustryCompanies(industry, count);
      const candidates = await synthesizeIndustryCandidates(
        industry,
        discoveryRaw,
        count
      );

      if (!candidates.length) {
        return Response.json(
          {
            error: "industry discovery failed",
            detail: "No strong company candidates were found for that industry."
          },
          { status: 422 }
        );
      }

      const settledAccounts = await Promise.allSettled(
        candidates.map(async (candidate) => {
          const account = await enrichAccount({
            company: candidate.name,
            domain: candidate.domain,
            tone,
            generatedAt
          });

          return {
            ...account,
            candidate
          };
        })
      );

      const accounts = settledAccounts
        .filter((item) => item.status === "fulfilled")
        .map((item) => item.value);
      const failures = settledAccounts
        .map((item, index) =>
          item.status === "rejected"
            ? {
                candidate: candidates[index],
                error: item.reason?.message || "Account enrichment failed."
              }
            : null
        )
        .filter(Boolean);

      if (!accounts.length) {
        throw new Error(
          failures[0]?.error || "No industry accounts could be enriched."
        );
      }

      return Response.json({
        mode: "industry",
        industry,
        accounts,
        discovery: {
          candidates,
          sources: summarizeSourceStatus(discoveryRaw)
        },
        meta: {
          generatedAt,
          requestedCount: count,
          completedCount: accounts.length,
          failures
        }
      });
    }

    if (!company) {
      return Response.json({ error: "company required" }, { status: 400 });
    }

    return Response.json({
      mode: "account",
      ...(await enrichAccount({ company, domain, tone, generatedAt }))
    });
  } catch (error) {
    return Response.json(
      {
        error: "enrichment failed",
        detail: error.message
      },
      {
        status: 500
      }
    );
  }
}
