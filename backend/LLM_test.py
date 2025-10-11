import google.generativeai as genai

genai.configure(api_key="AIzaSyAFqz4rBwUP6_L4V2suoeUTY-WOUicMLGI")

model = genai.GenerativeModel("gemini-2.5-flash")

prompt = "Tell me the top 5 marriott hotels in NYC near family friendly restaurants in an affordable price range. Must have kids menu and Gluten Free options."

response = model.generate_content(prompt)

print(response.text)