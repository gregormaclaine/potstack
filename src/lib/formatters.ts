import { format, parseISO } from "date-fns";

const CURRENCY_LOCALES: Record<string, string> = {
  GBP: "en-GB",
  USD: "en-US",
  EUR: "de-DE",
  JPY: "ja-JP",
  CAD: "en-CA",
  AUD: "en-AU",
  CHF: "de-CH",
};

export function formatCurrency(value: number, currency = "GBP"): string {
  const locale = CURRENCY_LOCALES[currency] ?? "en-GB";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatProfit(value: number, currency = "GBP"): string {
  const formatted = formatCurrency(Math.abs(value), currency);
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatted}`;
  return formatted;
}

export function formatDate(date: string | Date, fmt = "d MMM yyyy"): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, fmt);
}

export function formatTime(date: string | Date): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "HH:mm");
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}
