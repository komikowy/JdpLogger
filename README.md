# JdpLogger

Mobilny logger CAN/OBD dla LilyGO T-2CAN, przygotowany pod diagnostyke BMW DDE/EDC17 oraz Opel EDC17C19. Aplikacja dziala w Expo SDK 54 na Androidzie i iOS, laczy sie z gatewayem WebSocket na plytce i zapisuje telemetrie do lokalnej bazy SQLite.

## Funkcje

- Live dashboard automotive z kaflami metryk, trendami i licznikami CAN.
- Profile PID: Aftertreatment, Performance, Temperatures.
- Logowanie telemetryczne CSV, RAW CAN CSV, markery sesji i raport OBD.
- Diagnostyka ECU: VIN/CAL ID/CVN, raport i status CAN/TWAI.
- Tryb Performance logging ograniczajacy koszt renderowania podczas zapisu.
- Firmware wysyla tylko aktywne/widoczne pola, bez martwych kolumn typu `distance_mil`.

## Hardware

- Plytka: LilyGO T-2CAN.
- Firmware: `APK_CAN_DASH/APK_CAN_DASH.ino`.
- Domyslna siec AP: `LilyGO_EDC17`, haslo `password123`.
- Domyslny endpoint aplikacji: `ws://192.168.4.1:81`.

## Uruchomienie

```bash
npm install
npm start
```

Po uruchomieniu Expo zeskanuj QR w Expo Go albo uruchom przez `npm run android` / `npm run ios`.

## Jak dojsc do wysokiego Hz

1. W `Setup` wybierz preset `Performance` albo zostaw recznie jeden aktywny PID.
2. Wylacz `Raw CAN trace`, chyba ze robisz diagnostyke ramek.
3. Na ekranie Live wlacz `Performance logging`.
4. Sprawdz `Packet Hz`; `UI Hz` celowo zostaje throttlowane, zeby nie renderowac kazdej probki.

Firmware usuwa dawny limit 100 ms i dla jednego aktywnego PID celuje w broadcast co 10 ms. Realny wynik zalezy jeszcze od ECU, opoznienia odpowiedzi OBD i obciazenia telefonu.

Performance logging nie zmienia fizycznego czasu odpowiedzi ECU. Ogranicza renderowanie UI, probkuje RAW preview i zapisuje SQLite wiekszymi paczkami, zeby telefon nie blokowal logowania przy wysokim Hz.

## Stabilnosc WiFi

Firmware konfiguruje SoftAP na `192.168.4.1`, kanal 6, jeden klient i wylaczone power-save. Jezeli telefon mimo tego zrywa WiFi, sprawdz w systemie telefonu automatyczne przelaczanie na siec z internetem/LTE, bo AP LilyGO celowo nie ma dostepu do internetu.

## Jakosc i testy

```bash
npm test
npm run lint
npm run format:check
npm run check
npx expo export --platform android
npx expo export --platform ios
```

Testy obejmuja dekodowanie telemetrii, profile PID, alarmy, reducer runtime oraz render glownego dashboardu z safe area.

## Profile diagnostyczne

- BMW diesel nie uzywa standardowych PID `5C`, `78`, `7A`, bo testowane EDC17CP45/C41 nie deklaruja ich w generic OBD.
- Opel diesel uzywa `5C`, `78`, `7A` oraz momentow `61`, `62`, `63`.
- Funkcje BMW F/F02 zostaly usuniete z aplikacji i firmware, bo w testowym aucie nie dawaly wiarygodnych wartosci.

Wiecej: `docs/CAN_DIAGNOSTICS.md`.
