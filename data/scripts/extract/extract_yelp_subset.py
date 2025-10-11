import json
from pathlib import Path

# Input and output paths
RAW_FILE = Path("data/raw/yelp/business.json")
OUT_DIR = Path("data/processed")
OUT_DIR.mkdir(parents=True, exist_ok=True)
OUT_FILE = OUT_DIR / "yelp_restaurants_new_york.json"

# Define the filter
TARGET_CITY = "New York"
TARGET_CATEGORY = "Restaurant"

# Stream through the raw JSON (line-delimited)
count_in, count_out = 0, 0
with RAW_FILE.open("r", encoding="utf-8") as infile, OUT_FILE.open("w", encoding="utf-8") as outfile:
    for line in infile:
        count_in += 1
        business = json.loads(line)
        if business.get("city") == TARGET_CITY and business.get("categories") and TARGET_CATEGORY in business["categories"]:
            json.dump({
                "business_id": business["business_id"],
                "name": business["name"],
                "address": business.get("address"),
                "city": business["city"],
                "state": business["state"],
                "stars": business["stars"],
                "review_count": business["review_count"],
                "categories": business["categories"]
            }, outfile)
            outfile.write("\n")
            count_out += 1

print(f"✅ Processed {count_in:,} records → kept {count_out:,} matching businesses.")
print(f"Output saved to {OUT_FILE}")
