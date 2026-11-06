import socket
import threading
import json
import time
import secrets
import ipaddress
from datetime import datetime, timezone

LOG_FILE = "server.log"
SENSOR_TYPES = ["ThermoNode", "WindSense", "RainDetect", "AirQuality"]

IDLE_TIMEOUT = 15        # s bez dat -> SENSOR IDLE
KEEPALIVE_INTERVAL = 5   # s medzi KEEPALIVE spravami
MAX_KEEPALIVES = 3       # po 3 neodpovedanych -> SENSOR DISCONNECTED

log_to_console = False
log_lock = threading.Lock()

sock = None
running = False
lock = threading.RLock()
sessions = {}       # sensor_id -> udaje o relacii
suppress_ack = {}   # sensor_id -> kolko DATA sprav nepotvrdit (UAT5)
server_seq = 0


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
    # CRC sa pocita zo vsetkych poli spravy okrem pola "crc"
    without_crc = {k: v for k, v in msg.items() if k != "crc"}
    text = json.dumps(without_crc, sort_keys=True, separators=(",", ":"))
    return f"{crc16(text.encode('utf-8')):04x}"


# ---------------- odosielanie ----------------

def next_seq():
    global server_seq
    server_seq += 1
    return server_seq


def send_msg(msg, addr):
    try:
        sock.sendto(to_json(msg).encode("utf-8"), addr)
        log("MESSAGE", "INFO", "SERVER", f"Sent to {addr[0]}:{addr[1]} {to_json(msg)}")
    except OSError as e:
        log("SYSTEM", "ERROR", "SERVER", f"Sending to {addr[0]}:{addr[1]} failed: {e}")


def send_keepalive(sensor_id, s):
    s["unanswered"] += 1
    s["last_keepalive"] = time.time()
    send_msg({"type": "KEEPALIVE", "seq": next_seq(), "sensor_id": sensor_id,
              "token": s["token"]}, s["addr"])


# ---------------- spracovanie prijatych sprav ----------------

def handle_register(msg, addr):
    sensor_type = msg["sensor_type"]
    sensor_id = msg["sensor_id"]
    seq = msg["seq"]

    if sensor_type not in SENSOR_TYPES:
        log("SYSTEM", "WARNING", "SERVER", f"Registration rejected, unknown sensor type {sensor_type}")
        send_msg({"type": "REJECT", "seq": next_seq(), "reject_for": seq, "sensor_id": sensor_id,
                  "reason": "unknown sensor type"}, addr)
        return

    old = sessions.get(sensor_id)
    if old is not None:
        if old["addr"] == addr and old["reg_seq"] == seq:
            # opakovana registracia (nase ACK sa stratilo) -> posleme ACK znova
            send_msg({"type": "ACK", "seq": next_seq(), "ack_for": seq, "sensor_id": sensor_id,
                      "token": old["token"]}, addr)
        else:
            log("SYSTEM", "WARNING", "SERVER", f"Registration rejected, duplicate sensor id {sensor_id}")
            send_msg({"type": "REJECT", "seq": next_seq(), "reject_for": seq, "sensor_id": sensor_id,
                      "reason": "duplicate sensor id"}, addr)
        return

    token = secrets.token_hex(4)
    sessions[sensor_id] = {
        "type": sensor_type,
        "token": token,
        "addr": addr,
        "reg_seq": seq,
        "last_seq": seq,
        "last_data": time.time(),
        "idle": False,
        "unanswered": 0,
        "last_keepalive": 0,
        "values": {},
    }
    log("SYSTEM", "INFO", "SERVER", f"Sensor registered: {sensor_type}:{sensor_id}, token {token}")
    send_msg({"type": "ACK", "seq": next_seq(), "ack_for": seq, "sensor_id": sensor_id,
              "token": token}, addr)


def handle_data(msg, addr):
    sensor_id = msg["sensor_id"]
    seq = msg["seq"]
    s = sessions.get(sensor_id)

    # neplatny token -> sprava je zamietnuta
    if s is None or s["token"] != msg.get("token"):
        log("SYSTEM", "WARNING", "SERVER", f"Invalid token from sensor {sensor_id}, message rejected")
        send_msg({"type": "REJECT", "seq": next_seq(), "reject_for": seq, "sensor_id": sensor_id,
                  "reason": "invalid token"}, addr)
        return

    name = f"{s['type']}:{sensor_id}"

    # UAT5 - server zamerne nepotvrdi x DATA sprav
    if suppress_ack.get(sensor_id, 0) > 0:
        suppress_ack[sensor_id] -= 1
        log("SYSTEM", "NOTICE", "SERVER",
            f"ACK suppressed for {name} seq {seq} (remaining {suppress_ack[sensor_id]})")
        return

    # kontrola integrity
    if msg.get("crc") != compute_crc(msg):
        log("SYSTEM", "WARNING", "SERVER", f"Integrity check failed for {name} retransmission requested")
        send_msg({"type": "NACK", "seq": next_seq(), "nack_for": seq, "sensor_id": sensor_id,
                  "token": s["token"]}, addr)
        return

    s["last_data"] = time.time()
    s["unanswered"] = 0
    if s["idle"]:
        s["idle"] = False
        log("SYSTEM", "INFO", "SERVER", f"SENSOR ACTIVE: {name}")

    if seq <= s["last_seq"]:
        # duplicitna sprava (stratilo sa ACK) - neulozime ju znova, iba potvrdime
        log("SYSTEM", "INFO", "SERVER", f"Duplicate DATA seq {seq} from {name}, ACK sent again")
    else:
        s["last_seq"] = seq
        values = {k: v for k, v in msg.items() if k not in ("type", "seq", "sensor_id", "token", "crc")}
        s["values"] = values
        log("SYSTEM", "INFO", "SERVER", f"Data from {name}: {to_json(values)}")

    send_msg({"type": "ACK", "seq": next_seq(), "ack_for": seq, "sensor_id": sensor_id}, addr)


