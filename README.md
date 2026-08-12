# Roy's — Controle de Pães V2

Aplicativo operacional para lançar e conferir o fechamento de pães, importar foto/PDF com revisão humana e acompanhar os resultados em uma área administrativa protegida.

## Abrir para testar

Dê dois cliques em `ABRIR-ROYS-V2.cmd`.

O inicializador:

1. gera uma versão de produção;
2. encerra somente um servidor anterior deste mesmo projeto;
3. inicia o app estável em `http://127.0.0.1:4173/`;
4. abre o navegador.

Ele não usa o servidor de desenvolvimento/HMR, evitando reinícios durante o teste.

## Fluxo da funcionária

- identificação, data, turno e unidade;
- contagem física de abertura, produção, desperdício, cortesia e sobra;
- foto, imagem ou PDF, com OCR e revisão dos itens;
- lançamento manual dividido entre cardápio regular, Roy's Essential e ofertas especiais;
- tela `REVISE O FECHAMENTO`;
- confirmação final explícita;
- fechamento definitivo e sem edição pela funcionária.

## Catálogo operacional

- Cardápio regular: Smart (0,5), Super (1), Combo Smart (0,5), Combo Super (1) e Integrador (0,5).
- Roy's Essential: Essential 1 (0,5) e Essential 2 (1).
- Ofertas especiais: Double Smash (1), Crispy Lover (1), Trio Mix (1,5), Big King (2) e Mega Mix (2).

Os valores entre parênteses são equivalentes de pão por unidade.

## Área administrativa

- senha definida no primeiro acesso;
- hash derivado com PBKDF2/SHA-256, salt aleatório e sem senha em texto simples;
- bloqueio de cinco minutos após cinco erros;
- sessão local de 15 minutos;
- dashboard por mês, unidade e turno;
- indicadores calculados apenas com registros reais;
- gráfico: zero verde, positivo azul e negativo vermelho;
- clique na barra mostra manual, sistema e diferença;
- correção administrativa cria nova revisão e preserva o original.

Nesta etapa, dados e senha ficam no navegador deste aparelho. Limpar os dados do navegador remove a configuração local. Sincronização segura entre aparelhos exige backend autenticado em uma fase futura.

## Desenvolvimento e verificação

```powershell
npm.cmd install
npm.cmd run typecheck
npm.cmd test -- --run
npm.cmd run build
npm.cmd run preview -- --host 127.0.0.1 --port 4173 --strictPort
```

Regra:

```text
consumo físico = abertura + assados - desperdícios - cortesias - sobra final
diferença = venda no sistema - consumo físico
```

Somente diferença exatamente zero significa que a conferência manual bateu com o sistema.
