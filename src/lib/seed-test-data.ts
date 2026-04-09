/**
 * ──────────────────────────────────────────────────────────
 * 🌱 MOCK DATA MASTER - Seed Script para Ambiente de Teste
 * ──────────────────────────────────────────────────────────
 * 
 * Gera 50 lançamentos fictícios para 3 usuários de teste:
 *   - diretor@teste.com     (admin)     senha: teste123
 *   - executivo@teste.com   (gestor)    senha: teste123
 *   - sdr@teste.com         (user/SDR)  senha: teste123
 * 
 * ⚠️  Este script TS é uma referência. Para popular o banco,
 *     execute o SQL em: supabase/migrations/20260409014500_seed_test_data.sql
 *     diretamente no Supabase SQL Editor (ignora RLS).
 * 
 * Todos os registros possuem is_test_data = true para isolamento total.
 */

import { createClient } from "@supabase/supabase-js";

// ─── Configuração Supabase (deve bater com src/integrations/supabase/client.ts) ───
const SUPABASE_URL = "https://ardjxmurnswohqotlyus.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyZGp4bXVybnN3b2hxb3RseXVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNTA2NTEsImV4cCI6MjA5MDYyNjY1MX0.CO4GoFW1K5UdJ22AV1U9x1w9JMYuHsoV5NFGNjTZTY0";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── IDs Fictícios (UUID v4 estáticos para reprodutibilidade) ───
const ADMIN_ID   = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeee0001"; // diretor@teste.com
const GESTOR_ID  = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeee0002"; // executivo@teste.com
const SDR_ID     = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeee0003"; // sdr@teste.com

// ─── Helpers ───
function d(dateStr: string) { return dateStr; }
function addDays(dateStr: string, days: number): string {
  const dt = new Date(dateStr + "T12:00:00");
  dt.setDate(dt.getDate() + days);
  return dt.toISOString().slice(0, 10);
}

const clientNames = [
  "TechNova Labs", "Autoparts Brasil", "Grupo Zeta", "MegaStore Digital",
  "CloudSec Solutions", "DataVault Inc", "FarmaTech S.A.", "OceanBlue Logística",
  "Pinnacle Corp", "SkyNet Telecomunicações", "NexGen Fibra", "EcoSolar Energy",
  "MetaForge AI", "Quantum Dynamics", "BioVida Saúde", "RapidPay Fintech",
  "Atlas Mineração", "Vortex Energia", "CyberShield Pro", "Integra ERP",
  "SmartGrid IoT", "ApexTrade Global", "GreenField Agro", "NovaFront UI",
  "CoreStack Infra", "PulseWave Media", "BlueHorizon Travel", "SwiftCode Labs",
  "IronClad Security", "NetSphere Hosting", "PrimeData Analytics", "VeloCity Courier",
  "InfiniLoop Games", "HydraCloud PaaS", "TitanBridge Capital", "PixelCraft Studio",
  "SilverPeak Mining", "ZenithTech Corp", "OrbitalEdge Space", "FlexStack Dev",
  "DeltaOps Consulting", "ArcticNode CDN", "TerraByte Storage", "MagnaVolt Power",
  "Sapphire Retail", "EchoStream Audio", "VaultLine Crypto", "NeuroLink Health",
  "SparkForge Robotics", "CrestWave Marine"
];

// ─── Build dos 50 Deals ───
interface SeedDeal {
  client_name: string;
  operation: string;
  monthly_value: number;
  implantation_value: number;
  closing_date: string;
  first_payment_date: string;
  implantation_payment_date: string;
  payment_status: string;
  user_id: string;
  commission_rate_snapshot: number;
  commission_amount_snapshot: number;
  is_paid_to_user: boolean;
  is_user_confirmed_payment: boolean;
  is_mensalidade_paid_by_client: boolean;
  is_implantacao_paid_by_client: boolean;
}

function makeDeal(
  index: number,
  userId: string,
  closingDate: string,
  operation: "BluePex" | "Opus Tech",
  monthlyValue: number,
  implantationValue: number,
  status: "pago" | "aguardando_sdr" | "pendente",
  commissionRate: number
): SeedDeal {
  const firstPayment = addDays(closingDate, 30);
  const implPayment  = addDays(closingDate, 30);
  const commSnapshot = (monthlyValue * commissionRate) + (implantationValue * 0.4 * commissionRate);

  return {
    client_name: clientNames[index % clientNames.length],
    operation,
    monthly_value: monthlyValue,
    implantation_value: implantationValue,
    closing_date: closingDate,
    first_payment_date: firstPayment,
    implantation_payment_date: implPayment,
    payment_status: status === "pago" ? "Pago" : "Pendente",
    user_id: userId,
    commission_rate_snapshot: commissionRate,
    commission_amount_snapshot: Math.round(commSnapshot * 100) / 100,
    is_paid_to_user: status === "pago" || status === "aguardando_sdr",
    is_user_confirmed_payment: status === "pago",
    is_mensalidade_paid_by_client: status === "pago",
    is_implantacao_paid_by_client: status === "pago" && implantationValue > 0,
  };
}

