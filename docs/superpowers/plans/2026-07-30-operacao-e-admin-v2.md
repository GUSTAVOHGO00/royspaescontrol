# Roy's Operação e Admin V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar um fluxo estável e testável desde o lançamento do fechamento pela funcionária até a autenticação e o dashboard do administrador.

**Architecture:** O catálogo operacional será a fonte única para entrada manual, OCR e cálculo. Fechamentos originais serão imutáveis; correções serão novas revisões criadas apenas dentro de uma sessão administrativa. O dashboard calculará métricas reais dos registros efetivos e usará um gráfico React/CSS centrado em diferença zero.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Testing Library, Dexie/IndexedDB, Web Crypto e CSS responsivo.

## Global Constraints

- Diferença é `venda no sistema - consumo físico`.
- Somente diferença exatamente `0` é fechamento correto.
- Smart vale `0,5` pão e Super vale `1` pão.
- Roy's Essencial e Ofertas Especiais são seções diferentes.
- O original nunca é editado ou excluído.
- Correção administrativa cria uma nova revisão.
- Senha não pode existir em texto simples nem no repositório.
- Dashboard não pode usar dados demonstrativos no app real.
- Gráfico: zero verde, positivo azul, negativo vermelho.
- Nenhuma coluna começa selecionada.
- O app local de teste deve usar build/preview, não HMR.

---

### Task 1: Catálogo operacional único

**Files:**
- Create: `src/domain/operationalCatalog.ts`
- Modify: `src/domain/catalog.ts`
- Modify: `src/App.tsx`
- Test: `src/domain/operationalCatalog.test.ts`

**Interfaces:**
- Produces: `OPERATIONAL_REPORT_GROUPS`, `OPERATIONAL_REPORT_ITEMS`, `findOperationalItem(id)`, `calculateReportEquivalent(report)`.
- Consumes: fatores confirmados na especificação de catálogo.

- [ ] **Step 1: Write the failing catalog tests**

```ts
it("keeps Roy's Essencial separate from offers", () => {
  expect(OPERATIONAL_REPORT_GROUPS.find(group => group.id === "essential")?.items)
    .toEqual(["essential-1", "essential-2"])
  expect(OPERATIONAL_REPORT_GROUPS.find(group => group.id === "offers")?.items)
    .toEqual(["double-smash", "crispy-lover", "trio-mix", "big-king", "mega-mix"])
})

it("calculates factors 0.5, 1, 1.5 and 2", () => {
  expect(calculateReportEquivalent({
    "essential-1": 2,
    "trio-mix": 1,
    "big-king": 1,
  })).toBe(4.5)
})
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm.cmd test -- --run src/domain/operationalCatalog.test.ts`

Expected: FAIL because `operationalCatalog.ts` does not exist.

- [ ] **Step 3: Implement the source of truth**

```ts
export type OperationalSection = "regular" | "essential" | "offers"

export interface OperationalReportItem {
  id: string
  label: string
  section: OperationalSection
  breadFactor: number
  aliases: readonly string[]
}

export const OPERATIONAL_REPORT_ITEMS = [
  { id: "smart", label: "Subs Smart", section: "regular", breadFactor: 0.5, aliases: ["SANDUICHE SMART"] },
  { id: "super", label: "Subs Super", section: "regular", breadFactor: 1, aliases: ["SANDUICHE SUPER"] },
  { id: "combo-smart", label: "Combos Smart", section: "regular", breadFactor: 0.5, aliases: ["COMBOS SMART"] },
  { id: "combo-super", label: "Combos Super", section: "regular", breadFactor: 1, aliases: ["COMBOS SUPER"] },
  { id: "integrator", label: "Integrador Padrão", section: "regular", breadFactor: 0.5, aliases: ["INTEGRADOR PADRAO"] },
  { id: "essential-1", label: "Roy's Essencial 1", section: "essential", breadFactor: 0.5, aliases: ["ROYS ESSENCIAL 1", "ESSENCIAL 1"] },
  { id: "essential-2", label: "Roy's Essencial 2", section: "essential", breadFactor: 1, aliases: ["ROYS ESSENCIAL 2", "ESSENCIAL 2"] },
  { id: "double-smash", label: "Double Smash", section: "offers", breadFactor: 1, aliases: ["DOUBLE SMASH"] },
  { id: "crispy-lover", label: "Crispy Lover", section: "offers", breadFactor: 1, aliases: ["CRISPY LOVER"] },
  { id: "trio-mix", label: "Trio Mix", section: "offers", breadFactor: 1.5, aliases: ["TRIO MIX"] },
  { id: "big-king", label: "Big King", section: "offers", breadFactor: 2, aliases: ["BIG KING"] },
  { id: "mega-mix", label: "Mega Mix", section: "offers", breadFactor: 2, aliases: ["MEGA MIX"] },
] as const
```

