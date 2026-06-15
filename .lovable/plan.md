# Lojas Parceiras

Empresas parceiras que aceitam Fênix Coin nos seus estabelecimentos. O admin cria a conta da loja, a loja gerencia os próprios produtos num painel dedicado, e os clientes veem essas lojas numa seção da aba Loja.

## Decisões confirmadas
- Contas de loja são criadas **somente pelo admin**.
- Cada loja tem **página dedicada** para gerenciar seus produtos.
- Dados da loja: **nome, logo, descrição, categoria, endereço/localização, contato (telefone/email)**.
- Produtos das lojas continuam precificados em **Fênix Coin (FC)**.

## Banco de dados

**1. Novo papel de usuário**
- Adicionar o valor `lojista` ao enum `app_role` (migração isolada — exigência do Postgres para usar o valor depois).

**2. Tabela `stores`** (com GRANTs + RLS)
- Campos: `owner_id` (referência ao usuário dono), `name`, `logo_url`, `description`, `category`, `address`, `phone`, `email`, `active` (soft delete).
- Regras de acesso:
  - Qualquer usuário autenticado vê lojas ativas.
  - O lojista vê e edita apenas a própria loja.
  - O admin vê/edita/gerencia todas.

**3. Vincular produtos às lojas**
- Adicionar coluna `store_id` (opcional) em `products`. Produtos com `store_id` pertencem a uma loja parceira; produtos sem `store_id` continuam sendo da Ecoteiner.
- Atualizar as políticas de `products`:
  - Lojista pode criar/editar/desativar produtos **apenas da própria loja**.
  - Admin mantém controle total.
  - Clientes continuam vendo produtos ativos.

**4. Storage**
- Criar bucket público `store-logos` para os logos das lojas, com políticas de upload para lojistas/admin.

## Backend (edge function)

**`admin-create-store`** — necessária porque criar uma conta de login exige privilégio de administrador do servidor.
- Verifica que quem chama é admin.
- Cria o usuário de login (email + senha) da loja.
- Atribui o papel `lojista`.
- Cria o registro em `stores` com os dados informados.

## Frontend

**1. Contexto de autenticação**
- Adicionar `isLojista` ao `AuthContext` (mesma lógica do `isAdmin`).

**2. Painel Admin — nova aba "Lojas Parceiras"** (`AdminStores.tsx`)
- Listar lojas (com filtro de inativas, padrão do projeto).
- Criar nova loja: formulário com nome, email/senha de acesso, logo (upload), descrição, categoria, endereço e contato → chama a edge function.
- Editar dados da loja e desativar/reativar (soft delete).

**3. Painel da Loja — nova rota `/minha-loja`** (`MinhaLoja.tsx`)
- Acessível apenas a usuários `lojista`.
- Seção "Dados da loja": editar nome, logo, descrição, categoria, endereço e contato.
- Seção "Meus produtos": cadastrar/editar/desativar produtos (preço em FC, imagem, destaque), reaproveitando o padrão visual do `AdminProducts`, mas restrito aos produtos da própria loja.
- Item no menu lateral aparece só para lojistas.
- Após login, lojista é direcionado para `/minha-loja`.

**4. Aba Loja — seção "Lojas Parceiras"** (`Loja.tsx`)
- Nova seção que lista as lojas parceiras ativas (logo, nome, categoria) e os produtos de cada loja agrupados por estabelecimento.
- Mantém o caráter informativo (sem botão de compra, conforme regra do projeto).

## Detalhes técnicos
- O valor de enum `lojista` é adicionado numa migração separada da criação de tabelas/políticas que o utilizam (restrição do Postgres).
- `store_id` em `products` é opcional para não quebrar os produtos existentes da Ecoteiner.
- Validação de inputs (nome, email, telefone) no formulário de criação de loja seguindo os padrões já usados no cadastro de usuários.
- A senha inicial da loja é definida pelo admin no momento da criação.
