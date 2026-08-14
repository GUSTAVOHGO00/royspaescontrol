# Roy's Store Access and Auditable Closing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publicar uma V2 segura em que cada loja usa uma credencial compartilhada, seleciona o funcionário responsável, envia um fechamento imutável e recebe um resultado com justificativa proporcional à divergência.

**Architecture:** O React/Vite será dividido em cascas `/loja` e `/admin`, ambas autenticadas pelo Supabase Auth. O banco aplica RLS e funções SQL para gravar o fechamento, calcular o resultado no servidor e anexar justificativas sem permitir edição dos números; uma Edge Function com service role gerencia contas de loja somente após validar o administrador.

**Tech Stack:** React 19, TypeScript 7, Vite 7, Vitest, Testing Library, Dexie somente para rascunhos, Supabase Auth/Postgres/Storage/Edge Functions, Vercel, vite-plugin-pwa.

## Global Constraints

- A conta administrativa principal usa `comercial@roys.com.br`; nenhuma senha entra no código ou no Git.
- Cada unidade possui no máximo uma credencial compartilhada ativa, com login sem e-mail visível.
- Contas de loja acessam somente a própria unidade e nunca leem histórico, métricas ou documentos antigos.
- O resultado aparece somente depois que os números foram persistidos de forma imutável.
- Toda divergência diferente de zero exige motivo e justificativa.
- Níveis: zero correto; acima de zero até 2 pequeno; acima de 2 até 5 atenção; acima de 5 até 10 relevante; acima de 10 crítico.
- O servidor calcula físico, sistema, diferença, status e nível; o navegador não é fonte confiável desses campos.
- `submitted_at` e `justified_at` são horários do servidor; a apresentação usa `America/Sao_Paulo`.
- O original nunca é atualizado ou apagado; correção administrativa cria nova revisão vinculada.
- A chave `service_role` nunca é enviada ao navegador nem incluída em variável `VITE_*`.
- O cardápio preserva `regular`, `essential` e `offers`, com os fatores atuais de 0,5, 1, 1,5 e 2.
- A experiência operacional deve funcionar em 375, 390 e 430 px, tablet e desktop.

## File Map

- `src/lib/supabase.ts`: cliente público único e validação das variáveis de ambiente.
- `src/auth/username.ts`: normalização do login e identidade técnica invisível.
- `src/auth/authService.ts`: login de loja, login administrativo, logout e recuperação.
- `src/auth/AuthProvider.tsx`: sessão, perfil, unidade e guardas de papel.
- `src/routing/appRoute.ts`: resolução testável de `/loja`, `/admin` e recuperação.
- `src/features/store/StoreLogin.tsx`: tela enxuta de login da unidade.
- `src/features/store/EmployeePicker.tsx`: seleção e cadastro de funcionário da unidade.
- `src/features/store/StoreClosingApp.tsx`: orquestra o fechamento operacional autenticado.
- `src/features/store/ClosingResult.tsx`: resultado bloqueado, justificativa e protocolo.
- `src/features/admin/AdminAccess.tsx`: login Supabase e recuperação por e-mail.
- `src/features/admin/AccessManagement.tsx`: unidades, credenciais e funcionários.
- `src/features/admin/AdminDashboard.tsx`: dados remotos, alertas e performance.
- `src/data/draftRepository.ts`: rascunho local, sem histórico definitivo.
- `src/data/cloudClosingRepository.ts`: RPCs, upload privado e consultas administrativas.
- `src/data/unitRepository.ts`: unidades, funcionários e invocação da Edge Function.
- `src/domain/alerts.ts`: classificação e textos em português.
- `supabase/migrations/202608110001_store_access_and_auditable_closings.sql`: tabelas, funções, gatilhos, RLS e bucket.
- `supabase/functions/admin-store-users/index.ts`: criar, redefinir e bloquear credenciais.
- `vercel.json`: fallback SPA para rotas diretas.
- `scripts/install-store-shortcut.ps1`: cria atalho para a URL oficial `/loja`.

---

### Task 1: Supabase client, route resolver and username identity

