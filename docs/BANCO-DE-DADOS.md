# Banco de dados

Postgres gerenciado pelo Lovable Cloud. **Todas as tabelas têm RLS habilitado** e acesso concedido apenas aos papéis necessários.

## Tabelas

| Tabela | Finalidade | Campos principais |
|---|---|---|
| `profiles` | Dados e carteira do usuário | `user_id`, `full_name`, `email`, `phone`, `cpf`, `balance`, `pending_balance`, `total_recycled_kg`, `month_recycled_kg`, `level`, `is_active` |
| `user_roles` | Papéis (RBAC) | `user_id`, `role` (`admin`, `moderator`, `user`, `lojista`) |
| `transactions` | Extrato imutável de FC | `type` (`credit`/`debit`), `amount`, `category`, `material`, `weight_kg`, `collection_point_id` |
| `stores` | Lojas parceiras | `owner_id`, `name`, `logo_url`, `category`, `address`, `phone`, `email`, `active` |
| `products` | Produtos do sistema (`store_id` nulo) e de parceiros | `name`, `price_fc`, `category`, `image_url`, `featured`, `stock`, `active`, `store_id` |
| `product_categories` | Categorias dinâmicas usadas nos filtros da loja | `name`, `label`, `active` |
| `orders` | Pedidos gerados por resgates em parceiros | `store_id`, `customer_id`, `product_name`, `quantity`, `unit_price_fc`, `total_fc`, `status`, `customer_name`, `customer_phone` |
| `collection_points` | Pontos de coleta | `name`, `address`, `hours`, `lat`, `lng`, `accepted_materials`, `active` |
| `material_rates` | Conversão material → FC | `material`, `unit`, `quantity_per_fenix`, `fenix_per_unit`, `active` |
| `promotions` | Banners do dashboard | `title`, `image_url`, `link_url`, `start_date`, `end_date`, `active` |
| `contact_messages` | Mensagens do formulário de contato | `name`, `email`, `subject`, `message`, `read` |
| `monitoring_thresholds` / `monitoring_alerts` | Limites e histórico de alertas do banco | `metric_key`, `warn_value`, `crit_value` / `level`, `value`, `message` |

Enums: `app_role` (`admin`, `moderator`, `user`, `lojista`), `order_status` (`pendente`, `separacao`, `enviado`, `entregue`, `cancelado`).

Exclusões usam **soft delete** pelo campo `active`; nunca apagar registros de domínio.

## Funções (RPC / internas)

| Função | Papel |
|---|---|
| `has_role(user_id, role)` | Checagem de papel (SECURITY DEFINER, evita recursão de RLS) |
| `owns_store(user_id, store_id)` | Checagem de propriedade de loja |
| `redeem_store_product(product_id, quantity)` | Resgate: valida conta/loja/estoque, trava a linha do cliente (`FOR UPDATE`), debita saldo, credita pendente do lojista, baixa estoque e cria o pedido |
| `cancel_store_order(order_id)` | Cancela pedido pendente: estorna o cliente, reverte o pendente do lojista e devolve o estoque |
| `release_pending_earnings()` | Move `pending_balance` → `balance` e registra a transação |
| `release_pending_if_due()` | Executa a liberação apenas se hoje for o 5º dia útil |
| `is_fifth_business_day(date)` | Verdadeiro no 5º dia útil do mês (não considera feriados) |
| `cleanup_old_orders()` | Remove pedidos com mais de 2 anos |
| `get_db_metrics()` / `_compute_db_metrics()` | Métricas do banco para o painel de monitoramento (somente admin) |
| `handle_new_user()` | Trigger em `auth.users`: cria o perfil |
| `protect_profile_financial_fields[_insert]()` | Trigger que impede o usuário de alterar saldo, nível e volumes reciclados |
| `update_updated_at_column()` | Mantém `updated_at` |

## Rotinas agendadas (pg_cron)

| Job | Agenda | Ação |
|---|---|---|
| `release-pending-earnings-daily` | `0 9 * * *` | `release_pending_if_due()` |
| `cleanup-old-orders` | `0 3 * * *` | `cleanup_old_orders()` |
| `monitor-check-15min` | `*/15 * * * *` | Chama a Edge Function `monitor-check` |

## Storage

| Bucket | Público | Uso |
|---|---|---|
| `product-images` | sim | Imagens de produtos (upload pelo admin/lojista) |
| `promotion-images` | sim | Imagens de banners promocionais |
