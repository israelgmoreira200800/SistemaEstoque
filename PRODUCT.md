# Produto

## Visão

O Sistema de Gestão de Estoque, Pedidos e Produção atende empresas que compram,
armazenam, transformam, montam, reservam, expedem ou comercializam itens. A
fábrica de slime é somente um cenário de validação; o domínio deve funcionar sem
customização obrigatória para outros segmentos.

## Problemas resolvidos

- Divergência entre saldo físico, reservado e disponível.
- Baixas manuais incorretas de matérias-primas e componentes.
- Falta de vínculo entre pedido, produção, consumo e expedição.
- Baixa rastreabilidade de perdas, ajustes e ações de usuários.
- Planilhas desconectadas e permissões excessivas.

## Escopo do MVP

- Autenticação e recuperação de acesso.
- Empresas, filiais, depósitos e setores.
- Usuários, cargos e permissões configuráveis.
- Itens, categorias, unidades de medida e conversões.
- Clientes e fornecedores.
- Entradas, saídas, reservas, ajustes, perdas e transferências.
- Pedidos e fluxo de status.
- Fichas técnicas e ordens de produção ou montagem.
- Consumo de componentes e entrada do produto resultante.
- Dashboard, alertas, relatórios e auditoria.

## Fora do MVP

- Emissão fiscal e integração contábil completa.
- Aplicativo móvel nativo.
- Previsões avançadas com inteligência artificial.
- Integrações obrigatórias com marketplaces ou ERPs.
- Planos, cobrança recorrente e painel administrativo SaaS.

## Perfis iniciais

Os perfis são modelos de configuração, não enumerações fixas no domínio.

| Perfil | Responsabilidade típica |
| --- | --- |
| Administrador principal | Configuração, usuários, cadastros e operação completa |
| Gestor | Indicadores, aprovações, relatórios e acompanhamento |
| Operador de pedidos | Clientes, pedidos, prazos e observações |
| Operador de produção | Execução de ordens e registro de perdas |
| Estoquista | Recebimento, inventário, transferência e expedição |
| Visualizador | Consulta somente aos recursos liberados |

Permissões seguem o formato `recurso.ação`, por exemplo `order.create`,
`stock.adjust`, `production.finish`, `cost.view` e `audit.view`.

## Conceitos do domínio

### Item

Entidade genérica que representa qualquer elemento controlado: matéria-prima,
embalagem, componente, intermediário, produto acabado, revenda ou consumo
interno. Cada item pertence a uma empresa e possui uma unidade principal de
estoque.

### Saldo

- **Físico:** quantidade registrada no depósito.
- **Reservado:** parte comprometida com um pedido ou finalidade.
- **Bloqueado:** parte indisponível por inspeção ou decisão operacional.
- **Disponível:** físico menos reservado e bloqueado.

### Ficha técnica

Versão configurável dos componentes e quantidades necessários para gerar um item.
Uma ordem de produção registra a versão efetivamente utilizada.

### Movimentação

Registro imutável que explica uma alteração de saldo. Recebimentos, expedições,
ajustes, perdas, transferências e produções geram movimentações identificáveis e
auditáveis.

## Fluxos essenciais

### Recebimento

1. Informar fornecedor, documento e quantidades esperadas.
2. Registrar quantidades aprovadas e recusadas com os motivos.
3. Adicionar somente a quantidade aprovada ao saldo.
4. Criar movimentação e auditoria na mesma operação.

### Pedido e reserva

1. Registrar cliente, itens, prazo e prioridade.
2. Verificar o estoque disponível.
3. Reservar o que estiver disponível sem reduzir o saldo físico.
4. Sinalizar necessidade de produção para faltas.
5. Na expedição, consumir a reserva e reduzir o saldo físico.

### Produção ou montagem

1. Criar a ordem com produto resultante, quantidade e ficha técnica versionada.
2. Calcular materiais e validar disponibilidade.
3. Informar produção aprovada, perdas e observações.
4. Em uma transação, consumir componentes, registrar perdas e adicionar o produto.
5. Atualizar vínculos com pedidos e registrar auditoria.

## Regras de negócio

| Código | Regra |
| --- | --- |
| RN-001 | Dados de uma empresa não podem ser acessados por outra. |
| RN-002 | SKU e código de barras, quando informados, são únicos por empresa. |
| RN-003 | Disponível é o saldo físico menos reservas e bloqueios. |
| RN-004 | Saídas não geram saldo negativo sem configuração e permissão especiais. |
| RN-005 | A produção registra a versão de ficha técnica utilizada. |
| RN-006 | Transferência gera saída e entrada na mesma transação. |
| RN-007 | Movimentações confirmadas não podem ser apagadas ou editadas. |
| RN-008 | Ajustes exigem motivo e responsável. |
| RN-009 | Itens inativos continuam no histórico e não recebem operações comuns. |
| RN-010 | Alterações críticas geram auditoria. |
| RN-011 | Reserva reduz apenas o saldo disponível. |
| RN-012 | Expedição consome a reserva e reduz o saldo físico. |
| RN-013 | Perdas possuem classificação e vínculo operacional quando aplicável. |
| RN-014 | A unidade do item define se a quantidade aceita frações. |
| RN-015 | Visualização de custos exige permissão específica. |

## Requisitos de experiência

- Interface responsiva, com temas claro e escuro.
- Complexidade progressiva conforme perfil e permissão.
- Busca por código, nome, pedido, lote ou documento.
- Poucos passos nas tarefas operacionais e confirmação de ações críticas.
- Filtros persistentes, exportação e mensagens de validação objetivas.
- Contraste, navegação por teclado e rótulos acessíveis.

## Critérios de aceite do MVP

- Usuários veem somente dados e ações permitidos.
- O isolamento entre empresas é comprovado por testes.
- Itens e unidades são independentes de segmento.
- Toda alteração de saldo atualiza saldo e histórico corretamente.
- Reservas apresentam o saldo disponível real.
- Fichas técnicas aceitam qualquer combinação de itens cadastrados.
- Produção consome componentes e gera resultado atomicamente.
- Perdas e ajustes registram motivo, usuário e auditoria.
- Dashboards usam dados reais e filtros funcionais.
- Regras críticas possuem testes automatizados.