**Files:**
- Modify: `package.json`
- Create: `.env.example`
- Create: `src/lib/supabase.ts`
- Create: `src/auth/username.ts`
- Create: `src/auth/username.test.ts`
- Create: `src/routing/appRoute.ts`
- Create: `src/routing/appRoute.test.ts`
- Modify: `src/main.tsx`

**Interfaces:**
- Produces: `normalizeStoreUsername(value: string): string`
- Produces: `storeUsernameToEmail(username: string): string`
- Produces: `resolveAppRoute(pathname: string): "store" | "admin" | "recovery"`
- Produces: `supabase: SupabaseClient`

- [ ] **Step 1: Install the public client and write failing unit tests**

```ts
import { describe, expect, it } from "vitest";
import { normalizeStoreUsername, storeUsernameToEmail } from "./username";

describe("store username", () => {
  it("normalizes the administrator supplied login", () => {
    expect(normalizeStoreUsername("  ROYS.Ilha  ")).toBe("roys.ilha");
  });

  it("rejects spaces and short values", () => {
    expect(() => normalizeStoreUsername("ab")).toThrow(/3 caracteres/i);
    expect(() => normalizeStoreUsername("roys ilha")).toThrow(/letras, números/i);
  });

  it("creates the invisible auth identity", () => {
    expect(storeUsernameToEmail("roys.ilha")).toBe("roys.ilha@lojas.roys.internal");
  });
});
```

```ts
import { describe, expect, it } from "vitest";
import { resolveAppRoute } from "./appRoute";

it.each([
  ["/", "store"],
  ["/loja", "store"],
  ["/admin", "admin"],
  ["/recuperar-senha", "recovery"],
] as const)("maps %s to %s", (path, expected) => {
  expect(resolveAppRoute(path)).toBe(expected);
});
```

- [ ] **Step 2: Run the tests and verify RED**

Run: `npm.cmd test -- src/auth/username.test.ts src/routing/appRoute.test.ts --run`

Expected: FAIL because both modules are absent.

- [ ] **Step 3: Add `@supabase/supabase-js` and implement the pure interfaces**

```ts
const USERNAME_PATTERN = /^[a-z0-9._-]{3,32}$/;

export function normalizeStoreUsername(value: string): string {
  const normalized = value.trim().toLocaleLowerCase("pt-BR");
  if (normalized.length < 3) throw new Error("O login precisa ter pelo menos 3 caracteres.");
  if (!USERNAME_PATTERN.test(normalized)) {
    throw new Error("Use somente letras, números, ponto, hífen ou sublinhado.");
  }
  return normalized;
}

export function storeUsernameToEmail(value: string): string {
  return `${normalizeStoreUsername(value)}@lojas.roys.internal`;
}
```

```ts
export type AppRoute = "store" | "admin" | "recovery";

export function resolveAppRoute(pathname: string): AppRoute {
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/recuperar-senha")) return "recovery";
  return "store";
}
```

Create `src/lib/supabase.ts` with `createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)` and throw a visible configuration error when either value is absent. Add only those two public names to `.env.example`.

- [ ] **Step 4: Run focused tests, typecheck and commit**

Run: `npm.cmd test -- src/auth/username.test.ts src/routing/appRoute.test.ts --run`

Expected: PASS.

Run: `npm.cmd run typecheck`

Expected: exit 0.

Commit: `git commit -m "feat: add Supabase client and app routes"`

---

### Task 2: Database model, authoritative calculations and RLS

**Files:**
- Create: `supabase/migrations/202608110001_store_access_and_auditable_closings.sql`
- Create: `supabase/tests/store_access_and_closings.sql`
- Modify: `src/data/models.ts`

**Interfaces:**
- Produces tables: `roys_units`, `roys_profiles`, `roys_employees`, `roys_catalog_items`, `roys_closings`, `roys_closing_justifications`, `roys_audit_events`
- Produces RPC: `submit_store_closing(payload jsonb) returns jsonb`
- Produces RPC: `justify_store_closing(closing_id uuid, reason_code text, explanation text) returns jsonb`
- Produces RPC: `create_admin_correction(original_id uuid, payload jsonb) returns uuid`

- [ ] **Step 1: Write transactional SQL assertions first**