def handle_ack(msg, addr):
    # senzor odpoveda na KEEPALIVE
    s = sessions.get(msg["sensor_id"])
    if s is not None and s["token"] == msg.get("token"):
        s["unanswered"] = 0


def handle_message(msg, addr):
    with lock:
        try:
            msg_type = msg["type"]
            if msg_type == "REGISTER":
                handle_register(msg, addr)
            elif msg_type == "DATA":
                handle_data(msg, addr)
            elif msg_type == "ACK":
                handle_ack(msg, addr)
            else:
                log("SYSTEM", "WARNING", "SERVER", f"Unknown message type {msg_type}")
        except (KeyError, TypeError, ValueError) as e:
            log("SYSTEM", "WARNING", "SERVER", f"Invalid message from {addr[0]}:{addr[1]} ({e})")


# ---------------- vlakna ----------------

def receive_loop():
    while running:
        try:
            data, addr = sock.recvfrom(4096)
        except socket.timeout:
            continue
        except ConnectionResetError:
            # Windows: ICMP port unreachable z predchadzajuceho odoslania
            continue
        except OSError:
            break

        try:
            msg = json.loads(data.decode("utf-8"))
            if not isinstance(msg, dict):
                raise ValueError
        except ValueError:
            log("SYSTEM", "WARNING", "SERVER", f"Received unreadable message from {addr[0]}:{addr[1]}")
            continue

        log("MESSAGE", "INFO", "SERVER", f"Received from {addr[0]}:{addr[1]} {to_json(msg)}")
        handle_message(msg, addr)


def timer_loop():
    while running:
        time.sleep(0.2)
        now = time.time()
        with lock:
            for sensor_id, s in list(sessions.items()):
                name = f"{s['type']}:{sensor_id}"
                if not s["idle"]:
                    if now - s["last_data"] >= IDLE_TIMEOUT:
                        s["idle"] = True
                        log("SYSTEM", "WARNING", "SERVER", f"SENSOR IDLE: {name}")
                        send_keepalive(sensor_id, s)
                elif now - s["last_keepalive"] >= KEEPALIVE_INTERVAL:
                    if s["unanswered"] >= MAX_KEEPALIVES:
                        del sessions[sensor_id]
                        suppress_ack.pop(sensor_id, None)
                        log("SYSTEM", "WARNING", "SERVER",
                            f"SENSOR DISCONNECTED: {name}, token {s['token']} invalidated")
                    else:
                        send_keepalive(sensor_id, s)


# ---------------- menu ----------------

def ask_ip(prompt, default):
    text = input(prompt).strip() or default
    try:
        if ipaddress.ip_address(text).version != 4:
            raise ValueError
    except ValueError:
        print("Invalid IPv4 address.")
        return None
    return text


def ask_port(prompt, default):
    text = input(prompt).strip() or str(default)
    try:
        port = int(text)
        if not 1 <= port <= 65535:
            raise ValueError
    except ValueError:
        print("Invalid port (1-65535).")
        return None
    return port


def start_server():
    global sock, running
    if running:
        print("Server is already running.")
        return
    ip = ask_ip("Listening IP [0.0.0.0]: ", "0.0.0.0")
    if ip is None:
        return
    port = ask_port("Port [9000]: ", 9000)
    if port is None:
        return

    new_sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        new_sock.bind((ip, port))
    except OSError as e:
        new_sock.close()
        print(f"Cannot listen on {ip}:{port}, port is in use or address is not available.")
        log("SYSTEM", "ERROR", "SERVER", f"Cannot bind {ip}:{port}: {e}")
        return
    new_sock.settimeout(1.0)
    sock = new_sock
    running = True
    threading.Thread(target=receive_loop, daemon=True).start()
    threading.Thread(target=timer_loop, daemon=True).start()
    log("SYSTEM", "INFO", "SERVER", f"Server listening on {ip}:{port}")
    print(f"Server listening on {ip}:{port}")


def show_sensors():
    with lock:
        if not sessions:
            print("No registered sensors.")
            return
        for sensor_id, s in sessions.items():
            state = "IDLE" if s["idle"] else "ACTIVE"
            print(f"{s['type']}:{sensor_id}  token={s['token']}  {state}  {to_json(s['values'])}")


def suppress_menu():
    sensor_id = input("Sensor ID: ").strip()
    with lock:
        if sensor_id not in sessions:
            print("Sensor is not registered.")
            return
    try:
        count = int(input("How many DATA messages not to acknowledge: "))
        if count < 1:
            raise ValueError
    except ValueError:
        print("Invalid number.")
        return
    with lock:
        suppress_ack[sensor_id] = count
    log("SYSTEM", "INFO", "SERVER", f"Next {count} DATA messages from {sensor_id} will not be acknowledged")


def main():
    global log_to_console, running
    log("SYSTEM", "INFO", "SERVER", "Server program started")
    while True:
        print("\n--- SERVER ---")
        print("1. Start listening")
        print("2. Show sensors")
        print("3. Do not acknowledge next x DATA messages of a sensor")
        print(f"4. Console logging on/off (now {'on' if log_to_console else 'off'})")
        print("0. Exit")
        try:
            choice = input("> ").strip()
            if choice == "1":
                start_server()
            elif choice == "2":
                show_sensors()
            elif choice == "3":
                suppress_menu()
            elif choice == "4":
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
    log("SYSTEM", "INFO", "SERVER", "Server stopped")


if __name__ == "__main__":
    main()
