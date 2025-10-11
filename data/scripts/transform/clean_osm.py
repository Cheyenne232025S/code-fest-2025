"""
clean_osm.py
------------
Cleans the OpenStreetMap (OSM) restaurant dataset into a standardized CSV.

Run from the repo root:
    python data/scripts/transform/clean_osm.py
"""

import json
import pandas as pd
import numpy as np
from pathlib import Path

# --- Define paths relative to repository root (works on Windows/Mac/Linux) ---
ROOT = Path(__file__).resolve().parents[3]    # → code-fest-2025/
RAW_DIR = ROOT / "data" / "raw"
PROCESSED_DIR = ROOT / "data" / "processed"

input_path = RAW_DIR / "osm_restaurants_new_york.json"
output_path = PROCESSED_DIR / "osm_restaurants_new_york_clean.csv"

# --- Load JSON ---
with open(input_path, "r", encoding="utf-8") as f:
    data = json.load(f)

df = pd.DataFrame(data)

# --- Clean and normalize ---
clean_df = pd.DataFrame({
    "business_name": df["name"].astype(str).str.strip(),
    "latitude": df["lat"],
    "longitude": df["lon"],
    "rating": np.nan,  # OSM has no ratings
    "category": df.get("cuisine", "").astype(str).fillna("").str.strip(),
    "address_full": df.get("addr_city", "").astype(str).fillna("").str.strip(),
    "source": "osm"
})

# --- Remove duplicates ---
clean_df = clean_df.drop_duplicates(subset=["business_name", "latitude", "longitude"])

# --- Save cleaned data ---
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
clean_df.to_csv(output_path, index=False, encoding="utf-8")

print(f"✅ Cleaned {len(clean_df)} records → {output_path.relative_to(ROOT)}")
