
import google.generativeai as genai

genai.configure(api_key="AIzaSyAFqz4rBwUP6_L4V2suoeUTY-WOUicMLGI")

model = genai.GenerativeModel(
    model_name="gemini-2.5-flash",
    system_instruction="You are a travel concierge specializing in family-friendly hotel recommendations in NYC."
)



def get_family_friendly_hotels() -> str:
    try:
        prompt = "List 3 family-friendly Marriott hotels in NYC with gluten-free menu options. Keep response brief."
        response = model.generate_content(
            prompt,
            generation_config={
                "max_output_tokens": 1024,
                "temperature": 0.4,
            },
            safety_settings=[
                {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": 4},
                {"category": "HARM_CATEGORY_HARASSMENT", "threshold": 4},
                {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": 4},
                {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": 4}
            ]
        )

        if response.candidates and response.candidates[0].content.parts:
            return response.text
        else:
            return f"No valid response returned. Finish reason: {response.candidates[0].finish_reason}"

    except Exception as e:
        return f"Error during generation: {str(e)}"
    
##########################
# import google.generativeai as genai

# genai.configure(api_key="AIzaSyAFqz4rBwUP6_L4V2suoeUTY-WOUicMLGI")

# model = genai.GenerativeModel(
#     model_name="gemini-2.5-flash",
#     system_instruction="You are a travel concierge specializing in family-friendly hotel recommendations in NYC."
#     )

# prompt = "List 3 family-friendly Marriott hotels in NYC with gluten-free menu options. Keep response brief."

# response = model.generate_content(
#     prompt,
#     generation_config= {
#         "max_output_tokens": 1024,
#         "temperature": 0.4,
#     },
#     safety_settings=[
#   {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": 4},
#   {"category": "HARM_CATEGORY_HARASSMENT", "threshold": 4},
#   {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": 4},
#   {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": 4}
# ]
#                                 )

# # print(response.text)
# if response.candidates and response.candidates[0].content.parts:
#     print(response.text)
# else:
#     print("No valid response returned. Finish reason:", response.candidates[0].finish_reason)