The SQL test must create one admin and two store identities inside a transaction, set JWT claims with `set_config('request.jwt.claims', ...)`, and assert:

```sql
select plan(12);
select is(public.roys_alert_level(0), 'correct', 'zero is correct');
select is(public.roys_alert_level(2), 'small', 'two is small');
select is(public.roys_alert_level(2.5), 'attention', 'above two is attention');
select is(public.roys_alert_level(7), 'relevant', 'seven is relevant');
select is(public.roys_alert_level(11), 'critical', 'eleven is critical');
select throws_ok(
  $$ update public.roys_closings set business_date = current_date $$,
  'P0001', 'Fechamentos originais são imutáveis.'
);
select * from finish();
rollback;
```

The remaining assertions cover: store A cannot use unit B; store cannot select closings; duplicate idempotency returns the same protocol; zero closes without justification; nonzero remains `awaiting_justification`; justification cannot change counts; admin correction creates revision 2.

- [ ] **Step 2: Run the SQL test and verify RED**

Run against the linked development project using the Supabase SQL runner.

Expected: FAIL because tables/functions do not exist.

- [ ] **Step 3: Create the migration with exact catalog factors and immutable records**

Seed `roys_catalog_items` with:

```sql
insert into public.roys_catalog_items (code, label, section, bread_factor) values
('smart', 'Subs Smart', 'regular', 0.5),
('super', 'Subs Super', 'regular', 1),
('combo-smart', 'Combos Smart', 'regular', 0.5),
('combo-super', 'Combos Super', 'regular', 1),
('integrator', 'Integrador Padrão', 'regular', 0.5),
('essential-1', 'Roy''s Essential 1', 'essential', 0.5),
('essential-2', 'Roy''s Essential 2', 'essential', 1),
('double-smash', 'Double Smash', 'offers', 1),
('crispy-lover', 'Crispy Lover', 'offers', 1),
('trio-mix', 'Trio Mix', 'offers', 1.5),
('big-king', 'Big King', 'offers', 2),
('mega-mix', 'Mega Mix', 'offers', 2)
on conflict (code) do update set label = excluded.label, section = excluded.section, bread_factor = excluded.bread_factor;
```

Implement `roys_alert_level(abs_difference numeric)` with the exact global thresholds. `submit_store_closing` must derive the caller's `unit_id` from `auth.uid()`, validate the selected active employee belongs to that unit, calculate physical movement from `counts`, calculate system total from `report × roys_catalog_items.bread_factor`, insert once by `idempotency_key`, and return only:

```json
{
  "closingId": "uuid",
  "protocol": "ROY-20260811-ABC123",
  "difference": -3.5,
  "alertLevel": "attention",
  "submissionState": "awaiting_justification",
  "submittedAt": "2026-08-11T22:10:00Z"
}
```

Create `roys_closing_justifications` as a one-to-one append-only table. `justify_store_closing` verifies the caller submitted the closing, requires a listed reason, rejects blank text, requires at least 30 trimmed characters for `relevant` and `critical`, and returns the final receipt.

Enable RLS on every public table. Store profiles can select their own profile and unit, select/insert active employees in their own unit, and execute only the two store RPCs. They have no `SELECT`, `UPDATE`, or `DELETE` permission on closings. Admin profiles can read all operational tables. Revoke table grants from `anon`.

- [ ] **Step 4: Apply migration, run SQL assertions and security advisors**

Expected: 12 SQL assertions pass; no missing-RLS or exposed-service-role findings. Add indexes for every foreign key reported by the advisor.

- [ ] **Step 5: Update TypeScript models and commit**

Add `Employee`, `StoreProfile`, `AlertLevel`, `ClosingReceipt`, `ReasonCode`, `RemoteClosing`, `submittedAt`, `justifiedAt`, `protocol`, and `employeeId`. Preserve legacy `StoredClosing` only for migration tests.

Commit: `git commit -m "feat: add auditable Supabase closing schema"`

---

### Task 3: Secure administration of store credentials

