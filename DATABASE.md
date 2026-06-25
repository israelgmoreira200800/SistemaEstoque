# Banco de Dados

## Estratégia

O PostgreSQL é a fonte de verdade. O Prisma gerencia schema, client e migrations.
Cada cliente SaaS representa uma empresa independente em `companies`; `company_id`
é o limite obrigatório de isolamento dos dados empresariais.

Não há filiais nem depósitos no MVP. O estoque é principal e único.

## Tabelas principais

### Fundação

- `companies`: tenants empresariais, com status, plano atual e período de teste.
- `platform_users`: operadores da plataforma Vertice, separados de `users`.
- `platform_sessions`: sessões dos operadores da plataforma.
- `platform_audit_logs`: auditoria da plataforma e ações sobre empresas.
- `plans`: planos manuais preparados para SaaS.
- `plan_features`: recursos e limites declarativos de cada plano.
- `subscriptions`: assinatura atual/histórica de uma empresa.
- `usage_limits`: limites manuais por empresa, aplicados em runtime.
- `billing_events`: eventos de cobrança ou plano, sem cobrança real nesta fase.
- `users`: usuários da empresa, com status `ACTIVE` ou `BLOCKED`.
- `sessions`: sessões revogáveis; guarda hash do token, usuário e empresa.
- `password_reset_tokens`: tokens hashados de recuperacao de senha.
- `user_invitations`: convites hashados para aceite e definicao de senha.
- `email_outbox`: fila local de e-mails transacionais enquanto nao ha SMTP real.
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
- `stock_adjustment_requests`: solicitacoes de ajuste/inventario com aprovacao.

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
5. `20260624090000_saas_domain_preparation`
6. `20260624190000_account_recovery_and_invites`
7. `20260624200000_stock_adjustment_approvals`

A quarta migration aposenta `company_users`, `company_user_roles`, `branches` e
`warehouses`, faz backfill para `users.company_id`, cria `user_roles`,
`user_permission_overrides`, `sectors`, estoque, produção e pedidos.

A quinta migration prepara o domínio SaaS com novos status de empresa, dados de
trial e plano atual, operadores/sessões/auditoria da plataforma e estrutura
manual inicial de planos, assinaturas, limites e eventos de cobrança.

A sexta migration adiciona recuperacao de senha, convite de usuarios e outbox
local de e-mails transacionais, usando tokens opacos armazenados apenas como
hash.

A setima migration adiciona solicitacoes de ajuste e inventario com revisao,
status, saldo de referencia, saldo solicitado, delta aplicado e vinculo opcional
ao movimento de estoque gerado na aprovacao.

## Invariantes

- Usuário bloqueado não mantém sessão válida.
- Empresa `SUSPENDED` ou `CANCELLED` não permite acesso empresarial.
- Assinatura conhecida precisa estar `TRIALING` ou `ACTIVE` para liberar acesso
  empresarial.
- Operador da plataforma não pertence a `users`, cargos ou permissões empresariais.
- Cargos não são apagados em fluxo comum; são inativados.
- Permissões individuais são explícitas e auditadas.
- O último usuário com `permission.manage` não pode perder esse acesso.
- SKU e código de barras são únicos dentro da empresa.
- Onboarding empresarial cria tenant, primeiro usuario administrador, cargos,
  setores, catalogo inicial, assinatura, limites e auditorias em transacao unica.
- Consultas relacionais sensiveis devem validar tambem a empresa dos itens
  associados, como componentes de producao, itens de pedido e movimentos de
  estoque.
- Quantidades usam `Decimal(18, 6)`.
- Saldo disponível é derivado de físico, reservado e bloqueado.
- Saidas de estoque e consumo de producao so reduzem saldo com decremento
  atomico condicionado a saldo suficiente.
- Ajustes e inventario pendentes nao alteram saldo.
- Aprovacao de ajuste/inventario recalcula a diferenca contra o saldo atual,
  cria movimento `ADJUSTMENT` ou `INVENTORY` e registra auditoria na mesma
  transacao.
- Expedicao de pedido cria movimento `SHIPMENT` vinculado ao `customer_order`,
  baixa estoque com decremento atomico e marca o pedido como `SHIPPED` na mesma
  transacao.
- Relatorios e exportacoes CSV sao leituras filtradas por `company_id`; a
  exportacao registra auditoria, mas nao altera dados operacionais.
- `usage_limits` controla usuarios e itens ativos no runtime; criacao e
  reativacao consomem limite, bloqueio/inativacao sincronizam o uso.
- Tokens de recuperacao de senha e convite sao de uso unico, expiram e ficam
  persistidos apenas como hash.
- Aceite de convite consome o limite de usuarios antes de ativar a conta.
- `email_outbox` guarda o conteudo necessario para entrega enquanto nao existe
  provedor SMTP integrado; nao substitui auditoria.
- Movimentações confirmadas não são editadas pela aplicação.
- Entrada, saída e produção gravam movimento e auditoria em transação.
