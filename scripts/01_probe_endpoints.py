"""Probe every documented endpoint + a few suspects, log results as JSON."""
import json
import sys

sys.path.insert(0, "/home/rishisulakhe/ivy_homes/scripts")
import api

out = []

def probe(label, fn):
    try:
        result = fn()
        out.append({"probe": label, "ok": True, "result": result})
        print(f"[OK]   {label}: {json.dumps(result)[:300]}")
    except api.ApiError as e:
        out.append({"probe": label, "ok": False, "status": e.status, "detail": e.detail})
        print(f"[{e.status}] {label}: {str(e.detail)[:200]}")
    except Exception as e:
        out.append({"probe": label, "ok": False, "error": str(e)})
        print(f"[ERR]  {label}: {e}")

api.login()

# --- endpoint existence, as documented ---
probe("GET /v1/listing/{id} (doc: singular path)", lambda: api.get("/v1/listing/SQU-5004678")[1])
probe("GET /v1/listings/{id}", lambda: api.get("/v1/listings/SQU-5004678")[1])
probe("GET /v1/listings/{id}/similar", lambda: api.get("/v1/listings/SQU-5004678/similar")[1])
probe("GET /v1/rentals (limit 2)", lambda: {k: api.get("/v1/rentals", limit=2)[1][k] for k in ["limit", "offset", "count", "total", "has_more"]})
probe("GET /v1/rentals/{id} (need real id first)", lambda: api.get("/v1/rentals/UNKNOWN")[1])
probe("GET /v1/projects (limit 2)", lambda: {k: api.get("/v1/projects", limit=2)[1][k] for k in ["limit", "offset", "count", "total", "has_more"]})
probe("GET /v1/projects/P50244", lambda: api.get("/v1/projects/P50244")[1])
probe("GET /v1/favourites", lambda: api.get("/v1/favourites")[1])
probe("GET /v1/analytics/summary", lambda: api.get("/v1/analytics/summary")[1])
probe("POST /auth/logout then re-login", lambda: api.call("POST", "/auth/logout"))

# --- undocumented suspects ---
probe("GET /v1/analytics (bare)", lambda: api.get("/v1/analytics")[1])
probe("GET /v1/city", lambda: api.get("/v1/city")[1])
probe("GET /v1/localities", lambda: api.get("/v1/localities")[1])

# re-login after logout
api.login()
out.append({"note": "re-logged in after logout probe"})

with open("/home/rishisulakhe/ivy_homes/results/01_endpoint_probe.json", "w") as f:
    json.dump(out, f, indent=2)
print("\nsaved results/01_endpoint_probe.json")
