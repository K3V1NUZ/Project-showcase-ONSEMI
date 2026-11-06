import socket
import threading
import json
import time
import random
import ipaddress
from datetime import datetime, timezone

LOG_FILE = "tester.log"

# typ senzora -> zoznam parametrov (nazov, min, max, pocet desatinnych miest)
SENSOR_TYPES = {
    "ThermoNode": [("temperature", -50.0, 60.0, 1), ("humidity", 0.0, 100.0, 1),
                   ("dew_point", -50.0, 60.0, 1), ("pressure", 800.0, 1100.0, 2)],
    "WindSense": [("wind_speed", 0.0, 50.0, 1), ("wind_gust", 0.0, 70.0, 1),
                  ("wind_direction", 0, 359, 0), ("turbulence", 0.0, 1.0, 1)],
    "RainDetect": [("rainfall", 0.0, 500.0, 1), ("soil_moisture", 0.0, 100.0, 1),
                   ("flood_risk", 0, 3, 0), ("rain_duration", 0, 60, 0)],
    "AirQuality": [("co2", 300, 5000, 0), ("ozone", 0.0, 500.0, 1),
                   ("air_quality_index", 0, 500, 0)],
}

SEND_INTERVAL = 10     # s medzi automatickymi DATA spravami
ACK_TIMEOUT = 3        # s cakania na ACK
MAX_ATTEMPTS = 3       # 1x povodne + 2x opakovane
SESSION_TIMEOUT = 30   # s bez spravy od servera -> koniec relacie

log_to_console = False
log_lock = threading.Lock()

sock = None
server_addr = None
running = True
lock = threading.RLock()
sensors = {}   # sensor_id -> stav senzora


# ---------------- logovanie ----------------

def log(msg_type, level, source, text):
    now = datetime.now(timezone.utc)
    ts = now.strftime("%Y-%m-%dT%H:%M:%S.") + f"{now.microsecond // 1000:03d}Z"
    line = f"{ts} | {msg_type} | {level} | {source} | {text}"
    with log_lock:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(line + "\n")
        if log_to_console:
            print(line)


def to_json(msg):
    return json.dumps(msg, separators=(",", ":"))


def source(sensor_id):
    return f"TESTER:{sensors[sensor_id]['type']}:{sensor_id}"


# ---------------- kontrola integrity (CRC-16) ----------------

def crc16(data):
    crc = 0xFFFF
    for byte in data:
        crc ^= byte << 8
        for _ in range(8):
            if crc & 0x8000:
                crc = ((crc << 1) ^ 0x1021) & 0xFFFF
            else:
                crc = (crc << 1) & 0xFFFF
    return crc


def compute_crc(msg):
    without_crc = {k: v for k, v in msg.items() if k != "crc"}
    text = json.dumps(without_crc, sort_keys=True, separators=(",", ":"))
    return f"{crc16(text.encode('utf-8')):04x}"


# ---------------- odosielanie ----------------

def next_seq(s):
    s["seq"] += 1
    return s["seq"]


def send_raw(sensor_id, msg): # iba raw sprava (odpoved na KEEPALIVE)
    try:
        sock.sendto(to_json(msg).encode("utf-8"), server_addr)
        log("MESSAGE", "INFO", source(sensor_id), f"Sent {to_json(msg)}")
    except OSError as e:
        log("SYSTEM", "ERROR", source(sensor_id), f"Sending failed: {e}")


def send_with_ack(sensor_id, msg, wire_msg=None):
    # sprava caka na ACK, pri vyprsani sa posle znova (vid timer_loop)
    s = sensors[sensor_id]
    s["pending"][msg["seq"]] = {"msg": msg, "attempts": 1, "last_sent": time.time()}
    send_raw(sensor_id, wire_msg if wire_msg is not None else msg)


def random_values(sensor_type):
    values = {}
    for name, low, high, decimals in SENSOR_TYPES[sensor_type]:
        if decimals == 0:
            values[name] = random.randint(low, high)
        else:
            values[name] = round(random.uniform(low, high), decimals)
    return values


def send_data(sensor_id, values):
    s = sensors[sensor_id]
    msg = {"type": "DATA", "seq": next_seq(s), "sensor_id": sensor_id, "token": s["token"]}
    msg.update(values)
    msg["crc"] = compute_crc(msg)

    wire_msg = None
    if s["corrupt_next"]:
        # poskodime prvu hodnotu az po vypocte CRC -> server zisti chybu
        s["corrupt_next"] = False
        wire_msg = dict(msg)
        first_param = SENSOR_TYPES[s["type"]][0][0]
        wire_msg[first_param] = wire_msg[first_param] + 1
        log("SYSTEM", "WARNING", source(sensor_id), f"Error injected into DATA seq {msg['seq']}")
    send_with_ack(sensor_id, msg, wire_msg)


def remove_sensor(sensor_id, reason):
    log("SYSTEM", "WARNING", source(sensor_id), f"Session ended: {reason}")
    del sensors[sensor_id]