- [ ] **Step 4: Derive the manual fields and total from the catalog**

Replace `REPORT_FIELDS` and the manual total reducer in `App.tsx` with imports from `operationalCatalog.ts`.

- [ ] **Step 5: Run focused and existing domain tests**

Run: `npm.cmd test -- --run src/domain/operationalCatalog.test.ts src/domain/catalog.test.ts src/domain/closing.test.ts`

Expected: PASS.

### Task 2: OCR/PDF aware of Essential and Offers

**Files:**
- Modify: `src/import/reportParser.ts`
- Modify: `src/App.tsx`
- Test: `src/import/reportParser.test.ts`
- Test: `src/import/reportParser.currency.test.ts`

**Interfaces:**
- Consumes: `OPERATIONAL_REPORT_ITEMS`.
- Produces: `ParsedReportItem.category` using operational item IDs and per-item factors.

- [ ] **Step 1: Add failing parser fixtures**

```ts
it("parses Essential and Offers as different sections", () => {
  const result = parseReport(`
4. PROMOCOES
Roy's Essencial 1 2 25,90 51,80
7. OFERTAS ROYS
Trio Mix 1 59,90 59,90
Big King 2 69,90 139,80
`)
  expect(result.items.map(item => [item.category, item.breadEquivalent])).toEqual([
    ["essential-1", 1],
    ["trio-mix", 1.5],
    ["big-king", 4],
  ])
})
```

- [ ] **Step 2: Run parser test and verify RED**

Run: `npm.cmd test -- --run src/import/reportParser.test.ts`

Expected: FAIL because special sections are ignored.

- [ ] **Step 3: Implement section-aware matching**

Add `ReportSection = ReportCategory | "essential" | "offers"`, recognize headers `PROMOCOES`, `ROYS ESSENCIAL`, `OFERTAS ROYS` and `OFERTAS ESPECIAIS`, match special aliases only against their expected section, and preserve rejected evidence when a known item appears in the wrong section.

- [ ] **Step 4: Make review selection item-based**

Render `OPERATIONAL_REPORT_ITEMS` in the correction select. Updating the selected item must update label, factor and equivalent, then clear human confirmation.

- [ ] **Step 5: Run parser and app tests**

Run: `npm.cmd test -- --run src/import/reportParser.test.ts src/import/reportParser.currency.test.ts src/App.test.tsx`

Expected: PASS.

### Task 3: Definitive employee finalization

**Files:**
- Create: `src/features/closing/FinalConfirmation.tsx`
- Create: `src/features/closing/FinalConfirmation.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/data/models.ts`
- Modify: `src/data/closingRepository.ts`
- Test: `src/App.test.tsx`

**Interfaces:**
- Produces: `FinalConfirmation({ open, saving, onCancel, onConfirm })`.
- Adds: `StoredClosing.createdByRole: "employee" | "admin"`.

- [ ] **Step 1: Write failing confirmation tests**

