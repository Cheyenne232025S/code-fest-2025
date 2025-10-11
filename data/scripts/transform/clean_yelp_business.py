"""
clean_yelp_business.py
----------------------
Cleans the Yelp business dataset into a standardized CSV.

Run from the repo root:
    python data/scripts/transform/clean_yelp_business.py
"""

import json
import pandas as pd
import numpy as np
from pathlib import Path

# --- Define paths relative to the repository root ---
ROOT = Path(__file__).resolve().parents[3]     # -> code-fest-2025/
RAW_DIR = ROOT / "data" / "raw" / "yelp"       # assuming business.json is under data/raw/yelp/
PROCESSED_DIR = ROOT / "data" / "processed"

input_path = RAW_DIR / "business.json"
output_path = PROCESSED_DIR / "business_clean.csv"

# --- Read and process the JSON file line by line (Yelp format is JSON lines) ---
rows = []
with open(input_path, "r", encoding="utf-8") as f:
    for line in f:
        obj = json.loads(line)

        # Build full address
        address_parts = [
            obj.get("address", ""),
            obj.get("city", ""),
            obj.get("state", ""),
            obj.get("postal_code", "")
        ]
        address_full = ", ".join(
            part.strip() for part in address_parts if part and str(part).strip()
        )

        # Extract first category if available
        category = ""
        if obj.get("categories"):
            category = obj["categories"].split(",")[0].strip()

        rows.append({
            "business_name": obj.get("name", "").strip(),
            "address_full": address_full,
            "latitude": obj.get("latitude"),
            "longitude": obj.get("longitude"),
            "rating": obj.get("stars"),
            "category": category,
            "source": "business"
        })

# --- Convert to DataFrame ---
df = pd.DataFrame(rows)

# --- Drop duplicates and save output ---
df = df.drop_duplicates(subset=["business_name", "latitude", "longitude"])

PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
df.to_csv(output_path, index=False, encoding="utf-8")

print(f"✅ Cleaned {len(df)} records → {output_path.relative_to(ROOT)}")
