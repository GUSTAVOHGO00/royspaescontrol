# Roy's Controle de Pães V2 - Fechamento imutável e painel administrativo

Data: 30 de julho de 2026
Status: direção funcional e visual aprovada

## Objetivo

Separar claramente a operação das funcionárias da administração:

- a funcionária registra, revisa e finaliza um fechamento;
- o fechamento finalizado torna-se definitivo para a funcionária;
- somente um administrador autenticado pode criar uma correção;
- o administrador acompanha os resultados mês a mês em um dashboard;
- o registro original nunca é alterado ou apagado.

Esta especificação complementa
`2026-07-30-catalogo-e-estabilidade-v2-design.md`.

## Perfis

### Funcionária

Pode:

- iniciar e retomar um rascunho;
- informar contagens;
- importar foto ou PDF;
- revisar e corrigir os dados antes da finalização;
- justificar divergências;
- consultar a confirmação do fechamento recém-finalizado.

Não pode:

- editar um fechamento finalizado;
- criar correção;
- excluir registros;
- acessar o dashboard administrativo;
- configurar ou redefinir a senha administrativa.

### Administrador

Após autenticação, pode:

- consultar o dashboard;
- filtrar fechamentos;
- abrir documentos e evidências;
- criar uma correção versionada;
- exportar dados;
- encerrar a própria sessão administrativa.

O administrador não pode alterar nem excluir o registro original.

## Revisão e finalização

O título da etapa 4 será:

> REVISE O FECHAMENTO

A etapa mostrará consumo físico, venda no sistema, diferença, contagens,
itens do relatório e justificativa. O texto "Está tudo bem explicado" será
removido.

Ao tocar em `Finalizar fechamento`, a aplicação abrirá uma confirmação:

> Confira atentamente todas as informações. Depois de finalizar, este
> fechamento será definitivo para a equipe e somente um administrador poderá
> criar uma correção. Deseja finalizar?

Ações:

- `Voltar e revisar`;
- `Sim, finalizar definitivamente`.

O botão de confirmação terá ação única e bloqueio contra clique duplo.

## Imutabilidade e correções

Um fechamento finalizado é um evento imutável.

Uma correção administrativa:

- recebe novo identificador;
- mantém o identificador do original em `correctsId`;
- incrementa a revisão;
- registra data e hora;
- registra que a origem foi administrativa;
- preserva o original;
- aparece vinculada ao original no histórico e no dashboard.

Nenhum botão de correção será exibido no fluxo da funcionária.

## Autenticação administrativa local

Nesta fase, a autenticação será local e operacional.

Requisitos:

- senha criada na primeira configuração administrativa;
- senha nunca armazenada em texto simples;
- derivação com Web Crypto, PBKDF2, salt aleatório e número alto de iterações;
- comparação do hash derivado;
- cinco tentativas incorretas causam bloqueio temporário;
- sessão expira após 15 minutos sem atividade;
- botão explícito para sair;
- nenhuma senha padrão ou senha escrita no repositório.

Limitação conhecida:

Se os dados do navegador forem apagados, a configuração local pode ser perdida.
Autenticação forte entre aparelhos exige backend com usuários e papéis e não
faz parte desta etapa.

## Dashboard administrativo

### Estrutura aprovada

- cabeçalho compacto com logo oficial;
- navegação: Visão geral, Fechamentos e Auditoria;
- filtro de mês;
- filtro de unidade e turno;
- indicadores mensais;
- gráfico de conferência manual versus sistema;
- fila de atenção;
- últimos fechamentos;
- desempenho por unidade;
- detalhes e correções versionadas.

Não usar:

- moldura genérica externa;
- barra lateral vazia;
- elementos circulares como principal linguagem dos gráficos;
- números fictícios no produto final;
- seleção automática de um dia no gráfico.

### Indicadores mensais

- total de fechamentos;
- quantidade e percentual com diferença exatamente zero;
- quantidade com diferença positiva;
- quantidade com diferença negativa;
- divergências críticas;
- equivalente de pão desperdiçado;
- correções administrativas;
- fechamentos ausentes, quando a frequência esperada puder ser determinada.

Todos os indicadores serão calculados a partir dos registros salvos.

## Gráfico de conferência

Título:

> CONFERÊNCIA MANUAL × SISTEMA

Mensagem:

> O fechamento correto fica no centro: diferença exatamente 0,0.

Semântica:

- verde no centro: diferença `0,0`, manual e sistema bateram;
- azul para cima: diferença positiva;
- vermelho para baixo: diferença negativa;
- qualquer valor diferente de zero continua sendo um fechamento que não bateu.

Representação:

- colunas retangulares e estreitas;
- fechamento correto usa pequeno bloco verde sobre a linha zero;
- diferença positiva usa barra azul saindo do zero;
- diferença negativa usa barra vermelha saindo do zero;
- nenhuma bola ou marcador circular;
- nenhum dia selecionado ao abrir.

Interação:

- clique em uma coluna abre o detalhe;
- segundo clique na mesma coluna fecha;
- clique fora fecha;
- tecla `Esc` fecha;
- foco e acionamento por teclado;
- tooltip mostra data, unidade, turno, manual, sistema e diferença;
- a mensagem informa se bateu ou se o sistema ficou acima ou abaixo da
  conferência manual.

## Dados e filtros

O dashboard agrupa os fechamentos pelo fuso `America/Sao_Paulo`.

Filtros:

- mês e ano;
- unidade;
- turno;
- status;
- responsável;
- original ou correção.

O gráfico usa os registros correspondentes aos filtros. Dias sem registro não
podem ser mostrados como se tivessem diferença zero.

## Estados da interface

O dashboard deve prever:

- carregamento;
- mês sem fechamentos;
- filtro sem resultados;
- erro de armazenamento;
- sessão expirada;
- senha incorreta;
- bloqueio temporário;
- fechamento original;
- correção administrativa vinculada;
- documento original indisponível após migração.

## Responsividade e acessibilidade

- sem rolagem horizontal em 375, 768, 1024 ou 1440 pixels;
- navegação por teclado;
- foco visível;
- cores acompanhadas de texto e posição;
- contraste compatível com WCAG AA;
- tabelas adaptadas para telas pequenas;
- preferência por movimento reduzido respeitada;
- gráficos acompanhados de valores no tooltip e resumo textual.

## Testes de aceitação

- o texto ambíguo não existe mais;
- a confirmação definitiva aparece antes do salvamento;
- cancelar retorna à revisão sem perder dados;
- confirmar cria um registro e remove o rascunho;
- a funcionária não encontra ação de correção;
- o administrador não acessa o painel sem senha;
- senha correta cria sessão temporária;
- cinco erros ativam bloqueio;
- sessão expira;
- correção cria nova revisão e preserva o original;
- nenhum gráfico começa com seleção;
- zero é verde no centro;
- positivo é azul para cima;
- negativo é vermelho para baixo;
- clique e teclado abrem e fecham o tooltip;
- dias ausentes não são tratados como zero;
- filtros mensais usam apenas dados reais;
- a suíte anterior continua aprovada.

## Fora do escopo

- exclusão de fechamento;
- edição direta do original;
- sincronização entre dispositivos;
- recuperação remota de senha;
- login em nuvem;
- metas comerciais inventadas;
- comparação entre unidades sem dados suficientes.
