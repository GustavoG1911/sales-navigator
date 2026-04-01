import { useState, useCallback, useEffect } from "react";
import { Deal, MonthlyPresentations, AppSettings } from "@/lib/types";
import { getDeals, saveDeal, deleteDeal, getPresentations, savePresentations, getSettings, saveSettings } from "@/lib/store";

export function useAppData() {
  const [deals, setDeals] = useState<Deal[]>(getDeals);
  const [presentations, setPresentations] = useState<MonthlyPresentations>(getPresentations);
  const [settings, setSettings] = useState<AppSettings>(getSettings);

  const refreshDeals = useCallback(() => setDeals(getDeals()), []);

  const addOrUpdateDeal = useCallback((deal: Deal) => {
    saveDeal(deal);
    refreshDeals();
  }, [refreshDeals]);

  const removeDeal = useCallback((id: string) => {
    deleteDeal(id);
    refreshDeals();
  }, [refreshDeals]);

  const updatePresentations = useCallback((monthKey: string, count: number) => {
    const updated = { ...presentations, [monthKey]: count };
    savePresentations(updated);
    setPresentations(updated);
  }, [presentations]);

  const updateSettings = useCallback((newSettings: AppSettings) => {
    saveSettings(newSettings);
    setSettings(newSettings);
  }, []);

  return { deals, addOrUpdateDeal, removeDeal, presentations, updatePresentations, settings, updateSettings };
}