```tsx
it("does not finalize before definitive confirmation", async () => {
  fireEvent.click(screen.getByRole("button", { name: /finalizar fechamento/i }))
  expect(screen.getByRole("dialog", { name: /finalizar definitivamente/i })).toBeVisible()
  expect(await closingRepository.list()).toHaveLength(before)
  fireEvent.click(screen.getByRole("button", { name: /sim, finalizar definitivamente/i }))
  await waitFor(async () => expect(await closingRepository.list()).toHaveLength(before + 1))
})
```

- [ ] **Step 2: Run the app test and verify RED**

Run: `npm.cmd test -- --run src/App.test.tsx`

Expected: FAIL because the dialog does not exist.

- [ ] **Step 3: Implement the dialog and copy**

Use title `REVISE O FECHAMENTO`, remove `Está tudo bem explicado`, open the dialog before `finalize()`, and expose `Voltar e revisar` plus `Sim, finalizar definitivamente`.

- [ ] **Step 4: Remove employee correction actions**

Delete `Criar correção` from the employee history. Keep `startCorrection` private to the future admin screen.

- [ ] **Step 5: Verify idempotence and immutability**

Run: `npm.cmd test -- --run src/App.test.tsx src/data/closingRepository.audit.test.ts`

Expected: PASS and only one record after repeated confirmation.

### Task 4: Local administrator authentication

**Files:**
- Create: `src/features/admin/adminAuth.ts`
- Create: `src/features/admin/adminAuth.test.ts`
- Create: `src/features/admin/AdminAccess.tsx`
- Create: `src/features/admin/AdminAccess.test.tsx`
- Create: `src/features/admin/admin.css`

**Interfaces:**
- Produces: `hasAdminPassword()`, `configureAdminPassword(password)`, `authenticateAdmin(password)`, `getAdminSession()`, `endAdminSession()`.

- [ ] **Step 1: Write failing crypto and lockout tests**

```ts
it("stores only a derived hash and locks after five failures", async () => {
  await configureAdminPassword("senha-segura")
  expect(localStorage.getItem("roys-admin-auth")).not.toContain("senha-segura")
  for (let attempt = 0; attempt < 5; attempt++) {
    await authenticateAdmin("errada")
  }
  await expect(authenticateAdmin("senha-segura")).resolves.toMatchObject({ ok: false, reason: "locked" })
})
```

- [ ] **Step 2: Run auth tests and verify RED**

Run: `npm.cmd test -- --run src/features/admin/adminAuth.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement PBKDF2 and local session**

Use `crypto.subtle.importKey`, `deriveBits` with PBKDF2/SHA-256, a random 16-byte salt, 210000 iterations, five-attempt lockout for five minutes, and a session expiry 15 minutes after authentication.

- [ ] **Step 4: Build setup/login UI**

First use asks for password and confirmation. Later use asks only for password. Show remaining lock time and never echo stored values.

- [ ] **Step 5: Run auth tests**

Run: `npm.cmd test -- --run src/features/admin/adminAuth.test.ts src/features/admin/AdminAccess.test.tsx`

Expected: PASS.

### Task 5: Real monthly admin metrics and chart

**Files:**
- Create: `src/features/admin/adminMetrics.ts`
- Create: `src/features/admin/adminMetrics.test.ts`
- Create: `src/features/admin/ReconciliationChart.tsx`
- Create: `src/features/admin/ReconciliationChart.test.tsx`
- Create: `src/features/admin/AdminDashboard.tsx`
- Modify: `src/features/admin/admin.css`

**Interfaces:**
- Produces: `effectiveClosings(records)`, `filterClosings(records, filters)`, `monthlyMetrics(records)`, `dailyWorstSeries(records)`.

- [ ] **Step 1: Write failing metric tests**

```ts
it("replaces an original with its latest correction without deleting it", () => {
  const effective = effectiveClosings([original, correction1, correction2])
  expect(effective).toEqual([correction2])
})

