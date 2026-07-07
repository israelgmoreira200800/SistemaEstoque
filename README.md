# Sistema de Controle de Estoque e Produção

O Vertice e um sistema web de estoque, pedidos e producao em transformacao para
SaaS multiempresa. Cada cliente representa uma empresa independente, sem filiais
no escopo atual, com estoque principal unico e organizacao interna por usuarios,
setores, cargos e permissoes.

Vértice (c) 2026 - Desenvolvido por Israel Gomes Moreira.

O ambiente empresarial atual segue operacional. A base SaaS ja possui status de
empresa, trial, plano manual, assinaturas, limites, operadores da plataforma,
auditoria da plataforma, login separado em `/platform/login`, painel minimo em
`/platform` e onboarding transacional de empresas clientes.

## Estado atual

Implementado:

- login com sessão HTTP-only e bloqueio temporário por falhas;
- recuperacao de senha com token temporario e outbox local de e-mail;
- dashboard como primeira tela após login;
- cadastro de itens, unidades e categorias;
- entradas e saídas com atualização de estoque;
- ajuste e inventario por solicitacao, aprovacao e auditoria;
- histórico de movimentações;
- fichas técnicas simples;
- produção com baixa automática de componentes e entrada do produto acabado;
- pedidos simples com status;
- expedicao de pedido com baixa automatica de estoque e movimento vinculado;
- relatorios operacionais com exportacao CSV de estoque, movimentacoes, pedidos
  e producoes;
- usuários, setores operacionais, cargos e permissões granulares;
- convite de usuarios por link temporario, com aceite e definicao de senha;
- permissões individuais por usuário com concessão ou negação;
- auditoria para login, estoque, pedidos, produção, relatorios, usuários, cargos e permissões;
- proteção de backend em Server Actions e rotas;
- preparacao do dominio SaaS com empresas, planos manuais, assinaturas, limites
  e entidades de operadores da plataforma;
- autenticacao separada da plataforma com cookie, sessao e auditoria proprios;
- painel minimo da plataforma com visao geral, listagem, onboarding e ciclo de
  vida das empresas;
- criacao transacional de tenant, primeiro administrador, cargos padrao,
  setores, catalogo inicial, plano, assinatura, limites e auditoria;
- revisao de isolamento multiempresa em Server Actions, leituras relacionais e
  escritas empresariais;
- decremento atomico de saldo para saidas e consumo de producao, evitando saldo
  negativo em concorrencia;
- aplicacao runtime de assinatura ativa/trial e limites de usuarios/itens ativos;
- migration versionada e seed idempotente.

## Executar localmente

Pré-requisitos: Node.js 24, pnpm 11 e Docker.

```bash
pnpm install
docker compose up -d postgres
pnpm db:generate
pnpm db:deploy
pnpm db:seed
pnpm dev
```

Abra `http://localhost:3000`.

Mantenha `APP_URL="http://localhost:3000"` no `.env` local para que links de
recuperacao de senha e convite sejam gerados corretamente.

Para envio real de recuperacao de senha e convites, configure SMTP:

```env
SMTP_HOST="smtp.seudominio.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="usuario"
SMTP_PASSWORD="senha-ou-app-password"
SMTP_FROM="Vertice <no-reply@seudominio.com>"
SMTP_DELIVERY_TIMEOUT_MS="10000"
```

`SMTP_DELIVERY_TIMEOUT_MS` limita quanto tempo uma action espera pelo provedor
SMTP. Se o provedor nao responder, o e-mail fica marcado como `FAILED` no
outbox em vez de deixar o formulario carregando indefinidamente.

Sem SMTP configurado, as mensagens continuam registradas em `email_outbox` como
pendentes para inspeção operacional.

Os e-mails transacionais usam templates centralizados em `src/lib/email/templates.ts`.
O corpo texto continua salvo em `email_outbox.body`; quando houver HTML, ele fica em
`metadata.email.htmlBody` e e enviado pelo SMTP como alternativa visual. Em
desenvolvimento, visualize os modelos em:

```text
/api/dev/email-preview?template=reset-password
/api/dev/email-preview?template=invite-user
/api/dev/email-preview?template=company-created
/api/dev/email-preview?template=company-suspended
/api/dev/email-preview?template=company-reactivated
/api/dev/email-preview?template=stock-alert
/api/dev/email-preview?template=operational-notification
```

