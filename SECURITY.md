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

