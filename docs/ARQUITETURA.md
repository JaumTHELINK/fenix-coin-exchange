# Arquitetura — Ecoteiner / Fênix Coin

## Visão geral

Aplicação web (SPA) para uma instituição de reciclagem: usuários entregam materiais recicláveis em pontos de coleta e recebem **Fênix Coin (FC)**, moeda interna usada para resgatar produtos do sistema ou de **lojas parceiras**.

```text
React SPA (Vite)
   |  supabase-js (JWT do usuário)
   v
Lovable Cloud (Postgres + Auth + Storage + Edge Functions)
   - RLS em todas as tabelas
   - RPCs SECURITY DEFINER para operações financeiras
   - pg_cron para rotinas agendadas
```

## Stack

| Camada | Tecnologia |
|---|---|
| UI | React 18, Vite 5, TypeScript, Tailwind CSS, shadcn/ui |
| Estado/dados | TanStack Query (`@tanstack/react-query`) |
| Rotas | react-router-dom |
| Backend | Lovable Cloud (Postgres, Auth, Storage, Edge Functions em Deno) |
| Testes | Vitest (unitários), Playwright (E2E) |

## Estrutura de pastas

```text
src/
  pages/            Telas por rota
  components/
    admin/          Painéis do administrador (uma aba por arquivo)
    ui/             shadcn/ui
    DashboardLayout.tsx, AppSidebar.tsx, ProtectedRoute.tsx
  contexts/AuthContext.tsx   Sessão, perfil e papéis do usuário
  lib/validation.ts          CPF, telefone e regras de senha (testada)
  integrations/supabase/     Cliente e tipos gerados (não editar)
  test/                      Testes unitários
supabase/functions/          Edge Functions
docs/                        Esta documentação
```

## Rotas

| Rota | Acesso | Descrição |
|---|---|---|
| `/` | público | Login |
| `/cadastro` | público | Cadastro com validação de CPF/telefone/senha |
| `/recuperar-senha`, `/redefinir-senha` | público | Fluxo de recuperação de senha |
| `/sobre` | público | Página institucional |
| `/dashboard` | autenticado | Saldo, nível, volume reciclado, promoções |
| `/loja` | autenticado | Produtos do sistema + seção de lojas parceiras |
| `/loja/:id` | autenticado | Detalhe do produto e resgate (quantidade + estoque) |
| `/pontos` | autenticado | Pontos de coleta e materiais aceitos |
| `/extrato` | autenticado | Histórico de transações em FC |
| `/minha-loja` | papel `lojista` | Produtos, estoque e pedidos da loja |
| `/admin` | papel `admin` | Painel administrativo |

Rotas protegidas usam `ProtectedRoute`; usuários sem o papel necessário são redirecionados para `/dashboard`.

## Painel administrativo (abas)

Usuários, Transações, Produtos (próprios + somente leitura de parceiros), Lojas, Pontos de coleta, Taxas de material, Categorias de produto, Promoções, Contatos, Relatórios e Monitoramento do banco.

## Edge Functions

| Função | Uso |
|---|---|
| `admin-create-store` | Cria a conta de acesso do lojista e a loja (somente admin) |
| `admin-update-user` | Altera e-mail e redefine senha de usuários (somente admin) |
| `monitor-check` | Coleta métricas do banco, compara com thresholds e registra/notifica alertas (cron 15 min) |
