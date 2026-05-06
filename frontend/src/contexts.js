import { createContext, useContext } from "react";

// ── Theme Context ──
export const ThemeContext = createContext();
export function useTheme() {
  return useContext(ThemeContext);
}

// ── Tender Context (shared across pages) ──
export const TenderContext = createContext();
export function useTender() {
  return useContext(TenderContext);
}