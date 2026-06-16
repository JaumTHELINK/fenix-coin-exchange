## Objetivo

Quando um cliente resgatar um produto de uma loja parceira, o valor em Fênix Coin (FC) é debitado do cliente na hora e fica como **saldo pendente** do lojista. Esse pendente só vira saldo disponível no **5º dia útil de cada mês**, quando todo o pendente acumulado é liberado de uma vez.

> Observação: hoje a loja é "apenas informativa" (sem botão de compra). Para o fluxo automático escolhido, será adicionado um botão "Resgatar" nos produtos de lojas parceiras. Isso muda essa regra para o contexto das lojas parceiras — produtos Ecoteiner continuam informativos.

## Banco de dados

1. **Novo campo** `pending_balance` (numérico, padrão 0) na tabela de perfis — guarda o FC pendente do lojista.
2. Atualizar os gatilhos que protegem campos financeiros para também proteger `pending_balance` (só funções internas/admin alteram).
3. **Função de resgate** `redeem_store_product(produto)` (segura, server-side, executada pelo cliente logado):
   - Valida: produto ativo e de loja parceira ativa; cliente ativo; saldo suficiente; cliente não pode resgatar da própria loja.
   - Debita o FC do saldo do cliente e registra uma transação de débito (categoria "resgate").
   - Soma o FC ao `pending_balance` do dono da loja.
4. **Função de liberação** `release_pending_earnings()` — para cada lojista com pendente > 0: move `pending_balance` para `balance`, zera o pendente e registra transação de crédito (categoria "venda").
5. **Função auxiliar** que detecta o 5º dia útil do mês (ignora sábados/domingos) e roda a liberação apenas nesse dia.
6. Habilitar `pg_cron` e agendar a verificação diária (a liberação só ocorre de fato no 5º dia útil).

## Frontend

- **Loja parceira** (`Loja.tsx`): adicionar botão "Resgatar" nos cards de produtos de lojas parceiras, com confirmação, validação de saldo e chamada à função de resgate. Atualiza saldo e listas após sucesso.
- **Minha Loja** (`MinhaLoja.tsx`): exibir cartões de **Saldo disponível** e **Saldo pendente** do lojista, com aviso de que o pendente é liberado no 5º dia útil do mês.
- Mensagens em PT-BR e toasts de sucesso/erro.

## Detalhes técnicos

- A função de resgate roda como SECURITY DEFINER (contorna RLS de transações/perfis com segurança), validando `auth.uid()` internamente.
- Tipos de transação: `debit`/categoria `resgate` (cliente) e `credit`/categoria `venda` (liberação ao lojista).
- Agendamento via `cron.schedule` rodando diariamente; a própria função decide se hoje é o 5º dia útil antes de liberar (feriados não são considerados, apenas fins de semana).
