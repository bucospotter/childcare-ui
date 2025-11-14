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
  data?: any; // holds raw validated payload from backend (e.g., clarifying_questions)
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
      <div className="text-sm font-semibold mb-2">To check eligibility, please answer:</div>
      <ol className="list-decimal pl-5 space-y-1 text-sm">
        {questions.map((q, i) => (
          <li key={i}>{q}</li>
        ))}
      </ol>
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

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send() {
    const q = input.trim();
    if (!q) return;
    setLoading(true);
    setMessages((m) => [...m, { role: "user", content: q }]);
    setInput(""); 

    try {
      const res = await fetch(
        process.env.NEXT_PUBLIC_API_BASE
          ? `${process.env.NEXT_PUBLIC_API_BASE}/chat`
          : "/chat",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: q, state, intent }),
        }
      );

      const data = await res.json();

      if (data.answer) {
        const msg: Message = {
          role: "assistant",
          content: data.answer,
          citations: data.citations || [],
          providers: Array.isArray(data.providers) ? data.providers : undefined,
          data: data.data ?? undefined, // <— keep full payload for extras like clarifying_questions
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
      </header>

      <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-6">
        <div className="space-y-4">
          {messages.map((m, i) => (
            <div key={i} className="rounded-lg p-3 border bg-white">
              <div className="text-xs text-neutral-500">{m.role}</div>

              <div className="whitespace-pre-wrap">{m.content}</div>

              {!!m.providers?.length && <ProvidersTable providers={m.providers} />}

              {Array.isArray(m.data?.clarifying_questions) && m.data.clarifying_questions.length > 0 && (
                <ClarifyingQuestions questions={m.data.clarifying_questions} />
              )}

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
            placeholder="Ask a question about ratios, eligibility, etc."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="px-4 py-2 rounded bg-black text-white disabled:bg-gray-400"
          >
            {loading ? "Sending…" : "Send"}
          </button>
        </div>
      </footer>
    </main>
  );
}
