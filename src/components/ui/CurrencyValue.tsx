"use client";

import { useFormatCurrency } from "@/contexts/SettingsContext";

interface CurrencyValueProps {
  value: number;
  sign?: boolean;
}

export default function CurrencyValue({ value, sign = false }: CurrencyValueProps) {
  const { formatCurrency } = useFormatCurrency();
  if (sign && value > 0) return <>+{formatCurrency(value)}</>;
  return <>{formatCurrency(value)}</>;
}
