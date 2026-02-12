# Dokumentacioni i testeve

Ky dokument permbledh te gjitha testet aktuale ne repo, cfare verifikojne dhe si ekzekutohen. Dokumenti bazohet ne skedaret reale te testeve nen `tests/`.

**Struktura**
- `tests/unit/` – unit tests (Vitest)
- `tests/integration/` – integration tests (Vitest, godasin API reale)
- `tests/e2e/smoke/` – E2E smoke tests (Playwright)
- `tests/helpers/` – helpera per testet (requestJson, searchCars, booking, etj.)
- `tests/fixtures/` – fixture statike (JSON/CSV) per testet

**Konfigurime**
- `vitest.config.ts` – perfshin `tests/unit/**/*.spec.ts` dhe `tests/integration/**/*.spec.ts`.
- `playwright.config.ts` – `tests/e2e/smoke`, `baseURL` nga `TEST_BASE_URL` (default `http://localhost:3000`).
- `tests/tsconfig.json` – projekt TS per testet.

---

**Unit tests – Cars / Utils**
- `tests/unit/cars/utils/validate.spec.ts` – teston `validateQuery`, `validateBody`, `validateParams`: kur `safeParse` deshton duhet te kthehet gabim me `statusCode: 400`; kur kalon, kthen te dhenat e parsuar.
- `tests/unit/cars/utils/string.utils.spec.ts` – teston `toSafeSegment` (normalizim segmentesh per path) dhe `normalizeBucketName` (heqje protokolli, segmenti i fundit i path-it, trim).
- `tests/unit/cars/utils/date.utils.spec.ts` – teston `getDaysDifference` me rregullin e oreve (<3 ore nuk shton dite; >=3 ore shton 1 dite).
- `tests/unit/cars/utils/logger.spec.ts` – teston `getLogger` dhe qe `info/warn/error` delegojne te `console.*` me mesazh + meta.

**Unit tests – Cars / Schemas (Zod)**
- `tests/unit/cars/schemas/common.spec.ts` – teston `tenantIdSchema`, `emailSchema`, `dateSchema`, `timeSchema`, `optionalCommaSeparatedToArray`, `optionalCommaSeparatedToNumberArray`.
- `tests/unit/cars/schemas/bookings/create.schema.spec.ts` – teston fushat e detyrueshme, `vehicle_id` min(1), lowercasing te email-it dhe defaultet e `options`.
- `tests/unit/cars/schemas/cars/search.schema.spec.ts` – teston dy mode te kerkeses se search-it: `vehicle_id` flow dhe full search; teston `isVehicleIdSearch`.
- `tests/unit/cars/schemas/customers/by-email.schema.spec.ts` – teston validimin e `email` + `tenant_id` (coercion, refuzim invalid).

**Unit tests – Cars / Services**
- `tests/unit/cars/services/BookingNumberService.spec.ts` – teston `isValidBookingNumber`, `extractTenantId`, dhe `generateUniqueBookingNumber` (formati `tenantId-XXXXXXXX` dhe retry per unik).
- `tests/unit/cars/services/BookingOptionsService.spec.ts` – teston `getOptions` dhe mapping e vlerave `null/undefined` ne 0; fushat map-ohen sakte.
- `tests/unit/cars/services/storage.service.spec.ts` – teston `uploadDocument`: kthen `null` kur file mungon, nderton path korrekt `Tenant_<safe>_<id>/Customer_<safe>/...`, dhe hedh gabim kur Supabase kthen `error`.

**Unit tests – Flights / Server**
- `tests/unit/flights/providers/registry.spec.ts` – teston `ProviderRegistry` (nuk lejon duplikime, `getAll` i renditur nga `priority`, `get/has/getIds`).
- `tests/unit/flights/database/client.spec.ts` – teston `isBuildPhase` bazuar ne `TURSO_DATABASE_URL` dhe `TURSO_AUTH_TOKEN`.
- `tests/unit/flights/database/queries.spec.ts` – teston `generateSearchHash` (deterministik dhe ndryshon me parametra te ndryshem).

