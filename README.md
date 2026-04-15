# Home

Portal startowy dla użytkowników realm `garden`, pokazujący tylko produkcyjne aplikacje, do których użytkownik ma dostęp.

## Struktura

- `app/` - frontend Next.js
- `api/` - backend Node.js + Express
- `shared/` - wspólne typy i ręczny registry aplikacji

## Uruchomienie

1. Skonfiguruj `.env` w `app/` i `api/`.
2. Uruchom `npm install` w katalogu głównym lub osobno w `app/` i `api/`.
3. W osobnych terminalach uruchom:
   - `npm run dev --workspace app`
   - `npm run dev --workspace api`

## Skan projektów

Home ma pomocniczy skaner kandydatów z `/home/ubuntu/Projects`.

- CLI: `npm run scan:projects`
- API: `GET /v1/scan/report` dla ról z `SCAN_REPORT_REALM_ROLES`

Skan:

- wykrywa frontendy `*-app` oraz zagnieżdżone `app/` w monorepo
- próbuje odczytać hosty `*.grdn.pl`, `clientId` i wskazówki ról
- porównuje wynik z `shared/app-registry.ts`
- nie publikuje nic automatycznie do registry

## Registry aplikacji

Metadane app są składane z trzech warstw:

- `shared/app-registry.ts` - seed fallback dla migracji i lokalnego dev
- `shared/app-registry-overrides.ts` - centralne override'y `enabled`, `visibleInHome`, `sourcePath`
- `data/app-registry.json` - runtime registration publikowany przez appki przez `POST /v1/registry/register`

Effective access do Home nie jest już liczony wyłącznie z lokalnych ról. Dla apek z `accessSync.mode="pull_snapshot_v1"` Home pulluje i cache'uje snapshot `user_sub` do `data/access-snapshots.sqlite`.

Zasady:

- aplikacja jest widoczna tylko gdy `enabled=true`
- aplikacja jest widoczna tylko gdy `visibleInHome=true`
- aplikacja jest widoczna tylko dla `environment='prod'`
- aplikacja z `accessSync` jest widoczna tylko dla userów obecnych w świeżym snapshotcie
- aplikacja bez `accessSync` używa tymczasowego fallbacku do legacy `access`
- skaner służy tylko do bootstrapu kandydatów, a nie do automatycznej publikacji
