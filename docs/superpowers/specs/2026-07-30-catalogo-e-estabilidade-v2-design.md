# Roy's Controle de Pães V2 - Catálogo operacional e estabilidade

Data: 30 de julho de 2026  
Status: aprovado pelo responsável da Roy's

## Objetivo

Corrigir dois problemas encontrados no teste operacional:

1. a aplicação local está sendo executada pelo servidor de desenvolvimento do
   Vite, que recarrega a página quando detecta alterações;
2. promoções Roy's Essencial e Ofertas Especiais existem como conceitos
   operacionais diferentes, mas não estão disponíveis na entrada manual nem no
   parser OCR/PDF da V2.

## Autoridade dos dados

- Os subs e combos regulares continuam usando o cardápio V5 oficial.
- Roy's Essencial é uma categoria promocional própria.
- Ofertas Especiais é outra categoria e não pode ser agregada à Roy's Essencial.
- As equivalências operacionais abaixo vêm da V1 preservada e foram confirmadas
  pelo responsável da Roy's nesta revisão.

## Catálogo operacional

### Categorias regulares

| Item operacional | Equivalente por unidade |
|---|---:|
| Sub Smart | 0,5 pão |
| Sub Super | 1 pão |
| Combo Smart | 0,5 pão |
| Combo Super | 1 pão |
| Integrador Padrão | 0,5 pão |

### Promoções - Roy's Essencial

| Item | Equivalente por unidade |
|---|---:|
| Roy's Essencial 1 | 0,5 pão |
| Roy's Essencial 2 | 1 pão |

### Ofertas Especiais

| Item | Equivalente por unidade |
|---|---:|
| Double Smash | 1 pão |
| Crispy Lover | 1 pão |
| Trio Mix | 1,5 pão |
| Big King | 2 pães |
| Mega Mix | 2 pães |

## Arquitetura

Uma única fonte de dados operacional deve descrever:

- identificador estável;
- nome exibido;
- seção do relatório;
- aliases usados pelo OCR;
- fator de pão;
- situação vigente ou legada.

A entrada manual, o parser OCR/PDF, a revisão dos itens, o cálculo do total e a
exportação devem consumir essa mesma fonte. Nenhuma dessas camadas poderá manter
uma lista paralela de fatores.

## Interface

A entrada manual será dividida visualmente em três grupos:

1. vendas regulares;
2. promoções Roy's Essencial;
3. Ofertas Especiais.

Cada linha mostrará nome, quantidade e equivalente por unidade. Itens com fator
1,5 ou 2 não serão reduzidos artificialmente a Smart ou Super.

Na revisão do OCR, o item terá uma seleção pelo produto operacional, e não apenas
uma seleção genérica de tamanho. A seção de origem e o fator aplicado ficarão
visíveis.

## OCR e PDF

O parser reconhecerá cabeçalhos distintos:

- `PROMOÇÕES` e `ROY'S ESSENCIAL`;
- `OFERTAS ROY'S` e `OFERTAS ESPECIAIS`;
- seções regulares de Smart, Super e combos.

Dentro de Roy's Essencial, somente os itens Essencial 1 e 2 serão aceitos. Dentro
de Ofertas, serão aceitos Double Smash, Crispy Lover, Trio Mix, Big King e Mega
Mix. Um item fora da seção esperada será sinalizado para revisão, sem receber
fator silenciosamente.

O fallback manual continuará disponível.

## Estabilidade local

O atalho Windows deixará de iniciar `vite dev`. Ele deverá:

1. garantir que o build de produção exista;
2. iniciar o servidor de prévia em porta fixa e com modo estrito;
3. aguardar uma resposta HTTP válida;
4. abrir o endereço local no navegador.

Isso elimina recargas por Hot Module Replacement durante o teste. O rascunho
continua salvo no IndexedDB para proteger o trabalho contra fechamento da aba,
queda do navegador ou atualização externa.

## Tratamento de erros

- Porta ocupada pelo próprio app: reutilizar a instância saudável.
- Porta ocupada por outro programa: exibir erro claro em vez de abrir endereço
  incorreto.
- Build ausente ou inválido: não abrir a aplicação e orientar a executar a
  preparação.
- Produto desconhecido no relatório: manter evidência e exigir classificação
  humana.
- Item conhecido em seção incompatível: sinalizar divergência.

## Testes de aceitação

- Roy's Essencial e Ofertas aparecem em blocos separados.
- Essencial 1 soma 0,5 e Essencial 2 soma 1.
- Trio Mix soma 1,5.
- Big King e Mega Mix somam 2 por unidade.
- O total combina corretamente fatores 0,5, 1, 1,5 e 2.
- O OCR respeita a seção de cada item.
- Um item de oferta não é classificado como Roy's Essencial.
- O fechamento em andamento reaparece após recarregar a página.
- O atalho executa a versão de produção sem recarga automática.
- Toda a suíte existente continua aprovada.

## Fora do escopo

- Criar novas promoções.
- Alterar preços comerciais.
- Declarar ofertas históricas como vigentes fora do controle interno.
- Sincronização entre unidades ou backend remoto.