it("counts only exact zero as matched", () => {
  expect(monthlyMetrics([balanced, positive, negative])).toMatchObject({
    total: 3, matched: 1, positive: 1, negative: 1,
  })
})
```

- [ ] **Step 2: Run metric tests and verify RED**

Run: `npm.cmd test -- --run src/features/admin/adminMetrics.test.ts`

Expected: FAIL because metric functions do not exist.

- [ ] **Step 3: Implement effective records and filters**

Corrections supersede their original only for aggregate metrics. Both versions remain available in audit details.

- [ ] **Step 4: Write failing chart interaction tests**

```tsx
it("starts with no selection and applies the approved colors", () => {
  render(<ReconciliationChart records={[zero, positive, negative]} />)
  expect(screen.queryByRole("status")).not.toBeVisible()
  expect(screen.getByLabelText(/diferença 0/i)).toHaveClass("matched")
  expect(screen.getByLabelText(/diferença positiva/i)).toHaveClass("positive")
  expect(screen.getByLabelText(/diferença negativa/i)).toHaveClass("negative")
})
```

- [ ] **Step 5: Implement chart and dashboard**

Use rectangular CSS columns: zero green at center, positive blue upward and negative red downward. Do not preselect. Click toggles tooltip; outside click and `Esc` close. Dashboard uses only repository records and exposes month, unit and shift filters.

- [ ] **Step 6: Run admin tests**

Run: `npm.cmd test -- --run src/features/admin`

Expected: PASS.

### Task 6: App integration and admin-only corrections

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/styles/global.css`
- Modify: `src/data/models.ts`
- Test: `src/App.test.tsx`

**Interfaces:**
- Consumes: `AdminAccess`, `AdminDashboard`, `startCorrection`.

- [ ] **Step 1: Add failing end-to-end component tests**

Test that the home exposes `Área administrativa`, setup/login gates the dashboard, employee history has no correction action, and an authenticated admin can start a versioned correction.

- [ ] **Step 2: Run app test and verify RED**

Run: `npm.cmd test -- --run src/App.test.tsx`

Expected: FAIL because admin screens are not routed.

- [ ] **Step 3: Integrate admin states**

Extend `Step` with `admin-access` and `admin-dashboard`. Successful authentication opens `AdminDashboard`; logout returns home. Starting a correction exits the dashboard and enters identity with a new closing ID and incremented revision.

- [ ] **Step 4: Verify full component flow**

Run: `npm.cmd test -- --run src/App.test.tsx src/features/admin`

Expected: PASS.

### Task 7: Stable local runtime and final verification

**Files:**
- Modify: `package.json`
- Modify: `ABRIR-ROYS-V2.cmd`
- Modify: `.gitignore`
- Modify: `README.md`

- [ ] **Step 1: Add stable preview script**

```json
"preview": "vite preview"
```

- [ ] **Step 2: Replace launcher behavior**

The launcher runs `npm.cmd run build`, starts `npm.cmd run preview -- --host 127.0.0.1 --port 4173 --strictPort`, waits for HTTP 200 and opens the URL. It never invokes `npm run dev`.

- [ ] **Step 3: Ignore visual-companion artifacts**

Add `.superpowers/` to `.gitignore`.

- [ ] **Step 4: Run complete verification**

Run:

```powershell
npm.cmd run typecheck
npm.cmd test -- --run
npm.cmd run build
npm.cmd audit
git diff --check
```

Expected: all checks pass and audit reports zero vulnerabilities.

- [ ] **Step 5: Launch and browser-check**

Start preview at `http://127.0.0.1:4173/`, verify the employee flow, definitive confirmation, admin setup/login, dashboard filters, zero/positive/negative chart interaction, correction creation, 375/768/1024/1440 widths and no console errors.

- [ ] **Step 6: Commit and push**

Stage only product files, commit with `feat: add immutable closings and admin dashboard`, push `codex/v2-rebuild`, and confirm the GitHub PR build succeeds.