**Files:**
- Create: `supabase/functions/admin-store-users/index.ts`
- Create: `supabase/functions/_shared/storeUserInput.ts`
- Create: `src/data/unitRepository.ts`
- Create: `src/data/unitRepository.test.ts`

**Interfaces:**
- Consumes: `normalizeStoreUsername`, authenticated Supabase session
- Produces Edge actions: `create`, `reset-password`, `set-active`
- Produces: `listUnitsWithAccess()`, `createStoreAccess(input)`, `resetStorePassword(profileId, password)`, `setStoreAccessActive(profileId, active)`

- [ ] **Step 1: Write failing repository tests**

```ts
it("invokes the protected function without exposing the technical email", async () => {
  const invoke = vi.fn().mockResolvedValue({ data: { username: "roys.ilha" }, error: null });
  const repository = createUnitRepository({ invoke } as never);
  await repository.createStoreAccess({ unitId: "unit-1", username: "roys.ilha", password: "SenhaSegura123" });
  expect(invoke).toHaveBeenCalledWith("admin-store-users", {
    body: { action: "create", unitId: "unit-1", username: "roys.ilha", password: "SenhaSegura123" },
  });
});
```

- [ ] **Step 2: Run focused test and verify RED**

Run: `npm.cmd test -- src/data/unitRepository.test.ts --run`

Expected: FAIL because the repository does not exist.

- [ ] **Step 3: Implement the Edge Function authorization boundary**

The function must read the bearer token, call `auth.getUser(token)`, query `roys_profiles` for `role = 'admin' and active = true`, and reject all other callers with HTTP 403. For `create`, normalize the login, form `${username}@lojas.roys.internal`, call `auth.admin.createUser({ email, password, email_confirm: true, app_metadata: { role: "store" } })`, and insert a profile bound to the selected unit. For reset and block actions, use the target profile's `user_id` and record an audit event.

Never return the technical email, password, service key, or auth user object. Return `{ profileId, unitId, username, active }`.

- [ ] **Step 4: Implement the frontend repository, run tests and deploy function**

Run: `npm.cmd test -- src/data/unitRepository.test.ts --run`

Expected: PASS.

Deploy with JWT verification enabled. Test once as admin (200) and once as a store user (403).

- [ ] **Step 5: Commit**

Commit: `git commit -m "feat: let admins manage store credentials"`

---

### Task 4: Cloud authentication and role guards

**Files:**
- Create: `src/auth/authService.ts`
- Create: `src/auth/authService.test.ts`
- Create: `src/auth/AuthProvider.tsx`
- Create: `src/auth/AuthProvider.test.tsx`
- Create: `src/features/store/StoreLogin.tsx`
- Create: `src/features/store/StoreLogin.test.tsx`
- Modify: `src/features/admin/AdminAccess.tsx`
- Modify: `src/features/admin/AdminAccess.test.tsx`
- Delete after replacement: `src/features/admin/adminAuth.ts`
- Delete after replacement: `src/features/admin/adminAuth.test.ts`

**Interfaces:**
- Produces: `signInStore(username, password)`
- Produces: `signInAdmin(email, password)`
- Produces: `requestAdminPasswordReset(email)`
- Produces: `updateRecoveredPassword(password)`
- Produces context: `{ session, profile, unit, loading, signOut }`

- [ ] **Step 1: Replace local-password expectations with failing cloud-auth tests**

```ts
it("signs a store in through its technical identity", async () => {
  const signInWithPassword = vi.fn().mockResolvedValue({ data: {}, error: null });
  const service = createAuthService({ auth: { signInWithPassword } } as never);
  await service.signInStore("ROYS.ILHA", "SenhaSegura123");
  expect(signInWithPassword).toHaveBeenCalledWith({
    email: "roys.ilha@lojas.roys.internal",
    password: "SenhaSegura123",
  });
});
```

Admin tests assert that the form requires `comercial@roys.com.br`, calls `resetPasswordForEmail` with `${location.origin}/recuperar-senha`, and never offers first-device password setup.

- [ ] **Step 2: Run auth tests and verify RED**

Run: `npm.cmd test -- src/auth src/features/store/StoreLogin.test.tsx src/features/admin/AdminAccess.test.tsx --run`

