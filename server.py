"""
VALORANT ASCEND — deployable backend (Python stdlib only, no pip installs)

Serves the static app and adds:
  - Optional passphrase gate (APP_PASSPHRASE env). No env var = open (local dev).
  - Signed, stateless session cookie (HMAC, 7 days). Survives restarts.
  - /api/state GET/PUT  — server-side progress sync (JSON file, atomic writes).
  - /api/henrik/*       — proxy to the HenrikDev API with the key held
                          server-side (HDEV_API_KEY env). Key never reaches
                          the browser. Whitelisted paths only.
  - Security headers (CSP, nosniff, frame denial) on every response.
  - Login rate limiting (5 attempts / 15 min per IP).

Env vars:
  PORT            port to listen on (default 8150)
  APP_PASSPHRASE  enables the login gate when set
  HDEV_API_KEY    enables the HenrikDev proxy when set
  DATA_DIR        where state.json lives (default ./data)

Render free-tier note: the disk is ephemeral, so state.json can vanish on
redeploys. The client keeps a full local copy and re-pushes automatically,
so the newest device always self-heals the server. Good enough for one user.
"""

import hashlib
import hmac
import json
import os
import re
import sys
import time
import urllib.request
import urllib.error
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from http import cookies

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.environ.get("DATA_DIR", os.path.join(BASE_DIR, "data"))
STATE_FILE = os.path.join(DATA_DIR, "state.json")
PORT = int(os.environ.get("PORT", "8150"))

PASSPHRASE = os.environ.get("APP_PASSPHRASE", "")
AUTH_ENABLED = bool(PASSPHRASE)
HDEV_KEY = os.environ.get("HDEV_API_KEY", "")

SECRET = hashlib.sha256(("va-secret:" + PASSPHRASE).encode()).digest()
SESSION_TTL = 7 * 24 * 3600
COOKIE_NAME = "va_session"

HENRIK_BASE = "https://api.henrikdev.xyz/valorant/"
HENRIK_ALLOWED = re.compile(
    r"^(v[123]/(account|mmr|matches|mmr-history|by-puuid/mmr)/[A-Za-z0-9 ._#%&'\-\/]+"
    r"|v[12]/store-featured|v[12]/store-offers)$"
)
MAX_STATE_BYTES = 512 * 1024

# ---- login rate limiting (in-memory) ----
_attempts = {}  # ip -> [timestamps]
RATE_MAX = 5
RATE_WINDOW = 15 * 60


def rate_limited(ip):
    now = time.time()
    hits = [t for t in _attempts.get(ip, []) if now - t < RATE_WINDOW]
    _attempts[ip] = hits
    return len(hits) >= RATE_MAX


def note_attempt(ip):
    _attempts.setdefault(ip, []).append(time.time())


# ---- signed cookie helpers ----
def make_token():
    exp = str(int(time.time()) + SESSION_TTL)
    sig = hmac.new(SECRET, exp.encode(), hashlib.sha256).hexdigest()
    return exp + "." + sig


def token_valid(token):
    try:
        exp, sig = token.split(".", 1)
        good = hmac.new(SECRET, exp.encode(), hashlib.sha256).hexdigest()
        return hmac.compare_digest(sig, good) and int(exp) > time.time()
    except Exception:
        return False


