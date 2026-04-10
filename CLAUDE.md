# Sales Navigator — Contexto do Projeto para Claude Code

## O que é este projeto
Plataforma de Business Intelligence e gestão de comissionamento para as operações comerciais BluePex e Opus Tech. Calcula comissões dinâmicas baseadas em metas de apresentações e gerencia transbordos temporais de pagamento (Regra do Dia 07).

**Usuários:** SDRs, Executivos de Vendas e Gestores Comerciais.

---

## Stack Tecnológica
- **Frontend:** React + Vite + TypeScript
- **UI:** Tailwind CSS, Shadcn UI, Radix UI, Lucide React, Recharts
- **Backend/DB:** Supabase (PostgreSQL + Auth + Realtime)
- **Estado:** TanStack Query (React Query) + hooks customizados

---

## Arquitetura — Leia Antes de Qualquer Coisa

### Fluxo de Dados (NUNCA desviar deste fluxo)
```
Supabase (snake_case) 
  → dbToDeal() em src/lib/supabase-deals.ts  [tradução snake→camel]
  → useAppData() em src/hooks/useAppData.ts   [única fonte de verdade]
  → Páginas e Componentes
```

### Arquivos Críticos por Ordem de Importância
1. `src/hooks/useAppData.ts` — Estado global. Nenhuma página pode fazer fetch direto ao Supabase.
2. `src/lib/supabase-deals.ts` — Mapeador snake_case ↔ camelCase. Se adicionar coluna no banco, OBRIGATORIAMENTE mapear aqui.
3. `src/lib/commission.ts` — Motor matemático. Todo cálculo de comissão passa por `calculateCommission()`.
4. `src/pages/Index.tsx` — Dashboard principal. `useState` sempre ANTES dos `useMemo`.
5. `src/pages/Financeiro.tsx` — Torre de Controle Financeiro.
6. `src/components/PresentationsCard.tsx` — Card de apresentações.

---

## Modelo de Permissões e Cargos

**IMPORTANTE:** `role` e `position` são conceitos separados. Nunca usar `role` para decisões de visibilidade de dados ou UI.

| Campo | Tabela | Valores | Controla |
|---|---|---|---|
| `role` | `profiles` | `admin`, `gestor`, `user` | Permissões de sistema (aprovar usuários, mudar configs globais) |
| `position` | `profiles` | `Diretor`, `Executivo de Negócios`, `SDR` | Visibilidade de dados, UI, cálculo de comissão |

### Regras de Visibilidade por Position
- **Diretor** → vê todos os deals (sem filtro de `user_id`), painel consolidado, filtros avançados
- **Executivo de Negócios** → vê apenas os próprios deals
- **SDR** → vê deals de todos os Executivos de Negócios (busca por `position = "Executivo de Negócios"` na tabela `profiles`)

---

## Regras de Negócio Inegociáveis

### Regra do Dia 07 (Transbordo)
Negócios onde o primeiro pagamento ocorre APÓS o dia 07 do mês são contabilizados financeiramente apenas no mês seguinte. Lógica em `getPaymentDateInfo`.

### Aceleradores de Comissão
- 15 apresentações = Meta (100%) → multiplicador ativo
- 30 apresentações = Super Meta (200%) → multiplicador máximo
- Abaixo de 15 = sem acelerador

### Isolamento de Ambiente
Usuários com email `@teste.com` operam em banco isolado (`is_test_data: true`). **NUNCA remover este filtro.**

---

## Guardrails — O que NUNCA Fazer

1. **NÃO** fazer requisições diretas ao Supabase dentro de páginas (`Index.tsx`, `Financeiro.tsx`). Usar apenas `useAppData`.
2. **NÃO** remover `.eq("is_test_data", isTestUser)` em `supabase-deals.ts`.
3. **NÃO** calcular comissões manualmente nas interfaces. Sempre invocar `calculateCommission()`.
4. **NÃO** alterar nomes de colunas no banco sem atualizar o mapeador `dbToDeal` e `dealToDb`.
5. **NÃO** refatorar lógicas que já estão operacionais. Ser cirúrgico.
6. **NÃO** colocar `useMemo` antes de `useState` em `Index.tsx` (causa Temporal Dead Zone).
7. **NÃO** usar `role` para decisões de visibilidade de dados ou UI. Usar sempre `position`.
8. **NÃO** gravar `role` a partir do cargo do usuário. O `OnboardingModal` salva cargo em `position`, nunca em `role`.

