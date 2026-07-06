# Arquitetura

## Decisão principal

O produto segue como monólito modular em Next.js. Frontend, rotas, Server Actions e
regras de negócio ficam no mesmo projeto implantável, com módulos internos claros.

Essa escolha reduz o custo operacional do MVP e deixa o código pronto para separar
serviços no futuro, se o volume real justificar.

## Stack

| Área | Escolha |
| --- | --- |
| Aplicação | Next.js App Router, React e TypeScript |
| Interface | Tailwind CSS |
| Banco | PostgreSQL |
| ORM | Prisma com migrations versionadas |
| Autenticação | Sessão própria, cookie HTTP-only e senha com scrypt |
| Validação | Zod nas fronteiras de entrada |
| Testes | Vitest |
| Local | Docker Compose |

## Estrutura

```text
src/app/login                 login
src/app/recuperar-senha       pedido de recuperacao de senha
src/app/redefinir-senha       definicao de nova senha por token
src/app/aceitar-convite       aceite de convite por token
src/app/platform/login        login da plataforma
src/app/platform              ambiente protegido da plataforma
src/app/platform/companies    empresas clientes e ciclo de vida
src/app/dashboard             área autenticada
src/app/dashboard/ajustes     ajuste e inventario com aprovacao
src/app/dashboard/relatorios  relatorios operacionais e exportacao CSV
src/app/api/health            saúde da aplicação
src/components                navegação e cabeçalhos
src/lib/auth                  senha, sessão empresarial, sessão da plataforma, permissões e guardas
src/lib/stock                 validação e regras de estoque
src/lib/production            validação de produção
src/lib/orders                validação de pedidos
src/lib/reports               helpers de relatorios e CSV
src/lib/users                 validação de usuários/cargos/setores
src/lib/organization          onboarding e defaults empresariais
src/lib/billing               assinatura e limites de uso
src/lib/email                 outbox local de e-mails transacionais
prisma/schema.prisma          modelo relacional
prisma/migrations             migrations
```

## Módulos

```text
identity      autenticação e sessões
access        usuários, cargos, permissões, overrides e setores
catalog       itens, categorias, unidades e conversões
stock         saldos, entradas, saidas, ajustes, inventario e historico
orders        pedidos, status e expedicao vinculada ao estoque
production    fichas técnicas e produção concluída
reports       indicadores operacionais e exportacao CSV
audit         trilha de ações críticas
settings      parâmetros gerais da instalação
platform      operadores Vertice, empresas clientes, onboarding, planos e auditoria SaaS
billing       assinatura, limites de uso e eventos manuais de cobranca
email         outbox local de mensagens transacionais
```

Não existe módulo de filiais. Não existe fluxo obrigatório de depósito. O estoque é
principal e único no MVP.

## Empresa e SaaS

A tabela `companies` agora representa o tenant empresarial. O painel empresarial
continua usando o `companyId` da sessão, e o ambiente da plataforma sera separado
em rotas, sessão, operadores e auditoria próprios.

Regras:

1. O cliente não escolhe `companyId`.
2. A sessão carrega `companyId` do usuário autenticado.
3. Consultas de negócio filtram por `companyId`.
4. Criações usam o `companyId` da sessão.
5. Permissões são calculadas no backend.
6. Operadores da plataforma não usam cargos empresariais.
7. Empresas `TRIAL` e `ACTIVE` podem acessar; empresas `SUSPENDED` e `CANCELLED` não acessam.
8. Assinaturas conhecidas precisam estar `TRIALING` ou `ACTIVE`.

## Autorização

Cada caso de uso protegido chama `requirePermission`.

A permissão efetiva é calculada com:

1. bloqueio do usuário;
2. negação individual;
3. concessão individual;
4. permissões dos cargos ativos;
5. ausência de permissão.

Esconder botões é apenas melhoria visual. A segurança real está nas Server Actions,
rotas e regras de domínio.

## Identidade por e-mail

Recuperacao de senha e convite de usuarios usam tokens opacos enviados por link.
O banco guarda somente hash SHA-256, data de expiracao e data de uso. Enquanto
nao houver SMTP integrado, a entrega fica registrada em `email_outbox`.

Ao aceitar convite, o usuario bloqueado define senha e so entao pode ser ativado,
desde que o limite de usuarios da empresa permita. Ao redefinir senha, sessoes
empresariais anteriores daquele usuario sao revogadas.

## Consistência transacional

Operações que alteram estoque usam transação:

- entrada;
- saída;
- aprovacao de ajuste/inventario;
- expedicao de pedido;
- produção concluída;
- consumo de componentes;
- entrada do produto acabado.

Cada alteração de saldo cria movimentação e auditoria.

Saidas e consumo de componentes usam atualizacao atomica condicionada a saldo
suficiente no banco. Se duas operacoes concorrentes disputarem o mesmo saldo,
apenas a primeira que ainda satisfaz a condicao grava a baixa.

Solicitacoes de ajuste/inventario nao alteram saldo enquanto estao pendentes.
Na aprovacao, a diferenca e recalculada contra o saldo atual e aplicada na
mesma transacao que cria movimento e auditoria.

Expedicao de pedido baixa cada item com decremento atomico, cria movimentos
`SHIPMENT` vinculados ao pedido e so entao marca o pedido como `SHIPPED`.

Limites de usuarios e itens ativos sao consumidos dentro da mesma transacao que
cria ou reativa o recurso. Bloqueio de usuario e inativacao de item sincronizam
o contador de uso.

## Ficha tecnica e producao

A ficha tecnica usa a estrutura existente `product_components`, com produto,
componente, quantidade e status por empresa. A manutencao fica no detalhe do
item/produto e e protegida por `bom.*`.

A tela de producao nao permite editar componentes. Ao finalizar, o backend recebe
somente dados operacionais, busca a ficha ativa da empresa, recalcula consumo,
valida saldo disponivel e grava consumo dos componentes, entrada do produto
acabado, movimentos e auditoria em uma unica transacao.

## Auditoria

Eventos críticos são gravados em `audit_logs` com empresa, usuário, ação, entidade,
metadados úteis e data.

São auditados login/logout, estoque, ajustes/inventario, produção, pedidos,
relatorios exportados, usuários, cargos, permissões individuais e seed.
