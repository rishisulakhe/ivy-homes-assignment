"""Build duplicate-property graph across all listings.

Same property = same physical flat detected via:
  - same-unit pairs: identical (apartment_name, locality, bedroom, floor, bathroom,
    balcony, furnishing, facing) + carpet_area within 25 + geo within 0.0015 + price within 8%
  - cross-unit pairs: same key + area ratio ~= 10.7639 (sqm vs sqft) within 7% + price within 10%
"""
import json
from collections import defaultdict

DATA = "/home/rishisulakhe/ivy_homes/data"
L = json.load(open(f"{DATA}/listings.json"))

SQM_PER_SQFT = 10.7639

BAIT_PREFIXES = ('Urgent sale - owner relocating.', 'Owner moving abroad, priced to sell.', 'Price negotiable for a quick sale.')


def is_bait(r):
    return r['description'].startswith(BAIT_PREFIXES)


groups = defaultdict(list)
for r in L:
    key = (r['apartment_name'].lower().replace('  ', ' '), r['locality'], r['bedroom'], r['floor'], r['bathroom'])
    groups[key].append(r)


def same_flat(a, b):
    if a['balcony'] != b['balcony'] or a['furnishing'] != b['furnishing'] or a['facing_direction'] != b['facing_direction']:
        return False
    geo = max(abs(a['latitude'] - b['latitude']), abs(a['longitude'] - b['longitude'])) <= 0.0016
    pa, pb = a['carpet_area'], b['carpet_area']
    same_unit = abs(pa - pb) <= 25 and abs(a['price'] - b['price']) <= 0.08 * max(a['price'], b['price'])
    cross_unit = False
    lo, hi = sorted((pa, pb))
    if hi / lo > 5:  # potential sqm/sqft pair
        conv = lo * SQM_PER_SQFT
        cross_unit = abs(conv - hi) / hi <= 0.07 and abs(a['price'] - b['price']) <= 0.10 * max(a['price'], b['price'])
    return geo and (same_unit or cross_unit)


# union-find
parent = {r['listing_id']: r['listing_id'] for r in L}

def find(x):
    while parent[x] != x:
        parent[x] = parent[parent[x]]
        x = parent[x]
    return x

def union(a, b):
    ra, rb = find(a), find(b)
    if ra != rb:
        parent[rb] = ra

pair_log = []
for key, v in groups.items():
    if len(v) < 2:
        continue
    for i in range(len(v)):
        for j in range(i + 1, len(v)):
            if same_flat(v[i], v[j]):
                union(v[i]['listing_id'], v[j]['listing_id'])
                pair_log.append((v[i]['listing_id'], v[j]['listing_id'],
                                 'cross-unit' if max(v[i]['carpet_area'], v[j]['carpet_area']) / min(v[i]['carpet_area'], v[j]['carpet_area']) > 5 else 'same-unit'))

comps = defaultdict(list)
for r in L:
    comps[find(r['listing_id'])].append(r)

sizes = defaultdict(int)
for c in comps.values():
    sizes[len(c)] += 1
print("property groups by size:", dict(sorted(sizes.items())))
print("distinct properties:", len(comps))
extra = sum(len(c) - 1 for c in comps.values())
print("extra records (duplicates collapsed):", extra)

# composition of multi-record groups
from collections import Counter
multi = [c for c in comps.values() if len(c) > 1]
print("\nmulti-record groups:", len(multi))
pair_types = Counter(t for _, _, t in pair_log)
print("pair types:", dict(pair_types))
# how many sqm records are in groups with a sqft record
sqm_in_group_with_sqft = 0
sqm_alone = 0
for c in comps.values():
    sqm_ids = [r for r in c if r['carpet_area'] < 300]
    ft_ids = [r for r in c if r['carpet_area'] >= 300]
    sqm_in_group_with_sqft += len([r for r in sqm_ids if ft_ids])
    sqm_alone += len([r for r in sqm_ids if not ft_ids])
print(f"sqm records grouped with a sqft twin: {sqm_in_group_with_sqft}, sqm records alone: {sqm_alone}")

# bait records in multi groups?
bait_multi = sum(1 for c in multi for r in c if is_bait(r))
bait_total = sum(1 for r in L if is_bait(r))
print(f"bait records in multi-record groups: {bait_multi}/{bait_total}")

# save property mapping
prop_map = {r['listing_id']: find(r['listing_id']) for r in L}
json.dump({
    "distinct_properties": len(comps),
    "extra_duplicate_records": extra,
    "group_sizes": {str(k): v for k, v in sorted(sizes.items())},
    "pairs": pair_log,
}, open(f"{DATA}/property_graph.json", "w"), indent=1)
print("\nsaved property_graph.json")
