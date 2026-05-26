# Diagnostyka CAN/OBD

## Pewne profile PID

BMW diesel, tylko pola uzywane przez aplikacje:

`04 05 0B 0C 0D 0F 10 11 23 24 2C 2D 33 3C 42 45 46 49 4C`

BMW benzyna, tylko pola uzywane przez aplikacje:

`04 05 0B 0C 0D 0F 10 11 23 2F 33 3C 42 45 46 49 4C`

Opel diesel, tylko pola uzywane przez aplikacje:

`04 05 0B 0C 0D 0F 10 11 23 24 2C 2D 2F 33 3C 42 45 46 49 4C 5C 61 62 63 78 7A`

## Najwazniejszy wniosek

BMW diesel w generic OBD nie deklaruje `5C` oil temp, `78` EGT ani `7A` DPF differential pressure. Aplikacja nie pyta o nie w profilu BMW diesel. Opel diesel deklaruje te PID-y, wiec profil Opel je zawiera.

Parametry, ktore nie sa pokazywane ani uzywane w raporcie, zostaly wyciete z logowania i payloadu firmware. Dotyczy to m.in. `distance_mil`, `warmups_clear`, `distance_clear`, `abs_load` oraz martwych dekoderow BMW F/F02.

## Wysokie Hz

Firmware nie czeka juz sztywno 100 ms na broadcast:

- 1 PID: cel 10 ms,
- 2-3 PID: cel 25 ms,
- 4-8 PID: cel 50 ms,
- wiecej: cel 100 ms.

To usuwa limit aplikacyjno-firmware'owy. Najwyzszy Hz uzyskasz przy jednym aktywnym PID; preset `Performance` jest szerszy i celuje bardziej w praktyczny log drogowy niz absolutne 100 Hz. Rzeczywisty Hz zalezy od czasu odpowiedzi ECU i stabilnosci magistrali.

## Stabilnosc WiFi

Firmware uruchamia LilyGO jako SoftAP `192.168.4.1`, kanal 6, jeden klient, bez power-save WiFi. Kolejka WebSocket ma mniejszy bufor, zeby nie zabierac RAM-u sterownikowi WiFi.

Na telefonie warto potwierdzic, ze system nie przelacza automatycznie z sieci `LilyGO_EDC17` na LTE/inne WiFi dlatego, ze AP nie ma internetu. Przy testach wysokiego Hz:

- `Raw CAN trace` off,
- `Performance logging` on,
- jeden aktywny PID,
- telefon blisko LilyGO i z wylaczonym automatycznym przelaczaniem WiFi, jesli system to wymusza.

## Bench vs auto

Bench czesto zwraca wartosci technicznie poprawne, ale niefizyczne: `-40 degC`, `255 km/h`, stale MAP/rail, zerowy runtime. Dlatego walidacja PID musi odrozniac:

- czy ECU odpowiada,
- czy wzor dekodowania dziala,
- czy wartosc ma sens w warunkach auta.

## Diagnostyka bledow CAN

Dashboard pokazuje:

- `CAN TX err`, `CAN RX err`,
- `CAN bus err`,
- `CAN TX fail`,
- `CAN RX missed`,
- `CAN arb lost`,
- `TWAI state`.

Przy `0 RX` i rosnacych bledach najpierw sprawdzic: bitrate, terminacje, CAN-H/CAN-L, zasilanie ECU, mase wspolna, ACK na magistrali oraz stan transceivera.
