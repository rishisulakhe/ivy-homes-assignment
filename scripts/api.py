"""Shared API helpers for the Ivy Homes assignment."""
import json
import time
import urllib.request
import urllib.error

BASE = "https://solve.ivy.homes"
API_KEY = "IVY26-D4BC016512F7"
DATA_DIR = "/home/rishisulakhe/ivy_homes/data"

_active_token = None
_refresh_token = None
_token_exp = 0.0


class ApiError(Exception):
    def __init__(self, status, detail, url):
        super().__init__(f"HTTP {status} on {url}: {detail}")
        self.status = status
        self.detail = detail
        self.url = url


def _raw(method, path, body=None, auth=True, api_key=True):
    url = BASE + path
    req = urllib.request.Request(url, method=method)
    if api_key:
        req.add_header("X-API-Key", API_KEY)
    if auth:
        req.add_header("Authorization", "Bearer " + _active_token)
    data = None
    if body is not None:
        data = json.dumps(body).encode()
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, data=data, timeout=60) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        try:
            detail = json.loads(e.read().decode())
        except Exception:
            detail = {"raw": "?"}
        raise ApiError(e.code, detail, url) from None


def login(email="demo1@ivy.homes", password="d376a9a8bb"):
    """Login and cache tokens in memory + on disk."""
    global _active_token, _refresh_token, _token_exp
    status, body = _raw("POST", "/auth/login", {"email": email, "password": password}, auth=False)
    _active_token = body["access_token"]
    _refresh_token = body.get("refresh_token")
    _token_exp = time.time() + body.get("expires_in", 900) - 30
    with open(f"{DATA_DIR}/login_state.json", "w") as f:
        json.dump({"email": email, **body}, f, indent=2)
    return body


def refresh():
    """Refresh the access token using the refresh token."""
    global _active_token, _refresh_token, _token_exp
    if not _refresh_token:
        return login()
    status, body = _raw("POST", "/auth/refresh", {"refresh_token": _refresh_token}, auth=False)
    _active_token = body["access_token"]
    _refresh_token = body.get("refresh_token", _refresh_token)
    _token_exp = time.time() + body.get("expires_in", 900) - 30
    return body


def call(method, path, body=None, retries=3):
    """Authenticated call with auto re-login/refresh on 401."""
    global _active_token, _refresh_token
    for attempt in range(retries):
        if _active_token is None or time.time() > _token_exp:
            if _refresh_token:
                try:
                    refresh()
                except ApiError:
                    login()
            else:
                login()
        try:
            return _raw(method, path, body)
        except ApiError as e:
            if e.status == 401 and attempt < retries - 1:
                _refresh_token = None
                _active_token = None
                continue
            raise


def get(path, **params):
    qs = "&".join(f"{k}={urllib.request.quote(str(v))}" for k, v in params.items() if v is not None)
    if qs:
        path = path + "?" + qs
    return call("GET", path)


def fetch_all(path, page_size=50, **params):
    """Page through a collection using limit/offset until has_more is False.

    Trusts the truthfulness of count/has_more per the brief. Returns (records, meta).
    """
    records = []
    offset = 0
    total_reported = None
    pages = 0
    while True:
        status, body = get(path, limit=page_size, offset=offset, **params)
        batch = body.get("results", [])
        records.extend(batch)
        total_reported = body.get("total")
        pages += 1
        if not body.get("has_more"):
            break
        if not batch:  # safety: has_more true but empty page => stop
            break
        offset += len(batch)
    return records, {"total_reported": total_reported, "pages": pages, "fetched": len(records)}


def save(name, obj):
    with open(f"{DATA_DIR}/{name}", "w") as f:
        json.dump(obj, f, indent=1)
    print(f"saved {name}: {len(obj) if isinstance(obj, list) else 'obj'}")


def load(name):
    with open(f"{DATA_DIR}/{name}") as f:
        return json.load(f)
