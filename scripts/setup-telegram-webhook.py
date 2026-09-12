"""Register Telegram webhook for /api/telegram/webhook.
Reads TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_SECRET from .env.local via dotenv.
The base URL is the public URL of the dev server (cloudflared tunnel or Vercel).
No secret values are printed.
"""
from __future__ import annotations

import json
import os
import sys
import urllib.parse
import urllib.request
from pathlib import Path

import dotenv

ROOT = Path(__file__).resolve().parent.parent
dotenv.load_dotenv(ROOT / ".env.local")

BASE_URL = os.getenv("NOVA_PUBLIC_URL")
if not BASE_URL:
    print("NOVA_PUBLIC_URL is required (e.g. https://xxxx.trycloudflare.com)")
    sys.exit(1)
TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
SECRET = os.getenv("TELEGRAM_WEBHOOK_SECRET")
if not TOKEN:
    print("TELEGRAM_BOT_TOKEN is required in .env.local")
    sys.exit(1)

WEBHOOK_URL = f"{BASE_URL.rstrip('/')}/api/telegram/webhook"
API_BASE = f"https://api.telegram.org/bot{TOKEN}"

def call(method: str, params: dict) -> dict:
    query = urllib.parse.urlencode(params)
    with urllib.request.urlopen(f"{API_BASE}/{method}?{query}", timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))

info = call("getWebhookInfo", {})
print({"before": {"url": info.get("result", {}).get("url"), "pending": info.get("result", {}).get("pending_update_count"), "last_error": info.get("result", {}).get("last_error_message")}})

params = {"url": WEBHOOK_URL, "allowed_updates": json.dumps(["message", "channel_post"]), "drop_pending_updates": True}
if SECRET:
    params["secret_token"] = SECRET
result = call("setWebhook", params)
print({"setWebhook_ok": result.get("ok"), "description": result.get("description"), "url": WEBHOOK_URL})

info = call("getWebhookInfo", {})
print({"after": {"url": info.get("result", {}).get("url"), "pending": info.get("result", {}).get("pending_update_count"), "last_error": info.get("result", {}).get("last_error_message")}})