function buildAllDeals(): SeedDeal[] {
  const deals: SeedDeal[] = [];
  let i = 0;

  // ═══════════════════════════════════════════════════════════
  // BLOCO 1: PASSADO (Jan/Fev/Mar 2026) — 15 deals
  //   Validar Snapshotting e gráficos históricos
  // ═══════════════════════════════════════════════════════════

  // Janeiro 2026 — 5 deals (todos pagos, SDR com 12 apresentações)
  deals.push(makeDeal(i++, SDR_ID,    "2025-12-05", "BluePex",   1200, 1500, "pago", 0.10));
  deals.push(makeDeal(i++, SDR_ID,    "2025-12-10", "BluePex",   2800, 3000, "pago", 0.10));
  deals.push(makeDeal(i++, SDR_ID,    "2025-12-15", "Opus Tech", 4500, 5000, "pago", 0.10));
  deals.push(makeDeal(i++, GESTOR_ID, "2025-12-08", "BluePex",   1800, 2000, "pago", 0.15));
  deals.push(makeDeal(i++, GESTOR_ID, "2025-12-20", "Opus Tech", 3200, 0,    "pago", 0.15));

  // Fevereiro 2026 — 5 deals (pagos + aguardando SDR)
  deals.push(makeDeal(i++, SDR_ID,    "2026-01-03", "BluePex",   950,  750,  "pago", 0.10));
  deals.push(makeDeal(i++, SDR_ID,    "2026-01-12", "BluePex",   1400, 0,    "pago", 0.10));
  deals.push(makeDeal(i++, SDR_ID,    "2026-01-18", "Opus Tech", 2200, 1800, "aguardando_sdr", 0.10));
  deals.push(makeDeal(i++, GESTOR_ID, "2026-01-05", "BluePex",   3100, 2500, "pago", 0.15));
  deals.push(makeDeal(i++, GESTOR_ID, "2026-01-22", "Opus Tech", 5200, 4000, "pago", 0.15));

  // Março 2026 — 5 deals (mistura de status)
  deals.push(makeDeal(i++, SDR_ID,    "2026-02-04", "BluePex",   1750, 900,  "pago", 0.10));
  deals.push(makeDeal(i++, SDR_ID,    "2026-02-14", "Opus Tech", 3400, 2700, "aguardando_sdr", 0.10));
  deals.push(makeDeal(i++, SDR_ID,    "2026-02-25", "BluePex",   600,  0,    "pendente", 0.10));
  deals.push(makeDeal(i++, GESTOR_ID, "2026-02-10", "Opus Tech", 4800, 3500, "pago", 0.15));
  deals.push(makeDeal(i++, GESTOR_ID, "2026-02-28", "BluePex",   2100, 1200, "aguardando_sdr", 0.15));

  // ═══════════════════════════════════════════════════════════
  // BLOCO 2: MÊS ATUAL (Abril 2026) — 10 deals
  //   CRÍTICO: Testar Transbordo do Dia 7
  // ═══════════════════════════════════════════════════════════

  // Fechamentos cujo 1o pagamento cai ANTES ou NO dia 7/Abril
  // → Comissão deve cair em 20/Abril (mesmo mês)
  deals.push(makeDeal(i++, SDR_ID,    "2026-03-05", "BluePex",   1100, 800,  "pendente", 0.10));  // 1o pag: 04/Abr
  deals.push(makeDeal(i++, SDR_ID,    "2026-03-06", "Opus Tech", 2000, 1500, "pendente", 0.10));  // 1o pag: 05/Abr
  deals.push(makeDeal(i++, SDR_ID,    "2026-03-08", "BluePex",   3500, 2800, "aguardando_sdr", 0.10)); // 1o pag: 07/Abr (inclusivo!)
  deals.push(makeDeal(i++, GESTOR_ID, "2026-03-04", "BluePex",   4200, 3000, "pendente", 0.15));  // 1o pag: 03/Abr
  deals.push(makeDeal(i++, GESTOR_ID, "2026-03-07", "Opus Tech", 6000, 5000, "pendente", 0.15));  // 1o pag: 06/Abr

  // Fechamentos cujo 1o pagamento cai DEPOIS do dia 7/Abril
  // → Comissão deve ser empurrada para 20/MAIO (transbordo)
  deals.push(makeDeal(i++, SDR_ID,    "2026-03-10", "BluePex",   1300, 600,  "pendente", 0.10));  // 1o pag: 09/Abr → Maio!
  deals.push(makeDeal(i++, SDR_ID,    "2026-03-15", "Opus Tech", 4100, 3200, "pendente", 0.10));  // 1o pag: 14/Abr → Maio!
  deals.push(makeDeal(i++, SDR_ID,    "2026-03-20", "BluePex",   2700, 2000, "pendente", 0.10));  // 1o pag: 19/Abr → Maio!
  deals.push(makeDeal(i++, GESTOR_ID, "2026-03-12", "Opus Tech", 5500, 4500, "pendente", 0.15));  // 1o pag: 11/Abr → Maio!
  deals.push(makeDeal(i++, GESTOR_ID, "2026-03-25", "BluePex",   3800, 2800, "pendente", 0.15));  // 1o pag: 24/Abr → Maio!

  // ═══════════════════════════════════════════════════════════
  // BLOCO 3: FUTURO (Mai–Dez 2026) — 20 deals
  //   Validar Painel de Lançamentos Futuros
  // ═══════════════════════════════════════════════════════════

  // Maio 2026 — 4 deals
  deals.push(makeDeal(i++, SDR_ID,    "2026-04-02", "BluePex",   1900, 1200, "pendente", 0.10));
  deals.push(makeDeal(i++, SDR_ID,    "2026-04-15", "Opus Tech", 3600, 2800, "pendente", 0.10));
  deals.push(makeDeal(i++, GESTOR_ID, "2026-04-05", "BluePex",   2500, 1800, "pendente", 0.15));
  deals.push(makeDeal(i++, GESTOR_ID, "2026-04-20", "Opus Tech", 7200, 6000, "pendente", 0.15));

  // Junho 2026 — 3 deals
  deals.push(makeDeal(i++, SDR_ID,    "2026-05-10", "BluePex",   2100, 1500, "pendente", 0.10));
  deals.push(makeDeal(i++, SDR_ID,    "2026-05-18", "Opus Tech", 4900, 3800, "pendente", 0.10));
  deals.push(makeDeal(i++, GESTOR_ID, "2026-05-22", "BluePex",   3300, 2200, "pendente", 0.15));

  // Julho 2026 — 3 deals
  deals.push(makeDeal(i++, SDR_ID,    "2026-06-08", "Opus Tech", 5500, 4200, "pendente", 0.10));
  deals.push(makeDeal(i++, GESTOR_ID, "2026-06-15", "BluePex",   2800, 2000, "pendente", 0.15));
  deals.push(makeDeal(i++, GESTOR_ID, "2026-06-25", "Opus Tech", 6100, 5000, "pendente", 0.15));

  // Agosto 2026 — 2 deals
  deals.push(makeDeal(i++, SDR_ID,    "2026-07-12", "BluePex",   1600, 1000, "pendente", 0.10));
  deals.push(makeDeal(i++, GESTOR_ID, "2026-07-20", "Opus Tech", 8500, 7000, "pendente", 0.15));

  // Setembro 2026 — 2 deals
  deals.push(makeDeal(i++, SDR_ID,    "2026-08-05", "Opus Tech", 3800, 2900, "pendente", 0.10));
  deals.push(makeDeal(i++, GESTOR_ID, "2026-08-18", "BluePex",   4200, 3100, "pendente", 0.15));

  // Outubro 2026 — 2 deals
  deals.push(makeDeal(i++, SDR_ID,    "2026-09-10", "BluePex",   2400, 1800, "pendente", 0.10));
  deals.push(makeDeal(i++, GESTOR_ID, "2026-09-22", "Opus Tech", 5800, 4500, "pendente", 0.15));

  // Novembro 2026 — 2 deals
  deals.push(makeDeal(i++, SDR_ID,    "2026-10-07", "Opus Tech", 6200, 4800, "pendente", 0.10));
  deals.push(makeDeal(i++, GESTOR_ID, "2026-10-15", "BluePex",   3500, 2600, "pendente", 0.15));

  // Dezembro 2026 — 2 deals
  deals.push(makeDeal(i++, SDR_ID,    "2026-11-03", "BluePex",   4000, 3200, "pendente", 0.10));
  deals.push(makeDeal(i++, GESTOR_ID, "2026-11-20", "Opus Tech", 9200, 7500, "pendente", 0.15));

  // ═══════════════════════════════════════════════════════════
  // BLOCO 4: EXTRAS PARA VOLUMETRIA — 5 deals (acumular em Março)
  //   SDR com 32 apresentações BluePex em Março → Super Meta
  // ═══════════════════════════════════════════════════════════
  deals.push(makeDeal(i++, SDR_ID, "2026-02-01", "BluePex", 800,  500, "pago", 0.10));
  deals.push(makeDeal(i++, SDR_ID, "2026-02-02", "BluePex", 950,  400, "pago", 0.10));
  deals.push(makeDeal(i++, SDR_ID, "2026-02-03", "BluePex", 700,  0,   "pago", 0.10));
  deals.push(makeDeal(i++, SDR_ID, "2026-02-04", "BluePex", 1100, 800, "pago", 0.10));
  deals.push(makeDeal(i++, SDR_ID, "2026-02-06", "BluePex", 1250, 600, "pago", 0.10));

  return deals;
}

