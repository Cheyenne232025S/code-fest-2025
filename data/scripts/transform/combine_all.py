"""
combine_all.py
---------------
Combines all cleaned restaurant CSV files into one unified dataset.

Run from the repo root:
    python data/scripts/transform/combine_all.py
"""

import pandas as pd
from pathlib import Path

# --- Define repo-relative paths ---
ROOT = Path(__file__).resolve().parents[3]     # -> code-fest-2025/
PROCESSED_DIR = ROOT / "data" / "processed"
COMBINED_DIR = ROOT / "data" / "processed" / "combined"

# --- Find all *_clean.csv files in processed directory ---
csv_files = list(PROCESSED_DIR.glob("*_clean.csv"))

if not csv_files:
    print("⚠️ No cleaned CSV files found in 'data/processed'. Make sure to run the cleaning scripts first.")
else:
    print(f"📂 Found {len(csv_files)} cleaned files to combine:\n")
    for f in csv_files:
        print(f"  - {f.name}")

    # --- Load and combine all CSVs ---
    dfs = []
    for f in csv_files:
        df = pd.read_csv(f)
        df["source_file"] = f.name  # optional: keep track of origin file
        dfs.append(df)

    combined_df = pd.concat(dfs, ignore_index=True)

    # --- Remove duplicates across sources ---
    combined_df.drop_duplicates(subset=["business_name", "latitude", "longitude"], inplace=True)

    # --- Ensure combined directory exists ---
    COMBINED_DIR.mkdir(parents=True, exist_ok=True)
    output_path = COMBINED_DIR / "nyc_restaurants_combined.csv"

    # --- Save combined dataset ---
    combined_df.to_csv(output_path, index=False, encoding="utf-8")

    print(f"\n✅ Combined {len(combined_df)} total records → {output_path.relative_to(ROOT)}")
