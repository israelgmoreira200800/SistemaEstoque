# Progresso

Última atualização: 24 de junho de 2026.

## Estado geral

Fase atual: **Fase 14 - Revisao mobile e responsividade (concluida)**.

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
A Fase 5 revisa consultas, Server Actions e relacoes sensiveis para reforcar que
dados empresariais sejam sempre lidos e alterados dentro da empresa autenticada.
A Fase 6 corrige o risco de corrida em saidas e consumo de producao usando
decremento atomico condicionado ao saldo disponivel no banco.
A Fase 7 aplica assinaturas e limites no runtime empresarial: assinaturas
ativas/trial liberam acesso, e limites de usuarios e itens ativos bloqueiam
novas criacoes ou reativacoes quando atingidos.
A Fase 8 adiciona recuperacao de senha, convite de usuarios por link temporario
e outbox local de e-mails transacionais. Tokens ficam hashados no banco; o
conteudo de envio fica enfileirado em `email_outbox` enquanto nao ha SMTP real.
A Fase 9 adiciona solicitacoes de ajuste e inventario com aprovacao antes de
alterar saldo. O saldo solicitado fica pendente, e a diferenca e calculada de
novo no momento da aprovacao para considerar movimentos ocorridos no intervalo.
A Fase 10 liga a expedicao ao pedido: ao enviar um pedido, o sistema baixa os
itens do estoque com decremento atomico, cria movimentos `SHIPMENT`, atualiza o
pedido para `SHIPPED` e audita a operacao na mesma transacao.
A Fase 11 adiciona relatorios operacionais por empresa, com indicadores,
consultas recentes e exportacao CSV para estoque, movimentacoes, pedidos e
producoes. As exportacoes exigem `report.export`, respeitam o `companyId` da
sessao e registram auditoria `report.exported`.
A Fase 12 separa a gestao da ficha tecnica do lancamento de producao. A ficha
fica no detalhe do item/produto e usa permissoes `bom.*`; a producao recebe
somente dados operacionais, busca componentes no banco, valida saldo disponivel
e rejeita componentes enviados manualmente pelo frontend.
A Fase 13 centraliza os templates transacionais de e-mail, adiciona layout HTML
responsivo com identidade do Vertice, mantem texto simples como alternativa e
preserva os fluxos existentes de convite e recuperacao de senha.
A Fase 14 revisa a experiencia mobile com drawer de navegacao, ajustes globais
de tabelas, formularios, cards, popovers e alvos de toque, preservando regras de
negocio e o desktop.
A identificacao de autoria foi adicionada de forma discreta no login, layout
principal, configuracoes, README e metadados do pacote.

## Concluído nesta entrega

- [x] Adicionar identificacao profissional: Vértice 2026, desenvolvido por
  Israel Gomes Moreira.
- [x] Trocar a navegacao mobile truncada por drawer com empresa, usuario,
  atalhos completos e logout.
- [x] Reforcar `app-shell`, `page-body`, cards, headers e popovers para evitar
  scroll horizontal global.
- [x] Melhorar tabelas responsivas em cards no mobile, mantendo scroll interno
  apenas quando necessario.
- [x] Ajustar formularios, botoes e acoes compactas para toque confortavel em
  360px a 430px.
- [x] Validar via Chrome headless larguras 1440, 1280, 1024, 768, 430, 412,
  390 e 360px em login, recuperacao, dashboard, itens, usuarios, cadastros,
  pedidos, producao e login da plataforma.
- [x] Criar layout centralizado de e-mail com cabecalho, botao, bloco de
  informacoes, aviso de seguranca e rodape.
- [x] Converter convite de usuario e redefinicao de senha para templates HTML
  com texto simples alternativo.
- [x] Preparar templates padronizados para empresa criada, empresa suspensa,
  empresa reativada, alerta de estoque e notificacao operacional.
- [x] Enviar HTML pelo SMTP quando disponivel, mantendo `email_outbox.body`
  como conteudo texto.
- [x] Adicionar preview local em `/api/dev/email-preview` somente fora de
  producao.
