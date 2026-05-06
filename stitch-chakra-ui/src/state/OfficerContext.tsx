import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { TenderResponse } from "../types/backend";
import { tenderApi } from "../api/client";

type OfficerContextValue = {
  tenders: TenderResponse[];
  activeTenderId: string | null;
  setActiveTenderId: (id: string) => void;
  activeTender: TenderResponse | null;
  refreshTenders: () => Promise<void>;
};

const OfficerContext = createContext<OfficerContextValue | undefined>(undefined);

const ACTIVE_TENDER_KEY = "stitch_active_tender_id";

export function OfficerProvider({ children }: { children: React.ReactNode }) {
  const [tenders, setTenders] = useState<TenderResponse[]>([]);
  const [activeTenderId, setActiveTenderIdState] = useState<string | null>(null);

  const refreshTenders = async () => {
    const res = await tenderApi.list();
    const normalized = Array.isArray(res.data) ? res.data : [];
    setTenders(normalized);

    setActiveTenderIdState((current) => {
      if (current && normalized.some((t) => t.id === current)) return current;

      const saved = localStorage.getItem(ACTIVE_TENDER_KEY);
      if (saved && normalized.some((t) => t.id === saved)) return saved;

      return normalized[0]?.id ?? null;
    });
  };

  useEffect(() => {
    // Initial load
    refreshTenders().catch(() => {
      // Leave state as-is; pages will show empty state.
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeTenderId) localStorage.setItem(ACTIVE_TENDER_KEY, activeTenderId);
  }, [activeTenderId]);

  const setActiveTenderId = (id: string) => {
    setActiveTenderIdState(id);
    localStorage.setItem(ACTIVE_TENDER_KEY, id);
  };

  const activeTender = useMemo(
    () => (activeTenderId ? tenders.find((t) => t.id === activeTenderId) ?? null : null),
    [activeTenderId, tenders],
  );

  const value: OfficerContextValue = {
    tenders,
    activeTenderId,
    setActiveTenderId,
    activeTender,
    refreshTenders,
  };

  return <OfficerContext.Provider value={value}>{children}</OfficerContext.Provider>;
}

export function useOfficer() {
  const ctx = useContext(OfficerContext);
  if (!ctx) throw new Error("useOfficer must be used within OfficerProvider");
  return ctx;
}

