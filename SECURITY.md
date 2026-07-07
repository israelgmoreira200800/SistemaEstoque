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
- Recuperacao de senha e convite usam tokens opacos, armazenados apenas como
  hash SHA-256, com expiracao e uso unico.
- Redefinicao de senha revoga sessoes empresariais existentes do usuario.
- Empresas `TRIAL` e `ACTIVE` permitem acesso empresarial.
- Assinaturas conhecidas com status diferente de `TRIALING` ou `ACTIVE` tambem
  bloqueiam login e sessao empresarial.
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
- `stock.adjust`;
- `stock.adjust_approve`;
- `production.finish`;
- `order.approve`;
- `shipment.dispatch`;
- `report.view`;
- `report.export`;
- `role.update`;
- `permission.manage`;
- `audit.view`.

Cada Server Action e rota sensível chama `requirePermission`.

As rotas empresariais usam a empresa da sessao autenticada. Leituras, escritas e
relacoes sensiveis de catalogo, usuarios, estoque, producao e pedidos incluem
`companyId` ou validam os itens relacionados pela mesma empresa.

Saidas de estoque e consumo de producao reduzem saldo por decremento atomico
condicionado a saldo suficiente, evitando saldo negativo em operacoes
concorrentes.

Ajustes e inventario usam fluxo de solicitacao e aprovacao: `stock.adjust` ou
`stock.inventory` cria pendencia, e somente `stock.adjust_approve` aplica a
diferenca no saldo.

Expedicao usa `shipment.dispatch` e baixa estoque dentro da mesma transacao que
marca o pedido como enviado.

Relatorios usam `report.view` para leitura e `report.export` para CSV. O endpoint
de exportacao filtra por empresa da sessao e registra auditoria.

Criacao e reativacao de usuarios/itens ativos consultam `usage_limits` dentro
da mesma transacao da alteracao. Quando o limite estiver atingido, a Server
Action retorna erro e nao grava o novo recurso.

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

O guardiao do ultimo administrador valida o usuario alvo junto da empresa
esperada antes de decidir se a permissao administrativa seria perdida.

## Auditoria

São auditados:

- login e logout;
- criação/bloqueio de usuários;
- criação, edição, duplicação e inativação de cargos;
- alteração de permissões de cargo;
- concessões e negações individuais;
- entradas, saídas e produção;
- solicitacao, aprovacao e rejeicao de ajuste/inventario;
- expedicao de pedido com baixa de estoque;
- exportacao de relatorios;
- pedidos e alterações de status;
- onboarding empresarial criado pela plataforma;
- recuperacao de senha solicitada/concluida;
- convite de usuario criado, reenviado e aceito;
- seed inicial.

Credenciais, tokens, cookies e segredos nunca devem ser gravados em auditoria.

## Ficha tecnica e producao

- Permissoes `bom.view`, `bom.create`, `bom.update` e `bom.inactivate` separam a
  gestao da ficha tecnica da operacao de producao.
- Operadores de producao podem visualizar os componentes necessarios, mas nao
  criar, editar ou remover componentes sem permissao `bom.*`.
- Server Actions de producao rejeitam campos extras, incluindo listas manuais de
  componentes, e o backend recalcula o consumo a partir do banco.
- A baixa dos componentes usa saldo disponivel e acontece na mesma transacao da
  entrada do produto acabado e da auditoria.

## Segredos

- `.env` é local e ignorado pelo Git.
- `.env.example` contém apenas estrutura.
- Logs não devem imprimir variáveis de ambiente completas.
- Tokens crus de recuperacao e convite nao devem aparecer em auditoria ou logs.
- `email_outbox` pode conter o corpo de entrega enquanto nao houver SMTP real;
  trate esse conteudo como dado sensivel.
- Templates HTML de e-mail ficam em `metadata.email.htmlBody` quando gerados;
  trate esse conteudo com o mesmo cuidado do corpo texto, pois links de acao
  podem conter tokens temporarios.

## Verificações por entrega

- `pnpm quality`
- `pnpm build`
- `pnpm audit --prod`
- `pnpm exec prisma migrate status`
