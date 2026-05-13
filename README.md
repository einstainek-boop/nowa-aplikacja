# Nowe lokale gastro

Panel MVP do wykrywania nowych lokali gastronomicznych z TikToka i social mediów.

## Komendy

```bash
npm run build
npm start
```

## Co jest w MVP

- watchlista twórców gastro
- importer konkretnego filmu TikTok przez `/api/tiktok-oembed`
- klasyfikacja wpisów na `potwierdzone`, `do sprawdzenia` i odrzucone
- lokalny formularz do testowania opisów postów
- oznaczanie lokalu jako sprawdzony

## Następny etap

Źródła danych trafiają do aplikacji jako ustrukturyzowane rekordy: twórca,
opis filmu, link źródłowy, miasto, nazwa lokalu i kandydat adresu. Obecny importer
działa dla konkretnego URL filmu TikTok. Automatyczne pozyskiwanie z profili trzeba
podpiąć przez zatwierdzone API albo zewnętrznego dostawcę danych, a lokalizacje
weryfikować przez Google Places.

## Struktura

- `public/index.html` - glowny dokument aplikacji
- `public/styles.css` - style interfejsu
- `public/app.js` - interakcje po stronie klienta
- `api/tiktok-oembed.js` - proxy metadanych konkretnego filmu TikTok
- `vercel.json` - konfiguracja deployu
