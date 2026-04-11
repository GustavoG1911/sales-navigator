import { useState, useCallback, useEffect } from "react";
import { Deal, MonthlyPresentations, MonthlySuperMeta, AppSettings, ReceivableAdjustments, ReceivableAdjustment } from "@/lib/types";
import { getPresentations, savePresentations, getSettings, saveSettings, getSuperMeta, saveSuperMeta, getAdjustments, saveAdjustments } from "@/lib/store";
import { fetchDeals, upsertDeal, deleteDealFromDb, fetchPresentations, savePresentationToDb, fetchUserCommissionRate, saveUserCommissionRate } from "@/lib/supabase-deals";
import { toast } from "sonner";
import { UserRole } from "./useAuth";

export function useAppData(role: UserRole = "user", userId?: string, position?: string) {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [presentations, setPresentations] = useState<MonthlyPresentations>({});
  const [settings, setSettings] = useState<AppSettings>(getSettings);
  const [superMeta, setSuperMeta] = useState<MonthlySuperMeta>(getSuperMeta);
  const [adjustments, setAdjustments] = useState<ReceivableAdjustments>(getAdjustments);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [dealsData, presData, commRate] = await Promise.all([
        fetchDeals(role, userId, position),
        fetchPresentations(role, userId, position),
        userId ? fetchUserCommissionRate(userId) : Promise.resolve(null),
      ]);
      setDeals(dealsData);
      setPresentations(presData);
      if (commRate !== null) {
        setSettings((prev) => ({ ...prev, commissionRate: commRate }));
      }
    } catch (err: any) {
      console.error("Error fetching data:", err);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, [role, userId, position]);

  const loadDeals = loadData; // Alias for compatibility

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  const updatePresentations = useCallback(async (monthKey: string, operation: "bluepex" | "opus", count: number) => {
    if (!userId) {
      toast.error("Usuário não identificado");
      return;
    }
    try {
      await savePresentationToDb(monthKey, operation, count, userId);
      const updatedData = await fetchPresentations(role, userId, position);
      setPresentations(updatedData);
    } catch (err: any) {
      console.error("Error saving presentations:", err);
      toast.error("Erro ao salvar apresentações");
    }
  }, [role, userId, position]);

  const updateSettings = useCallback(async (newSettings: AppSettings) => {
    saveSettings(newSettings);
    setSettings(newSettings);
    if (userId) {
      try {
        await saveUserCommissionRate(userId, newSettings.commissionRate);
      } catch (err: any) {
        console.error("Error saving commission rate to DB:", err);
      }
    }
  }, [userId]);

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
