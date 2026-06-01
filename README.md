# JdpLogger

Mobilny datalogger CAN/OBD dla telefonu, zbudowany jako projekt inżynierski do rejestracji parametrów ECU. System łączy płytkę LilyGO T-2CAN z aplikacją Expo/React Native przez WebSocket i zapisuje sesje lokalnie w SQLite.

## Cel projektu

Celem było stworzenie taniego, konfigurowalnego i weryfikowalnego loggera do testów drogowych oraz bench. Projekt ma pokazywać dane ECU w czasie rzeczywistym, rejestrować sesje, eksportować CSV/TXT i nie udawać obsługi funkcji, które nie zostały potwierdzone w testach.

## Finalna architektura

Przepływ danych:

```text
ECU / CAN -> LilyGO T-2CAN -> WebSocket JSON -> telefon -> SQLite -> CSV/TXT
```

Główne warstwy:

- hardware: LilyGO T-2CAN, ESP32-S3, TWAI/CAN, Wi-Fi SoftAP;
- firmware: Arduino/C++, zapytania OBD Mode 01/09, RAW CAN, liczniki CAN/TWAI;
- aplikacja: Expo SDK 54, React Native 0.81.5, React 19.1.0, React Navigation 7;
- dane: `expo-sqlite`, sesje, telemetria, RAW CAN, markery, alarmy i raport OBD.

## Hardware i firmware

- płytka: LilyGO T-2CAN;
- firmware: `APK_CAN_DASH/APK_CAN_DASH.ino`;
- domyślna sieć: `LilyGO_EDC17`;
- domyślny endpoint: `ws://192.168.4.1:81`;
- telefon łączy się bezpośrednio z bramką, bez backendu i bez internetu.

## Aplikacja mobilna

Aplikacja jest przeznaczona na telefon Android/iOS. Interfejs ma układ automotive dashboard i cztery główne sekcje:

- `Live`: status połączenia, start/stop logowania, trend i kafle metryk;
- `OBD`: identyfikacja ECU, VIN/CAL ID/CVN i raport TXT;
- `Historia`: sesje, eksport telemetrii CSV, RAW CAN CSV i raportów;
- `Setup`: gateway WebSocket, presety PID, RAW trace, GPS i alarmy.

UI jest odświeżane wolniej niż napływające pakiety danych, co ogranicza koszt renderowania i poprawia wydajność logowania.

## Presety i dane diagnostyczne

Finalny zakres opiera się tylko na zapytaniach uznanych za pewne w testach.

- `Aftertreatment`: parametry układu oczyszczania spalin i temperatur.
- `Performance`: podstawowe parametry dynamiczne, m.in. RPM, MAP, rail, MAF, load.
- `Temperatures`: temperatury dostępne przez potwierdzone PID.

BMW diesel nie używa w finalnym profilu PID `5C`, `78`, `7A`, ponieważ testowane sterowniki EDC17C41/EDC17CP45 nie deklarowały ich w generic OBD. Opel diesel może korzystać z szerszego zestawu, jeśli ECU deklaruje obsługę tych PID.

## Logowanie i eksport

Aplikacja zapisuje dane lokalnie w SQLite i działa w trybie offline-first. Eksport obejmuje:

- telemetrię CSV;
- RAW CAN CSV;
- raport OBD TXT;
- markery sesji i podstawowe metadane testu.

RAW trace można wyłączyć, gdy priorytetem jest wyższa częstotliwość logowania.

## Wyniki testów praktycznych

Najważniejszy materiał walidacyjny to `JDP_TELEMETRY_21.csv`:

- 339 próbek;
- około 17,2 s sesji;
- średni `packet_hz`: około 19,6 Hz;
- średni `ui_hz`: około 6,25 Hz;
- `raw_dropped_count`: 0.

Wniosek: aplikacja potrafi rejestrować komplet próbek z testu, a UI nie musi renderować każdej próbki, żeby logowanie pozostało płynne.

## Funkcje usunięte lub świadomie pominięte

Z finalnego zakresu usunięto lub pominięto funkcje, które nie były wystarczająco wiarygodne w testach:

- `Read/Clear DTC`;
- zakładkę i logikę BMW F/F02;
- duże gauges;
- martwe kolumny i parametry logowane, ale niewyświetlane;
- opisywanie niepewnych PID jako działających.

## Uruchomienie

```bash
npm install
npm start
```

Przydatne komendy:

```bash
npm run android
npm run ios
npm test
npm run lint
npm run format:check
npm run check
```

## Testy jakości

Aktualny stan projektu:

- `npm test`: 3 zestawy testów, 14 testów;
- `npm run lint`: bez błędów ESLint;
- `npm run format:check`: zgodność z Prettier.

Testy obejmują logikę telemetrii, presety PID, alarmy, reducer runtime oraz render dashboardu z safe area.

## Kierunki rozwoju

1. Rozszerzenie profili ECU po pozyskaniu pewnych źródeł DBC/A2L lub własnych testów porównawczych.
2. Dalsza optymalizacja wysokiego Hz przez minimalny preset jednego PID i profilowanie SQLite na fizycznych telefonach.
3. Dodanie testów integracyjnych firmware-app z symulatorem WebSocket.
4. Rozbudowa raportów z sesji o statystyki i porównanie przejazdów.
5. Przygotowanie wersji produkcyjnej z parowaniem, konfiguracją sieci i formalnym modelem profili pojazdów.
