# code-fest-2025

## Project Intro

## 🏗️ Architecture Overview

### 🧭 System Diagram

````mermaid
flowchart LR
    User[User in Browser] --> UI[React Web App]
    UI --> API[FastAPI Backend]
    API --> DB[(Postgres Database)]
    API --> Storage[(File Storage / Images)]

### 🧠 API

Our `app/main.py` script serves as a simple API:
- It loads datasets from `/data/`
- It filters data by user input (e.g., state name)
- It prints or returns results for analysis
