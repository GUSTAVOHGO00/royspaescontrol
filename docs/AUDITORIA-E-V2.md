# Auditoria do controle de pães e decisões da V2

## Diagnóstico da versão anterior

A V1 concentrava interface, regras e integração em arquivos HTML extensos. Os principais riscos encontrados foram:

- leitura simulada ou frágil de foto/PDF, sem evidência por item e sem confiança útil;
- possibilidade de seguir mesmo quando nenhum item confiável era reconhecido;
- endpoint público e escrita remota sem autenticação adequada;
- ausência de rascunho, retomada e tratamento recuperável de falhas;
- dados agregados insuficientes para reconstruir um fechamento;
- regras e listas de produtos duplicadas em vários pontos;
- interface desktop adaptada, com muito texto e pouca orientação visual;
- indicadores de sequência/XP calculados sem base temporal real.

A cópia byte a byte da V1 foi preservada em `legacy-v1/`.

## Cardápio oficial V5 usado pelo OCR

| Item | Família |
| --- | --- |
| Steak | Chef |
| Almôndega | Chef |
| Rosbife | Chef |
| Camarão com Cream Cheese | Chef |
| Carne Seca com Cream Cheese | Chef |
| Choripán | Chef |
| Frango | Clássico |
| Frango com Cream Cheese | Clássico |
| Frango Crispy King | Clássico |
| Frango Crispy Royal | Clássico |
| Smash Blend | Clássico |

Regras de pão:

- Smart (15 cm): `0,5` pão de 30 cm;
- Super (30 cm): `1` pão de 30 cm;
- Combo Smart: `0,5`;
- Combo Super: `1`.

O “Integrador padrão” permanece disponível somente na entrada manual, marcado como item a confirmar. Os demais nomes antigos ficam no catálogo legado, mas não são tratados como cardápio oficial V5.

## Fluxo operacional da V2

1. Identificação da responsável, unidade, data local de São Paulo e turno.
2. Contagem de abertura, assados, desperdícios, cortesias e sobra em 30 cm/15 cm.
3. Foto, imagem ou PDF, com opção manual sem esconder o caminho alternativo.
4. Revisão dos itens detectados: produto, categoria/tamanho, quantidade, linha original e confiança.
5. Comparação final e justificativa obrigatória quando existir diferença.

O rascunho é salvo automaticamente no IndexedDB e pode ser retomado. A finalização usa um identificador estável, não duplica com clique rápido e não sobrescreve um fechamento já criado.

## Pipeline de foto e PDF

- imagens passam por limite de tamanho, dimensão mínima, escala, tons de cinza e contraste;
- OCR Tesseract em português é empacotado localmente e incluído no precache da PWA;
- PDF com camada de texto usa extração posicional;
- PDF misto decide por página: páginas sem texto suficiente passam por OCR;
- no máximo oito páginas escaneadas passam por OCR, com aviso explícito sobre páginas excedentes;
- confiança do Tesseract e confiança estrutural do parser são combinadas;
- nenhum arquivo libera a etapa seguinte sem itens e confirmação humana;
- baixa confiança não é tratada como sucesso automático: a lista inteira fica editável.

## Integridade e auditoria

Cada registro final guarda:

- contagens completas por movimento e tamanho;
- totais do relatório;
- itens extraídos, quantidades, categorias, confiança, avisos e linha de evidência;
- arquivo original (foto/PDF);
- justificativa;
- versão do catálogo (`V5`) e revisão (`1`);
- consumo físico, venda no sistema, diferença e status.

Regra:

```text
consumo físico = abertura + assados - desperdícios - cortesias - sobra
diferença = venda no sistema - consumo físico
```

Somente diferença zero fica balanceada. Até `0,5` fica em atenção. Acima de `0,5` fica crítica. Toda diferença exige explicação antes de finalizar.

## Limites conscientes desta entrega

- os dados permanecem locais ao aparelho; sincronização entre unidades precisa de uma API autenticada;
- a precisão real do OCR ainda deve ser medida com fotos e PDFs anonimizados usados nas lojas;
- a auditoria completa de dependências passa com zero vulnerabilidades conhecidas; os overrides do Workbox são validados por testes e build.
