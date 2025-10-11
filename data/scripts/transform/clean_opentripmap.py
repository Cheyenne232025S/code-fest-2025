"""
clean_opentripmap.py
--------------------
Cleans the OpenTripMap dataset into a standardized CSV format.

Run from your repo root:
    python data/scripts/transform/clean_opentripmap.py
"""

import json
import pandas as pd
from pandas import json_normalize
from pathlib import Path

# --- Define repo-relative paths dynamically ---
ROOT = Path(__file__).resolve().parents[3]        # -> code-fest-2025/
RAW_DIR = ROOT / "data" / "raw"
PROCESSED_DIR = ROOT / "data" / "processed"

input_path = RAW_DIR / "opentripmap_restaurants_nyc.json"
output_path = PROCESSED_DIR / "opentripmap_restaurants_nyc_clean.csv"

# --- Load data ---
with open(input_path, "r", encoding="utf-8") as f:
    data = json.load(f)

# --- Normalize nested structure ---
df_raw = json_normalize(data)

# --- Build cleaned DataFrame ---
address_cols = [
    "address.house_number", "address.house", "address.pedestrian", "address.road",
    "address.city", "address.suburb", "address.county", "address.country",
    "address.postcode"
]

clean_df = pd.DataFrame({
    "business_name": df_raw["name"].astype(str).str.strip(),
    "latitude": df_raw["lat"],
    "longitude": df_raw["lon"],
    "rating": pd.to_numeric(df_raw.get("rate"), errors="coerce"),
    "category": df_raw["kinds"].astype(str).str.split(",").str[0].str.split(";").str[0].str.strip(),
})

# --- Create full address string ---
clean_df["address_full"] = df_raw[address_cols].apply(
    lambda row: ", ".join(str(v) for v in row if pd.notna(v) and str(v).strip()),
    axis=1
)

clean_df["source"] = "opentripmap"

# --- Remove duplicates & reorder columns ---
clean_df = clean_df.drop_duplicates(subset=["business_name", "latitude", "longitude"])
clean_df = clean_df[["business_name", "address_full", "latitude", "longitude", "rating", "category", "source"]]

# --- Save cleaned data ---
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
clean_df.to_csv(output_path, index=False)

print(f"✅ Cleaned {len(clean_df)} records → {output_path.relative_to(ROOT)}")
