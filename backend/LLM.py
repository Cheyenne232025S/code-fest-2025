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
model = genai.GenerativeModel("gemini-2.5-flash")  # or "gemini-2.5-flash" if available
def generate_summary_with_gemini(answers: list[str]) -> str:
    city = answers[0] if len(answers) > 0 else ""
    distance = answers[1] if len(answers) > 1 else ""
    reason = answers[2] if len(answers) > 2 else ""
    cuisines = answers[3] if len(answers) > 3 else ""
    rating = answers[4] if len(answers) > 4 else ""
    price = answers[5] if len(answers) > 5 else ""

    prompt = f"""
    A traveler is planning a trip to {city} for {reason}.
    They are willing to travel {distance} miles for food, prefer {cuisines} cuisine,
    are looking for places rated around {rating}, and have a budget of {price}.
    Write a warm, enthusiastic 4-sentence recommendation tailored to this traveler.
    """

    response = model.generate_content(prompt)
    return response.text





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



def generate_hotel_comparison_narrative(ranked_hotels, user_prefs):
    import google.generativeai as genai
    genai.configure(api_key="AIzaSyAFqz4rBwUP6_L4V2suoeUTY-WOUicMLGI")

    model = genai.GenerativeModel("gemini-2.5-flash")

    """
    Use AI to explain why one Marriott is better than another
    for this specific traveler
    """
    
    top_3 = ranked_hotels[:3]
    
    prompt = f"""
    A traveler is choosing between Marriott hotels in NYC.
    
    Their preferences:
    - Cuisines: {user_prefs['cuisines']}
    - Budget: {user_prefs['price_level']}
    - Purpose: {user_prefs['purpose']}
    - Dietary needs: {user_prefs.get('dietary_restrictions', 'None')}
    
    Hotel Options:
    1. {top_3[0]['hotel']['name']} (Score: {top_3[0]['total_score']}/100)
       - {top_3[0]['total_matches']} matching restaurants nearby
       - Top matches: {[r['restaurant']['name'] for r in top_3[0]['matching_restaurants'][:3]]}
    
    2. {top_3[1]['hotel']['name']} (Score: {top_3[1]['total_score']}/100)
       - {top_3[1]['total_matches']} matching restaurants nearby
       - Top matches: {[r['restaurant']['name'] for r in top_3[1]['matching_restaurants'][:3]]}
    
    3. {top_3[2]['hotel']['name']} (Score: {top_3[2]['total_score']}/100)
       - {top_3[2]['total_matches']} matching restaurants nearby
       - Top matches: {[r['restaurant']['name'] for r in top_3[2]['matching_restaurants'][:3]]}
    
    Write a compelling 4-sentence recommendation explaining:
    1. Which Marriott is best for THIS traveler
    2. Why (specific restaurants and experiences)
    3. What makes it better than the other options
    4. One unique dining experience they'll love
    
    Be enthusiastic and specific. Make them excited to book.
    """
    
    

    response = model.generate_content(prompt)

    # print(response.text)

    return response.choices[0].message.content # or just response.text?


    