# ---------------- spracovanie prijatych sprav ----------------

def handle_message(msg):
    sensor_id = msg.get("sensor_id")
    with lock:
        if sensor_id not in sensors:
            log("MESSAGE", "WARNING", "TESTER", f"Received message for unknown sensor {to_json(msg)}")
            return
        s = sensors[sensor_id]
        log("MESSAGE", "INFO", source(sensor_id), f"Received {to_json(msg)}")
        s["last_from_server"] = time.time()

        try:
            msg_type = msg["type"]
            if msg_type == "ACK":
                p = s["pending"].pop(msg["ack_for"], None)
                if p is not None and p["msg"]["type"] == "REGISTER":
                    s["token"] = msg["token"]
                    s["registered"] = True
                    s["next_send"] = time.time() + SEND_INTERVAL
                    log("SYSTEM", "INFO", source(sensor_id), f"Registered, token {s['token']}")

            elif msg_type == "NACK":
                p = s["pending"].get(msg["nack_for"])
                if p is not None and p["attempts"] < MAX_ATTEMPTS:
                    p["attempts"] += 1
                    p["last_sent"] = time.time()
                    log("SYSTEM", "INFO", source(sensor_id),
                        f"Retransmission of seq {msg['nack_for']} requested by server")
                    send_raw(sensor_id, p["msg"])

            elif msg_type == "KEEPALIVE":
                send_raw(sensor_id, {"type": "ACK", "seq": next_seq(s), "ack_for": msg["seq"],
                                     "sensor_id": sensor_id, "token": s["token"]})

            elif msg_type == "REJECT":
                remove_sensor(sensor_id, f"rejected by server ({msg.get('reason')})")

        except (KeyError, TypeError) as e:
            log("SYSTEM", "WARNING", source(sensor_id), f"Invalid message from server ({e})")


# ---------------- vlakna ----------------

def receive_loop():
    while running:
        try:
            data, addr = sock.recvfrom(4096)
        except socket.timeout:
            continue
        except ConnectionResetError:
            # Windows: server nebezi (ICMP port unreachable)
            continue
        except OSError:
            break

        try:
            msg = json.loads(data.decode("utf-8"))
            if not isinstance(msg, dict):
                raise ValueError
        except ValueError:
            log("SYSTEM", "WARNING", "TESTER", f"Received unreadable message from {addr[0]}:{addr[1]}")
            continue
        handle_message(msg)


def timer_loop():
    while running:
        time.sleep(0.1)
        now = time.time()
        with lock:
            for sensor_id, s in list(sensors.items()):
                # opakovane odoslanie, ak neprislo ACK
                for seq, p in list(s["pending"].items()):
                    if now - p["last_sent"] < ACK_TIMEOUT:
                        continue
                    if p["attempts"] >= MAX_ATTEMPTS:
                        del s["pending"][seq]
                        log("SYSTEM", "WARNING", source(sensor_id),
                            f"No ACK for {p['msg']['type']} seq {seq} after {MAX_ATTEMPTS} attempts, message dropped")
                        if p["msg"]["type"] == "REGISTER":
                            remove_sensor(sensor_id, "registration failed")
                            break
                    else:
                        p["attempts"] += 1
                        p["last_sent"] = now
                        log("SYSTEM", "INFO", source(sensor_id),
                            f"No ACK for seq {seq}, sending again (attempt {p['attempts']}/{MAX_ATTEMPTS})")
                        send_raw(sensor_id, p["msg"])

                if sensor_id not in sensors or not s["registered"]:
                    continue

                # casovac relacie
                if now - s["last_from_server"] >= SESSION_TIMEOUT:
                    remove_sensor(sensor_id, f"no message from server for {SESSION_TIMEOUT} s")
                    continue

                # automaticke odosielanie dat
                if s["auto_send"] and now >= s["next_send"]:
                    s["next_send"] = now + SEND_INTERVAL
                    send_data(sensor_id, random_values(s["type"]))


# ---------------- menu ----------------

def setup_connection():
    global sock, server_addr
    ip = input("Server IP: ").strip()
    try:
        if ipaddress.ip_address(ip).version != 4:
            raise ValueError
    except ValueError:
        print("Invalid IPv4 address.")
        return
    try:
        port = int(input("Server port [9000]: ").strip() or "9000")
        if not 1 <= port <= 65535:
            raise ValueError
    except ValueError:
        print("Invalid port (1-65535).")
        return

    if sock is None:
        try:
            local_port = int(input("Local port [0 = automatic]: ").strip() or "0")
            if not 0 <= local_port <= 65535:
                raise ValueError
        except ValueError:
            print("Invalid port (0-65535).")
            return
        new_sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        try:
            new_sock.bind(("0.0.0.0", local_port))
        except OSError as e:
            new_sock.close()
            print(f"Cannot use local port {local_port}, port is in use.")
            log("SYSTEM", "ERROR", "TESTER", f"Cannot bind local port {local_port}: {e}")
            return
        new_sock.settimeout(1.0)
        sock = new_sock
        threading.Thread(target=receive_loop, daemon=True).start()
        threading.Thread(target=timer_loop, daemon=True).start()
        log("SYSTEM", "INFO", "TESTER", f"Local socket bound to port {sock.getsockname()[1]}")

    server_addr = (ip, port)
    log("SYSTEM", "INFO", "TESTER", f"Server address set to {ip}:{port}")


