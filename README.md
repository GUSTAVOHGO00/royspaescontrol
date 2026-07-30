# Roy's — Fechamento de Pães V2

PWA mobile-first para conciliar consumo físico de pães e vendas, com OCR/PDF revisável, rascunho automático e histórico local auditável.

## Rodar

```powershell
npm.cmd install
npm.cmd run dev
```

## Verificar

```powershell
npm.cmd run typecheck
npm.cmd test -- --run
npm.cmd run build
npm.cmd audit --omit=dev
```

## Regra operacional

```text
consumo físico = abertura + assados - desperdícios - cortesias - sobra final
diferença = venda no sistema - consumo físico
```

Smart vale 0,5 pão; Super vale 1 pão. Somente zero é balanceado, até 0,5 exige atenção e acima de 0,5 é crítico. Toda diferença exige explicação.

## O que a V2 entrega

- PWA responsiva com identidade visual Roy's;
- foto, imagem e PDF textual, escaneado ou misto;
- OCR português empacotado para uso offline após instalar/carregar a PWA;
- revisão editável e confirmação humana obrigatória dos itens importados;
- catálogo oficial V5 como fonte única do parser;
- autosave e retomada de rascunho pelo IndexedDB;
- fechamento imutável/idempotente com contagens, evidências OCR, justificativa e arquivo original;
- histórico detalhado e exportação CSV;
- V1 preservada byte a byte em `legacy-v1/`.

A auditoria, o cardápio completo e as decisões estão em [`docs/AUDITORIA-E-V2.md`](docs/AUDITORIA-E-V2.md).

## Segurança e próximos passos

Os dados ficam no aparelho nesta etapa. A antiga URL pública de Apps Script não é usada. Sincronização entre unidades só deve ser ativada com API autenticada, autorização por unidade e escrita idempotente.

A auditoria completa de dependências passa com zero vulnerabilidades conhecidas. Overrides controlados mantêm corrigida a cadeia transitiva do Workbox, e build e testes validam essa combinação.