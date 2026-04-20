"use client";

import PageWrapper from "@/components/layout/PageWrapper";
import { useSettings, type CurrencyCode } from "@/contexts/SettingsContext";

const CURRENCIES: { code: CurrencyCode; symbol: string; name: string }[] = [
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "CHF", symbol: "Fr", name: "Swiss Franc" },
];

export default function SettingsPage() {
  const { curvedCharts, setCurvedCharts, currency, setCurrency } = useSettings();

  return (
    <PageWrapper>
      <h1 className="mb-8 text-2xl font-bold text-zinc-100">Settings</h1>
      <div className="max-w-lg space-y-8">

        {/* Charts section */}
        <section>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Charts
          </h2>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800">
            <label className="flex cursor-pointer items-center justify-between px-5 py-4 hover:bg-zinc-800/40 transition-colors">
              <div>
                <p className="text-sm font-medium text-zinc-200">Curved lines</p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Use smooth curves instead of straight lines in line charts
                </p>
              </div>
              <div
                role="switch"
                aria-checked={curvedCharts}
                onClick={() => setCurvedCharts(!curvedCharts)}
                className={[
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200",
                  curvedCharts ? "bg-emerald-500" : "bg-zinc-700",
                ].join(" ")}
              >
                <span
                  className={[
                    "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transition-transform duration-200",
                    curvedCharts ? "translate-x-5" : "translate-x-0",
                  ].join(" ")}
                />
              </div>
            </label>
          </div>
        </section>

        {/* Display section */}
        <section>
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Currency
          </h2>
          <p className="mb-4 text-xs text-zinc-600">
            Visual only — does not affect stored values.
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {CURRENCIES.map(({ code, symbol, name }) => (
              <button
                key={code}
                onClick={() => setCurrency(code)}
                className={[
                  "rounded-xl border px-4 py-3 text-left transition-colors",
                  currency === code
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-300"
                    : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200",
                ].join(" ")}
              >
                <span className="block text-xl font-bold tabular-nums">
                  {symbol}
                </span>
                <span className="block text-sm font-semibold mt-1">
                  {code}
                </span>
                <span className="block text-xs text-zinc-500 mt-0.5">
                  {name}
                </span>
              </button>
            ))}
          </div>
        </section>

      </div>
    </PageWrapper>
  );
}