Expected: FAIL because the cloud service and provider are absent and old local setup copy remains.

- [ ] **Step 3: Implement service, provider and guarded screens**

Load the authenticated profile from `roys_profiles` and its `roys_units` relation. `/loja` accepts only role `store`; `/admin` accepts only role `admin`. A wrong role signs out and shows “Este acesso não pertence a esta área.” Generic login errors must not reveal whether the username exists.

Implement “Esqueci minha senha” only on the admin screen. Store password changes are performed by the administrator in Task 3.

- [ ] **Step 4: Run tests and commit**

Run: `npm.cmd test -- src/auth src/features/store/StoreLogin.test.tsx src/features/admin/AdminAccess.test.tsx --run`

Expected: PASS.

Commit: `git commit -m "feat: add cloud authentication and role guards"`

---

### Task 5: Employees scoped to the authenticated store

**Files:**
- Create: `src/features/store/EmployeePicker.tsx`
- Create: `src/features/store/EmployeePicker.test.tsx`
- Modify: `src/data/unitRepository.ts`
- Modify: `src/data/unitRepository.test.ts`
- Create: `src/features/store/employeePicker.css`

**Interfaces:**
- Produces: `listActiveEmployees(unitId): Promise<Employee[]>`
- Produces: `createEmployee({ unitId, name, source: "store" }): Promise<Employee>`
- Produces component props: `{ unit, selectedId, onSelect }`

- [ ] **Step 1: Write failing behavior tests**

```tsx
it("shows only active employees from the authenticated unit", async () => {
  render(<EmployeePicker unit={{ id: "ilha", name: "Shopping da Ilha" }} selectedId="" onSelect={vi.fn()} repository={repository} />);
  expect(await screen.findByRole("option", { name: "Ana" })).toBeVisible();
  expect(screen.queryByRole("option", { name: "Funcionária inativa" })).not.toBeInTheDocument();
});

it("registers a missing employee and selects the returned record", async () => {
  fireEvent.click(screen.getByRole("button", { name: /cadastrar funcionário/i }));
  fireEvent.change(screen.getByLabelText(/nome do funcionário/i), { target: { value: "Beatriz" } });
  fireEvent.click(screen.getByRole("button", { name: /^salvar$/i }));
  await waitFor(() => expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ name: "Beatriz" })));
});
```

- [ ] **Step 2: Run and verify RED**

Run: `npm.cmd test -- src/features/store/EmployeePicker.test.tsx src/data/unitRepository.test.ts --run`

Expected: FAIL because the picker and employee methods do not exist.

- [ ] **Step 3: Implement selection, quick registration and duplicate handling**

Display the fixed unit above the selector. Normalize repeated spaces, require at least two visible characters, map unique-name conflicts to “Este funcionário já está cadastrado; selecione o nome existente.” Do not allow the store to edit or deactivate employees.

- [ ] **Step 4: Run tests and commit**

Expected: focused tests PASS.

Commit: `git commit -m "feat: add employees scoped by store"`

---

### Task 6: Cloud closing repository and private evidence upload

**Files:**
- Create: `src/data/cloudClosingRepository.ts`
- Create: `src/data/cloudClosingRepository.test.ts`
- Create: `src/data/draftRepository.ts`
- Modify: `src/data/closingRepository.ts`
- Modify: `src/data/closingRepository.test.ts`

**Interfaces:**
- Produces: `submitClosing(input): Promise<ClosingReceipt>`
- Produces: `justifyClosing(input): Promise<ClosingReceipt>`
- Produces: `listAdminClosings(filters): Promise<RemoteClosing[]>`
- Produces: `createCorrection(originalId, input): Promise<string>`
- Produces: `uploadEvidence({ unitId, closingId, file }): Promise<string>`

- [ ] **Step 1: Write failing idempotency and privacy tests**

```ts
it("sends raw values and omits client-derived reconciliation", async () => {
  await repository.submitClosing(input);
  expect(rpc).toHaveBeenCalledWith("submit_store_closing", {
    payload: expect.not.objectContaining({ physical: expect.anything(), system: expect.anything(), difference: expect.anything() }),
  });
});

it("reuses the same idempotency key after a network retry", async () => {
  await expect(repository.submitClosing(input)).rejects.toThrow(/conexão/i);
  await repository.submitClosing(input);
  expect(rpc.mock.calls[0][1].payload.idempotencyKey).toBe(rpc.mock.calls[1][1].payload.idempotencyKey);
});
```

