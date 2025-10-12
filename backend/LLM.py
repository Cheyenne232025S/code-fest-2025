# from pydantic import BaseModel
# from typing import List, Dict, Any
# import json

# class SurveyResponse(BaseModel):
#     id: int                       # timestamp in milliseconds
#     timestamp: str                # ISO datetime string
#     answers: Dict[str, List[Any]] # question ID -> array of answers (allow non-string items like numbers)

# backend/LLM.py
import google.generativeai as genai
import os
import json


genai.configure(api_key="AIzaSyAFqz4rBwUP6_L4V2suoeUTY-WOUicMLGI")
model = genai.GenerativeModel(
   model_name="gemini-2.5-flash",
   system_instruction="You are a travel concierge specializing in hotel recommendations in NYC."
   )  # or "gemini-2.5-flash" if available
def generate_summary_with_gemini(payload):
    print("Payload received for LLM:", payload)
    city = payload.get("city", "NYC")
    user_prefs = payload.get("prefs", {})
    recs = payload.get("recommendations", {})
    
    # Convert top_hotels DataFrame -> list of dicts if needed
    top_hotels = recs.get("top_hotels", [])
    if not isinstance(top_hotels, list):
        try:
            top_hotels = top_hotels.to_dict(orient="records")
        except Exception:
            raise ValueError("top_hotels must be a list or a DataFrame")

    # Get top 3
    top_3 = top_hotels[:3]
    if len(top_3) < 3:
        raise ValueError("Need at least 3 hotels to generate a comparison")

    prompt = f"""
    A traveler is choosing between Marriott hotels in {city}.
    
    Their preferences:
    - Cuisines: {', '.join(user_prefs.get('liked_cuisines', []))}
    - Budget levels: {user_prefs.get('price_levels', [])}
    - Radius: {user_prefs.get('preferred_radius_m', 0) / 1600:.1f} miles
    - Purpose: {user_prefs.get('purpose', 'leisure')}
    
    Hotel Options:
    """

    for i, hotel in enumerate(top_3, start=1):
        name = hotel.get("hotel_name", "Unknown Hotel")
        score = hotel.get("score", "?")
        restaurants = json.loads(hotel.get("top_restaurants", "[]")) if isinstance(hotel.get("top_restaurants"), str) else hotel.get("top_restaurants", [])
        top_matches = [r.get("name") for r in restaurants[:3]] if restaurants else []
        prompt += f"""
        {i}. {name} (Score: {score}/100)
           - {len(restaurants)} matching restaurants nearby
           - Top matches: {top_matches}
        """

    prompt += """
    Write a short but compelling recommendation explaining:
    1. Which Marriott is best for THIS traveler
    2. Why (specific restaurants and experiences)
    3. What makes it better than the other options
    4. One unique dining experience they'll love

    Be enthusiastic, specific, and professional. Make them excited to book.
    """

    response = model.generate_content(
        prompt,
                generation_config={
            # "max_output_tokens": 1024,
            "temperature": 0.5,
        }
      )
    return response.text.strip()






# def generate_hotel_comparison_narrative(top_hotels: list, user_prefs: dict) -> str:
#     if len(top_hotels) < 3:
#         raise ValueError("Need at least 3 hotels to generate a comparison.")

#     top_3 = top_hotels[:3]

#     def parse_restaurants(hotel):
#         try:
#             return json.loads(hotel.get("top_restaurants", "[]"))
#         except Exception:
#             return []

#     prompt = f"""
# A traveler is choosing between Marriott hotels in {user_prefs.get('city', 'a major city')}.

# Their preferences:
# - Cuisines: {", ".join(user_prefs.get('liked_cuisines', []))}
# - Budget: {user_prefs.get('price_levels', [])}
# - Purpose: {user_prefs.get('purpose', 'leisure')}
# - Dietary needs: {user_prefs.get('dietary_restrictions', 'None')}

# Hotel Options:
# """

#     for i, hotel in enumerate(top_3, start=1):
#         name = hotel["hotel_name"]
#         score = hotel["score"]
#         matches = parse_restaurants(hotel)
#         top_matches = [r["name"] for r in matches[:3]]
#         prompt += f"""
# {i}. {name} (Score: {score}/100)
#    - {len(matches)} matching restaurants nearby
#    - Top matches: {top_matches}
# """

#     prompt += """
# Write a compelling 4-sentence recommendation explaining:
# 1. Which Marriott is best for THIS traveler
# 2. Why (specific restaurants and experiences)
# 3. What makes it better than the other options
# 4. One unique dining experience they'll love

# Be enthusiastic and specific. Make them excited to book.
# """

#     response = model.generate_content(prompt)
#     return response.text


'''
def generate_hotel_comparison_narrative(ranked_hotels, user_prefs):
    
    if not ranked_hotels or len(ranked_hotels) == 0:
        raise ValueError("ranked_hotels list is empty or invalid")

    top_5 = ranked_hotels[:5]

    cuisines = user_prefs.get("liked_cuisines", [])
    price_levels = user_prefs.get("price_levels", [])
    radius_m = user_prefs.get("preferred_radius_m", 0)
    radius_miles = round(radius_m / 1600, 2)

    prompt = f"""
    A traveler is choosing between Marriott hotels in NYC.

    Their preferences:
    - Cuisines: {', '.join(cuisines)}
    - Price levels (1–4): {price_levels}
    - Travel radius: {radius_miles} miles

    Hotel Options:
    """

    for i, h in enumerate(top_5[:3], start=1):
        hotel_name = h.get("hotel", {}).get("name", "Unknown Hotel")
        total_score = h.get("total_score", "?")
        total_matches = h.get("total_matches", 0)
        matching_restaurants = h.get("matching_restaurants", [])
        top_restos = [r["restaurant"]["name"] for r in matching_restaurants[:3] if "restaurant" in r]
        
        prompt += f"""
        {i}. {hotel_name} (Score: {total_score}/100)
           - {total_matches} matching restaurants nearby
           - Top matches: {top_restos}
        """

    prompt += """
    Write a compelling 4-sentence recommendation explaining:
    1. Which Marriott is best for THIS traveler
    2. Why (specific restaurants and experiences)
    3. What makes it better than the other options
    4. One unique dining experience they'll love

    Be enthusiastic and specific. Make them excited to book.
    """

    response = model.generate_content(prompt)
    return response.text.strip()
    '''