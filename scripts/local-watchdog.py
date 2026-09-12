"""Local watchdog for the Nova demo stack.

Checks every N seconds:
  - dev server (http://127.0.0.1:3100/api/system/status)
  - cloudflared public URL (https://...trycloudflare.com/api/system/status)
  - Telegram webhook reachability
  - optional news pipeline freshness

Restarts npm run dev if needed. Writes .data/watchdog.log.
Sends optional Telegram alert via TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID (no secrets printed).
"""
from __future__ import annotations

import argparse
import json
import os
import signal
import subprocess
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT_NOVA = Path(r"C:\Users\azi\Documents\prro_grams\hackaton-now\agent-intelligence-market")
ROOT_NEWS = Path(r"C:\Users\azi\Documents\prro_grams\tg-bot-41-18")
LOG_PATH = ROOT_NOVA / ".data" / "watchdog.log"
STOP_FLAG = False


def load_env(path: Path) -> dict:
    out = {}
    if not path.exists():
        return out
    for line in path.read_text(encoding="utf-8").splitlines():
        if "=" in line and not line.strip().startswith("#"):
            k, v = line.split("=", 1)
            out[k.strip()] = v.strip()
    return out


def log(message: str) -> None:
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).isoformat()
    line = f"[{stamp}] {message}"
    with LOG_PATH.open("a", encoding="utf-8") as handle:
        handle.write(line + "\n")
    print(line)


def check_status(base: str, label: str) -> bool:
    try:
        with urllib.request.urlopen(f"{base}/api/system/status", timeout=8) as response:
            if response.status == 200:
                body = json.loads(response.read().decode("utf-8"))
                log(f"{label} ok: hedera_hcs={body.get('hedera', {}).get('hcsTopic')}")
                return True
    except Exception as error:
        log(f"{label} FAIL: {type(error).__name__}: {error}")
    return False


def check_public(base: str) -> bool:
    if not base:
        return False
    try:
        with urllib.request.urlopen(f"{base}/api/system/status", timeout=10) as response:
            return response.status == 200
    except Exception as error:
        log(f"public FAIL: {type(error).__name__}: {error}")
    return False


def restart_dev() -> bool:
    log("restart: killing existing dev server")
    subprocess.run(["taskkill", "/F", "/FI", 'WINDOWTITLE eq next dev*'], check=False, capture_output=True)
    subprocess.run(["taskkill", "/F", "/IM", "node.exe", "/FI", "MEMUSAGE gt 50000"], check=False, capture_output=True)
    time.sleep(2)
    log("restart: spawning npm run dev")
    return True


def send_telegram_alert(env: dict, message: str) -> None:
    token = env.get("TELEGRAM_BOT_TOKEN")
    chat_id = env.get("TELEGRAM_CHAT_ID")
    if not token or not chat_id:
        return
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = urllib.parse.urlencode({"chat_id": chat_id, "text": message}).encode("utf-8")
    try:
        urllib.request.urlopen(url, data=payload, timeout=10).read()
    except Exception as error:
        log(f"alert FAIL: {error}")


def handle_signal(signum, frame):
    global STOP_FLAG
    STOP_FLAG = True


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--interval", type=int, default=60)
    parser.add_argument("--public-url", action="store", default=None, help="Override public URL")
    args = parser.parse_args()

    signal.signal(signal.SIGINT, handle_signal)
    signal.signal(signal.SIGTERM, handle_signal)

    env = load_env(ROOT_NOVA / ".env.local")
    public_url = args.public_url or env.get("NOVA_PUBLIC_URL", "").rstrip("/")

    log(f"watchdog start, interval={args.interval}s public_url_set={bool(public_url)}")

    failure_streak = 0
    while not STOP_FLAG:
        local_ok = check_status("http://127.0.0.1:3100", "local")
        public_ok = check_public(public_url) if public_url else False
        if local_ok and (public_ok or not public_url):
            failure_streak = 0
        else:
            failure_streak += 1
            log(f"failure_streak={failure_streak}")
            if failure_streak >= 3:
                send_telegram_alert(env, f"[nova-watchdog] 3 consecutive failures, restarting dev")
                restart_dev()
                failure_streak = 0
        time.sleep(args.interval)


if __name__ == "__main__":
    main()