- [ ] **Step 2: Run and verify RED**

Run: `npm.cmd test -- src/data/cloudClosingRepository.test.ts --run`

Expected: FAIL because the repository is absent.

- [ ] **Step 3: Implement RPC mapping, upload and local drafts**

Upload to private bucket path `${unitId}/${closingId}/original-${safeFilename}` before calling the RPC; include only path and metadata. Keep the draft and idempotency key in Dexie until the receipt is complete. Remove definitive local-history writes from the employee path. Map PostgreSQL duplicate and permission errors to typed Portuguese errors.

- [ ] **Step 4: Run repository tests and commit**

Expected: PASS, including retry with one protocol and no derived fields in the request.

Commit: `git commit -m "feat: persist closings securely in Supabase"`

---

### Task 7: Alert language, post-lock result and required justification

**Files:**
- Create: `src/domain/alerts.ts`
- Create: `src/domain/alerts.test.ts`
- Create: `src/features/store/ClosingResult.tsx`
- Create: `src/features/store/ClosingResult.test.tsx`
- Create: `src/features/store/closingResult.css`
- Modify: `src/features/closing/FinalConfirmation.tsx`
- Modify: `src/features/closing/FinalConfirmation.test.tsx`

**Interfaces:**
- Produces: `describeDifference(difference: number, alertLevel: AlertLevel): DifferenceMessage`
- Produces component states: `awaiting_justification` and `complete`

- [ ] **Step 1: Write failing boundary and copy tests**

```ts
it.each([
  [0, "correct", "Tudo correto"],
  [-2, "small", "Faltaram lançar 2 equivalentes de pão no sistema"],
  [2.5, "attention", "Sobraram 2,5 equivalentes de pão na conferência física"],
  [-7, "relevant", "Diferença relevante"],
  [11, "critical", "Alerta crítico"],
] as const)("describes %s as %s", (difference, level, copy) => {
  expect(describeDifference(difference, level).text).toMatch(copy);
});
```

Component tests assert that raw fields are absent, the reason list contains all seven approved reasons, nonzero cannot complete without explanation, relevant/critical require 30 characters, and zero shows a completed receipt without a textarea.

- [ ] **Step 2: Run and verify RED**

Run: `npm.cmd test -- src/domain/alerts.test.ts src/features/store/ClosingResult.test.tsx --run`

Expected: FAIL because the result module is absent.

- [ ] **Step 3: Implement result and justification**

Use the server-returned `difference` and `alertLevel`; do not recalculate them for authorization. Show protocol and `submittedAt` formatted with `timeZone: "America/Sao_Paulo"`. Submit `{ closingId, reasonCode, explanation }` to `justifyClosing`. Disable double submission and restore the same state after reload.

- [ ] **Step 4: Run tests and commit**

Expected: focused tests PASS.

Commit: `git commit -m "feat: show locked result and require justification"`

---

### Task 8: Integrate the authenticated store journey

**Files:**
- Create: `src/features/store/StoreClosingApp.tsx`
- Create: `src/features/store/StoreClosingApp.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/App.employeeBlindReview.test.tsx`
- Modify: `src/App.employeeResultPrivacy.test.tsx`
- Modify: `src/App.finalConfirmation.test.tsx`
- Modify: `src/styles/global.css`

**Interfaces:**
- Consumes: authenticated `profile`, fixed `unit`, selected `Employee`, draft repository, cloud closing repository
- Produces: complete `/loja` flow from login through receipt

- [ ] **Step 1: Write failing end-to-end component tests**

The main test logs in as Shopping da Ilha, asserts the unit selector is absent, selects Ana, enters counts/report, confirms the blind review, accepts the definitive modal, receives `difference = -3`, sees “Faltaram lançar 3”, supplies reason and explanation, and sees the protocol. It then clicks Back and verifies no raw input can be reopened.

