import { useState, useCallback, useEffect, useRef } from "react";
import { Deal, MonthlyPresentations, MonthlySuperMeta, AppSettings, ReceivableAdjustments, ReceivableAdjustment } from "@/lib/types";
import { getSettings, saveSettings, getSuperMeta, saveSuperMeta, getAdjustments, saveAdjustments } from "@/lib/store";
import { fetchDeals, upsertDeal, deleteDealFromDb, fetchPresentations, savePresentationToDb, fetchUserCommissionRate, saveUserCommissionRate } from "@/lib/supabase-deals";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserRole } from "./useAuth";

export function useAppData(role: UserRole = "user", userId?: string, position?: string) {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [presentations, setPresentations] = useState<MonthlyPresentations>({});
  const [settings, setSettings] = useState<AppSettings>(getSettings);
  const [superMeta, setSuperMeta] = useState<MonthlySuperMeta>(getSuperMeta);
  const [adjustments, setAdjustments] = useState<ReceivableAdjustments>(getAdjustments);

  // ─── Carga inicial completa (mostra loading) ──────────────────────────────
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      console.error("Error fetching data:", message);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, [role, userId, position]);

  const loadDeals = loadData;

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ─── Refresh silencioso (sem spinner) — usado pelo Realtime ──────────────
  const silentRefreshDeals = useCallback(async () => {
    try {
      const data = await fetchDeals(role, userId, position);
      setDeals(data);
    } catch (err: unknown) {
      console.error("[Realtime] deals refresh error:", err instanceof Error ? err.message : err);
    }
  }, [role, userId, position]);

  const silentRefreshPresentations = useCallback(async () => {
    try {
      const data = await fetchPresentations(role, userId, position);
      setPresentations(data);
    } catch (err: unknown) {
      console.error("[Realtime] presentations refresh error:", err instanceof Error ? err.message : err);
    }
  }, [role, userId, position]);

  // ─── Timers de debounce para não refazer fetch a cada evento ─────────────
  const dealsTimer = useRef<ReturnType<typeof setTimeout>>();
  const presTimer = useRef<ReturnType<typeof setTimeout>>();

  // ─── Supabase Realtime — sincronização multi-usuário ─────────────────────
  useEffect(() => {
    if (!userId) return;

    const channelName = `sync-${userId.slice(0, 8)}`;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "deals" },
        () => {
          clearTimeout(dealsTimer.current);
          dealsTimer.current = setTimeout(silentRefreshDeals, 400);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "presentations" },
        () => {
          clearTimeout(presTimer.current);
          presTimer.current = setTimeout(silentRefreshPresentations, 400);
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("[Realtime] ✅ Sincronização ativa para", channelName);
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn("[Realtime] ⚠️ Falha na sincronização:", status, "— usando polling");
        }
      });

    // Polling de fallback a cada 30 s (cobre projetos sem Realtime habilitado)
    const pollInterval = setInterval(() => {
      silentRefreshDeals();
      silentRefreshPresentations();
    }, 30_000);

    return () => {
      clearTimeout(dealsTimer.current);
      clearTimeout(presTimer.current);
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [userId, silentRefreshDeals, silentRefreshPresentations]);

  // ─── Mutações ─────────────────────────────────────────────────────────────
  const addOrUpdateDeal = useCallback(async (deal: Deal) => {
    try {
      await upsertDeal(deal);
      await loadDeals();
    } catch (err: unknown) {
      console.error("Error saving deal:", err instanceof Error ? err.message : err);
      toast.error("Erro ao salvar fechamento");
    }
  }, [loadDeals]);

  const removeDeal = useCallback(async (id: string) => {
    try {
      await deleteDealFromDb(id);
      await loadDeals();
    } catch (err: unknown) {
      console.error("Error deleting deal:", err instanceof Error ? err.message : err);
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
      // Atualiza o estado local imediatamente após o save (o Realtime vai
      // notificar os demais usuários; o optimisticPresentations em Index.tsx
      // já garantiu a UI local sem flickering)
      const updatedData = await fetchPresentations(role, userId, position);
      setPresentations(updatedData);
    } catch (err: unknown) {
      console.error("Error saving presentations:", err instanceof Error ? err.message : err);
      toast.error("Erro ao salvar apresentações");
    }
  }, [role, userId, position]);

  const updateSettings = useCallback(async (newSettings: AppSettings) => {
    saveSettings(newSettings);
    setSettings(newSettings);
    if (userId) {
      try {
        await saveUserCommissionRate(userId, newSettings.commissionRate);
      } catch (err: unknown) {
        console.error("Error saving commission rate to DB:", err instanceof Error ? err.message : err);
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

  return {
    deals,
    loading,
    addOrUpdateDeal,
    removeDeal,
    presentations,
    updatePresentations,
    settings,
    updateSettings,
    superMeta,
    toggleSuperMeta,
    adjustments,
    updateAdjustment,
    refreshDeals: loadDeals,
  };
}
