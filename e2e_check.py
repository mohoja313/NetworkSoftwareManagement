"""End-to-end check against a running Network Software Hub (dev mode: OTP comes from server log)."""
import hashlib
import os
import random
import re
import sys
import time

import requests

BASE = os.environ.get("BASE_URL", "http://127.0.0.1:18080")
SERVER_LOG = os.environ.get("SERVER_LOG", "")
EMAIL = "e2e.tester@gmail.com"

s = requests.Session()
fails = []


def check(name, cond, extra=""):
    print(("PASS " if cond else "FAIL ") + name + ((" | " + str(extra)) if extra and not cond else ""))
    if not cond:
        fails.append(name)


def wait_server(timeout=60):
    for _ in range(timeout * 2):
        try:
            r = s.get(BASE + "/api/stats", timeout=3)
            if r.status_code == 200:
                return True
        except Exception:
            pass
        time.sleep(0.5)
    return False


def read_otp_from_log(email, timeout=30):
    pat = re.compile(r"DEV-MODE OTP for " + re.escape(email) + r" : code = (\d{6})")
    deadline = time.time() + timeout
    seen = set()
    while time.time() < deadline:
        try:
            with open(SERVER_LOG, encoding="utf-8", errors="replace") as f:
                for line in f:
                    if line in seen:
                        continue
                    seen.add(line)
                    m = pat.search(line)
                    if m:
                        return m.group(1)
        except FileNotFoundError:
            pass
        time.sleep(0.5)
    return None


print("BASE =", BASE)
check("server up", wait_server(), "server did not start")

# --- UI served ---
r = s.get(BASE + "/", timeout=10)
check("index served", r.status_code == 200 and "Network Software Hub" in r.text, r.status_code)

# --- auth: non-gmail rejected ---
r = s.post(BASE + "/api/auth/request-code", json={"email": "user@yahoo.com"}, timeout=10)
check("non-gmail rejected", r.status_code == 400, r.text[:120])

# --- auth: gmail OTP ---
r = s.post(BASE + "/api/auth/request-code", json={"email": EMAIL}, timeout=10)
check("request-code ok", r.status_code == 200, r.text[:200])
code = read_otp_from_log(EMAIL) if r.status_code == 200 else None
check("otp found in server log (dev mode)", bool(code))
token = None
if code:
    r = s.post(BASE + "/api/auth/verify-code", json={"email": EMAIL, "code": code}, timeout=10)
    check("verify-code ok + token", r.status_code == 200 and r.json().get("token"), r.text[:200])
    token = r.json().get("token") if r.status_code == 200 else None
    # wrong code now (row deleted) -> NOT_FOUND
    r = s.post(BASE + "/api/auth/verify-code", json={"email": EMAIL, "code": "000000"}, timeout=10)
    check("reused/consumed code rejected", r.status_code in (400, 429), r.text[:120])

# --- upload without login must fail ---
payload = bytes(random.getrandbits(8) for _ in range(3 * 1024 * 1024))  # 3 MiB
sha = hashlib.sha256(payload).hexdigest()
r = s.post(BASE + "/api/software",
           files={"file": ("persian-tool.v1.apk", payload)},
           data={"name": "Persian Tool", "version": "2.3.1",
                 "description": "End-to-end test upload", "platform": "ANDROID"},
           timeout=60)
check("unauthenticated upload rejected (401)", r.status_code == 401, r.status_code)

# --- authenticated upload ---
sw = None
if token:
    r = s.post(BASE + "/api/software",
               files={"file": ("persian-tool.v1.apk", payload)},
               data={"name": "Persian Tool", "version": "2.3.1",
                     "description": "End-to-end test upload \u2014 \u062a\u0633\u062a \u0641\u0627\u0631\u0633\u06cc",
                     "platform": "ANDROID"},
               headers={"Authorization": "Bearer " + token}, timeout=120)
    check("authenticated upload (201)", r.status_code == 201, r.text[:300])
    if r.status_code == 201:
        sw = r.json()
        check("sha256 matches", sw.get("sha256") == sha, sw.get("sha256"))
        check("publisher recorded", sw.get("publisher", {}).get("email") == EMAIL, sw)
        check("uploaderIp recorded", bool(sw.get("uploaderIp")), sw)
        check("platform label", sw.get("platform") == "ANDROID", sw)

    # wrong extension for platform
    r = s.post(BASE + "/api/software",
               files={"file": ("bad.exe", b"xx")},
               data={"name": "Bad", "version": "1.0", "platform": "ANDROID"},
               headers={"Authorization": "Bearer " + token}, timeout=30)
    check("extension mismatch rejected", r.status_code == 400, r.text[:160])

if sw:
    sid = sw["id"]
    # --- detail ---
    r = s.get(BASE + f"/api/software/{sid}", timeout=10)
    d = r.json() if r.status_code == 200 else {}
    check("detail shows publisher+ip+time",
          d.get("publisher", {}).get("email") == EMAIL and d.get("uploaderIp") and d.get("publishedAt"),
          r.text[:200])
    # --- search across everything ---
    r = s.get(BASE + "/api/software", params={"q": "persian"}, timeout=10)
    ids = [x["id"] for x in r.json().get("content", [])]
    check("search finds upload", sid in ids, ids)
    r = s.get(BASE + "/api/software", params={"platform": "WINDOWS", "q": "persian"}, timeout=10)
    check("platform filter excludes it", sid not in [x["id"] for x in r.json().get("content", [])])
    # --- download ---
    r = s.get(BASE + f"/api/software/{sid}/download", timeout=60)
    check("download bytes exact + attachment",
          r.status_code == 200 and r.content == payload
          and "attachment" in r.headers.get("Content-Disposition", ""), r.status_code)
    r = s.get(BASE + f"/api/software/{sid}/download", headers={"Range": "bytes=0-99"}, timeout=15)
    check("range resume (206)", r.status_code == 206 and len(r.content) == 100
          and r.headers.get("Content-Range", "").startswith("bytes 0-99/"), r.status_code)
    r = s.get(BASE + f"/api/software/{sid}", timeout=10)
    check("download counter bumped (>=2)", r.json().get("downloadCount", 0) >= 2, r.text[:160])
    # --- publishers + stats ---
    r = s.get(BASE + "/api/publishers", timeout=10)
    pubs = r.json() if r.status_code == 200 else []
    check("publishers list contains uploader", any(p.get("email") == EMAIL for p in pubs), len(pubs))
    if pubs:
        pid = next(p["id"] for p in pubs if p.get("email") == EMAIL)
        r = s.get(BASE + f"/api/publishers/{pid}", timeout=10)
        check("publisher detail", r.status_code == 200 and r.json().get("softwareCount", 0) >= 1, r.text[:160])
        r = s.get(BASE + "/api/software", params={"publisherId": pid}, timeout=10)
        check("publisher filter works", sid in [x["id"] for x in r.json().get("content", [])])
    r = s.get(BASE + "/api/stats", timeout=10)
    check("stats ok", r.status_code == 200 and r.json().get("totalSoftware", 0) >= 1, r.text[:160])

print()
if fails:
    print("FAILED:", fails)
    sys.exit(1)
print("ALL E2E CHECKS PASSED")
