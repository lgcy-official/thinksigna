"use client";

import {
  AlertCircle,
  Bot,
  BriefcaseBusiness,
  Check,
  Clipboard,
  Clock3,
  ExternalLink,
  FileText,
  Globe2,
  Loader2,
  Mail,
  Radio,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Target,
  Users,
  Zap
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

const sampleAccounts = [
  { company: "Rippling", domain: "rippling.com" },
  { company: "Stripe", domain: "stripe.com" },
  { company: "Mercury", domain: "mercury.com" }
];

const sampleIndustries = [
  "HR and payroll software",
  "cybersecurity compliance platforms",
  "AI meeting assistants"
];

const tones = [
  { id: "casual", label: "Casual" },
  { id: "direct", label: "Direct" },
  { id: "executive", label: "Executive" }
];

const accountAgentPlan = [
  {
    id: "parse",
    label: "Read target",
    detail: "Normalize account name and domain",
    icon: Target
  },
  {
    id: "search",
    label: "Search live web",
    detail: "Query company, news, funding, careers, reviews",
    icon: Search
  },
  {
    id: "sources",
    label: "Inspect sources",
    detail: "Rank signals from public web hits",
    icon: Globe2
  },
  {
    id: "synthesis",
    label: "Synthesize brief",
    detail: "Extract firmographics, triggers, and sales angle",
    icon: Sparkles
  },
  {
    id: "email",
    label: "Draft outreach",
    detail: "Write a personalized email in selected tone",
    icon: Mail
  }
];

const industryAgentPlan = [
  {
    id: "industry",
    label: "Read industry",
    detail: "Convert the industry into a live search brief",
    icon: Target
  },
  {
    id: "discover",
    label: "Discover accounts",
    detail: "Find companies with public web and pricing signals",
    icon: Search
  },
  {
    id: "enrich",
    label: "Enrich each account",
    detail: "Run live Bright Data research per company",
    icon: Globe2
  },
  {
    id: "compare",
    label: "Rank signals",
    detail: "Extract triggers, firmographics, and sales angles",
    icon: Sparkles
  },
  {
    id: "outreach",
    label: "Draft outreach",
    detail: "Generate copy-ready email for every account",
    icon: Mail
  }
];

const emptySourceSummary = [
  "Website signal",
  "News and funding",
  "LinkedIn footprint",
  "Crunchbase trail",
  "Review market",
  "Hiring signal"
];

function formatTime(value) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function sourceCount(sources) {
  return sources?.reduce(
    (count, source) => count + (source.results?.length || 0),
    0
  );
}

function compactHost(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function PlanStep({ step, index, activeStep, loading, completed }) {
  const Icon = step.icon;
  const isDone = completed || activeStep > index;
  const isActive = loading && activeStep === index;

  return (
    <div
      className={`flex gap-3 rounded-md border p-3 transition ${
        isActive
          ? "border-ink bg-white shadow-sm"
          : isDone
            ? "border-emerald-200 bg-emerald-50"
            : "border-line bg-white"
      }`}
    >
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${
          isActive
            ? "bg-ink text-white"
            : isDone
              ? "bg-mint text-white"
              : "bg-surface text-muted"
        }`}
      >
        {isActive ? (
          <Loader2 size={17} className="animate-spin" />
        ) : isDone ? (
          <Check size={17} />
        ) : (
          <Icon size={17} />
        )}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink">{step.label}</p>
        <p className="mt-0.5 text-xs leading-5 text-muted">{step.detail}</p>
      </div>
    </div>
  );
}

function SourcePill({ source }) {
  const ok = source.status === "ok";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium ${
        ok ? "bg-emerald-50 text-mint" : "bg-red-50 text-red-700"
      }`}
      title={source.error || `${source.statusCode || "No"} status code`}
    >
      {ok ? <Check size={13} /> : <AlertCircle size={13} />}
      {source.label}
    </span>
  );
}

function Metric({ icon: Icon, label, value }) {
  return (
    <div className="rounded-md border border-line bg-white p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted">
        <Icon size={14} />
        {label}
      </div>
      <p className="break-words text-sm font-semibold text-ink">{value || "Not found"}</p>
    </div>
  );
}

export default function Home() {
  const [mode, setMode] = useState("account");
  const [company, setCompany] = useState("Rippling");
  const [domain, setDomain] = useState("rippling.com");
  const [industry, setIndustry] = useState("HR and payroll software");
  const [batchSize, setBatchSize] = useState(3);
  const [tone, setTone] = useState("casual");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [selectedAccountIndex, setSelectedAccountIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const intervalRef = useRef(null);
  const activeAgentPlan =
    mode === "industry" ? industryAgentPlan : accountAgentPlan;

  useEffect(() => {
    if (!loading) {
      return undefined;
    }

    setActiveStep(0);
    intervalRef.current = window.setInterval(() => {
      setActiveStep((current) =>
        Math.min(current + 1, activeAgentPlan.length - 1)
      );
    }, 1600);

    return () => window.clearInterval(intervalRef.current);
  }, [activeAgentPlan.length, loading]);

  const accounts = useMemo(() => {
    if (result?.accounts?.length) {
      return result.accounts;
    }

    if (result?.brief) {
      return [
        {
          brief: result.brief,
          email: result.email,
          meta: result.meta
        }
      ];
    }

    return [];
  }, [result]);

  const activeAccount = accounts[selectedAccountIndex] || accounts[0] || null;
  const brief = activeAccount?.brief || null;
  const activeEmail = activeAccount?.email || "";
  const sources = activeAccount?.meta?.sources || [];
  const completed = Boolean(result) && !loading;
  const isIndustryResult = result?.mode === "industry";
  const canSubmit =
    mode === "industry" ? Boolean(industry.trim()) : Boolean(company.trim());
  const sourceHits = useMemo(() => {
    return sources
      .flatMap((source) =>
        (source.results || []).map((hit) => ({
          ...hit,
          sourceLabel: source.label
        }))
      )
      .slice(0, 10);
  }, [sources]);

  async function enrich(nextTone = tone) {
    if (!canSubmit) {
      return;
    }

    setLoading(true);
    setError("");
    setCopied(false);
    setResult(null);
    setSelectedAccountIndex(0);

    try {
      const payload =
        mode === "industry"
          ? {
              mode,
              industry,
              count: batchSize,
              tone: nextTone
            }
          : {
              mode,
              company,
              domain,
              tone: nextTone
            };

      const response = await fetch("/api/enrich", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || data.error || "Enrichment failed.");
      }

      setResult(data);
      setActiveStep(activeAgentPlan.length);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
      window.clearInterval(intervalRef.current);
    }
  }

  async function copyEmail() {
    if (!activeEmail) {
      return;
    }

    await navigator.clipboard.writeText(activeEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  function submitFromComposer(event) {
    event.preventDefault();
    enrich();
  }

  function useSample(account) {
    setMode("account");
    setCompany(account.company);
    setDomain(account.domain);
    setResult(null);
    setSelectedAccountIndex(0);
    setError("");
  }

  function useIndustrySample(nextIndustry) {
    setMode("industry");
    setIndustry(nextIndustry);
    setBatchSize(3);
    setResult(null);
    setSelectedAccountIndex(0);
    setError("");
  }

  function changeMode(nextMode) {
    setMode(nextMode);
    setResult(null);
    setSelectedAccountIndex(0);
    setError("");
  }

  const workspaceTitle = isIndustryResult
    ? `${accounts.length} ${result.industry} accounts`
    : brief?.name ||
      (loading
        ? mode === "industry"
          ? `Scanning ${industry}`
          : `Researching ${company}`
        : "Ready for account research");
  const workspaceDescription = isIndustryResult
    ? "Select a generated company to review its brief, source trail, and outreach email."
    : brief?.description ||
      (mode === "industry"
        ? "The agent will discover companies in the industry, enrich each one, and draft tailored outreach."
        : "The agent will gather live public signals, synthesize a sales brief, and produce copy-ready outbound.");

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#eef4f1_0%,#f7f8f6_42%,#eef2f0_100%)]">
      <header className="sticky top-0 z-20 border-b border-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-ink text-white">
              <Bot size={20} />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold tracking-normal text-ink">
                ThinkSignal
              </h1>
              <p className="truncate text-xs text-muted">
                Live account signals for outbound sales
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted">
            <span className="hidden items-center gap-1.5 sm:inline-flex">
              <Radio size={14} className="text-mint" />
              Bright Data live
            </span>
            {result?.meta?.generatedAt ? (
              <span>Updated {formatTime(result.meta.generatedAt)}</span>
            ) : null}
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl grid-cols-1 gap-5 px-5 py-5 xl:grid-cols-[390px_minmax(0,1fr)]">
        <aside className="space-y-5">
          <section className="rounded-lg border border-line bg-white p-4 shadow-panel">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase text-muted">Agent command</p>
                <h2 className="mt-1 text-lg font-semibold text-ink">
                  {mode === "industry" ? "Build an account list" : "Research an account"}
                </h2>
              </div>
              <Zap size={18} className="text-coral" />
            </div>

            <form onSubmit={submitFromComposer} className="space-y-3">
              <div className="grid grid-cols-2 rounded-md border border-line bg-surface p-1">
                <button
                  type="button"
                  onClick={() => changeMode("account")}
                  className={`h-9 rounded text-xs font-semibold ${
                    mode === "account"
                      ? "bg-white text-ink shadow-panel"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  One company
                </button>
                <button
                  type="button"
                  onClick={() => changeMode("industry")}
                  className={`h-9 rounded text-xs font-semibold ${
                    mode === "industry"
                      ? "bg-white text-ink shadow-panel"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  Industry batch
                </button>
              </div>

              {mode === "industry" ? (
                <>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-muted">
                      Industry
                    </span>
                    <input
                      value={industry}
                      onChange={(event) => setIndustry(event.target.value)}
                      className="h-11 w-full rounded-md border border-line bg-white px-3 text-sm text-ink"
                      placeholder="HR and payroll software"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-muted">
                      Companies to generate
                    </span>
                    <select
                      value={batchSize}
                      onChange={(event) => setBatchSize(Number(event.target.value))}
                      className="h-11 w-full rounded-md border border-line bg-white px-3 text-sm text-ink"
                    >
                      <option value={2}>2 companies</option>
                      <option value={3}>3 companies</option>
                    </select>
                  </label>

                  <p className="rounded-md bg-emerald-50 px-3 py-2 text-xs leading-5 text-mint">
                    The agent will discover companies first, then run live enrichment for each one.
                  </p>
                </>
              ) : (
                <>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-muted">
                      Company
                    </span>
                    <input
                      value={company}
                      onChange={(event) => setCompany(event.target.value)}
                      className="h-11 w-full rounded-md border border-line bg-white px-3 text-sm text-ink"
                      placeholder="Rippling"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-muted">
                      Domain
                    </span>
                    <div className="flex items-center rounded-md border border-line bg-white px-3">
                      <Globe2 size={15} className="mr-2 text-muted" />
                      <input
                        value={domain}
                        onChange={(event) => setDomain(event.target.value)}
                        className="h-11 min-w-0 flex-1 bg-transparent text-sm text-ink outline-none"
                        placeholder="rippling.com"
                      />
                    </div>
                  </label>
                </>
              )}

              <div>
                <span className="mb-1 block text-xs font-medium text-muted">
                  Outreach tone
                </span>
                <div className="grid grid-cols-3 rounded-md border border-line bg-surface p-1">
                  {tones.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setTone(option.id)}
                      className={`h-9 rounded text-xs font-semibold ${
                        tone === option.id
                          ? "bg-white text-ink shadow-panel"
                          : "text-muted hover:text-ink"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !canSubmit}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-ink px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
                {loading
                  ? "Agent working"
                  : mode === "industry"
                    ? "Generate account list"
                    : "Launch agent"}
              </button>
            </form>
          </section>

          <section className="rounded-lg border border-line bg-white p-4 shadow-panel">
            <h2 className="mb-3 text-sm font-semibold text-ink">Demo targets</h2>
            <p className="mb-2 text-xs font-medium uppercase text-muted">Accounts</p>
            <div className="mb-4 space-y-2">
              {sampleAccounts.map((account) => (
                <button
                  key={account.company}
                  type="button"
                  onClick={() => useSample(account)}
                  className="flex w-full items-center justify-between rounded-md border border-line px-3 py-2 text-left hover:border-mint hover:bg-emerald-50"
                >
                  <span className="text-sm font-semibold text-ink">{account.company}</span>
                  <span className="text-xs text-muted">{account.domain}</span>
                </button>
              ))}
            </div>
            <p className="mb-2 text-xs font-medium uppercase text-muted">Industries</p>
            <div className="space-y-2">
              {sampleIndustries.map((nextIndustry) => (
                <button
                  key={nextIndustry}
                  type="button"
                  onClick={() => useIndustrySample(nextIndustry)}
                  className="flex w-full items-center justify-between gap-3 rounded-md border border-line px-3 py-2 text-left hover:border-mint hover:bg-emerald-50"
                >
                  <span className="text-sm font-semibold text-ink">{nextIndustry}</span>
                  <span className="shrink-0 text-xs text-muted">3 leads</span>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-line bg-white p-4 shadow-panel">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">Agent run</h2>
              {loading ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-mint">
                  <Clock3 size={13} />
                  in progress
                </span>
              ) : completed ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-mint">
                  <Check size={13} />
                  complete
                </span>
              ) : (
                <span className="text-xs text-muted">standing by</span>
              )}
            </div>
            <div className="space-y-2">
              {activeAgentPlan.map((step, index) => (
                <PlanStep
                  key={step.id}
                  step={step}
                  index={index}
                  activeStep={activeStep}
                  loading={loading}
                  completed={completed}
                />
              ))}
            </div>
          </section>
        </aside>

        <section className="space-y-5">
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              {error}
            </div>
          ) : null}

          <section className="overflow-hidden rounded-lg border border-line bg-white shadow-panel">
            <div className="border-b border-line bg-ink px-5 py-4 text-white">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase text-white/65">
                    Workspace
                  </p>
                  <h2 className="mt-1 truncate text-2xl font-semibold">
                    {workspaceTitle}
                  </h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-white/75">
                    {workspaceDescription}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="rounded-md bg-white/10 px-3 py-2">
                    <p className="text-lg font-semibold">
                      {isIndustryResult ? accounts.length : sources.length || 6}
                    </p>
                    <p className="text-[11px] uppercase text-white/55">
                      {isIndustryResult ? "accounts" : "sources"}
                    </p>
                  </div>
                  <div className="rounded-md bg-white/10 px-3 py-2">
                    <p className="text-lg font-semibold">{sourceCount(sources) || 0}</p>
                    <p className="text-[11px] uppercase text-white/55">hits</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-5 p-5">
              {isIndustryResult && accounts.length ? (
                <section className="rounded-lg border border-line bg-white p-4 shadow-panel">
                  <div className="mb-4 flex flex-col gap-1 border-b border-line pb-3">
                    <h3 className="text-sm font-semibold text-ink">
                      Generated companies
                    </h3>
                    <p className="text-xs text-muted">
                      Live-discovered accounts for {result.industry}. Select one to view its outreach and source trail.
                    </p>
                  </div>
                  <div className="grid gap-3 lg:grid-cols-3">
                    {accounts.map((account, index) => {
                      const selected = selectedAccountIndex === index;
                      const accountDomain =
                        account.meta?.domain || account.candidate?.domain || "";

                      return (
                        <button
                          key={`${account.brief?.name || account.candidate?.name}-${index}`}
                          type="button"
                          onClick={() => {
                            setSelectedAccountIndex(index);
                            setCopied(false);
                          }}
                          className={`rounded-md border p-3 text-left transition ${
                            selected
                              ? "border-ink bg-ink text-white"
                              : "border-line bg-surface hover:border-mint"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p
                                className={`truncate text-sm font-semibold ${
                                  selected ? "text-white" : "text-ink"
                                }`}
                              >
                                {account.brief?.name || account.candidate?.name}
                              </p>
                              <p
                                className={`mt-1 truncate text-xs ${
                                  selected ? "text-white/65" : "text-muted"
                                }`}
                              >
                                {accountDomain}
                              </p>
                            </div>
                            <span
                              className={`shrink-0 rounded px-2 py-1 text-[10px] font-semibold uppercase ${
                                selected
                                  ? "bg-white/15 text-white"
                                  : "bg-white text-muted"
                              }`}
                            >
                              {selected ? "open" : "view"}
                            </span>
                          </div>
                          <p
                            className={`mt-3 line-clamp-2 text-xs leading-5 ${
                              selected ? "text-white/75" : "text-muted"
                            }`}
                          >
                            {account.candidate?.reason || account.brief?.salesAngle}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ) : null}

              {brief ? (
                <>
                  <section className="rounded-lg border border-line bg-white p-4 shadow-panel">
                    <div className="mb-4 flex flex-col gap-3 border-b border-line pb-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-50 text-mint">
                          <Mail size={16} />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-ink">Generated outreach</h3>
                          <p className="text-xs text-muted">Tone: {tones.find((item) => item.id === tone)?.label}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => enrich(tone)}
                          disabled={loading || !result}
                          className="inline-flex h-9 items-center gap-2 rounded-md border border-line px-3 text-sm font-medium text-ink disabled:cursor-not-allowed disabled:opacity-50"
                          title={isIndustryResult ? "Regenerate account batch" : "Regenerate email"}
                        >
                          <RefreshCw size={15} />
                          {isIndustryResult ? "Regenerate batch" : "Regenerate"}
                        </button>
                        <button
                          type="button"
                          onClick={copyEmail}
                          disabled={!activeEmail}
                          className="inline-flex h-9 items-center gap-2 rounded-md bg-ink px-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                          title="Copy email"
                        >
                          {copied ? <Check size={15} /> : <Clipboard size={15} />}
                          {copied ? "Copied" : "Copy"}
                        </button>
                      </div>
                    </div>
                    <pre className="min-h-44 whitespace-pre-wrap rounded-md bg-surface p-5 text-sm leading-6 text-ink">
                      {activeEmail}
                    </pre>
                  </section>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <Metric icon={Users} label="Headcount" value={brief.headcount} />
                    <Metric icon={BriefcaseBusiness} label="Founded" value={brief.founded} />
                    <Metric icon={Sparkles} label="Funding" value={brief.funding} />
                  </div>

                  <div className="grid gap-4 xl:grid-cols-2">
                    <div>
                      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
                        <Radio size={15} className="text-coral" />
                        Recent triggers
                      </h3>
                      <div className="space-y-2">
                        {brief.recentNews.map((item, index) => (
                          <div
                            key={`${item}-${index}`}
                            className="rounded-md border border-line bg-surface p-3 text-sm leading-6 text-ink"
                          >
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
                        <FileText size={15} className="text-gold" />
                        Tech signals
                      </h3>
                      <div className="space-y-2">
                        {brief.techSignals.map((item, index) => (
                          <div
                            key={`${item}-${index}`}
                            className="rounded-md border border-line bg-surface p-3 text-sm leading-6 text-ink"
                          >
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-2">
                    <div className="rounded-md border border-line bg-white p-4">
                      <h3 className="mb-2 text-sm font-semibold text-ink">Hiring read</h3>
                      <p className="text-sm leading-6 text-muted">{brief.hiringTrends}</p>
                    </div>
                    <div className="rounded-md border border-line bg-white p-4">
                      <h3 className="mb-2 text-sm font-semibold text-ink">Sales angle</h3>
                      <p className="text-sm leading-6 text-muted">{brief.salesAngle}</p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <section className="rounded-lg border border-line bg-white p-4 shadow-panel">
                    <div className="mb-4 flex items-center gap-2 border-b border-line pb-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-50 text-mint">
                        <Mail size={16} />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-ink">Generated outreach</h3>
                        <p className="text-xs text-muted">Copy-ready email appears here first</p>
                      </div>
                    </div>
                    <div className="flex min-h-44 items-center justify-center rounded-md border border-dashed border-line bg-surface px-4 text-center text-sm text-muted">
                      {mode === "industry"
                        ? "Generate an industry batch to draft outreach for multiple companies."
                        : "Launch the agent to draft personalized outreach."}
                    </div>
                  </section>

                  <div className="grid min-h-[260px] place-items-center rounded-md border border-dashed border-line bg-surface px-6 text-center">
                    <div>
                      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-white text-ink shadow-panel">
                        <Bot size={23} />
                      </div>
                        <h3 className="text-base font-semibold text-ink">
                          {mode === "industry"
                            ? "Generate companies from an industry"
                            : "Launch the agent to build a brief"}
                        </h3>
                        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
                          {mode === "industry"
                            ? "It will discover public companies, enrich each one with live web data, and write outbound for every account."
                            : "It will query live web data, inspect the source trail, and write outreach from the latest public signals."}
                        </p>
                    </div>
                  </div>
                </>
              )}

              <section className="rounded-lg border border-line bg-surface p-4 shadow-panel">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-ink">Source stream</h3>
                  <span className="text-xs text-muted">
                    {sources.length ? `${sources.length} checked` : "queued"}
                  </span>
                </div>

                <div className="mb-5 flex flex-wrap gap-2">
                  {sources.length
                    ? sources.map((source) => (
                        <SourcePill key={source.label} source={source} />
                      ))
                    : emptySourceSummary.map((source) => (
                        <span
                          key={source}
                          className="inline-flex items-center gap-1.5 rounded bg-white px-2.5 py-1.5 text-xs font-medium text-muted"
                        >
                          <Clock3 size={13} />
                          {source}
                        </span>
                      ))}
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {sourceHits.length ? (
                    sourceHits.map((hit, index) => (
                      <a
                        key={`${hit.url}-${index}`}
                        href={hit.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block rounded-md border border-line bg-white p-3 hover:border-mint"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-medium text-muted">{hit.sourceLabel}</p>
                          <ExternalLink size={13} className="shrink-0 text-muted" />
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm font-semibold text-ink">
                          {hit.title}
                        </p>
                        <p className="mt-1 truncate text-xs text-muted">{compactHost(hit.url)}</p>
                      </a>
                    ))
                  ) : (
                    <div className="rounded-md border border-dashed border-line bg-white p-4 text-sm leading-6 text-muted">
                      Live links will appear as the agent finishes its source pass.
                    </div>
                  )}
                </div>
              </section>
            </div>
          </section>
        </section>
      </section>

    </main>
  );
}
