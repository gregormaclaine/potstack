"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import {
  formatCurrency as baseFmtCurrency,
  formatProfit as baseFmtProfit,
} from "@/lib/formatters";

export type CurrencyCode =
  | "GBP"
  | "USD"
  | "EUR"
  | "JPY"
  | "CAD"
  | "AUD"
  | "CHF";

export interface InitialSettings {
  curvedCharts: boolean;
  currency: CurrencyCode;
}

interface Settings extends InitialSettings {
  setCurvedCharts: (v: boolean) => void;
  setCurrency: (c: CurrencyCode) => void;
}

const SettingsContext = createContext<Settings | null>(null);

async function patchSettings(patch: { curvedCharts?: boolean; currency?: string }) {
  await fetch("/api/user/settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
}

export function SettingsProvider({
  children,
  initialSettings,
}: {
  children: ReactNode;
  initialSettings: InitialSettings;
}) {
  const [curvedCharts, setCurvedChartsState] = useState(initialSettings.curvedCharts);
  const [currency, setCurrencyState] = useState<CurrencyCode>(initialSettings.currency);

  function setCurvedCharts(v: boolean) {
    setCurvedChartsState(v);
    void patchSettings({ curvedCharts: v });
  }

  function setCurrency(c: CurrencyCode) {
    setCurrencyState(c);
    void patchSettings({ currency: c });
  }

  return (
    <SettingsContext.Provider
      value={{ curvedCharts, currency, setCurvedCharts, setCurrency }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): Settings {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}

export function useFormatCurrency() {
  const { currency } = useSettings();
  return {
    formatCurrency: (value: number) => baseFmtCurrency(value, currency),
    formatProfit: (value: number) => baseFmtProfit(value, currency),
  };
}