- [x] Cobrir templates de e-mail com testes unitarios.
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
- [x] Revisar consultas e Server Actions empresariais por uso de `companyId`.
- [x] Trocar escritas finais por `updateMany` com `companyId` em catalogo,
  usuarios, cargos, producao e pedidos.
- [x] Ajustar o guardiao do ultimo administrador para validar `userId` junto da
  empresa esperada.
- [x] Reforcar leituras relacionais de estoque, producao e pedidos para carregar
  apenas itens vinculados a mesma empresa.
- [x] Auditar o banco local contra vinculos cruzados entre empresas; nenhum
  desvio encontrado.
- [x] Criar decremento atomico de saldo com `updateMany` condicionado por
  `companyId`, `itemId`, item ativo e `quantityOnHand >= quantidade`.
- [x] Aplicar decremento atomico em saidas de estoque.
- [x] Aplicar decremento atomico no consumo de componentes da producao, com
  rollback da transacao quando algum componente nao tiver saldo.
- [x] Revalidar produto e ficha tecnica ativa dentro da transacao de producao.
- [x] Adicionar testes automatizados para o helper de decremento concorrente.
- [x] Validar concorrencia real no banco: duas saidas simultaneas de 8 sobre
  saldo 10 resultam em uma aceita, uma recusada e saldo final 2.
- [x] Criar helper central de limites em `src/lib/billing`.
- [x] Bloquear acesso empresarial quando a assinatura conhecida nao estiver
  `ACTIVE` ou `TRIALING`.
- [x] Aplicar limite de `users` para criacao e desbloqueio de usuarios ativos.
- [x] Aplicar limite de `items` para criacao e reativacao de itens ativos.
- [x] Sincronizar `usedValue` ao bloquear usuarios, inativar itens e rodar seed.
- [x] Inicializar o onboarding com uso correto do primeiro administrador.
- [x] Validar limites de uso no banco com empresa temporaria.
- [x] Criar migration `20260624190000_account_recovery_and_invites`.
- [x] Preparar `password_reset_tokens`, `user_invitations` e `email_outbox`.
- [x] Adicionar `APP_URL` para compor links de recuperacao e convite.
- [x] Implementar `/recuperar-senha`, `/redefinir-senha` e `/aceitar-convite`.
- [x] Alterar criacao de usuario para convite com usuario `BLOCKED` ate aceite.
- [x] Permitir reenvio de convite e invalidar convites anteriores.
- [x] Redefinir senha com token de uso unico, expiracao e revogacao de sessoes.
- [x] Validar fluxo real no banco com reset, convite, aceite e bloqueio de reuso.
- [x] Criar migration `20260624200000_stock_adjustment_approvals`.
- [x] Preparar `stock_adjustment_requests` com status de revisao.
- [x] Implementar `/dashboard/ajustes` para solicitacao, pendencias e revisoes.
- [x] Aplicar ajuste/inventario apenas apos `stock.adjust_approve`.
- [x] Recalcular a diferenca contra o saldo atual no momento da aprovacao.
- [x] Criar movimento `ADJUSTMENT` ou `INVENTORY` e auditoria ao aprovar.
- [x] Permitir rejeicao auditada sem alterar saldo.
- [x] Adicionar testes de validacao e calculo de delta de ajuste.
- [x] Implementar expedicao de pedido com baixa automatica de estoque.
- [x] Criar movimentos `SHIPMENT` vinculados ao `customer_order`.
- [x] Bloquear reexpedicao de pedido ja enviado ou cancelado.
- [x] Bloquear expedicao sem saldo suficiente, mantendo pedido e estoque intactos.
- [x] Permitir perfil de Expedicao expedir sem depender de `order.change_status`.
- [x] Validar expedicao real no banco com baixa, movimento, bloqueio de reuso e rollback por falta de saldo.
- [x] Criar `/dashboard/relatorios` com indicadores de estoque, pedidos,
  movimentacoes e producao.