A rota de preview retorna 404 em producao.

Credenciais criadas pelo `.env` atual:

- e-mail: `admin@exemplo.com`
- senha: `Estoque@2026!`

Se `pnpm` falhar no Windows por Execution Policy, use `pnpm.cmd`.

## Verificações

```bash
pnpm quality
pnpm build
pnpm audit --prod
pnpm exec prisma migrate status
```

O endpoint `GET /api/health` verifica aplicação e conexão com o banco.

## Responsividade

A interface usa ajustes centralizados em `src/app/globals.css` para preservar o
desktop e melhorar o mobile. No celular, a navegacao do dashboard vira um drawer
com empresa, usuario, links completos e logout; tabelas usam cards responsivos
para evitar scroll horizontal global.

Ao revisar telas, confira principalmente as larguras `1440`, `1280`, `1024`,
`768`, `430`, `412`, `390` e `360px`. O `body`, `main`, `app-shell`,
`app-content` e `page-body` nao devem estourar a largura da viewport; se uma
tabela muito grande precisar rolar, o scroll deve ficar dentro de `.data-table`.

## Perfis iniciais

O seed cria perfis editáveis, não fixos:

- Administrador;
- Gerente;
- Pedidos;
- Produção;
- Estoque;
- Expedição;
- Visualizador.

O administrador pode criar novos cargos, duplicar cargos existentes, alterar
permissões e definir permissões individuais por usuário.

## Fluxos principais

Estoque:

```text
Login → Dashboard → Itens → Entradas/Saídas/Ajustes → Estoque atualizado → Histórico
```

Produção:

```text
Produto → Ficha técnica → Quantidade produzida → Componentes necessários
→ Confirmar produção → Baixa dos componentes → Entrada do produto acabado
```

Expedicao:

```text
Pedido → Expedir → Baixa automatica do estoque → Movimento SHIPMENT → Pedido enviado
```

Relatorios:

```text
Relatorios → Indicadores operacionais → Exportacao CSV autorizada → Auditoria
```

Permissões:

```text
Usuários → Cargos → Permissões do cargo → Overrides individuais → Auditoria
```

## Documentação

- [PRODUCT.md](PRODUCT.md): visão e escopo original.
- [ARCHITECTURE.md](ARCHITECTURE.md): arquitetura modular.
- [DATABASE.md](DATABASE.md): modelo relacional atual.
- [SECURITY.md](SECURITY.md): autenticação, autorização e auditoria.
- [PROGRESS.md](PROGRESS.md): progresso, decisões e validações.

## Princípios inegociáveis

1. Permissões são verificadas no backend.
2. Esconder botão não é controle de segurança.
3. Usuário bloqueado não acessa o sistema.
4. Negações individuais vencem concessões e permissões herdadas.
5. O último administrador não pode perder acesso administrativo.
6. Toda alteração relevante gera auditoria.
7. Toda movimentação de estoque atualiza saldo e cria histórico.
8. Produção consome componentes e gera produto acabado na mesma transação.
9. Saidas e consumo de producao dependem de decremento atomico com saldo suficiente.
10. Assinaturas e limites de uso sao aplicados no backend.
11. Tokens de recuperacao e convite sao persistidos apenas como hash.
12. Convites ativam usuario somente apos senha definida e limite de usuarios validado.
13. Ajustes e inventario so alteram saldo apos aprovacao autorizada.
14. Expedicao de pedido baixa estoque e registra movimento na mesma transacao.
15. Exportacoes de relatorios exigem permissao no backend e usam somente dados
    da empresa autenticada.

## Atualizacao de producao e ficha tecnica

- A ficha tecnica agora e gerenciada no detalhe do item/produto, por usuarios com
  permissoes `bom.create`, `bom.update` e `bom.inactivate`.
- O operador de producao informa apenas produto, quantidade, perdas, lote e
  observacao; a composicao vem sempre do banco.
- A finalizacao de producao busca componentes ativos da empresa autenticada,
  valida saldo disponivel, consome componentes e adiciona o produto acabado na
  mesma transacao.
- A tela de producao mostra os componentes apenas para conferencia e nao envia
  lista manual de consumo.
