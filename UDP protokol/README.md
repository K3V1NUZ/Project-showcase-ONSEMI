# UDP protokol

Vlastný spoľahlivý protokol nad UDP pre sieť meteo senzorov.
`server.py` registruje senzory a prijíma ich dáta, `tester.py` simuluje
jeden alebo viac senzorov. Protokol rieši registráciu s tokenom, kontrolu
integrity (CRC-16), potvrdzovanie a opakované odoslanie (ACK/NACK) a
sledovanie nečinnosti (KEEPALIVE).

**Technológie:** Python, len štandardná knižnica

## Spustenie

Potrebné: **Python 3.8+**, nič netreba inštalovať. Spusti v dvoch termináloch:

```bash
python server.py
```

V menu zvoľ `1` a potvrď predvolené hodnoty Enterom (port 9000).

```bash
python tester.py
```

1. `1` – zadaj IP `127.0.0.1`, ostatné Enter
2. `2` – vyber typ senzora a zadaj ID (napr. `T-01`)

Senzor sa zaregistruje a každých 10 s posiela dáta. Na serveri ich zobrazí voľba `2`.
