# Resumo: OpenSpec - Curso Completo de Spec-Driven Development

Fonte: `openspec-course.tmp.html#m1`

## Ideia central

O curso apresenta o OpenSpec como uma forma de trabalhar com agentes de IA por meio de specs versionadas, revisadas e mantidas junto ao codigo. A proposta e substituir o "vibe coding" puro, baseado apenas em conversa e prompts soltos, por um fluxo em que humano e IA concordam sobre requisitos antes da implementacao.

O principio principal e: alinhar antes de construir. Em vez de deixar decisoes importantes perdidas no historico do chat, o projeto passa a ter uma fonte de verdade em arquivos de spec no Git.

## Modulo 1: Fundamentos de Spec-Driven Development

### Problema: vibe coding

O "vibe coding" e o uso direto de prompts em linguagem natural para pedir que uma IA gere codigo, seguido por ajustes sucessivos em conversa. Ele funciona para tarefas simples, mas tende a falhar em projetos maiores.

Principais problemas:

- Perda de contexto quando a conversa cresce.
- Requisitos ficam presos no chat, sem versionamento ou busca adequada.
- Regressoes silenciosas por falta de uma referencia estavel.
- Alucinacoes causadas por ambiguidade.
- Dificuldade de colaboracao entre humanos e agentes de IA.

### O que e SDD

Spec-Driven Development (SDD) e uma metodologia em que requisitos estruturados sao escritos, revisados e aceitos antes da geracao de codigo.

A spec nao precisa ser um documento longo e burocratico. No contexto do OpenSpec, ela e um artefato leve, legivel por humanos e por agentes, versionado no repositorio.

SDD com IA nao e waterfall. O fluxo continua iterativo: escreve-se uma spec minima, implementa-se, aprende-se com o resultado e refina-se a spec conforme o projeto evolui.

### Greenfield vs. brownfield

Muitas ferramentas assumem projetos greenfield, comecando do zero. O OpenSpec foca primeiro em projetos brownfield, ou seja, codebases existentes com padroes, dividas tecnicas e decisoes ja tomadas.

Para isso, usa o conceito de delta specs: specs que descrevem o que muda em relacao ao estado atual, sem exigir a reescrita da especificacao completa do sistema.

### Onde o OpenSpec se encaixa

O OpenSpec e apresentado como uma ferramenta leve e universal para aplicar SDD com diferentes agentes de IA.

Ele se destaca por:

- Suportar multiplos agentes.
- Ter setup rapido.
- Manter specs no Git junto ao codigo.
- Permitir iteracao sem phase gates rigidos.
- Funcionar bem em projetos existentes.

## Visao geral dos demais modulos

### Modulo 2: Ambiente e instalacao

Explica os pre-requisitos, principalmente Node.js 20.19.0 ou superior, e a instalacao do pacote `@fission-ai/openspec`.

Mostra o comando `openspec init`, que cria a estrutura `openspec/` no repositorio, incluindo:

- `specs/`: fonte de verdade sobre o estado atual do sistema.
- `changes/`: mudancas propostas.
- `archive/`: historico de mudancas ja concluidas.
- `config/`: configuracoes do OpenSpec.
- `AGENTS.md`: instrucoes para agentes de IA trabalharem no projeto.

O `AGENTS.md` e tratado como um arquivo essencial, pois permite que qualquer agente que leia Markdown siga o workflow do OpenSpec.

### Modulo 3: Workflow core

Apresenta o ciclo principal:

1. `explore`: investigar o codigo e reduzir ambiguidade.
2. `propose`: gerar artefatos de planejamento.
3. `apply`: implementar tarefa por tarefa.
4. `archive`: incorporar os delta specs na biblioteca principal.

O curso reforca que `explore` deve ser usado quando o problema ainda esta nebuloso. Se a mudanca ja esta clara, o fluxo pode comecar em `propose`.

Tambem ha um exercicio pratico com dark mode para experimentar o ciclo completo.

### Modulo 4: Escrevendo boas specs

Este e apontado como o modulo mais importante. A qualidade das specs determina a qualidade do resultado gerado pela IA.

Boas specs devem:

- Descrever comportamento esperado, nao pseudocodigo.
- Usar cenarios `WHEN/THEN` para deixar entradas e saidas claras.
- Diferenciar obrigatoriedade com `SHALL`, `MUST`, `SHOULD` e `MAY`.
- Cobrir condicoes de contorno, como inputs invalidos, falhas de rede, dados ausentes e concorrencia.
- Declarar non-goals para evitar aumento indevido de escopo.
- Usar delta specs em projetos existentes.

### Modulo 5: Workflow expandido

Apresenta comandos avancados para fluxos com mais controle:

- `/opsx:new`: cria a estrutura de um change sem gerar todos os artefatos.
- `/opsx:continue`: avanca artefato por artefato.
- `/opsx:ff`: gera todos os artefatos de planejamento de uma vez.
- `/opsx:verify`: compara implementacao com specs apos o apply.
- `/opsx:sync`: mescla delta specs na biblioteca principal sem arquivar.
- `/opsx:bulk-archive`: arquiva varios changes concluidos.
- `/opsx:onboard`: tutorial guiado do workflow.

O workflow expandido nao substitui o core; ele entra quando o projeto precisa de mais granularidade.

### Modulo 6: Specs como source of truth

Defende que `openspec/specs/` deve ser a fonte de verdade do projeto.

As specs vivem no Git, passam por diff, review e Pull Request como o codigo. Isso permite revisar nao apenas a implementacao, mas tambem a mudanca nos requisitos.

Regras importantes:

- Nao deixar requisitos importantes apenas no chat.
- Atualizar specs sempre que uma decisao de produto ou comportamento mudar.
- Organizar specs por capability para facilitar leitura por humanos e agentes.
- Usar a biblioteca de specs como documentacao viva e onboarding do projeto.

## Resumo pratico

O OpenSpec ajuda a transformar conversas com IA em artefatos persistentes de engenharia. A ideia nao e criar burocracia, mas reduzir ambiguidade antes da implementacao, preservar decisoes no Git e permitir que humanos e agentes trabalhem com uma referencia comum.

O valor principal aparece em projetos reais e existentes, onde contexto, historico e consistencia importam tanto quanto gerar codigo rapidamente.