def atomic_write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(text)
    os.replace(tmp, path)


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    # ---------- helpers ----------
    def client_ip(self):
        fwd = self.headers.get("X-Forwarded-For", "")
        return fwd.split(",")[0].strip() if fwd else self.client_address[0]

    def is_https(self):
        return self.headers.get("X-Forwarded-Proto", "").lower() == "https"

    def authed(self):
        if not AUTH_ENABLED:
            return True
        raw = self.headers.get("Cookie", "")
        try:
            jar = cookies.SimpleCookie(raw)
            if COOKIE_NAME in jar:
                return token_valid(jar[COOKIE_NAME].value)
        except Exception:
            pass
        return False

    def security_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "no-referrer")
        # login page uses a small inline script; everything else stays strict
        script_src = "'self' 'unsafe-inline'" if getattr(self, "_login_csp", False) \
            else "'self' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net"
        self.send_header(
            "Content-Security-Policy",
            "default-src 'self'; "
            f"script-src {script_src}; "
            "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com; "
            "font-src https://fonts.gstatic.com https://cdn.jsdelivr.net; "
            "img-src 'self' data: https:; "
            "connect-src 'self' https://api.henrikdev.xyz; "
            "frame-ancestors 'none'"
        )

    def end_headers(self):
        self.security_headers()
        if getattr(self, "_static_nocache", False):
            self.send_header("Cache-Control", "no-cache")
            self._static_nocache = False
        super().end_headers()

    def send_json(self, code, obj, extra_headers=None):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        for k, v in (extra_headers or {}).items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)

    def read_body(self, limit):
        try:
            n = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            return None
        if n <= 0 or n > limit:
            return None
        return self.rfile.read(n)

    def serve_login_page(self):
        self._login_csp = True
        path = os.path.join(BASE_DIR, "login.html")
        try:
            with open(path, "rb") as f:
                body = f.read()
        except OSError:
            body = b"<h1>Login required</h1>"
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def cookie_header(self, value, max_age):
        parts = [
            f"{COOKIE_NAME}={value}",
            "Path=/",
            "HttpOnly",
            "SameSite=Lax",
            f"Max-Age={max_age}",
        ]
        if self.is_https():
            parts.append("Secure")
        return "; ".join(parts)

    # ---------- routing ----------
    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path.startswith("/api/henrik/"):
            return self.handle_henrik()
        if path == "/api/state":
            return self.handle_state_get()
        if path == "/auth/status":
            return self.send_json(200, {"auth": AUTH_ENABLED, "ok": self.authed(),
                                        "proxy": bool(HDEV_KEY)})
        if AUTH_ENABLED and not self.authed():
            return self.serve_login_page()
        # never serve server internals as static files
        if path.startswith("/data/") or path.endswith(".py"):
            return self.send_json(404, {"error": "not found"})
        # always revalidate app code so deploys take effect immediately
        self._static_nocache = path.endswith((".js", ".css", ".html")) or path == "/"
        return super().do_GET()

    def do_POST(self):
        path = self.path.split("?", 1)[0]
        if path == "/auth/login":
            return self.handle_login()
        if path == "/auth/logout":
            return self.send_json(200, {"ok": True},
                                  {"Set-Cookie": self.cookie_header("x", 0)})
        self.send_json(404, {"error": "not found"})

    def do_PUT(self):
        path = self.path.split("?", 1)[0]
        if path == "/api/state":
            return self.handle_state_put()
        self.send_json(404, {"error": "not found"})

    # ---------- handlers ----------
    def handle_login(self):
        if not AUTH_ENABLED:
            return self.send_json(200, {"ok": True})
        ip = self.client_ip()
        if rate_limited(ip):
            return self.send_json(429, {"error": "Too many attempts. Wait 15 minutes."})
        body = self.read_body(4096)
        if body is None:
            return self.send_json(400, {"error": "bad request"})
        try:
            supplied = json.loads(body).get("passphrase", "")
        except Exception:
            return self.send_json(400, {"error": "bad request"})
        note_attempt(ip)
        if hmac.compare_digest(supplied.encode(), PASSPHRASE.encode()):
            _attempts.pop(ip, None)
            return self.send_json(200, {"ok": True},
                                  {"Set-Cookie": self.cookie_header(make_token(), SESSION_TTL)})
        return self.send_json(401, {"error": "Wrong passphrase."})

    def handle_state_get(self):
        if not self.authed():
            return self.send_json(401, {"error": "unauthorized"})
        try:
            with open(STATE_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
        except (OSError, ValueError):
            data = {}
        self.send_json(200, data)

    def handle_state_put(self):
        if not self.authed():
            return self.send_json(401, {"error": "unauthorized"})
        body = self.read_body(MAX_STATE_BYTES)
        if body is None:
            return self.send_json(400, {"error": "missing or oversized body"})
        try:
            data = json.loads(body)
            if not isinstance(data, dict):
                raise ValueError
        except ValueError:
            return self.send_json(400, {"error": "invalid JSON"})
        atomic_write(STATE_FILE, json.dumps(data))
        self.send_json(200, {"ok": True})

    def handle_henrik(self):
        if not self.authed():
            return self.send_json(401, {"error": "unauthorized"})
        raw = self.path[len("/api/henrik/"):]
        pathpart, _, query = raw.partition("?")
        # decode %20 etc for whitelist check but keep original for upstream
        from urllib.parse import unquote
        decoded = unquote(pathpart)
        if ".." in decoded or not HENRIK_ALLOWED.match(decoded):
            return self.send_json(403, {"error": "path not allowed"})
        if not HDEV_KEY:
            return self.send_json(501, {"error": "no server key"})
        url = HENRIK_BASE + pathpart + (("?" + query) if query else "")
        req = urllib.request.Request(url, headers={
            "Authorization": HDEV_KEY,
            "User-Agent": "valorant-ascend-personal",
        })
        try:
            with urllib.request.urlopen(req, timeout=20) as res:
                body = res.read()
                self.send_response(res.status)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(body)))
                self.send_header("Cache-Control", "no-store")
                self.end_headers()
                self.wfile.write(body)
        except urllib.error.HTTPError as e:
            body = e.read()
            self.send_response(e.code)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        except Exception:
            self.send_json(502, {"error": "upstream unreachable"})

    def log_message(self, fmt, *args):
        sys.stderr.write("%s - %s\n" % (self.client_ip(), fmt % args))


def main():
    os.makedirs(DATA_DIR, exist_ok=True)
    srv = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print(f"VALORANT ASCEND on :{PORT} | auth={'ON' if AUTH_ENABLED else 'off'} | proxy={'ON' if HDEV_KEY else 'off'}")
    srv.serve_forever()


if __name__ == "__main__":
    main()
