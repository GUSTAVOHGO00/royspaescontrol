# Roy's Pães Control V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar uma PWA local, visual e testada para fechamento de pães, com importação assistida de PDF/foto, revisão humana e dashboard.

**Architecture:** React e TypeScript organizados por domínio. IndexedDB guarda rascunhos e fechamentos. PDF.js e Tesseract ficam atrás de adaptadores; o parser e o cálculo são funções puras testadas.

**Tech Stack:** Node 24, npm 11, React, TypeScript, Vite, Vitest, Testing Library, Dexie, PDF.js, Tesseract.js, Zod, Lucide e vite-plugin-pwa.

## Global Constraints

- Interface em português do Brasil, mobile-first e sem `user-scalable=no`.
- Paleta oficial Roy's: `#0767B1`, `#2789CA`, `#EA1F27`, `#FABB15`.
- Smart vale 0,5 e Super vale 1 equivalente de pão de 30 cm.
- OCR com confiança baixa sempre exige revisão.
- Nenhum endpoint público ou segredo será incluído no cliente.
- A V1 deve permanecer em `legacy-v1/`.
- A sincronização remota usará uma interface desativada até existir backend autenticado.

---

### Task 1: Base do projeto e preservação da V1

**Files:**
- Create: `legacy-v1/index.html`
- Create: `legacy-v1/roys-dashboard.html`
- Create: `legacy-v1/logo.png`
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/test/setup.ts`

**Interfaces:**
- Produces: aplicação React inicial, scripts `dev`, `test`, `build` e `typecheck`.

- [ ] **Step 1: Preservar os três arquivos atuais em `legacy-v1/`.**
- [ ] **Step 2: Criar a configuração Vite/TypeScript e dependências.**
- [ ] **Step 3: Criar teste de fumaça que espera o título “Fechamento de Pães”.**
- [ ] **Step 4: Executar `npm test -- --run`; esperado: teste aprovado.**
- [ ] **Step 5: Executar `npm run build`; esperado: `dist/` gerado.**
- [ ] **Step 6: Commitar com `chore: scaffold Roys bread control V2`.**

### Task 2: Domínio, catálogo e cálculo

**Files:**
- Create: `src/domain/catalog.ts`
- Create: `src/domain/closing.ts`
- Create: `src/domain/types.ts`
- Test: `src/domain/catalog.test.ts`
- Test: `src/domain/closing.test.ts`

**Interfaces:**
- Produces: `calculatePhysicalConsumption(counts)`, `calculateReconciliation(system, physical, tolerance)`, `findCatalogMatch(name)` e `CATALOG_VERSION`.

- [ ] **Step 1: Escrever testes para Smart 0,5, Super 1, fórmula física, tolerância e aliases de Almôndega.**
- [ ] **Step 2: Executar `npm test -- --run src/domain`; esperado: falha por módulos ausentes.**
- [ ] **Step 3: Implementar tipos imutáveis, catálogo oficial e aliases legados marcados.**
- [ ] **Step 4: Implementar cálculo sem arredondamento oculto e status `balanced`, `attention`, `critical`.**
- [ ] **Step 5: Executar os testes; esperado: todos aprovados.**
- [ ] **Step 6: Commitar com `feat: add versioned bread reconciliation domain`.**

### Task 3: Persistência local e máquina de etapas

**Files:**
- Create: `src/data/db.ts`
- Create: `src/data/closingRepository.ts`
- Create: `src/features/closing/closingMachine.ts`
- Test: `src/features/closing/closingMachine.test.ts`

**Interfaces:**
- Consumes: tipos de `src/domain/types.ts`.
- Produces: `createDraft()`, `saveDraft()`, `finalizeDraft()` e transições `identity -> physical -> report -> review -> result`.

- [ ] **Step 1: Escrever testes de transição, retomada e bloqueio de finalização duplicada.**
- [ ] **Step 2: Executar o teste; esperado: falha por implementação ausente.**
- [ ] **Step 3: Implementar repositório Dexie com esquema versionado e UUID.**
- [ ] **Step 4: Implementar máquina de etapas com validação Zod.**
- [ ] **Step 5: Executar testes; esperado: todos aprovados.**
- [ ] **Step 6: Commitar com `feat: persist closing drafts safely`.**

### Task 4: Experiência guiada da funcionária

**Files:**
- Create: `src/features/closing/ClosingWizard.tsx`
- Create: `src/features/closing/IdentityStep.tsx`
- Create: `src/features/closing/PhysicalCountStep.tsx`
- Create: `src/features/closing/ReportStep.tsx`
- Create: `src/features/closing/ReviewStep.tsx`
- Create: `src/features/closing/ResultStep.tsx`
- Create: `src/components/AppShell.tsx`
- Test: `src/features/closing/ClosingWizard.test.tsx`

**Interfaces:**
- Consumes: máquina de etapas, catálogo e repositório.
- Produces: fluxo completo com autosave e uma ação principal por tela.

- [ ] **Step 1: Escrever teste do caminho feliz até a revisão.**
- [ ] **Step 2: Executar teste; esperado: falha por componentes ausentes.**
- [ ] **Step 3: Implementar as cinco telas com validação contextual e retorno seguro.**
- [ ] **Step 4: Garantir labels associados, foco visível e alvos de toque de 44 px.**
- [ ] **Step 5: Executar testes; esperado: caminho feliz aprovado.**
- [ ] **Step 6: Commitar com `feat: add guided employee closing flow`.**

### Task 5: Parser de relatório e revisão por confiança

**Files:**
- Create: `src/import/normalize.ts`
- Create: `src/import/reportParser.ts`
- Create: `src/import/confidence.ts`
- Test: `src/import/reportParser.test.ts`

**Interfaces:**
- Consumes: `findCatalogMatch(name)`.
- Produces: `parseReportText(text): ParsedReport`, com itens, avisos, confiança e evidência.

- [ ] **Step 1: Criar fixtures textuais para relatório válido, Almôndega, preço extra, OCR imperfeito e resultado vazio.**
- [ ] **Step 2: Escrever testes que proíbem falso sucesso quando `items.length === 0`.**
- [ ] **Step 3: Executar testes; esperado: falha por parser ausente.**
- [ ] **Step 4: Implementar normalização, seções, aliases, heurística de colunas e confiança explicável.**
- [ ] **Step 5: Executar testes; esperado: fixtures aprovadas.**
- [ ] **Step 6: Commitar com `feat: add confidence based report parser`.**

### Task 6: PDF, foto e OCR assistido

**Files:**
- Create: `src/import/pdfExtractor.ts`
- Create: `src/import/imagePreprocessor.ts`
- Create: `src/import/ocrEngine.ts`
- Create: `src/features/closing/DocumentCapture.tsx`
- Test: `src/import/pdfExtractor.test.ts`
- Test: `src/import/imagePreprocessor.test.ts`

**Interfaces:**
- Produces: `extractDocument(file, onProgress): DocumentExtraction` com modo `pdf-text`, `pdf-ocr` ou `image-ocr`.

- [ ] **Step 1: Escrever testes de seleção de estratégia para PDF textual, PDF sem texto e imagem.**
- [ ] **Step 2: Executar testes; esperado: falha por extratores ausentes.**
- [ ] **Step 3: Implementar extração posicional de PDF e renderização de página sem camada de texto.**
- [ ] **Step 4: Implementar pré-processamento em canvas e worker Tesseract com cancelamento.**
- [ ] **Step 5: Exibir progresso, prévia, avisos de qualidade e fallback manual.**
- [ ] **Step 6: Executar testes e build; esperado: aprovação.**
- [ ] **Step 7: Commitar com `feat: add assisted PDF and photo recognition`.**

### Task 7: Dashboard, exportação e gamificação

**Files:**
- Create: `src/features/dashboard/Dashboard.tsx`
- Create: `src/features/dashboard/metrics.ts`
- Create: `src/features/history/History.tsx`
- Create: `src/features/export/exportCsv.ts`
- Create: `src/features/gamification/progress.ts`
- Test: `src/features/dashboard/metrics.test.ts`
- Test: `src/features/gamification/progress.test.ts`

**Interfaces:**
- Produces: métricas locais, filtros, CSV e pontos de qualidade do processo.

- [ ] **Step 1: Escrever testes para métricas, CSV e regra que não dá pontos por diferença zero.**
- [ ] **Step 2: Executar testes; esperado: falha por módulos ausentes.**
- [ ] **Step 3: Implementar dashboard responsivo, histórico e detalhe do fechamento.**
- [ ] **Step 4: Implementar progresso, sequência e medalhas de captura/revisão.**
- [ ] **Step 5: Executar testes; esperado: aprovação.**
- [ ] **Step 6: Commitar com `feat: add operational dashboard and healthy gamification`.**

### Task 8: Identidade, PWA e validação final

**Files:**
- Create: `src/styles/tokens.css`
- Create: `src/styles/global.css`
- Create: `public/icons/`
- Create: `public/manifest.webmanifest`
- Modify: `vite.config.ts`
- Create: `README.md`

**Interfaces:**
- Consumes: todos os módulos anteriores.
- Produces: PWA instalável e documentação de operação.

- [ ] **Step 1: Aplicar paleta oficial, linguagem visual Roy's e layouts mobile/desktop.**
- [ ] **Step 2: Configurar service worker, manifest e fallback offline.**
- [ ] **Step 3: Executar `npm run typecheck`; esperado: zero erros.**
- [ ] **Step 4: Executar `npm test -- --run`; esperado: todos os testes aprovados.**
- [ ] **Step 5: Executar `npm run build`; esperado: build de produção aprovado.**
- [ ] **Step 6: Validar manualmente 390×844 e 1440×900, fluxo por teclado e estado offline.**
- [ ] **Step 7: Documentar execução, limitações do OCR e como adicionar fixtures reais.**
- [ ] **Step 8: Commitar com `feat: complete installable Roys closing PWA`.**

## Self-review

- Cobertura: domínio, fluxo, persistência, importação, revisão, dashboard, gamificação, PWA e documentação estão mapeados.
- Segurança: nenhum endpoint público legado será reutilizado.
- Escopo: backend autenticado e benchmark de precisão permanecem fora do primeiro ciclo por dependerem de credenciais e documentos reais.
- Consistência: `ParsedReport`, `DocumentExtraction`, UUID e estados da máquina são as interfaces centrais compartilhadas.
