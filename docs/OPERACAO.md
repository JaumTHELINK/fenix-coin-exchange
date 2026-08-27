# Operação e manutenção

## Ambiente local

```sh
npm i
npm run dev          # http://localhost:8080
npm run build        # build de produção
npx vitest run       # testes unitários
npx playwright test  # testes E2E
```

As variáveis do backend ficam em `.env` (geradas automaticamente): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`. Não editar manualmente.

## Tarefas administrativas comuns

| Tarefa | Onde |
|---|---|
| Criar loja parceira (gera o acesso do lojista) | Admin → Lojas |
| Alterar e-mail / redefinir senha de um usuário | Admin → Usuários → editar |
| Bloquear usuário | Admin → Usuários → `is_active` |
| Creditar/debitar FC manualmente | Admin → Transações |
| Cadastrar material e taxa de conversão | Admin → Taxas de material (reativação pelo campo `active`) |
| Criar categoria de produto | Admin → Produtos (formulário do produto) |
| Publicar banner | Admin → Promoções (upload de imagem) |
| Ver saúde do banco e alertas | Admin → Monitoramento |

## Monitoramento

`monitor-check` roda a cada 15 minutos, coleta conexões, tamanho do banco, latência e cache hit ratio, compara com `monitoring_thresholds` e grava em `monitoring_alerts` (níveis warn/crit), notificando administradores. Os limites são editáveis na aba Monitoramento.

## Rotinas automáticas

- 09:00 UTC diariamente: liberação de recebíveis no 5º dia útil.
- 03:00 UTC diariamente: limpeza de pedidos com mais de 2 anos.

## Checklist de verificação periódica

1. `npm run build` e `npx vitest run` sem erros.
2. Linter de segurança do banco sem novos alertas críticos.
3. Job `release-pending-earnings-daily` com execuções `succeeded`.
4. Alertas recentes em Admin → Monitoramento revisados.
5. Fluxo de resgate + cancelamento testado após qualquer mudança nas funções financeiras.

## Pendências conhecidas

- Feriados nacionais não afetam o cálculo do 5º dia útil.
- Bundle único de ~830 kB; code-splitting por rota melhoraria o carregamento.
