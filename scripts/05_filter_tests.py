"""Rigorous filter & sorting tests against live API.

For each documented filter: fetch all matching records, then verify every record
satisfies the filter predicate. Also test sort_by/order and the doc's exact-match
claims (locality lowercase, furnishing values, etc).
"""
import json
import sys

sys.path.insert(0, "/home/rishisulakhe/ivy_homes/scripts")
import api

L = json.load(open("/home/rishisulakhe/ivy_homes/data/listings.json"))
by_id = {r['listing_id']: r for r in L}
api.login()

out = []

def check(label, params, predicate):
    records, meta = api.fetch_all("/v1/listings", page_size=50, **params)
    bad = [r['listing_id'] for r in records if not predicate(r)]
    ids = {r['listing_id'] for r in records}
    local = {r['listing_id'] for r in L if predicate(r)}
    res = {
        "label": label, "params": params, "api_count": len(records),
        "total_reported": meta['total_reported'],
        "violations": bad[:10], "violation_count": len(bad),
        "local_count": len(local),
        "api_minus_local": sorted(ids - local)[:5],
        "local_minus_api": sorted(local - ids)[:5],
    }
    out.append(res)
    print(json.dumps({k: v for k, v in res.items() if k != 'params'}))
    return res

# each documented filter, verified against returned records
check("locality=malad west", {"locality": "malad west"}, lambda r: r['locality'] == 'malad west')
check("locality=Malad West (mixed case)", {"locality": "Malad West"}, lambda r: r['locality'] == 'malad west')
check("bhk=2", {"bhk": 2}, lambda r: r['bedroom'] == 2)
check("property_type=villa", {"property_type": "villa"}, lambda r: r['property_type'] == 'villa')
check("min_price=30000000", {"min_price": 30000000}, lambda r: r['price'] >= 30000000)
check("max_price=20000000", {"max_price": 20000000}, lambda r: r['price'] <= 20000000)
check("min_price+max_price band", {"min_price": 20000000, "max_price": 30000000},
      lambda r: 20000000 <= r['price'] <= 30000000)
check("furnishing=fully-furnished", {"furnishing": "fully-furnished"}, lambda r: r['furnishing'] == 'fully-furnished')
check("furnishing=semi-furnished", {"furnishing": "semi-furnished"}, lambda r: r['furnishing'] == 'semi-furnished')
check("project_id=P50244 (doc: /v1/listings?project_id=)", {"project_id": "P50244"},
      lambda r: r['project_id'] == 'P50244')

# sorting
def sort_check(label, params, key, desc_expected):
    s, body = api.get("/v1/listings", limit=50, **params)
    vals = [key(r) for r in body['results']]
    sorted_desc = all(vals[i] >= vals[i+1] for i in range(len(vals)-1))
    sorted_asc = all(vals[i] <= vals[i+1] for i in range(len(vals)-1))
    res = {"label": label, "params": params, "first5": vals[:5], "is_desc": sorted_desc, "is_asc": sorted_asc}
    out.append(res)
    print(json.dumps(res))

sort_check("sort_by=price asc (default)", {"sort_by": "price"}, lambda r: r['price'], False)
sort_check("sort_by=price desc", {"sort_by": "price", "order": "desc"}, lambda r: r['price'], True)
sort_check("sort_by=carpet_area desc", {"sort_by": "carpet_area", "order": "desc"}, lambda r: r['carpet_area'], True)
sort_check("sort_by=posted_at desc", {"sort_by": "posted_at", "order": "desc"}, lambda r: r['posted_at'], True)
sort_check("sort_by=bedroom desc", {"sort_by": "bedroom", "order": "desc"}, lambda r: r['bedroom'], True)
sort_check("order=desc only (no sort_by)", {"order": "desc"}, lambda r: r['listing_id'], True)

with open("/home/rishisulakhe/ivy_homes/results/03_filter_sort_tests.json", "w") as f:
    json.dump(out, f, indent=2)
print("\nsaved results/03_filter_sort_tests.json")
