# Nowe lokale gastro

Panel MVP do wykrywania nowych lokali gastronomicznych z TikToka i social mediów.

## Komendy

```bash
npm run build
npm start
```

## Co jest w MVP

- watchlista twórców gastro
- przykładowe sygnały o nowych lokalach
- klasyfikacja wpisów na `potwierdzone`, `do sprawdzenia` i odrzucone
- filtrowanie po mieście, statusie i tekście
- schematyczna mapa wykryć
- lokalny formularz do testowania opisów postów

## Następny etap

Źródła danych powinny trafiać do aplikacji jako ustrukturyzowane rekordy: twórca,
opis filmu, link źródłowy, miasto, nazwa lokalu i kandydat adresu. Automatyczne
pozyskiwanie z TikToka trzeba podpiąć przez zatwierdzone API, dostawcę danych albo
ręczny import linków, a lokalizacje weryfikować przez Google Places.

## Struktura

- `public/index.html` - glowny dokument aplikacji
- `public/styles.css` - style interfejsu
- `public/app.js` - interakcje po stronie klienta
- `vercel.json` - konfiguracja deployu
