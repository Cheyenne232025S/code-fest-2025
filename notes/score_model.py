# scoring_model.py
import pandas as pd, numpy as np, math, json, ast
from pathlib import Path
import os

# -----------------------------
# 1) Load inputs
# -----------------------------
def main(user_prefs=None):
    """
    Run scoring using CSV inputs. If user_prefs is provided (dict), it will
    override the local default user_prefs used by the script.
    Returns a small dict with output file paths and top hotels sample.
    """
    # Robust data paths for running under uvicorn (cwd may differ).
    # Prefer data directory next to backend (../data), allow override via DATA_DIR env var,
    # and fall back to ./data relative to current working directory.
    base_dir = Path(__file__).resolve().parent         # notes/
    backend_dir = base_dir.parent                       # backend/
    data_dir = Path(os.environ.get("DATA_DIR", backend_dir / "data"))

    hotels_path = data_dir / "hotels_nyc_geocoded.csv"
    nearby_path = data_dir / "restaurants_near_hotels.csv"
    scores_out_path = data_dir / "hotel_scores_with_recos.csv"
    recs_out_path = data_dir / "hotel_recommendations.csv"

    if not hotels_path.exists() or not nearby_path.exists():
        # Try fallback to ./data relative to current working directory
        alt_hotels = Path("data") / "hotels_nyc_geocoded.csv"
        alt_nearby = Path("data") / "restaurants_near_hotels.csv"
        if alt_hotels.exists() and alt_nearby.exists():
            hotels_path = alt_hotels
            nearby_path = alt_nearby
            print("Falling back to ./data in current working directory.")
        else:
            raise FileNotFoundError(
                f"Data files not found. Checked: {hotels_path} and {nearby_path}.\n"
                "Place CSVs in backend/data, ./data relative to cwd, or set DATA_DIR env var to the data folder."
            )

    hotels = pd.read_csv(hotels_path)
    restaurants = pd.read_csv(nearby_path)
    print("Loaded csvs")
    # -----------------------------
    # 2) Light cleaning / parsing
    # -----------------------------
    def to_list(x):
        """Normalize categories column into a list[str]."""
        if isinstance(x, list):
            return x
        if isinstance(x, str):
            s = x.strip()
            if not s:
                return []
            # try Python-literal list first
            try:
                if s.startswith("["):
                    val = ast.literal_eval(s)
                    return [str(v).strip().lower() for v in val if str(v).strip()]
            except Exception:
                pass
            # fallback: comma/semicolon separated
            return [p.strip().lower() for p in s.replace(";", ",").split(",") if p.strip()]
        return []

    restaurants["categories"] = restaurants.get("categories", []).apply(to_list)

    def price_to_int(p):
        """Map price symbol or int-ish to 1..4; else None."""
        if isinstance(p, str) and p.strip().startswith("$"):
            return min(4, max(1, len(p.strip())))
        if pd.isna(p):
            return None
        try:
            v = int(p)
            return v if 1 <= v <= 4 else None
        except Exception:
            return None

    restaurants["price_level"] = restaurants.get("price", None).apply(price_to_int)

    # Optional: ensure numeric distances
    if "distance_m" in restaurants.columns:
        restaurants["distance_m"] = pd.to_numeric(restaurants["distance_m"], errors="coerce").fillna(0.0)
    else:
        restaurants["distance_m"] = 0.0

    # -----------------------------
    # 3) User prefs (tweak freely)
    # -----------------------------
    incoming_weights = restaurants.get("weights")
    if user_prefs is None:
        user_prefs = {
            # Distance half-life in meters: the distance component halves at this distance
            "preferred_radius_m": 800, #dist in meters
            # Cuisine handling: any overlap between liked_cuisines and restaurant categories counts as a match
            "liked_cuisines": ["thai", "japanese", "italian"],
            # Allowed price levels (1..4). Empty list => ignore price
            "price_levels": [1, 2, 3], # multi choice; number of $$$
            # Feature weights (must sum to 1)
            "weights": incoming_weights or {
                "distance": 0.35,
                "rating":   0.35,
                "price":    0.15,
                "cuisine":  0.15,
            },
            # How many recommendations to keep per hotel
            "top_k": 5
        }
    print("Before assert")
    assert abs(sum(user_prefs["weights"].values()) - 1.0) < 1e-9, "Weights must sum to 1.0"
    print("After assert")

    # -----------------------------
    # 4) Scoring helpers
    # -----------------------------
    def distance_decay(distance_m: float, half_life_m: float) -> float:
        """Exponential decay: score = 0.5 at half_life_m."""
        if half_life_m <= 0:
            return 1.0
        # exp(-ln 2 * d / half_life) gives 0.5 at d = half_life
        return math.exp(-math.log(2.0) * float(distance_m) / float(half_life_m))

    def restaurant_score(hotel_row, rest_row, prefs) -> float:
        w = prefs["weights"]

        # Distance (already meters)
        d_m = float(rest_row.get("distance_m") or 0.0)
        s_dist = distance_decay(d_m, prefs["preferred_radius_m"])

        # Rating: 0..5 -> 0..1
        rating = rest_row.get("rating", np.nan)
        s_rating = (float(rating) / 5.0) if pd.notna(rating) else 0.0

        # Price fit
        allowed = prefs["price_levels"] or []
        price_lv = rest_row.get("price_level")
        if not allowed:           s_price = 1.0                   # ignore price if none provided
        elif price_lv is None:    s_price = 0.6                   # unknown price → soft credit
        else:                     s_price = 1.0 if price_lv in allowed else 0.0

        # Cuisine match (case-insensitive overlap)
        liked = [c.lower() for c in (prefs["liked_cuisines"] or [])]
        cats  = [c.lower() for c in (rest_row.get("categories") or [])]
        if not liked:             s_cuisine = 1.0                 # ignore cuisine if not provided
        else:                     s_cuisine = 1.0 if any(c in cats for c in liked) else 0.0

        return (w["distance"] * s_dist +
                w["rating"]   * s_rating +
                w["price"]    * s_price +
                w["cuisine"]  * s_cuisine)

    # For fast lookups: group restaurants by hotel_name
    rest_groups = {k: v for k, v in restaurants.groupby("hotel_name")} if "hotel_name" in restaurants.columns else {}

    # -----------------------------
    # 5) Compute per-hotel scores + top-K recs
    #    (ITERATE OVER HOTELS so every hotel appears)
    # -----------------------------
    TOP_K = int(user_prefs["top_k"])
    hotel_rows = []
    reco_rows  = []

    for _, hrow in hotels.iterrows():
        hotel_name = hrow["hotel_name"]
        group = rest_groups.get(hotel_name, pd.DataFrame())

        scored = []
        for _, r in group.iterrows():
            s = restaurant_score(hrow, r, user_prefs)
            scored.append({
                "restaurant_name": r.get("restaurant_name"),
                "score_r": round(float(s), 6),
                "rating": r.get("rating", None),
                "price": r.get("price", None),
                "price_level": r.get("price_level", None),
                "distance_m": float(r.get("distance_m") or 0.0),
                "categories": r.get("categories") or [],
                "restaurant_lat": r.get("restaurant_lat"),
                "restaurant_lon": r.get("restaurant_lon"),
                "url": r.get("url", None),
            })

        if not scored:
            # Keep the hotel with zero score and no recs
            hotel_rows.append({
                "hotel_name": hotel_name,
                "score": 0.0,
                "top_restaurants": "[]",
            })
            continue

        # Order by individual restaurant score (descending)
        scored.sort(key=lambda x: x["score_r"], reverse=True)

        # Aggregate: mean of top-K (stable, avoids long tails)
        top_for_score = scored[:TOP_K] if len(scored) >= TOP_K else scored
        hotel_score = float(np.mean([x["score_r"] for x in top_for_score]))

        # Keep top-K for recommendations
        topk = scored[:TOP_K]

        hotel_rows.append({
            "hotel_name": hotel_name,
            "score": round(hotel_score, 6),
            "top_restaurants": json.dumps([
                {
                    "name": t["restaurant_name"],
                    "score": round(t["score_r"], 3),
                    "rating": t["rating"],
                    "price": t["price"],
                    "distance_m": round(t["distance_m"], 1),
                    "cuisines": t["categories"],
                    "lat": t["restaurant_lat"],
                    "lon": t["restaurant_lon"],
                    "url": t["url"],
                } for t in topk
            ], ensure_ascii=False)
        })

        # Also emit a normalized long table for analysis/plots
        for rank, t in enumerate(topk, start=1):
            reco_rows.append({
                "hotel_name": hotel_name,
                "rank": rank,
                "restaurant_name": t["restaurant_name"],
                "restaurant_score": round(t["score_r"], 3),
                "rating": t["rating"],
                "price": t["price"],
                "price_level": t["price_level"],
                "distance_m": round(t["distance_m"], 1),
                "cuisines": ",".join(t["categories"]),
                "restaurant_lat": t["restaurant_lat"],
                "restaurant_lon": t["restaurant_lon"],
                "url": t["url"],
            })

    # -----------------------------
    # 6) Save outputs (+ merge hotel metadata for convenience)
    # -----------------------------
    hotel_scores_df = pd.DataFrame(hotel_rows)

    # Optional: attach hotel metadata (borough/neighborhood/brand) for slicing
    meta_cols = [c for c in ["hotel_name","borough","neighborhood","brand","city","address","lat","lon"] if c in hotels.columns]
    if meta_cols:
        hotel_scores_df = hotel_scores_df.merge(hotels[meta_cols].drop_duplicates("hotel_name"),
                                                on="hotel_name", how="left")

    hotel_scores_df = hotel_scores_df.sort_values("score", ascending=False)
    recs_df         = pd.DataFrame(reco_rows).sort_values(["hotel_name","rank"])

    # Ensure output folder exists
    Path(scores_out_path).parent.mkdir(parents=True, exist_ok=True)

    hotel_scores_df.to_csv(scores_out_path, index=False)
    recs_df.to_csv(recs_out_path, index=False)

    # Return a concise result for callers (backend)
    result = {
        "scores_out_path": scores_out_path,
        "recs_out_path": recs_out_path,
        "top_hotels": hotel_scores_df.head(5)
    }

    print(f"✅ wrote: {scores_out_path}  ({hotel_scores_df['hotel_name'].nunique()} hotels, {len(hotel_scores_df)} rows)")
    print(f"✅ wrote: {recs_out_path}  ({len(recs_df)} rows)")

    # -----------------------------
    # 7) Quick diagnostics
    # -----------------------------
    print("\nSanity checks:")
    print("Hotels in geocoded file:", hotels["hotel_name"].nunique())
    print("Hotels scored (should match):", hotel_scores_df["hotel_name"].nunique())

    if "borough" in hotel_scores_df.columns:
        print("\nHotels returned by borough:")
        print(hotel_scores_df.groupby("borough")["hotel_name"].nunique())

    print("\nTop 5 hotels by score:")
    print(hotel_scores_df[["hotel_name","borough","score"]].head(5))

    # Peek at first hotel's recs (if any)
    if len(hotel_scores_df) and hotel_scores_df.iloc[0]["top_restaurants"] not in (None, "", "[]"):
        sample = json.loads(hotel_scores_df.iloc[0]["top_restaurants"])
        print(f"\nFirst hotel: {hotel_scores_df.iloc[0]['hotel_name']}")
        for r in sample[:5]:
            print(f" - {r['name']}  ({r.get('rating','?')}★, {r.get('distance_m','?')} m, s={r.get('score','?')})")

    top5_df = hotel_scores_df.head(5)
    top5_list = []
    for _, row in top5_df.iterrows():
        # make sure top_restaurants is a real list/dict, not a string
        restaurants = row["top_restaurants"]
        if isinstance(restaurants, str):
            try:
                restaurants = ast.literal_eval(restaurants)
            except:
                restaurants = []
    
        # make each row into a clean Python dict
        hotel_dict = {
            "hotel_name": row["hotel_name"],
            "score": row["score"],
            "top_restaurants": restaurants
        }
        top5_list.append(hotel_dict)
    print(top5_list)

    return result

if __name__ == "__main__":
    main()