**Unit tests – Shared / Composables**
- `tests/unit/shared/useConsent.spec.ts` – teston `setConsent`, `acceptAll`, `rejectAll`, `clearConsent` dhe sjelljen me `gtag`.
- `tests/unit/shared/useFormatDate.spec.ts` – teston `formatDate` per `null` dhe locale `sq/de/en`.
- `tests/unit/shared/useFormatPrice.spec.ts` – teston qe `formatPrice` kthen string me monedhen EUR dhe shifrat.
- `tests/unit/shared/useSeoPage.spec.ts` – teston `useSeoPage`: canonical URL (kur s’fillon me http) dhe alternates per locale; perdor `useLocalePath` nga stub `tests/helpers/nuxt-imports.ts`.

---

**Integration tests (API)**
- `tests/integration/cars/search.spec.ts` – thirr `GET /api/cars/search` per data kohore dhe verifikon qe kthehet liste veturash (ose array bosh) me `id` dhe `tenant_id` numerik.
- `tests/integration/cars/booking-create-and-fetch-tenant46.spec.ts` – flow i plote: kerkon vetura, zgjedh vetem tenant 46, krijon booking, pastaj e lexon me `/api/bookings/:bookingNumber`; verifikon `tenant_id` dhe formatin e numrit te rezervimit. Ka timeout 20s.
- `tests/integration/flights/providers-health.spec.ts` – `GET /api/providers` kthen array; `/api/providers/:id/health` kthen 200 ose 404.

**Rregulla e tenantit (integration + e2e)**
- Booking krijohet vetem per `tenant_id = 46`.
- Nese search nuk kthen vetura me `tenant_id === 46`, testet e booking-ut deshtojne.

---

**E2E smoke tests (Playwright)**
- `tests/e2e/smoke/search.smoke.spec.ts` – verifikon qe search API kthen array.
- `tests/e2e/smoke/flights-health.smoke.spec.ts` – `GET /api/providers` (200 + array) dhe `/api/providers/:id/health` (200 ose 404).
- `tests/e2e/smoke/go-redirect.smoke.spec.ts` – `GET /api/go/:provider?t=web` kthen 302 me `location` https; `t=phone` kthen 302 ne `tel:`.
- `tests/e2e/smoke/booking-tenant46.smoke.spec.ts` – krijon booking tenant 46, verifikon API `GET /api/bookings/:id`, pastaj hap `/sq/booking/:id` dhe kontrollon qe numri i rezervimit shfaqet ne faqe.

---

**Helpers dhe siguri**
- `tests/helpers/http.ts` – `requestJson`, `requestMultipart`, `baseURL` nga `TEST_BASE_URL` (default `http://localhost:3000`).
- Siguri: nese `TEST_BASE_URL` permban `krahaso.co` dhe nuk permban `staging` ose `localhost`, testet ndalohen me gabim.
- `tests/helpers/search.ts` – `searchCars` dhe `getFirstPickupCity`.
- `tests/helpers/booking.ts` – `createBookingForTenant46` (vendos marker `SMOKE_TEST_TENANT46`).
- `tests/helpers/tenant46.ts` – zgjedh veturen e pare me `tenant_id === 46`.
- `tests/helpers/nuxt-imports.ts` – stub per `useLocalePath` ne unit tests.

---

**Si t’i ekzekutosh**

Unit + integration:
```bash
npm run test
```

Vetem integration:
```bash
npm run test:integration
```

E2E smoke (serveri duhet te jete i nisur):
```bash
# PowerShell
$env:TEST_BASE_URL="http://localhost:3000"; npm run test:e2e
```

Per staging (vetem nese URL permban "staging"):
```bash
# PowerShell
$env:TEST_BASE_URL="https://staging.example.com"; npm run test:integration
```
