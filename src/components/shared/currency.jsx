import { useState, useEffect } from "react";

export const CURRENCIES = [
  { code: "MAD", symbol: "MAD" },
  { code: "EUR", symbol: "€" },
  { code: "USD", symbol: "$" },
  { code: "GBP", symbol: "£" },
];

const STORAGE_KEY = "wape_currency";

export function getCurrencySymbol(code) {
  const c = code || localStorage.getItem(STORAGE_KEY) || "MAD";
  return CURRENCIES.find(x => x.code === c)?.symbol || c;
}

export function useCurrency() {
  const [currency, setCurrencyState] = useState(() => localStorage.getItem(STORAGE_KEY) || "MAD");

  useEffect(() => {
    const handler = () => setCurrencyState(localStorage.getItem(STORAGE_KEY) || "MAD");
    window.addEventListener("wape_currency_change", handler);
    return () => window.removeEventListener("wape_currency_change", handler);
  }, []);

  const setCurrency = (code) => {
    localStorage.setItem(STORAGE_KEY, code);
    window.dispatchEvent(new Event("wape_currency_change"));
  };

  const symbol = getCurrencySymbol(currency);
  const fmt = (val) => `${symbol} ${(val || 0).toLocaleString()}`;

  return { currency, setCurrency, symbol, fmt, CURRENCIES };
}