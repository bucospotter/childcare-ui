// app/components/CostEstimator.tsx
"use client";
import { useState } from "react";

const AGES = ["infant", "toddler", "preschool", "school-age", "mixed"] as const;
const SETTINGS = ["center", "family"] as const;
const METRICS = ["median", "p75"] as const;
const UNITS = ["monthly", "weekly"] as const;

export default function CostEstimator() {
    const [state, setState] = useState("PA");
    const [county, setCounty] = useState(""); // free text; optional
    const [age, setAge] = useState<typeof AGES[number]>("infant");
    const [setting, setSetting] = useState<typeof SETTINGS[number]>("center");
    const [metric, setMetric] = useState<typeof METRICS[number]>("median");
    const [units, setUnits] = useState<typeof UNITS[number]>("monthly");

    const [loading, setLoading] = useState(false);
    const [resp, setResp] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setResp(null);
        try {
            const r = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/cost`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    state,
                    county: county || undefined,
                    age_group: age,
                    setting,
                    metric,
                    units,
                }),
            });
            const j = await r.json();
            if (!r.ok || j.ok === false) throw new Error(j.error || "Request failed");
            setResp(j);
        } catch (e: any) {
            setError(e.message || String(e));
        } finally {
            setLoading(false);
        }
    }

    const primary = resp?.result?.primary_value;

    return (
        <div className="rounded-2xl p-4 border border-neutral-800">
            <h3 className="text-xl font-semibold mb-3">Childcare Cost Estimator</h3>

            <form onSubmit={onSubmit} className="grid md:grid-cols-3 gap-3">
                <label className="flex flex-col gap-1">
                    <span className="text-sm opacity-80">State (2-letter)</span>
                    <input
                        value={state}
                        onChange={(e) => setState(e.target.value.toUpperCase())}
                        className="px-3 py-2 rounded bg-neutral-900 border border-neutral-700"
                        maxLength={2}
                    />
                </label>

                <label className="flex flex-col gap-1 md:col-span-2">
                    <span className="text-sm opacity-80">County (optional, fuzzy)</span>
                    <input
                        value={county}
                        onChange={(e) => setCounty(e.target.value)}
                        placeholder="e.g., Allegheny"
                        className="px-3 py-2 rounded bg-neutral-900 border border-neutral-700"
                    />
                </label>

                <label className="flex flex-col gap-1">
                    <span className="text-sm opacity-80">Age Group</span>
                    <select
                        value={age}
                        onChange={(e) => setAge(e.target.value as any)}
                        className="px-3 py-2 rounded bg-neutral-900 border border-neutral-700"
                    >
                        {AGES.map((a) => (
                            <option key={a} value={a}>
                                {a}
                            </option>
                        ))}
                    </select>
                </label>

                <label className="flex flex-col gap-1">
                    <span className="text-sm opacity-80">Setting</span>
                    <select
                        value={setting}
                        onChange={(e) => setSetting(e.target.value as any)}
                        className="px-3 py-2 rounded bg-neutral-900 border border-neutral-700"
                    >
                        {SETTINGS.map((s) => (
                            <option key={s} value={s}>
                                {s}
                            </option>
                        ))}
                    </select>
                </label>

                <label className="flex flex-col gap-1">
                    <span className="text-sm opacity-80">Units</span>
                    <select
                        value={units}
                        onChange={(e) => setUnits(e.target.value as any)}
                        className="px-3 py-2 rounded bg-neutral-900 border border-neutral-700"
                    >
                        {UNITS.map((u) => (
                            <option key={u} value={u}>
                                {u}
                            </option>
                        ))}
                    </select>
                </label>

                <label className="flex flex-col gap-1">
                    <span className="text-sm opacity-80">Metric</span>
                    <select
                        value={metric}
                        onChange={(e) => setMetric(e.target.value as any)}
                        className="px-3 py-2 rounded bg-neutral-900 border border-neutral-700"
                    >
                        {METRICS.map((m) => (
                            <option key={m} value={m}>
                                {m.toUpperCase()}
                            </option>
                        ))}
                    </select>
                </label>

                <button
                    disabled={loading}
                    className="md:col-span-3 mt-1 px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60"
                >
                    {loading ? "Fetching…" : "Get Estimate"}
                </button>
            </form>

            {error && <p className="mt-3 text-red-400 text-sm">{error}</p>}

            {primary != null && (
                <div className="mt-4 rounded-xl border border-neutral-800 p-3">
                    <div className="text-sm opacity-70 mb-1">Answer</div>
                    <div className="text-2xl font-semibold">{resp?.message}</div>
                </div>
            )}

            {Array.isArray(resp?.result?.rows) && resp.result.rows.length > 1 && (
                <details className="mt-3">
                    <summary className="cursor-pointer opacity-80">See matching rows</summary>
                    <div className="overflow-x-auto mt-2">
                        <table className="text-sm w-full">
                            <thead className="opacity-70">
                            <tr>
                                <th className="text-left pr-3">County</th>
                                <th className="text-left pr-3">Median</th>
                                <th className="text-left pr-3">P75</th>
                                <th className="text-left pr-3">Units</th>
                            </tr>
                            </thead>
                            <tbody>
                            {resp.result.rows.map((r: any, i: number) => (
                                <tr key={i} className="border-t border-neutral-800">
                                    <td className="pr-3 py-1">{r.county ?? "State Avg"}</td>
                                    <td className="pr-3 py-1">{r.metric_values.median}</td>
                                    <td className="pr-3 py-1">{r.metric_values.p75}</td>
                                    <td className="pr-3 py-1">{r.units}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </details>
            )}
        </div>
    );
}
