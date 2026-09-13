"""Hunt for real paths of missing endpoints: favourites, similar, analytics."""
import json
import sys

sys.path.insert(0, "/home/rishisulakhe/ivy_homes/scripts")
import api

out = []

def try_all(label, variants, method="GET", body=None):
    for v in variants:
        try:
            status, resp = api.call(method, v, body)
            out.append({"what": label, "path": v, "method": method, "status": status, "resp": resp})
            print(f"[{status}] {method} {v} -> {json.dumps(resp)[:200]}")
            return v
        except api.ApiError as e:
            out.append({"what": label, "path": v, "method": method, "status": e.status, "detail": e.detail})
            print(f"[{e.status}] {method} {v} -> {str(e.detail)[:120]}")
    return None

api.login()

fav = try_all("favourites", [
    "/v1/favorites",
    "/v1/favourite",
    "/v1/favorites/list",
    "/v1/saved",
    "/v1/saved-listings",
    "/v1/wishlist",
    "/v1/bookmarks",
])
sim = try_all("similar listings", [
    "/v1/listings/SQU-5004678/comparables",
    "/v1/listings/SQU-5004678/compare",
    "/v1/listings/SQU-5004678/recommendations",
    "/v1/listings/SQU-5004678/nearby",
    "/v1/similar/SQU-5004678",
])
ana = try_all("analytics", [
    "/v1/analytics/overview",
    "/v1/analytics/city",
    "/v1/analytics/market",
    "/v1/analytics/summary/",
    "/v1/analytics/insights",
    "/v1/insights",
    "/v1/stats",
    "/v1/summary",
    "/v1/analytics/dashboard",
])
other = try_all("city info", [
    "/v1/me",
    "/v1/profile",
    "/v1/analytics/localities",
    "/v1/localities/malad west",
])

with open("/home/rishisulakhe/ivy_homes/results/02_path_hunt.json", "w") as f:
    json.dump(out, f, indent=2)
print("\nsaved results/02_path_hunt.json")
