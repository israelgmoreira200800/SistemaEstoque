# Banco de Dados

## Estratégia

O PostgreSQL é a fonte de verdade. O Prisma gerencia schema, client e migrations.
O sistema é usado por uma única empresa; `company_id` permanece como escopo interno
da instalação e para preservar isolamento lógico dos dados.

Não há filiais nem depósitos no MVP. O estoque é principal e único.

## Tabelas principais

### Fundação

- `companies`: raiz da instalação.
- `users`: usuários da empresa, com status `ACTIVE` ou `BLOCKED`.
- `sessions`: sessões revogáveis; guarda hash do token, usuário e empresa.
- `audit_logs`: trilha de auditoria.

### Cargos e permissões

- `roles`: cargos configuráveis e inativáveis.
- `permissions`: catálogo de permissões granulares por módulo/ação.
- `role_permissions`: permissões herdadas pelo cargo.
- `user_roles`: cargos atribuídos a usuários.
- `user_permission_overrides`: concessões ou negações individuais.
- `sectors`: setores operacionais.
- `user_sectors`: vínculo usuário/setor.

Prioridade de autorização:

1. usuário bloqueado: acesso negado;
2. negação individual: acesso negado;
3. concessão individual: acesso permitido;
4. permissão herdada do cargo: acesso permitido;
5. ausência de permissão: acesso negado.

### Catálogo

- `items`: matérias-primas, embalagens, componentes, produtos acabados, revenda e consumo interno.
- `item_categories`: categorias.
- `units`: unidades de medida.
- `item_unit_conversions`: conversões específicas por item.

### Estoque

- `stock_balances`: saldo atual por item.
- `stock_movements`: histórico imutável de entradas, saídas, perdas, ajustes,
  inventário, consumo de produção e produto produzido.

### Produção

- `product_components`: ficha técnica simples, produto → componentes.
- `productions`: produção concluída.

### Pedidos

- `customer_orders`: pedido e status.
- `customer_order_items`: itens do pedido.

## Migrations

Migrations aplicadas:

1. `20260622235223_foundation`
2. `20260623000236_catalog_foundation`
3. `20260623001632_organization_and_conversions`
4. `20260623010000_single_company_rbac_stock_mvp`

A quarta migration aposenta `company_users`, `company_user_roles`, `branches` e
`warehouses`, faz backfill para `users.company_id`, cria `user_roles`,
`user_permission_overrides`, `sectors`, estoque, produção e pedidos.

## Invariantes

- Usuário bloqueado não mantém sessão válida.
- Cargos não são apagados em fluxo comum; são inativados.
- Permissões individuais são explícitas e auditadas.
- O último usuário com `permission.manage` não pode perder esse acesso.
- SKU e código de barras são únicos dentro da empresa.
- Quantidades usam `Decimal(18, 6)`.
- Saldo disponível é derivado de físico, reservado e bloqueado.
- Movimentações confirmadas não são editadas pela aplicação.
- Entrada, saída e produção gravam movimento e auditoria em transação.