- [x] Adicionar exportacao CSV em `/dashboard/relatorios/export`.
- [x] Proteger leitura por `report.view` e exportacao por `report.export`.
- [x] Filtrar todos os relatorios pela empresa autenticada.
- [x] Auditar exportacoes com `report.exported`.
- [x] Adicionar helper testado para geracao de CSV.
- [x] Criar permissoes `bom.view`, `bom.create`, `bom.update` e `bom.inactivate`.
- [x] Mover gestao da ficha tecnica para o detalhe do item/produto.
- [x] Remover edicao de componentes da tela de producao.
- [x] Fazer a producao consumir somente ficha tecnica ativa carregada do banco.
- [x] Rejeitar componentes enviados manualmente no lancamento de producao.
- [x] Usar saldo disponivel atomico para consumo de componentes de producao.

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
- `password_reset_tokens`
- `user_invitations`
- `email_outbox`
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
- `stock_adjustment_requests`
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

### Fluxo de identidade por e-mail

```text
Recuperar senha ou criar convite
-> Gerar token opaco e salvar apenas hash
-> Enfileirar e-mail em email_outbox
-> Abrir link temporario
-> Definir senha
-> Consumir token e registrar auditoria
```

### Fluxo de ajuste e inventario

```text
Acessar Ajustes
-> Informar item, tipo e novo saldo contado
-> Solicitar aprovacao
-> Revisor aprova ou rejeita
-> Ao aprovar, recalcular diferenca contra saldo atual
-> Atualizar saldo e registrar movimento/auditoria
```

### Fluxo de expedicao

```text
Pedido com itens
-> Expedir
-> Baixar saldo dos itens
-> Criar movimentos SHIPMENT vinculados ao pedido
-> Marcar pedido como enviado
-> Registrar auditoria
```

### Fluxo de relatorios

```text
Relatorios
-> Consultar indicadores e listas recentes
-> Exportar CSV autorizado
-> Filtrar dados pela empresa da sessao
-> Registrar auditoria report.exported
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
- [x] auditoria SQL de isolamento multiempresa
- [x] teste real de concorrencia em saida de estoque
- [x] teste real de limites de uso em banco
- [x] teste real de recuperacao de senha e convite em banco
- [x] teste real de ajuste aprovado em banco
- [x] teste real de expedicao com baixa automatica em banco

Resultado:

- 7 migrations aplicadas.
- Banco atualizado.
- 15 arquivos de teste.
- 50 testes aprovados.
- Build Next.js aprovado.
- Nenhuma vulnerabilidade conhecida em produção.

- Auditoria local de isolamento sem vinculos cruzados entre empresas.
- Saida concorrente validada sem saldo negativo.
- Limites de uso validados com bloqueio e consumo reais no banco.
- Recuperacao de senha e convite validados com token unico, expiracao e reuso
  bloqueado no banco.
- Ajuste aprovado validado no banco com movimento, saldo final e rejeicao sem
  alterar estoque.
- Expedicao validada com baixa atomica, movimento `SHIPMENT`, bloqueio de
  reexpedicao e rollback quando nao ha saldo.

## Como testar perfis

1. Entre como `admin@exemplo.com`.
2. Acesse **Usuários**.
3. Crie um convite de usuario.
4. Atribua um dos cargos iniciais.
5. Copie o link enfileirado em `email_outbox` para aceitar o convite enquanto
   nao houver SMTP real.
6. Defina a senha, faca logout e entre com o novo usuario.
7. Confira menu e acoes disponiveis.

Perfis esperados:

- **Administrador**: vê e altera tudo.
- **Gerente**: opera quase tudo, mas não deve remover controles críticos.
- **Pedidos**: cria e acompanha pedidos.
- **Produção**: ve producao, consulta ficha tecnica e registra producao sem editar componentes.
- **Estoque**: registra entradas, saídas, perdas, ajustes e inventário.
- **Expedição**: vê pedidos e ações de expedição.
- **Visualizador**: consulta dados sem alterar.

Teste importante:

- Tente remover `permission.manage` do último administrador.
- O sistema deve negar a operação.

## Próximos incrementos recomendados

- Integracao SMTP real para entrega dos e-mails transacionais.
- Melhorias visuais nos formularios grandes de permissoes.
