# Technical Office System UI

Angular admin UI for the technical-office HR/ERP: employees, org structure, leave, attendance, custody, payroll, penalties, and identity admin.

Arabic-first, RTL by default, bilingual AR/EN.

Companion API: **MyERP** (`http://localhost:8400`, Swagger at `https://localhost:8500/swagger`).

## Stack

- Angular 17 (standalone, `bootstrapApplication`)
- PrimeNG 17 + PrimeFlex + PrimeIcons
- ngx-translate (JSON files, not Angular i18n)
- JWT in `localStorage` (access + refresh)
- Signals + services — no NgRx

## Repo map

```
src/app/
  app.config.ts          providers: router, HTTP, i18n, OpenAPI BASE_PATH
  app.routes.ts          lazy routes + guards
  core/
    auth/                session, JWT parse, permission codes
    guards/              authGuard, guestGuard, permissionGuard
    interceptors/        Bearer token, Accept-Language, error toasts
    api/generated/       OpenAPI client for HR/ERP
    api/identity-generated/  OpenAPI client for Identity
    services/            facades used by screens (prefer these)
    models/  mappers/    UI models and DTO mapping
  modules/               feature screens (folders, not NgModules)
  layout/                sidebar + topbar
  shared/                table, page header, form field, toasts, confirm
  styles/                themes, RTL, PrimeNG overrides
```

## Screens

| Route | What |
|-------|------|
| `/dashboard` | Home stats |
| `/employees` | Employees, documents |
| `/job-grades`, `/job-positions`, `/organization-units`, `/organization-structure` | Org lookups and tree |
| `/leave` | Types, requests, hourly permissions, balances, policies |
| `/attendance` | Daily attendance, shifts, plans, calc, fingerprint devices |
| `/custody` | Financial + document custody |
| `/payroll` | Periods, structures, runs, payslips |
| `/penalties` | Penalty list |
| `/admin` | Users, roles, permissions, pages |
| `/auth/login` | Login (guest only) |

## Run locally

1. **Node** `^18.13.0` or `>=20.9.0`.
2. Start the MyERP API on `http://localhost:8400` first.
3. Install and serve:

```powershell
npm install
npm start
```

Open `http://localhost:4200`.

API URLs live in `src/environments/environment.ts` (`apiBaseUrl`, `identityApiUrl`). Both currently point at `http://localhost:8400`. There is no proxy config.

## Auth and i18n

Login: `/auth/login` → `POST /api/auth/login`.

Permission codes match the backend (`hr.employees.read`, `leave.write`, …). Routes use `permissionGuard`; templates use `*appHasPermission`. Denied users go to `/dashboard`.

Default language is Arabic (`html[dir=rtl]`). Strings: `src/assets/i18n/ar.json` and `en.json`. Use `TranslatePipe` / `translate.instant(...)`.

## Where to look first

| File | Why |
|------|-----|
| `src/app/app.routes.ts` | All lazy routes |
| `src/app/app.config.ts` | Providers and API base paths |
| `src/app/core/auth/` | Session + permission codes |
| `src/app/modules/employees/` | Typical feature folder + `*.routes.ts` |

Reuse `shared/` (`SharedTableComponent`, `PageHeaderComponent`, `FormFieldComponent`, `NotifyService`). Prefer `core/services/` over calling generated clients from components.

## API clients

After a backend contract change, regenerate — do not hand-edit generated folders:

```powershell
npm run update-api              # HR/ERP from https://localhost:8500/swagger
npm run update-identity-api     # Identity from http://localhost:8400/swagger
```

Output: `src/app/core/api/generated/` and `src/app/core/api/identity-generated/`.
