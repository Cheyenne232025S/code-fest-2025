# backend/main.py
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Dict
from fastapi.middleware.cors import CORSMiddleware
from LLM_test import get_family_friendly_hotels
import json
from fastapi import FastAPI, Request
from LLM_test import get_family_friendly_hotels  # make sure this function exists

import sys
import os

# Add parent directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# import notes.score_model  # Now you can use score_model.main()
from notes.score_model import main


# -------------------
# Initialize FastAPI
# -------------------
app = FastAPI(title="Survey API")

# Allow requests from React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[],  # leave empty when using regex below
    allow_origin_regex=r"^http://localhost:517\d$",  # adjust to your frontend URL
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------
# Pydantic model
# -------------------
class SurveyResponse(BaseModel):
    id: int                       # timestamp in milliseconds
    timestamp: str                # ISO datetime string
    answers: Dict[str, List[str]] # question ID -> array of answers
    

# -------------------
# API Endpoints
# -------------------

# Health check
@app.get("/")
def root():
    return {"message": "Survey API is running"}


# @app.get("/llm/")
# def llm_endpoint():
#     response_text = get_family_friendly_hotels()
#     return { "data": response_text }


@app.post("/llm/")
def llm_endpoint():
    # Process the payload as needed and return it as a string
    return {
        "status": "success",
        "message": "LLM endpoint received",
        "data": get_family_friendly_hotels()
    }

@app.post("/submit/")
def submit_response(response: SurveyResponse):
    answers = response.answers
    print(response.answers)

    # --- 1️⃣ Extract survey answers ---
    city = answers.get("1")[0]
    distance_pref_miles = float(answers.get("2")[0]) #??
    # travel_reason = answers.get("3")[0]
    cuisines = answers.get("4")
    rating_pref = answers.get("5")[0]
    price_pref = answers.get("6")[0]

    # --- 2️⃣ Convert to numeric / scoring-friendly format ---

    price_map = {
        "$": [1],
        "$$": [1, 2],
        "$$$": [1, 2, 3],
        "$$$$": [1, 2, 3, 4]
    }
    price_levels = price_map.get(price_pref)
    liked_cuisines = [c.lower() for c in cuisines]

    # --- 3️⃣ Build user_prefs dict for your scoring model ---
    user_prefs = {
        "preferred_radius_m": distance_pref_miles * 1600,
        "liked_cuisines": liked_cuisines,
        "price_levels": price_levels,
        "weights": {
            "distance": 0.35,
            "rating": 0.35,
            "price": 0.15,
            "cuisine": 0.15,
        },
        "top_k": 5
    }
    try:
        recommendations = main(user_prefs)  # make sure main() accepts user_prefs as arg
    except Exception as e:
        return {
            "status": "error",
            "message": f"Scoring model failed: {str(e)}",
            "prefs": user_prefs
        }
    return {
        "status": "success",
        "city": city,
        # "reason": travel_reason,
        "prefs": user_prefs,
        "recommendations": recommendations
    }
