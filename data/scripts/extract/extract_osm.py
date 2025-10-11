# data/scripts/extract/extract_osm.py
import requests
import json
from datetime import datetime

def extract_osm_restaurants(city="New York", cuisine=None, radius_km=5):
    query = f"""
    [out:json][timeout:25];
    area["name"="{city}"];
    node["amenity"="restaurant"](area);
    out body;
    """
    response = requests.get("https://overpass-api.de/api/interpreter", params={"data": query})
    data = response.json()

    restaurants = []
    for el in data.get("elements", []):
        tags = el.get("tags", {})
        restaurants.append({
            "id": el.get("id"),
            "name": tags.get("name"),
            "cuisine": tags.get("cuisine"),
            "lat": el.get("lat"),
            "lon": el.get("lon"),
            "wheelchair": tags.get("wheelchair"),
            "diet_vegan": tags.get("diet:vegan"),
            "addr_city": tags.get("addr:city", city),
            "timestamp": datetime.now().isoformat()
        })

    # Save raw JSON
    with open(f"data/raw/osm_restaurants_{city.lower().replace(' ', '_')}.json", "w") as f:
        json.dump(restaurants, f, indent=2)

    print(f"✅ Extracted {len(restaurants)} restaurants for {city}")
    return restaurants

if __name__ == "__main__":
    extract_osm_restaurants("New York")
