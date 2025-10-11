# data/scripts/extract/extract_opentripmap_restaurants.py
import requests, json, time
from pathlib import Path

API_KEY = "5ae2e3f221c38a28845f05b6e0faacf6109b7e7c0eb97f2eff578603"  # 🔑 get one free at https://opentripmap.io
LAT, LON, RADIUS = 40.758, -73.9855, 5000  # Times Square, NYC
BASE = "https://api.opentripmap.com/0.1/en/places"

# --- Step 1: Get nearby restaurant XIDs ---
print("⏳ Fetching restaurant list from OpenTripMap...")
params = {
    "radius": RADIUS,
    "lon": LON,
    "lat": LAT,
    "kinds": "restaurants",
    "rate": "1",
    "limit": 1000,
    "format": "json",
    "apikey": API_KEY
}
res = requests.get(f"{BASE}/radius", params=params)
places = res.json()

# --- Step 2: For each XID, fetch detailed info ---
restaurants = []
for i, p in enumerate(places, start=1):
    xid = p.get("xid")
    if not xid:
        continue

    detail_url = f"{BASE}/xid/{xid}?apikey={API_KEY}"
    d = requests.get(detail_url).json()

    restaurants.append({
        "name": d.get("name"),
        "lat": d.get("point", {}).get("lat"),
        "lon": d.get("point", {}).get("lon"),
        "address": d.get("address"),
        "rate": d.get("rate"),
        "kinds": d.get("kinds"),
        "description": d.get("wikipedia_extracts", {}).get("text"),
        "image": d.get("preview", {}).get("source"),
        "xid": xid
    })

    # Respect API limits
    time.sleep(0.5)
    if i % 50 == 0:
        print(f"Processed {i}/{len(places)}...")

# --- Step 3: Save output ---
out = Path("data/raw/opentripmap_restaurants_nyc.json")
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(restaurants, indent=2, ensure_ascii=False))
print(f"✅ Saved {len(restaurants)} restaurants → {out}")