---

## Bugs — Estado Atual

### ✅ RESOLVIDO — user?.email → user?.id (Index.tsx e Settings.tsx)
**Arquivos:** `src/pages/Index.tsx` (linha 31), `src/pages/Settings.tsx` (linha 22)
**Problema:** `useAppData` era chamado com `user?.email` no lugar de `user?.id` (UUID). O fetch de presentations retornava vazio porque o filtro `user_id` no banco não batia com um e-mail, e saves falhavam silenciosamente.
**Fix aplicado:** Trocado para `user?.id` em ambos os arquivos. Todos os 4 call sites de `useAppData` no projeto agora passam `user?.id` corretamente.

### ✅ RESOLVIDO — PresentationsCard travado
**Arquivo:** `src/components/PresentationsCard.tsx`
**Problema:** Componente lia `presentations.bluepexCount` (camelCase) mas os dados vinham com chaves diferentes.
**Fix aplicado:** O componente lê `presentations?.bluepex` e `presentations?.opus`, que batem com o mapeamento de `fetchPresentations` em `supabase-deals.ts` (`bluepex_count` → `bluepex`, `opus_count` → `opus`).

### ⏸️ AGUARDANDO TESTE — Divergência de totais Dashboard vs Financeiro
**Arquivo:** `src/pages/Index.tsx`
**Problema:** Suspeita de divergência nos totais entre Dashboard e Financeiro. Ambas as telas já usam `calculateCommission` corretamente. Há uma diferença sutil no filtro: `financialDeals` no Dashboard aceita deals sem `userId` (`|| !d.userId`), enquanto o Financeiro não — pode causar contagem divergente em edge cases.
**Pendente:** Confirmar com dados reais se a divergência existe antes de endurecer o filtro (risco de impacto no papel de admin).

### ✅ RESOLVIDO — SettingsPanel no lugar errado
**Arquivo:** `src/pages/Settings.tsx`
**Problema:** SettingsPanel deveria estar no Settings.tsx, não no Index.tsx.
**Fix aplicado:** SettingsPanel está na aba "Metas e Comissões" (`value="comissions"`) do Settings.tsx. Não existe no Index.tsx.

### ✅ RESOLVIDO — UI Nesting (button > button) no PresentationsCard
**Arquivo:** `src/components/PresentationsCard.tsx`
**Problema:** `button cannot appear as a descendant of button` no PresentationsCard.
**Fix aplicado:** `TooltipTrigger` usa `asChild` com `<span>`, evitando que o Radix renderize um `<button>` extra. Os botões do `CounterInput` ficam dentro de `<div>`, sem nesting inválido.

### ✅ RESOLVIDO — Separação de cargo (position) e permissão (role)
**Arquivos:** `OnboardingModal.tsx`, `useAuth.tsx`, `supabase-deals.ts`, `useAppData.ts`, `Index.tsx`, `Financeiro.tsx`, `DealsTable.tsx`
**Problema:** O sistema usava `role` para controlar visibilidade de dados e UI. `OnboardingModal` sobrescrevia o `role` do usuário ao salvar o cargo.
**Fix aplicado:** `position` exposto pelo `useAuth`, filtros de banco e UI migrados para `position`, `OnboardingModal` para de tocar em `role`.

---

## Variáveis de Ambiente
```
VITE_SUPABASE_URL=    # Endpoint do projeto Supabase
VITE_SUPABASE_ANON_KEY=  # Chave pública de acesso
```

## Comandos
```bash
npm run dev          # Servidor de desenvolvimento
npm run build        # Build de produção
npx tsc --noEmit     # Verificar erros TypeScript (rodar antes de qualquer commit)
```

---

## Padrões do Projeto
- Banco de dados: `snake_case`
- TypeScript/Frontend: `camelCase`
- Tradução: exclusivamente via `dbToDeal()` em `supabase-deals.ts`
- Casting `(supabase as any).from('table')` é intencional para colunas customizadas

---

## Contexto de Negócio
- **Gustavo** é o gestor das operações. Não é desenvolvedor — comunicar mudanças de forma clara e não técnica.
- **Karen** é a SDR. Usuária final do sistema.
- Duas operações distintas no mesmo sistema: **BluePex** (cibersegurança) e **Opus Tech** (cloud privada).
- Projeto migrado de Lovable/Antigravity/Gemini para Claude Code.
