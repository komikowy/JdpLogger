# Architektura JdpLogger

## Przepływ danych

1. LilyGO T-2CAN czyta magistralę TWAI/CAN i wykonuje zapytania OBD Mode 01/09.
2. Firmware publikuje JSON przez WebSocket `ws://192.168.4.1:81`.
3. Aplikacja normalizuje telemetrię, aktualizuje UI w throttlingu i buforuje rekordy.
4. SQLite zapisuje sesje, telemetrię, RAW CAN, markery, alarmy i debug log.
5. Ekran historii eksportuje CSV/TXT przez `expo-sharing`.

## Podział odpowiedzialności

- `services/telemetry.js`: definicje PID, formatowanie, sanityzacja, alarmy i RAW normalize.
- `services/database.js`: schemat SQLite, migracje kolumn, zapis i eksport danych.
- `context/TelemetryContext.js`: publiczne API aplikacji, połączenie WebSocket, buforowanie, GPS, sesje.
- `context/runtimeState.js`: reducer stanu runtime, błędów i metryk performance.
- `components/*`: współdzielony UI automotive i responsywne siatki.
- `screens/*`: kompozycja widoków bez powielania podstawowych kafli/statusów.

## Asynchroniczność

- WebSocket ma reconnect co 2 s po rozłączeniu.
- Dane wysokiej częstotliwości trafiają najpierw do `refs`, a UI odświeża się throttlowane.
- SQLite zapisuje rekordy paczkami; w Performance logging paczki są większe.
- RAW preview jest próbkowane podczas aktywnego Performance logging, ale pełny RAW nadal może być buforowany do zapisu.

## Stany błędów

Reducer runtime zbiera ostatnie błędy: gateway, parser, database i GPS. Dashboard pokazuje najnowszy błąd, a pełne zdarzenia można analizować przez debug export i liczniki CAN/TWAI.
