# Roy's Pães Control V2 — Design aprovado

## Objetivo

Reconstruir o controle de fechamento de pães como uma PWA visual, rápida e confiável para uso diário pelas funcionárias da Roy's. A V2 deve reduzir digitação, impedir falso sucesso de OCR, funcionar no celular e no Windows, preservar rascunhos e transformar divergências em um fluxo de conferência claro.

## Princípios

- Pouca burocracia: uma ação principal por etapa e preenchimento automático sempre que seguro.
- Nenhuma leitura duvidosa é aceita silenciosamente.
- Gamificar a qualidade do processo, nunca a ausência de divergência.
- O cálculo físico representa consumo/venda teórica em equivalentes de pão, não “estoque manual”.
- Smart equivale a 0,5 pão de 30 cm; Super equivale a 1 pão de 30 cm.
- O catálogo oficial e os aliases internos do PDV são dados separados e versionados.
- A versão atual permanece preservada em `legacy-v1/`.

## Usuários e fluxo

### Funcionária

1. Inicia o fechamento.
2. Confirma data, turno, unidade e responsável.
3. Informa abertura, produção, desperdício, cortesia e sobra final.
4. Importa PDF ou foto, ou lança o relatório manualmente.
5. Revisa somente itens incertos ou não reconhecidos.
6. Confirma a conciliação.
7. Justifica divergência quando necessário.
8. Finaliza uma única vez.

### Supervisão

- Consulta histórico, divergências, desperdícios e qualidade das leituras.
- Exporta dados.
- Visualiza o documento de origem quando anexado.
- Corrige registros sem apagar a versão anterior.

## Arquitetura

A aplicação será React + TypeScript + Vite, instalável como PWA. O domínio ficará isolado da interface e terá testes unitários. Dados locais serão persistidos em IndexedDB com Dexie. Importação de PDF usará PDF.js; páginas sem camada de texto serão renderizadas e encaminhadas ao OCR. OCR de imagem usará Tesseract em um adaptador substituível.

O envio remoto ficará atrás da interface `SyncGateway`. A primeira entrega local não reutilizará a URL pública e insegura do Google Apps Script. A sincronização real será ativada somente com endpoint autenticado e escrita idempotente.

## Módulos

- `catalog`: cardápio vigente, aliases do PDV e fatores de pão.
- `closing`: fórmula física, tolerâncias, status e validações.
- `import`: extração de PDF, preparação de imagem e OCR.
- `review`: confiança, pendências e correções humanas.
- `storage`: rascunhos, fechamentos, anexos e fila de sincronização.
- `dashboard`: indicadores locais, filtros e exportação.
- `gamification`: progresso, sequência e medalhas de processo.

## Cálculo

`consumoFisico = abertura + produzidos - desperdicios - cortesias - sobraFinal`

`diferenca = vendaSistema - consumoFisico`

O resultado exibirá o sinal, a magnitude, a explicação e a tolerância. A tolerância inicial será configurável e começará em 0,5 equivalente de pão.

## Catálogo oficial inicial

Subs Chef: Steak, Almôndega, Rosbife, Camarão com Cream Cheese, Carne Seca com Cream Cheese e Choripán.

Subs Clássicos: Frango, Frango com Cream Cheese, Frango Crispy King, Frango Crispy Royal e Smash Blend.

Tamanhos: Smart 15 cm e Super 30 cm. Combos preservam o fator do tamanho do sub.

Saladas e itens sem pão permanecem no catálogo, mas têm fator de pão zero e não entram na conciliação.

Aliases internos legados — Integrador Padrão, Roy's Essencial 1/2, Double Smash, Crispy Lover, Trio Mix, Big King e Mega Mix — ficam marcados como “a confirmar no PDV”, separados dos itens públicos.

## OCR e PDF

- Foto: validação de dimensões, pré-processamento, OCR e confiança.
- PDF textual: reconstrução de linhas por posição.
- PDF escaneado: renderização de página e OCR.
- Parser: normalização, reconhecimento de seção, aliases e correspondência aproximada.
- Revisão: cada item mostra origem, quantidade, fator, confiança e motivo de alerta.
- Resultado zero ou confiança baixa nunca produz mensagem de sucesso.
- O arquivo original fica associado ao rascunho local.

## Experiência visual

- Paleta oficial: azul `#0767B1`, azul claro `#2789CA`, vermelho `#EA1F27` e amarelo `#FABB15`.
- Fundo claro quente, blocos de cor fortes e tipografia condensada para títulos.
- Navegação mobile-first em etapas curtas.
- Alvos de toque com no mínimo 44 px, zoom permitido e estados de foco visíveis.
- Fotografias oficiais aparecem apenas como apoio de marca, sem atrapalhar a operação.
- Linguagem acolhedora e objetiva; alertas explicam como corrigir.

## Gamificação

- Barra de progresso do fechamento.
- Pontos por conclusão, revisão de pendências e justificativa válida.
- Sequência de fechamentos completos.
- Medalhas de treinamento e qualidade de captura.
- Nenhum ponto por “zerar diferença”.

## Segurança e integridade

- Um fechamento recebe UUID e só é finalizado uma vez.
- Salvamento do rascunho é automático.
- Registros finalizados são imutáveis localmente; correções geram revisão.
- A sincronização futura exige autenticação, `POST`, validação no servidor e chave idempotente.
- Conteúdo de usuário nunca é interpolado como HTML.
- Erros de persistência e importação geram mensagens recuperáveis.

## Entrega local

A V2 será criada em `C:\Users\user\Downloads\Roys-brand\roys-paes-control-v2`, na branch local `codex/v2-rebuild`. A versão antiga será preservada em `legacy-v1/`. O build de produção e os testes devem executar localmente antes de qualquer publicação.

## Critérios de aceite

- Criar, salvar, retomar e finalizar um fechamento.
- Calcular corretamente equivalentes de pão e divergência.
- Importar PDF textual e encaminhar PDF escaneado ao OCR.
- Importar foto e exibir confiança e revisão.
- Nunca confirmar sucesso quando nenhum item for reconhecido.
- Reconhecer Almôndega e todos os subs oficiais.
- Permitir lançamento manual como fallback rápido.
- Exibir histórico e indicadores locais.
- Instalar como PWA e funcionar sem conexão após o primeiro carregamento.
- Testes unitários e build de produção aprovados.

## Fora do primeiro ciclo

- Publicação remota sem permissão GitHub.
- Ativação de backend sem credenciais e política de acesso aprovadas.
- Alegação de precisão de OCR sem conjunto real de fotos e PDFs rotulados.
