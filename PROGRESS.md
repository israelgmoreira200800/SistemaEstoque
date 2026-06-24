# Progresso

Última atualização: 24 de junho de 2026.

## Estado geral

Fase atual: **Fase 4 - Onboarding empresarial transacional**.

O sistema foi refatorado para uso em uma única empresa, sem módulo de filiais. A
complexidade de filial/depósito saiu da experiência e do modelo operacional. O MVP
agora possui estoque principal único, produção simples, pedidos, histórico e gestão
avançada de usuários, cargos e permissões.

A transformação para SaaS foi iniciada de forma incremental. A Fase 1 prepara o
domínio para múltiplas empresas clientes, operadores da plataforma, planos
manuais, assinaturas e limites, sem ativar ainda login ou painel `/platform`.
A Fase 2 adiciona login, sessão, cookie, logout e auditoria separados para os
operadores da plataforma.
A Fase 3 adiciona a primeira experiencia administrativa da plataforma: visao
geral, listagem de empresas, criacao manual e controle de status.
A Fase 4 transforma a criacao manual em onboarding transacional: empresa,
primeiro administrador, cargos, permissoes, setores, catalogo inicial, plano,
assinatura, limites e auditoria nascem juntos ou nao nascem.

## Concluído nesta entrega

- [x] Remover o fluxo operacional de filiais e depósitos.
- [x] Manter `companies` apenas como raiz interna da instalação.
- [x] Criar migration `20260623010000_single_company_rbac_stock_mvp`.
- [x] Migrar vínculos antigos de cargo para `user_roles`.
- [x] Adicionar `user_permission_overrides` com `GRANT` e `DENY`.
- [x] Adicionar `sectors` e `user_sectors`.
- [x] Criar permissões granulares por módulo.
- [x] Criar perfis iniciais editáveis: Administrador, Gerente, Pedidos, Produção, Estoque, Expedição e Visualizador.
- [x] Implementar regra de prioridade das permissões.
- [x] Bloquear acesso de usuários `BLOCKED`.
- [x] Proteger backend com `requirePermission`.
- [x] Impedir perda do último acesso administrativo.
- [x] Auditar alterações de usuários, cargos e permissões.
- [x] Implementar entradas e saídas com saldo e histórico.
- [x] Implementar fichas técnicas simples.
- [x] Implementar produção com baixa de componentes e entrada de produto acabado.
- [x] Implementar pedidos simples com status.
- [x] Criar dashboard com atalhos reais.
- [x] Criar tela de histórico de movimentações e auditoria.
- [x] Criar central de Usuários com cargos, permissões, overrides e setores.
- [x] Atualizar menu para permissões efetivas.
- [x] Atualizar README, DATABASE, SECURITY e PROGRESS.
- [x] Criar migration `20260624090000_saas_domain_preparation`.
- [x] Trocar status de empresa para `TRIAL`, `ACTIVE`, `SUSPENDED` e `CANCELLED`.
- [x] Adicionar metadados de empresa para documento, contato, trial, plano atual
  e ciclo de vida.
- [x] Preparar `platform_users`, `platform_sessions` e `platform_audit_logs`.
- [x] Preparar `plans`, `plan_features`, `subscriptions`, `usage_limits` e
  `billing_events` sem cobrança real.
- [x] Permitir acesso empresarial para empresas `TRIAL` e `ACTIVE`; bloquear
  `SUSPENDED` e `CANCELLED`.
- [x] Criar login separado em `/platform/login`.
- [x] Criar sessão e cookie separados da plataforma.
- [x] Proteger `/platform` sem reutilizar a sessão empresarial.
- [x] Auditar login, falha de login, logout e seed de operador da plataforma.
- [x] Preparar seed opcional de operador via `SEED_PLATFORM_*`.
- [x] Criar visao geral da plataforma em `/platform`.
- [x] Criar listagem e busca de empresas em `/platform/companies`.
- [x] Criar detalhe de empresa em `/platform/companies/[id]`.
- [x] Permitir criacao manual de empresa sem onboarding empresarial completo.
- [x] Permitir ativar, suspender, reativar e encerrar empresas.
- [x] Revogar sessoes empresariais ao suspender ou encerrar empresa.
- [x] Criar helper de onboarding empresarial em `src/lib/organization`.
- [x] Criar empresa e administrador inicial em uma unica transacao.
- [x] Preparar cargos padrao, permissoes, setores, unidade `UN` e categoria
  `Geral` durante o onboarding.
- [x] Associar plano inicial, assinatura, limites de uso e evento de cobranca
  manual no onboarding.
- [x] Registrar auditoria empresarial e auditoria da plataforma para onboarding.

## Tabelas atuais relevantes

- `users`
- `platform_users`
- `platform_sessions`
- `platform_audit_logs`
- `plans`
- `plan_features`
- `subscriptions`
- `usage_limits`
- `billing_events`
- `roles`
- `permissions`
- `user_roles`
- `role_permissions`
- `user_permission_overrides`
- `sectors`
- `user_sectors`
- `audit_logs`
- `items`
- `units`
- `item_categories`
- `stock_balances`
- `stock_movements`
- `product_components`
- `productions`
- `customer_orders`
- `customer_order_items`

## Fluxos entregues

### Fluxo principal

```text
Login
→ Dashboard
→ Cadastro de item
→ Entrada ou saída
→ Atualização do estoque
→ Histórico
```

### Fluxo de produção

```text
Selecionar produto
→ Informar quantidade produzida
→ Mostrar componentes necessários
→ Confirmar produção
→ Retirar componentes do estoque
→ Adicionar produto acabado ao estoque
→ Registrar movimentações
```

### Fluxo de permissões

```text
Usuários
→ Criar cargo
→ Marcar permissões
→ Atribuir cargo ao usuário
→ Conceder/negar permissão individual
→ Auditoria
```

## Validações executadas

- [x] `pnpm db:deploy`
- [x] `pnpm db:generate`
- [x] `pnpm db:seed`
- [x] `pnpm typecheck`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm quality`
- [x] `pnpm build`
- [x] `pnpm audit --prod`
- [x] `pnpm exec prisma migrate status`

Resultado:

- 5 migrations aplicadas.
- Banco atualizado.
- 8 arquivos de teste.
- 24 testes aprovados.
- Build Next.js aprovado.
- Nenhuma vulnerabilidade conhecida em produção.

## Como testar perfis

1. Entre como `admin@exemplo.com`.
2. Acesse **Usuários**.
3. Crie um usuário com senha inicial de pelo menos 12 caracteres.
4. Atribua um dos cargos iniciais.
5. Faça logout e entre com o novo usuário.
6. Confira menu e ações disponíveis.

Perfis esperados:

- **Administrador**: vê e altera tudo.
- **Gerente**: opera quase tudo, mas não deve remover controles críticos.
- **Pedidos**: cria e acompanha pedidos.
- **Produção**: vê produção, ficha técnica e registra produção.
- **Estoque**: registra entradas, saídas, perdas, ajustes e inventário.
- **Expedição**: vê pedidos e ações de expedição.
- **Visualizador**: consulta dados sem alterar.

Teste importante:

- Tente remover `permission.manage` do último administrador.
- O sistema deve negar a operação.

## Próximos incrementos recomendados

- Fase 5: revisão completa de isolamento por `companyId`.
- Fase 6: correção de concorrência em estoque e produção.
- Recuperação de senha.
- Convite por e-mail.
- Ajuste/inventário com aprovação.
- Expedição com baixa automática vinculada ao pedido.
- Relatórios e exportação.
- Melhorias visuais nos formulários grandes de permissões.
