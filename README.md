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

## Registry aplikacji

Wpisy trzymane są w `shared/app-registry.ts`.

Zasady:

- aplikacja jest widoczna tylko gdy `enabled=true`
- aplikacja jest widoczna tylko gdy `visibleInHome=true`
- aplikacja jest widoczna tylko dla `environment='prod'`
- aplikacja bez `access` nie jest widoczna nikomu
