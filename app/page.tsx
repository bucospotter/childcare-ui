"use client";

import { useEffect, useRef, useState } from "react";

// ----------------- Types -----------------
type Provider = {
  name: string;
  address: string | null;
  city: string | null;
  zip: string | null;
  license_type: string | null;
  license_status: string | null;
  qris_rating: string | null;
  source_url: string | null;
  last_seen: string | null;
};

type Message = {
  role: "user" | "assistant" | "system";
  content: string;
  citations?: { title?: string; url?: string }[];
  providers?: Provider[];
  data?: any; // keeps raw validated payload from backend (eligibility, cost, etc.)
};

type CostAnswer = {
  age_group: "infant" | "toddler" | "preschool" | string;
  setting: "center" | "family" | string;
  weekly: { median: number | null; p75: number | null };
  monthly: { median: number | null; p75: number | null };
};

type CostQueryEcho = {
  age_group: string;
  setting: string;
  metric: "median" | "p75";
  units: "weekly" | "monthly";
};

type CostData = {
  state: string;
  county_fips: string;
  county: string;
  queries: CostQueryEcho[];
  answers: CostAnswer[];
  notes: string[];
  citations: string[]; // may be NDCP source strings
};

function formatAddr(p: Provider) {
  return [p.address, p.city, p.zip].filter(Boolean).join(", ");
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString();
}

// ----------------- Providers Table -----------------
function ProvidersTable({ providers }: { providers: Provider[] }) {
  if (!providers?.length) return null;

  return (
      <div className="mt-3 overflow-x-auto rounded-lg border">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-50">
          <tr className="text-left">
            <th className="p-2">Name</th>
            <th className="p-2">Address</th>
            <th className="p-2">Type</th>
            <th className="p-2">QRIS</th>
            <th className="p-2">Status</th>
            <th className="p-2">Last Seen</th>
            <th className="p-2">Source</th>
          </tr>
          </thead>
          <tbody>
          {providers.map((p, i) => (
              <tr key={i} className="border-t">
                <td className="p-2 font-medium">{p.name}</td>
                <td className="p-2">{formatAddr(p) || "—"}</td>
                <td className="p-2">{p.license_type ?? "—"}</td>
                <td className="p-2">{p.qris_rating ?? "—"}</td>
                <td className="p-2">{p.license_status ?? "—"}</td>
                <td className="p-2">{formatDate(p.last_seen)}</td>
                <td className="p-2">
                  {p.source_url ? (
                      <a
                          className="text-blue-600 underline"
                          href={p.source_url}
                          target="_blank"
                          rel="noreferrer"
                      >
                        source
                      </a>
                  ) : (
                      "—"
                  )}
                </td>
              </tr>
          ))}
          </tbody>
        </table>
      </div>
  );
}

// ----------------- Clarifying Questions -----------------
function ClarifyingQuestions({ questions }: { questions: string[] }) {
  if (!questions?.length) return null;
  return (
      <div className="mt-3 rounded-lg border p-3 bg-neutral-50">
        <div className="text-sm font-semibold mb-2">
          To check eligibility, please answer:
        </div>
        <ol className="list-decimal pl-5 space-y-1 text-sm">
          {questions.map((q, i) => (
              <li key={i}>{q}</li>
          ))}
        </ol>
      </div>
  );
}

