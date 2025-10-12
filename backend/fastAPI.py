# backend/main.py
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from fastapi.middleware.cors import CORSMiddleware
from LLM_test import get_family_friendly_hotels
import json
from fastapi import FastAPI, Request
# from LLM_test import get_family_friendly_hotels 
# from LLM import generate_summary
# from LLM import generate_summary_with_gemini

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
    answers: Dict[str, List[Any]] # question ID -> array of answers (allow non-string items like numbers)
    weights: Optional[Dict[str, float]]=None
    

# -------------------
# module-level storage for last submission (in-memory)
# -------------------
LAST_SUBMISSION = None

# -------------------
# API Endpoints
# -------------------

# Health check
@app.get("/")
def root():
    return {"message": "Survey API is running"}

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
    global LAST_SUBMISSION
    answers = response.answers
    print(response.answers)

    # Defensive checks: ensure expected questions exist
    required_qs = ["1", "2", "4", "5", "6"]
    missing = [q for q in required_qs if q not in answers or not answers[q]]
    if missing:
        payload = {
            "status": "error",
            "message": f"Missing answers for questions: {', '.join(missing)}"
        }
        LAST_SUBMISSION = payload
        return payload

    # --- 1️⃣ Extract survey answers ---
    city = str(answers.get("1")[0])
    try:
        distance_pref_miles = float(answers.get("2")[0])
    except Exception:
        payload = {
            "status": "error",
            "message": "Invalid distance value; expected a number."
        }
        LAST_SUBMISSION = payload
        return payload

    cuisines = answers.get("4")
    rating_pref = str(answers.get("5")[0])
    price_pref = str(answers.get("6")[0])

    # --- 2️⃣ Convert to numeric / scoring-friendly format ---

    price_map = {
        "$": [1],
        "$$": [1, 2],
        "$$$": [1, 2, 3],
        "$$$$": [1, 2, 3, 4]
    }
    price_levels = price_map.get(price_pref)
    liked_cuisines = [c.lower() for c in cuisines]
    incoming_wegihts = response.weights
    # --- 3️⃣ Build user_prefs dict for your scoring model ---
    user_prefs = {
        "preferred_radius_m": distance_pref_miles * 1600,
        "liked_cuisines": liked_cuisines,
        "price_levels": price_levels,
        "weights": incoming_wegihts or {
            "distance": 0.35,
            "rating": 0.35,
            "price": 0.15,
            "cuisine": 0.15,
        },
        "top_k": 5
    }
    try:
        recommendations = main(user_prefs)  # make sure main() accepts user_prefs as arg
        # summary = generate_summary_with_gemini(answers)
    except Exception as e:
        payload = {
            "status": "error",
            "message": f"Scoring model failed: {str(e)}",
            "prefs": user_prefs
        }
        LAST_SUBMISSION = payload
        return payload

    payload = {
        "status": "success",
        "city": city,
        "prefs": user_prefs,
        "recommendations": recommendations,
        # "summary": summary
    }

    # persist latest submission in memory so frontend Map/Sidebar can fetch it
    LAST_SUBMISSION = payload
    return payload

# New endpoint: return the last submission (if any)
@app.get("/results/")
def get_results():
    if LAST_SUBMISSION is None:
        return {"status": "no_data", "message": "No submission available"}
    return LAST_SUBMISSION
