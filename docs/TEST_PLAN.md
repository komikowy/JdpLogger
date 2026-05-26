# Plan testów

## Testy automatyczne

Uruchomić przed wydaniem:

```bash
npm run lint
npm test
npm run format:check
npx expo export --platform android
npx expo export --platform ios
```

## Testy ekranów

- Mały Android: brak ucinania kafli, przyciski dostępne, tab bar nie zakrywa treści.
- Duży Android: siatki mają więcej kolumn, bez pustych dziur i nakładania tekstu.
- iPhone z wyspą: nagłówki i statusy nie wchodzą w safe area.
- iPhone bez wyspy: zachowany dolny padding tab bara.

## Testy funkcjonalne

- Brak gateway: aplikacja pokazuje offline i nie crashuje przy komendach.
- Reconnect: po powrocie Wi-Fi wysyła konfigurację PID i RAW.
- Start/stop logging: sesja zapisuje telemetrię, RAW, markery i metadane.
- GPS denied: aplikacja pokazuje błąd i wraca do stanu GPS off.
- RAW on/off: RAW preview i eksport są zgodne z ustawieniem.

## Testy CAN

- Presety: widoczne tylko `Aftertreatment`, `Performance`, `Temperatures`.
- BMW diesel w aucie: RPM, MAP, rail, MAF, ECT, IAT, baro, battery.
- Opel diesel: `5C`, `78`, `7A`, `61`, `62`, `63` dostepne w definicjach PID.
- Wysoki Hz: `Raw CAN trace` off, `Performance logging` on, mozliwie najmniejsza liczba aktywnych PID.

## Kryteria akceptacji

- `CAN error state` pokazuje rozbite liczniki, nie tylko sumę.
- Podczas nagrywania UI nie renderuje każdej ramki.
- Eksport CSV/TXT działa po dłuższej sesji.
- Wszystkie testy automatyczne przechodzą.