Add a second test for `difference = 0`: it shows “Tudo correto” after RPC success and never asks for a justification. Add a third test proving a retry uses the persisted idempotency key.

- [ ] **Step 2: Run and verify RED**

Run: `npm.cmd test -- src/features/store/StoreClosingApp.test.tsx src/App.employeeBlindReview.test.tsx src/App.employeeResultPrivacy.test.tsx --run`

Expected: FAIL because App still owns local unit/history/admin state and the done screen hides the approved result.

- [ ] **Step 3: Extract and integrate the store shell**

Move the operational state from `App.tsx` into `StoreClosingApp.tsx`. Replace the free responsible field with `EmployeePicker`, replace the unit select with a read-only unit badge, call `submitClosing` only after the definitive confirmation, and route the returned receipt into `ClosingResult`.

Change the blind-review copy to: “Confira os dados informados. O resultado será mostrado depois que este lançamento for gravado e bloqueado.” Remove the optional pre-result occurrence field.

- [ ] **Step 4: Run all employee tests and commit**

Run: `npm.cmd test -- src/features/store src/App.employeeBlindReview.test.tsx src/App.employeeResultPrivacy.test.tsx src/App.finalConfirmation.test.tsx --run`

Expected: PASS.

Commit: `git commit -m "feat: integrate authenticated store closing flow"`

---

### Task 9: Administrative access, employee management and remote dashboard

**Files:**
- Create: `src/features/admin/AccessManagement.tsx`
- Create: `src/features/admin/AccessManagement.test.tsx`
- Modify: `src/features/admin/AdminDashboard.tsx`
- Modify: `src/features/admin/AdminDashboard.test.tsx`
- Modify: `src/features/admin/adminMetrics.ts`
- Modify: `src/features/admin/adminMetrics.test.ts`
- Modify: `src/features/admin/adminDashboard.css`

**Interfaces:**
- Consumes: `listUnitsWithAccess`, credential actions, employee actions, `listAdminClosings`
- Produces: admin tabs for overview, closings, audit, units/access and employees

- [ ] **Step 1: Write failing management and metrics tests**

Test that an admin can select Shopping da Ilha, create `roys.ilha`, reset its password without displaying it afterward, block the access, add/deactivate an employee, and see last access. Test that the alert counters classify small/attention/relevant/critical separately and that store performance groups effective revisions by unit.

```ts
expect(storePerformance(records)).toEqual([
  expect.objectContaining({ unitName: "Shopping da Ilha", total: 2, matched: 1, critical: 1 }),
]);
```

- [ ] **Step 2: Run and verify RED**

Run: `npm.cmd test -- src/features/admin/AccessManagement.test.tsx src/features/admin/AdminDashboard.test.tsx src/features/admin/adminMetrics.test.ts --run`

Expected: FAIL because credential management and remote alert metrics are absent.

- [ ] **Step 3: Implement access management and remote loading**

Replace local history props with repository loading inside the authenticated admin shell. Add navigation items “Lojas e acessos” and “Funcionários”. Password forms use `autocomplete="new-password"`, require at least 10 characters, and clear the value after success. Confirmation dialogs identify the exact unit before block or reset.

Show server timestamps in Brasília, alert badges, reason, justification, employee, authenticated store account, document link and revision chain. Keep chart semantics: zero green, positive blue, negative red, with no bar preselected.

- [ ] **Step 4: Run admin tests and commit**

Expected: PASS.

Commit: `git commit -m "feat: add admin access management and remote metrics"`

---

### Task 10: Recovery route, PWA installation and Vercel routing

**Files:**
- Create: `src/features/admin/PasswordRecovery.tsx`
- Create: `src/features/admin/PasswordRecovery.test.tsx`
- Modify: `vite.config.ts`
- Create: `vercel.json`
- Create: `scripts/install-store-shortcut.ps1`
- Modify: `ABRIR-ROYS-V2.cmd`
- Modify: `README.md`

**Interfaces:**
- Consumes: `updateRecoveredPassword`
- Produces: installable `/loja` PWA and Windows shortcut script

- [ ] **Step 1: Write failing recovery and manifest tests**

