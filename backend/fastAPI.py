# backend/main.py
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Dict
from fastapi.middleware.cors import CORSMiddleware
from LLM_test import get_family_friendly_hotels
import json

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

# Submit a single response (process and return summary, no saving)
@app.post("/submit/")
def submit_response(response: SurveyResponse):
    # For now simply echo back the received payload so the frontend gets the same data
    return {
        "status": "success",
        "message": "Echoing received payload",
        "data": response.model_dump()
    }

@app.post("/llm/")
def llm_endpoint():
    # Process the payload as needed and return it as a string
    return {
        "status": "success",
        "message": "LLM endpoint received",
        "data": get_family_friendly_hotels()
    }