def register_sensor():
    if sock is None:
        print("Set the server address first.")
        return
    names = list(SENSOR_TYPES)
    for i, name in enumerate(names, 1):
        print(f"{i}. {name}")
    try:
        choice = int(input("Sensor type: "))
        if not 1 <= choice <= len(names):
            raise ValueError
    except ValueError:
        print("Invalid choice.")
        return
    sensor_type = names[choice - 1]
    sensor_id = input("Sensor ID (e.g. T-01): ").strip()
    if not sensor_id:
        print("ID cannot be empty.")
        return

    with lock:
        if sensor_id in sensors:
            print("Sensor with this ID already exists.")
            return
        sensors[sensor_id] = {
            "type": sensor_type,
            "token": None,
            "registered": False,
            "seq": 0,
            "auto_send": True,
            "next_send": 0,
            "corrupt_next": False,
            "last_from_server": time.time(),
            "pending": {},
        }
        s = sensors[sensor_id]
        send_with_ack(sensor_id, {"type": "REGISTER", "seq": next_seq(s),
                                  "sensor_type": sensor_type, "sensor_id": sensor_id})


def choose_sensor():
    with lock:
        registered = [sid for sid, s in sensors.items() if s["registered"]]
    if not registered:
        print("No registered sensors.")
        return None
    print("Registered sensors: " + ", ".join(registered))
    sensor_id = input("Sensor ID: ").strip()
    if sensor_id not in registered:
        print("Unknown sensor.")
        return None
    return sensor_id


def toggle_sending():
    sensor_id = choose_sensor()
    if sensor_id is None:
        return
    with lock:
        if sensor_id not in sensors:
            return
        s = sensors[sensor_id]
        s["auto_send"] = not s["auto_send"]
        s["next_send"] = time.time() + SEND_INTERVAL
        state = "on" if s["auto_send"] else "off"
        log("SYSTEM", "INFO", source(sensor_id), f"Automatic sending turned {state}")


def custom_data():
    sensor_id = choose_sensor()
    if sensor_id is None:
        return
    values = {}
    for name, low, high, decimals in SENSOR_TYPES[sensors[sensor_id]["type"]]:
        while True:
            text = input(f"{name} ({low} - {high}): ").strip()
            try:
                value = int(text) if decimals == 0 else round(float(text), decimals)
            except ValueError:
                print("Invalid number." + (" Whole number expected." if decimals == 0 else ""))
                continue
            if low <= value <= high:
                values[name] = value
                break
            print("Value is out of range.")
    with lock:
        if sensor_id in sensors:
            send_data(sensor_id, values)


def inject_error():
    sensor_id = choose_sensor()
    if sensor_id is None:
        return
    with lock:
        if sensor_id in sensors:
            sensors[sensor_id]["corrupt_next"] = True
            log("SYSTEM", "INFO", source(sensor_id), "Next DATA message will be corrupted")


def end_session():
    sensor_id = choose_sensor()
    if sensor_id is None:
        return
    with lock:
        if sensor_id in sensors:
            remove_sensor(sensor_id, "ended by user")


def show_sensors():
    with lock:
        if not sensors:
            print("No sensors.")
        for sensor_id, s in sensors.items():
            state = "registered" if s["registered"] else "registering"
            sending = "on" if s["auto_send"] else "off"
            print(f"{s['type']}:{sensor_id}  {state}  token={s['token']}  sending={sending}")


def main():
    global log_to_console, running
    log("SYSTEM", "INFO", "TESTER", "Tester program started")
    while True:
        print("\n--- TESTER ---")
        print("1. Set server address")
        print("2. Register sensor")
        print("3. Turn automatic sending on/off")
        print("4. Send custom data")
        print("5. Inject error into next DATA message")
        print("6. End sensor session")
        print("7. Show sensors")
        print(f"8. Console logging on/off (now {'on' if log_to_console else 'off'})")
        print("0. Exit")
        try:
            choice = input("> ").strip()
            if choice == "1":
                setup_connection()
            elif choice == "2":
                register_sensor()
            elif choice == "3":
                toggle_sending()
            elif choice == "4":
                custom_data()
            elif choice == "5":
                inject_error()
            elif choice == "6":
                end_session()
            elif choice == "7":
                show_sensors()
            elif choice == "8":
                log_to_console = not log_to_console
            elif choice == "0":
                break
            else:
                print("Unknown choice.")
        except (EOFError, KeyboardInterrupt):
            break

    running = False
    if sock is not None:
        sock.close()
    log("SYSTEM", "INFO", "TESTER", "Tester stopped")


if __name__ == "__main__":
    main()