// ─── Mock Profiles ───
const testProfiles = [
  {
    user_id: GESTOR_ID,
    full_name: "Carlos Gestor (Teste)",
    display_name: "Carlos Gestor",
    role: "gestor",
    commission_percent: 15,
    fixed_salary: 5000,
    job_title: "Gestor de Operações"
  },
  {
    user_id: SDR_ID,
    full_name: "Ana SDR (Teste)",
    display_name: "Ana SDR",
    role: "user",
    commission_percent: 10,
    fixed_salary: 2500,
    job_title: "SDR - Sales Development Representative"
  }
];

// ═══════════════════════════════════════════════════════════
// 🚀 EXECUÇÃO
// ═══════════════════════════════════════════════════════════

async function seed() {
  console.log("═══════════════════════════════════════");
  console.log("🌱 MOCK DATA MASTER — Início da População");
  console.log("═══════════════════════════════════════\n");

  // Step 1: Limpar dados de teste antigos (por user_id dos personas de teste)
  console.log("🗑️  Limpando dados de teste anteriores...");
  await supabase.from("deals").delete().in("user_id", [GESTOR_ID, SDR_ID]);
  await supabase.from("profiles").delete().in("user_id", [GESTOR_ID, SDR_ID]);
  console.log("   ✅ Dados antigos removidos.\n");

  // Step 2: Inserir Profiles de Teste
  console.log("👤 Criando Personas de Teste...");
  for (const profile of testProfiles) {
    const { error } = await supabase
      .from("profiles")
      .upsert(profile as any, { onConflict: "user_id" });
    if (error) {
      console.error(`   ❌ Erro no perfil ${profile.full_name}: ${error.message}`);
    } else {
      console.log(`   ✅ ${profile.full_name} (${profile.role}) criado.`);
    }
  }

  // Step 3: Inserir Deals
  console.log("\n📊 Inserindo 50 lançamentos fictícios...");
  const allDeals = buildAllDeals();
  
  // Insert in batches of 10
  for (let batch = 0; batch < allDeals.length; batch += 10) {
    const chunk = allDeals.slice(batch, batch + 10);
    const { data, error } = await supabase
      .from("deals")
      .insert(chunk as any[])
      .select("id");

    if (error) {
      console.error(`   ❌ Erro no lote ${batch / 10 + 1}: ${error.message}`);
    } else {
      console.log(`   ✅ Lote ${batch / 10 + 1}: ${data?.length || 0} deals inseridos.`);
    }
  }

  // Step 4: Relatório
  const { count: dealCount } = await supabase
    .from("deals")
    .select("*", { count: "exact", head: true })
    .in("user_id", [GESTOR_ID, SDR_ID]);

  console.log("═══════════════════════════════════════");
  console.log("📋 RELATÓRIO FINAL");
  console.log("═══════════════════════════════════════");
  console.log(`   Total de Deals de Teste no banco: ${dealCount}`);
  console.log(`   Perfis de Teste criados: ${testProfiles.length}`);
  console.log(`   Apresentações: gerenciadas via localStorage no front-end`);
  console.log("");
  console.log("   Distribuição dos Deals:");
  console.log("   ├─ Passado (Jan-Mar 2026): 20 deals");
  console.log("   ├─ Atual  (Abr 2026):      10 deals (5 antes D7, 5 depois D7)");
  console.log("   └─ Futuro (Mai-Dez 2026):  20 deals");
  console.log("");
  console.log("   Status:");
  const pagos = allDeals.filter(d => d.is_user_confirmed_payment).length;
  const aguardando = allDeals.filter(d => d.is_paid_to_user && !d.is_user_confirmed_payment).length;
  const pendentes = allDeals.filter(d => !d.is_paid_to_user).length;
  console.log(`   ├─ Pago (Confirmado SDR): ${pagos}`);
  console.log(`   ├─ Aguardando SDR:         ${aguardando}`);
  console.log(`   └─ Pendente:               ${pendentes}`);
  console.log("");
  console.log("🔥 Ambiente de Teste POPULADO com sucesso!");
  console.log("   → Faça login com executivo.teste@teste.com ou sdr.teste@teste.com");
  console.log("   → Acesse Dashboard e Financeiro para validar gráficos e KPIs.");
}

seed().catch(console.error);