Test that the recovery screen accepts matching passwords with at least 10 characters, calls `updateRecoveredPassword`, signs out and sends the user to `/admin`. Add a config test asserting manifest `start_url` is `/loja`, scope is `/`, display is `standalone`, and icons include 192 and 512.

- [ ] **Step 2: Run and verify RED**

Expected: FAIL because the recovery component is absent and the manifest still starts at `./`.

- [ ] **Step 3: Implement routes, manifest, rewrite and shortcut**

Use this Vercel rewrite:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

The PowerShell script accepts mandatory `-AppUrl`, validates HTTPS, and creates `Roy's - Fechamento de Pães.url` on the current user's desktop with `URL=$AppUrl/loja`. `ABRIR-ROYS-V2.cmd` remains clearly marked as local development only.

- [ ] **Step 4: Build and commit**

Run: `npm.cmd run build`

Expected: exit 0 and generated manifest contains `/loja`.

Commit: `git commit -m "feat: add recovery and installable store app"`

---

### Task 11: Mobile, security and production verification

**Files:**
- Create: `docs/QA-V2-LOJA-ADMIN.md`
- Modify when a verified defect requires it: the smallest owning component or stylesheet

**Interfaces:**
- Consumes: production candidate and seeded test accounts
- Produces: verified preview, production URL and installation procedure

- [ ] **Step 1: Run the complete automated suite**

Run: `npm.cmd test -- --run`

Expected: all tests pass.

Run: `npm.cmd run typecheck`

Expected: exit 0.

Run: `npm.cmd run build`

Expected: exit 0.

- [ ] **Step 2: Run database security checks**

Re-run the SQL assertions and Supabase security/performance advisors. Verify anon cannot read any Roy's table, a store cannot select closings, a store cannot submit for another unit, and the Edge Function returns 403 to store sessions.

- [ ] **Step 3: Verify the browser journey at required widths**

At 375, 390, 430, 768, 1024 and 1440 px, test:

- store login and wrong-password message;
- employee selection and quick registration;
- numeric keyboard fields, camera/file picker and OCR review;
- blind review, definitive confirmation and immutable submission;
- zero, small, attention, relevant and critical result cards;
- mandatory justification and reload recovery;
- admin login, password recovery entry point, access management, metrics, chart click values and logout;
- no horizontal overflow, clipped controls or text below 16 px in inputs.

Record every result in `docs/QA-V2-LOJA-ADMIN.md` with viewport, scenario, status and evidence.

- [ ] **Step 4: Deploy preview and verify it**

Create a new Vercel project under team `royd`, configure only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`, and deploy a preview. Confirm `/loja`, `/admin`, `/recuperar-senha`, PWA manifest, service worker and Supabase network calls.

- [ ] **Step 5: Promote the verified deployment to production**

Promote only after preview checks pass. Set the Supabase Auth site URL and redirect allowlist to the final production origin. Test the real admin recovery email without changing the committed password.

- [ ] **Step 6: Test the desktop shortcut and commit QA evidence**

Copy the exact HTTPS production URL returned by the Vercel promotion into the mandatory `-AppUrl` argument of `scripts/install-store-shortcut.ps1`. Confirm the resulting icon opens that origin followed by `/loja` and does not expose `/admin` in normal navigation. Record the concrete command and URL in `docs/QA-V2-LOJA-ADMIN.md` so the installation can be reproduced without a symbolic hostname.

Commit: `git commit -m "docs: record production verification"`

---

## Definition of Done

- All Vitest tests, typecheck and production build pass.
- SQL assertions and Supabase advisors pass without an exposed table or unsafe policy.
- The administrator can create, reset and block one shared credential per unit.
- Shopping da Ilha credentials cannot see or submit for Rio Anil and vice versa.
- The store selects or creates an employee before entering the closing.
- The server locks raw values before returning the result.
- Divergences require the approved reason and explanation flow.
- Original closings remain immutable and corrections are linked revisions.
- Admin metrics use remote effective revisions and separate all alert levels.
- Mobile QA passes at 375, 390 and 430 px.
- The verified Vercel production URL opens directly from the installed desktop shortcut.
