# Sistema de Controle de Estoque e Produção

Sistema web para uso dentro de uma única empresa, com controle de itens, entradas,
saídas, produção, pedidos, histórico, usuários, cargos e permissões granulares.

O MVP evita filial, regional e multiempresa na experiência do usuário. Por baixo,
existe uma tabela `companies` apenas como raiz da instalação e escopo interno de
dados/auditoria.

## Estado atual

Implementado:

- login com sessão HTTP-only e bloqueio temporário por falhas;
- dashboard como primeira tela após login;
- cadastro de itens, unidades e categorias;
- entradas e saídas com atualização de estoque;
- histórico de movimentações;
- fichas técnicas simples;
- produção com baixa automática de componentes e entrada do produto acabado;
- pedidos simples com status;
- usuários, setores operacionais, cargos e permissões granulares;
- permissões individuais por usuário com concessão ou negação;
- auditoria para login, estoque, pedidos, produção, usuários, cargos e permissões;
- proteção de backend em Server Actions e rotas;
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
Login → Dashboard → Itens → Entradas/Saídas → Estoque atualizado → Histórico
```

Produção:

```text
Produto → Ficha técnica → Quantidade produzida → Componentes necessários
→ Confirmar produção → Baixa dos componentes → Entrada do produto acabado
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