// ----------------- Cost Results -----------------
function CostResults({ data }: { data: CostData }) {
  if (!data) return null;

  const groups: Record<string, CostAnswer[]> = {};
  for (const a of data.answers) {
    const key = `${a.setting}`;
    groups[key] = groups[key] || [];
    groups[key].push(a);
  }
  const order = { infant: 1, toddler: 2, preschool: 3 };

  return (
      <div className="mt-3 space-y-3">
        <div className="text-sm text-neutral-600">
          <span className="font-semibold">County:</span> {data.county} ({data.county_fips}) •{" "}
          <span className="font-semibold">State:</span> {data.state}
        </div>

        {Object.entries(groups).map(([setting, answers]) => (
            <div key={setting} className="rounded-lg border overflow-x-auto">
              <div className="px-3 py-2 text-sm font-semibold bg-neutral-50 capitalize">
                {setting} prices (NDCP 2022)
              </div>
              <table className="min-w-full text-sm">
                <thead>
                <tr className="text-left bg-neutral-50">
                  <th className="p-2">Age Group</th>
                  <th className="p-2">Weekly Median</th>
                  <th className="p-2">Weekly P75</th>
                  <th className="p-2">Monthly Median</th>
                  <th className="p-2">Monthly P75</th>
                </tr>
                </thead>
                <tbody>
                {answers
                    .sort((a, b) => (order[a.age_group as keyof typeof order] || 9) - (order[b.age_group as keyof typeof order] || 9))
                    .map((a, i) => (
                        <tr key={i} className="border-t">
                          <td className="p-2 capitalize">{a.age_group}</td>
                          <td className="p-2">{a.weekly.median ?? "—"}</td>
                          <td className="p-2">{a.weekly.p75 ?? "—"}</td>
                          <td className="p-2">{a.monthly.median ?? "—"}</td>
                          <td className="p-2">{a.monthly.p75 ?? "—"}</td>
                        </tr>
                    ))}
                </tbody>
              </table>
            </div>
        ))}

        {Array.isArray(data.notes) && data.notes.length > 0 && (
            <div className="text-xs text-neutral-600">
              {data.notes.map((n, i) => (
                  <div key={i}>• {n}</div>
              ))}
            </div>
        )}

        {Array.isArray(data.citations) && data.citations.length > 0 && (
            <div className="mt-2 border-t pt-2">
              <div className="text-xs font-semibold mb-1">Sources</div>
              <ul className="list-disc pl-5 text-sm">
                {data.citations.map((c, i) => (
                    <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
        )}
      </div>
  );
}

// ----------------- Cost Estimator Form -----------------
function CostEstimatorForm(props: {
  county: string;
  setCounty: (s: string) => void;
  countyFips: string;
  setCountyFips: (s: string) => void;
  age: string;
  setAge: (s: string) => void;
  setting: string;
  setSetting: (s: string) => void;
  metric: string;
  setMetric: (s: string) => void;
  units: string;
  setUnits: (s: string) => void;
}) {
  const {
    county,
    setCounty,
    countyFips,
    setCountyFips,
    age,
    setAge,
    setting,
    setSetting,
    metric,
    setMetric,
    units,
    setUnits,
  } = props;

  return (
      <div className="max-w-3xl mx-auto px-4 py-3 bg-white border-b">
        <div className="text-sm font-semibold mb-2">Cost Estimator</div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
          <input
              className="border rounded px-2 py-1 text-sm col-span-2"
              placeholder="County name (e.g., Allegheny County)"
              value={county}
              onChange={(e) => setCounty(e.target.value)}
          />
          <input
              className="border rounded px-2 py-1 text-sm"
              placeholder="County FIPS (optional)"
              value={countyFips}
              onChange={(e) => setCountyFips(e.target.value)}
          />
          <select
              className="border rounded px-2 py-1 text-sm"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              title="Age Group"
          >
            <option value="">Any age</option>
            <option value="infant">Infant</option>
            <option value="toddler">Toddler</option>
            <option value="preschool">Preschool</option>
          </select>
          <select
              className="border rounded px-2 py-1 text-sm"
              value={setting}
              onChange={(e) => setSetting(e.target.value)}
              title="Setting"
          >
            <option value="">Any setting</option>
            <option value="center">Center</option>
            <option value="family">Family (home-based)</option>
          </select>
          <select
              className="border rounded px-2 py-1 text-sm"
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
              title="Metric"
          >
            <option value="median">Median</option>
            <option value="p75">75th percentile</option>
          </select>
          <select
              className="border rounded px-2 py-1 text-sm"
              value={units}
              onChange={(e) => setUnits(e.target.value)}
              title="Units"
          >
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
        <div className="text-xs text-neutral-600 mt-2">
          Tip: You can enter either County name or County FIPS (if both provided, FIPS wins).
        </div>
      </div>
  );
}

export default function Home() {
  const [input, setInput] = useState("");
  const [state, setState] = useState<"PA" | "MA" | "WV">("PA");
  const [intent, setIntent] = useState("LOOKUP_RULE");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Cost form state
  const [county, setCounty] = useState("");
  const [countyFips, setCountyFips] = useState("");
  const [age, setAge] = useState("");       // '', 'infant','toddler','preschool'
  const [setting, setSetting] = useState(""); // '', 'center','family'
  const [metric, setMetric] = useState<"median" | "p75">("median");
  const [units, setUnits] = useState<"weekly" | "monthly">("weekly");

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Reset chat when changing intent (optional QoL)
  useEffect(() => {
    // keep messages for now; comment in if you prefer clearing:
    // setMessages([]);
  }, [intent]);

  async function send() {
    const q = input.trim() || (intent === "COST" ? "Cost estimate" : "");
    if (!q) return;

    setLoading(true);
    setMessages((m) => [...m, { role: "user", content: q }]);
    setInput("");

    try {
      const payload: any = { query: q, state, intent };

      // Attach cost estimator fields when intent is COST
      if (intent === "COST") {
        if (county) payload.county = county;
        if (countyFips) payload.countyFips = countyFips;
        if (age) payload.age = age;
        if (setting) payload.setting = setting;
        if (metric) payload.metric = metric;
        if (units) payload.units = units;
      }

      const res = await fetch(
          process.env.NEXT_PUBLIC_API_BASE
              ? `${process.env.NEXT_PUBLIC_API_BASE}/chat`
              : "/chat",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
      );

      const data = await res.json();

      if (data.answer || data.data) {
        const msg: Message = {
          role: "assistant",
          content:
              data.answer ||
              (data.intent === "COST"
                  ? `Estimated childcare prices for ${data?.data?.county}, ${data?.data?.state}`
                  : "Here you go:"),
          citations: data.citations || [],
          providers: Array.isArray(data.providers) ? data.providers : undefined,
          data: data.data ?? undefined,
        };
        setMessages((m) => [...m, msg]);
      } else if (data.raw) {
        setMessages((m) => [...m, { role: "assistant", content: data.raw }]);
      } else {
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content: `Sorry—something went wrong.\n\n${data.error ?? "Unknown error"}`,
          },
        ]);
      }
    } catch (err: any) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: `Network error: ${err?.message ?? err}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  // dynamic placeholder
  const placeholder =
      intent === "COST"
          ? "Optional: add notes (e.g., 'center toddler in Allegheny') then click Send"
          : "Ask a question about ratios, eligibility, etc.";

  return (
      <main className="min-h-screen bg-neutral-50 flex flex-col">
        <header className="border-b bg-white">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
            <h1 className="text-xl font-semibold">ChildCare Q&A</h1>

            <select
                className="border rounded px-2 py-1 text-sm"
                value={state}
                onChange={(e) => setState(e.target.value as any)}
            >
              <option value="PA">Pennsylvania</option>
              <option value="MA">Massachusetts</option>
              <option value="WV">West Virginia</option>
            </select>

            <select
                className="border rounded px-2 py-1 text-sm"
                value={intent}
                onChange={(e) => setIntent(e.target.value)}
            >
              <option value="LOOKUP_RULE">Lookup rule</option>
              <option value="LOOKUP_PROVIDER">Find providers</option>
              <option value="CHECK_ELIGIBILITY">Eligibility</option>
              <option value="COST">Cost</option>
              <option value="DOCUMENTATION">Docs</option>
            </select>
          </div>

          {/* Cost form appears only when COST is selected */}
          {intent === "COST" && (
              <CostEstimatorForm
                  county={county}
                  setCounty={setCounty}
                  countyFips={countyFips}
                  setCountyFips={setCountyFips}
                  age={age}
                  setAge={setAge}
                  setting={setting}
                  setSetting={setSetting}
                  metric={metric}
                  setMetric={(m) => setMetric(m as "median" | "p75")}
                  units={units}
                  setUnits={(u) => setUnits(u as "weekly" | "monthly")}
              />
          )}
        </header>

        <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-6">
          <div className="space-y-4">
            {messages.map((m, i) => (
                <div key={i} className="rounded-lg p-3 border bg-white">
                  <div className="text-xs text-neutral-500">{m.role}</div>

                  <div className="whitespace-pre-wrap">{m.content}</div>

                  {!!m.providers?.length && <ProvidersTable providers={m.providers} />}

                  {/* Eligibility clarifying questions */}
                  {Array.isArray(m.data?.clarifying_questions) &&
                      m.data.clarifying_questions.length > 0 && (
                          <ClarifyingQuestions questions={m.data.clarifying_questions} />
                      )}

                  {/* Cost results */}
                  {m.data &&
                      (m.data as any).answers &&
                      Array.isArray((m.data as any).answers) && (
                          <CostResults data={m.data as CostData} />
                      )}

                  {/* Citations (from RAG paths) */}
                  {m.citations && m.citations.length > 0 && (
                      <div className="mt-2 border-t pt-2">
                        <div className="text-xs font-semibold mb-1">Citations</div>
                        <ul className="list-disc pl-5 text-sm">
                          {m.citations.map((c, j) => (
                              <li key={j}>
                                {c.title ? `${c.title} – ` : ""}
                                {c.url ? (
                                    <a
                                        className="text-blue-600 underline"
                                        href={c.url}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                      {c.url}
                                    </a>
                                ) : null}
                              </li>
                          ))}
                        </ul>
                      </div>
                  )}
                </div>
            ))}
            <div ref={scrollRef} />
          </div>
        </div>

        <footer className="border-t bg-white">
          <div className="max-w-3xl mx-auto px-4 py-3 flex gap-2">
            <input
                className="flex-1 border rounded px-3 py-2"
                placeholder={placeholder}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
            />
            <button
                onClick={send}
                disabled={loading || (!input.trim() && intent !== "COST")}
                className="px-4 py-2 rounded bg-black text-white disabled:bg-gray-400"
            >
              {loading ? "Sending…" : "Send"}
            </button>
          </div>
        </footer>
      </main>
  );
}
