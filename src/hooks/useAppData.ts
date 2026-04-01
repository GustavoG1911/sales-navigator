import { useState, useCallback, useEffect } from "react";
import { Deal, MonthlyPresentations, MonthlySuperMeta, AppSettings, ReceivableAdjustments, ReceivableAdjustment } from "@/lib/types";
import { getPresentations, savePresentations, getSettings, saveSettings, getSuperMeta, saveSuperMeta, getAdjustments, saveAdjustments } from "@/lib/store";
import { fetchDeals, upsertDeal, deleteDealFromDb } from "@/lib/supabase-deals";
import { toast } from "sonner";

export function useAppData() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [presentations, setPresentations] = useState<MonthlyPresentations>(getPresentations);
  const [settings, setSettings] = useState<AppSettings>(getSettings);
  const [superMeta, setSuperMeta] = useState<MonthlySuperMeta>(getSuperMeta);
  const [adjustments, setAdjustments] = useState<ReceivableAdjustments>(getAdjustments);

  const loadDeals = useCallback(async () => {
    try {
      const data = await fetchDeals();
      setDeals(data);
    } catch (err: any) {
      console.error("Error fetching deals:", err);
      toast.error("Erro ao carregar fechamentos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDeals();
  }, [loadDeals]);

  const addOrUpdateDeal = useCallback(async (deal: Deal) => {
    try {
      await upsertDeal(deal);
      await loadDeals();
    } catch (err: any) {
      console.error("Error saving deal:", err);
      toast.error("Erro ao salvar fechamento");
    }
  }, [loadDeals]);

  const removeDeal = useCallback(async (id: string) => {
    try {
      await deleteDealFromDb(id);
      await loadDeals();
    } catch (err: any) {
      console.error("Error deleting deal:", err);
      toast.error("Erro ao excluir fechamento");
    }
  }, [loadDeals]);

  const updatePresentations = useCallback((monthKey: string, count: number) => {
    const updated = { ...presentations, [monthKey]: count };
    savePresentations(updated);
    setPresentations(updated);
  }, [presentations]);

  const updateSettings = useCallback((newSettings: AppSettings) => {
    saveSettings(newSettings);
    setSettings(newSettings);
  }, []);

  const toggleSuperMeta = useCallback((monthKey: string, active: boolean) => {
    const updated = { ...superMeta, [monthKey]: active };
    saveSuperMeta(updated);
    setSuperMeta(updated);
  }, [superMeta]);

  const updateAdjustment = useCallback((entry: ReceivableAdjustment) => {
    const updated = { ...adjustments, [entry.id]: entry };
    saveAdjustments(updated);
    setAdjustments(updated);
  }, [adjustments]);

  return { deals, loading, addOrUpdateDeal, removeDeal, presentations, updatePresentations, settings, updateSettings, superMeta, toggleSuperMeta, adjustments, updateAdjustment, refreshDeals: loadDeals };
}
