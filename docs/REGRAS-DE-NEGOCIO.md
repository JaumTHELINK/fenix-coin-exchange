# Regras de negócio

## Fênix Coin (FC)

- FC é creditado ao usuário quando um administrador registra a entrega de material reciclável, conforme as taxas em `material_rates` (`quantity_per_fenix` / `fenix_per_unit`).
- O extrato (`transactions`) é imutável: não há atualização nem exclusão de lançamentos.
- Saldo, nível e volumes reciclados **nunca** podem ser alterados diretamente pelo usuário — triggers de proteção revertem qualquer tentativa; somente administradores e as funções financeiras internas alteram esses campos.
- Níveis do usuário são derivados do volume reciclado acumulado.

## Resgates

1. Usuário escolhe o produto e a quantidade (1 a 100, limitada ao estoque disponível).
2. `redeem_store_product` valida: conta ativa, produto e loja ativos, não resgatar da própria loja, estoque suficiente e saldo suficiente.
3. A linha do cliente é travada (`FOR UPDATE`) durante a operação — resgates simultâneos são serializados, impedindo gasto duplo.
4. Efeitos: debita o saldo do cliente, lança `debit/resgate` no extrato, credita `pending_balance` do lojista, decrementa o estoque e cria o pedido com status `pendente`.
5. Estoque vazio/nulo significa **ilimitado**; estoque zero bloqueia o resgate ("Esgotado").

## Pedidos (lojista)

- Pedidos pendentes ficam destacados; entregues com mais de 1 dia são arquivados na visão da loja.
- Filtros por data, cliente, produto e status.
- Apenas pedidos **pendentes** podem ser cancelados. O cancelamento estorna o valor exato ao cliente (`credit/estorno`), reverte o `pending_balance` do lojista e devolve o estoque.
- Somente o dono da loja ou um administrador altera pedidos daquela loja.
- Histórico é mantido por **2 anos**; registros mais antigos são removidos automaticamente.

## Recebíveis do lojista (5º dia útil)

- Vendas entram como `pending_balance` do lojista, não como saldo disponível.
- Um job diário às 09:00 UTC chama `release_pending_if_due()`; no **5º dia útil do mês** todo o pendente vira saldo disponível, com lançamento `credit/venda` ("Liberação de vendas pendentes").
- O cálculo considera apenas dias de semana (feriados nacionais não são tratados).
- Lojistas também podem gastar seus FC em outras lojas parceiras, usando o saldo do próprio perfil.

## Cadastro e validações (`src/lib/validation.ts`)

- CPF: máscara e validação dos dígitos verificadores; rejeita sequências repetidas.
- Telefone: máscara `(99) 9999-9999` para fixo e `(99) 99999-9999` para celular.
- Senha: mínimo 8 caracteres, com maiúscula, minúscula, número e caractere especial — exibida como checklist em tempo real no cadastro.
- Usuários podem ser bloqueados pelo campo `is_active` do perfil.
