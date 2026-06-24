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
src/app/platform/login        login da plataforma
src/app/platform              ambiente protegido da plataforma
src/app/platform/companies    empresas clientes e ciclo de vida
src/app/dashboard             área autenticada
src/app/api/health            saúde da aplicação
src/components                navegação e cabeçalhos
src/lib/auth                  senha, sessão empresarial, sessão da plataforma, permissões e guardas
src/lib/stock                 validação e regras de estoque
src/lib/production            validação de produção
src/lib/orders                validação de pedidos
src/lib/users                 validação de usuários/cargos/setores
src/lib/organization          onboarding e defaults empresariais
prisma/schema.prisma          modelo relacional
prisma/migrations             migrations
```

## Módulos

```text
identity      autenticação e sessões
access        usuários, cargos, permissões, overrides e setores
catalog       itens, categorias, unidades e conversões
stock         saldos, entradas, saídas e histórico
orders        pedidos e status
production    fichas técnicas e produção concluída
audit         trilha de ações críticas
settings      parâmetros gerais da instalação
platform      operadores Vertice, empresas clientes, onboarding, planos e auditoria SaaS
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

## Consistência transacional

Operações que alteram estoque usam transação:

- entrada;
- saída;
- produção concluída;
- consumo de componentes;
- entrada do produto acabado.

Cada alteração de saldo cria movimentação e auditoria.

## Auditoria

Eventos críticos são gravados em `audit_logs` com empresa, usuário, ação, entidade,
metadados úteis e data.

São auditados login/logout, estoque, produção, pedidos, usuários, cargos,
permissões individuais e seed.
