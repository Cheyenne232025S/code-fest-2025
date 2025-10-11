# import google.generativeai as genai

# genai.configure(api_key="AIzaSyAFqz4rBwUP6_L4V2suoeUTY-WOUicMLGI")

# model = genai.GenerativeModel("gemini-2.5-flash")

# prompt = "Tell me the top 5 marriott hotels in NYC near family friendly restaurants in an affordable price range. Must have kids menu and Gluten Free options."

# response = model.generate_content(prompt)

# print(response.text)



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


    