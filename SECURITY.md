# Segurança

## Objetivos

- Aplicar privilégio mínimo por usuário, cargo e permissão.
- Bloquear usuários sem deixar sessão ativa.
- Auditar alterações de estoque, pedidos, produção, usuários, cargos e permissões.
- Impedir que o último administrador perca acesso administrativo.
- Validar permissões no backend, não apenas na interface.

## Autenticação

- Senhas usam `scrypt` com salt aleatório.
- Sessões usam tokens aleatórios; só o hash SHA-256 é persistido.
- Cookies são `HttpOnly`, `SameSite=Lax` e `Secure` em produção.
- Cinco falhas consecutivas geram bloqueio temporário.
- Usuário `BLOCKED` não consegue autenticar e tem sessões revogadas.
- Empresas `TRIAL` e `ACTIVE` permitem acesso empresarial.
- Empresas `SUSPENDED` e `CANCELLED` bloqueiam novas autenticações e invalidam
  sessões empresariais quando a sessão for revalidada.

## Plataforma

- Operadores da plataforma usam `platform_users`, não `users`.
- Sessões da plataforma usam `platform_sessions` e cookie próprio.
- Auditoria da plataforma usa `platform_audit_logs`, separada da auditoria
  empresarial.
- O login `/platform/login` e a proteção de `/platform` estão implementados.
- O painel minimo de empresas esta implementado com onboarding transacional do
  tenant e do primeiro administrador empresarial.
- O operador da plataforma cria o tenant, mas nao ganha acesso silencioso aos
  dados operacionais da empresa criada.
- Planos, assinaturas detalhadas e operadores da plataforma ficam para fases
  seguintes.

## Autorização

O sistema usa permissões granulares, como:

- `item.create`;
- `stock.entry`;
- `production.finish`;
- `order.approve`;
- `role.update`;
- `permission.manage`;
- `audit.view`.

Cada Server Action e rota sensível chama `requirePermission`.

Regra de prioridade:

1. usuário bloqueado: nega;
2. override individual `DENY`: nega;
3. override individual `GRANT`: permite;
4. permissão do cargo ativo: permite;
5. ausência: nega.

## Último administrador

O sistema bloqueia ações que removeriam o último acesso administrativo:

- bloquear o último administrador;
- remover cargo administrativo do último administrador;
- negar `permission.manage` ao último administrador;
- inativar cargo administrativo quando ele sustenta o último acesso.

## Auditoria

São auditados:

- login e logout;
- criação/bloqueio de usuários;
- criação, edição, duplicação e inativação de cargos;
- alteração de permissões de cargo;
- concessões e negações individuais;
- entradas, saídas e produção;
- pedidos e alterações de status;
- onboarding empresarial criado pela plataforma;
- seed inicial.

Credenciais, tokens, cookies e segredos nunca devem ser gravados em auditoria.

## Segredos

- `.env` é local e ignorado pelo Git.
- `.env.example` contém apenas estrutura.
- Logs não devem imprimir variáveis de ambiente completas.

## Verificações por entrega

- `pnpm quality`
- `pnpm build`
- `pnpm audit --prod`
- `pnpm exec prisma migrate status`
