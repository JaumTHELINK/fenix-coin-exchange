# Segurança

Diretriz do projeto: OWASP Top 10 aplicado rigorosamente; em trade-offs, escolher segurança.

## Modelo de acesso

- Autenticação via Lovable Cloud Auth (e-mail/senha + Google). Sem cadastro anônimo.
- Papéis ficam em `user_roles` (nunca no perfil), verificados por `has_role()` — SECURITY DEFINER, evita recursão de RLS e escalonamento de privilégio.
- Autorização é sempre validada no servidor (RLS + RPCs). O front-end só esconde interface; nunca é a fonte de verdade.
- Cada tabela tem `GRANT` explícito apenas para os papéis usados pelas políticas; leituras anônimas somente onde é intencional.

## Controles implementados

| Risco | Controle |
|---|---|
| Gasto duplo (race condition) | `FOR UPDATE` na linha do cliente em `redeem_store_product` e `cancel_store_order`; defesa extra que rejeita saldo negativo |
| Manipulação de saldo pelo cliente | Triggers `protect_profile_financial_fields[_insert]` revertem alterações em `balance`, `pending_balance`, `level` e volumes; bypass apenas dentro das funções internas |
| Acesso a dados de terceiros | Políticas RLS escopadas por `auth.uid()` / `owns_store()` / `has_role()` |
| Funções sensíveis expostas | `EXECUTE` revogado de `anon`/`authenticated` em `release_pending_earnings`, `release_pending_if_due`, `is_fifth_business_day`, `cleanup_old_orders`, `_compute_db_metrics`; `get_db_metrics` exige admin |
| Operações administrativas | Feitas em Edge Functions que checam o papel admin antes de usar privilégios elevados |
| Injeção | Acesso ao banco por supabase-js/RPC com parâmetros; sem SQL concatenado no cliente |
| Dados inválidos | Validação de CPF/telefone/senha no cliente e restrições/validações no banco |

## Testes de segurança já executados

- RLS: usuário comum vê apenas o próprio perfil; `user_roles` vazio; auto-crédito de saldo bloqueado.
- Funções restritas retornam `permission denied` / "Acesso negado" para usuário comum.
- Fluxo financeiro: resgate, quantidade inválida, saldo insuficiente, resgate da própria loja, cancelamento por não autorizado e estorno exato — todos com o comportamento esperado.
- Rotas `/admin` e `/minha-loja` redirecionam quem não tem o papel.

## Riscos aceitos / observações

- Dados de contato das lojas parceiras (endereço, telefone, e-mail) são visíveis a qualquer usuário autenticado — decisão de produto, pois são informações comerciais públicas.
- Funções SECURITY DEFINER voltadas à API (`redeem_store_product`, `cancel_store_order`, `has_role`, `owns_store`) são chamáveis por usuários autenticados por design; cada uma valida autenticação e permissão internamente.
- O cálculo do 5º dia útil não considera feriados nacionais.
