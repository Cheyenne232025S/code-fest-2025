# code-fest-2025

## Project Intro

## 🗂️ Repository Structure

| Folder | Purpose |
|---------|----------|
| **/backend** | Holds our FastAPI application which integrates with our frontend LLM. |
| **/data/** | Shared and stored data sets. Tracks the YelpFusion API, open street map, and open trip map data. Our main files used for processing through our application include: hotels_nyc_geocoded, restaurants_near_hotels.csv, and hotel_scores_with_recos.csv. This data collected is used in relation with our score_model_v2.py to efficiently recommend the optimal hotel and restaurants. |
| **/frontend/** | Connects the backend and our score model to display and execute the travel survey. The user input is run through our score model and based on their preferences, the output will recommend the top 5 hotels along with the top 5 restaurants. Our LLM is implemented at this stage and generates a friendly response for travelers.   
| **/images/** | Holds our system, data and scoring flow, and deployment diagrams.  |
| **/notes/** | Jupyter NoteBooks with data retrieval and cleaning, as well as our final score model.  |
| **README.md** | Main documentation (project overview, architecture, and how to run). |

## 🏗️ Architecture Overview

Below are the three key diagrams that describe the system’s design.

### 1️⃣ System Diagram
<p align="center">
  <img src="images/Deployment_view_diagram.svg" width="650" alt="System Diagram">
</p>

### 2️⃣ Data & Scoring Flow
<p align="center">
  <img src="images/data_and_scoring_flow.svg" width="650" alt="Data & Scoring Flow">
</p>

### 3️⃣ Deployment Overview
<p align="center">
  <img src="images/high_level_diagram.svg" width="650" alt="Deployment Overview">
</p>

---

### 🧱 Modularity & Composability
 **Layers:** UI (React) → API (FastAPI) → Data (Local CSV Files) → Model (`scoring_model.py`)
- **Design:** Each layer is isolated — frontend handles presentation, backend handles logic, and the model runs scoring separately.
- **Reusable components:** CSV outputs and data loaders can be swapped for future APIs or database integrations.
- **Organization:**  
  `/app/` → API + model logic  
  `/data/` → clean inputs/outputs  
  `/images/` → architecture diagrams  
  `/notes/` → analysis + exploration notebooks  

---

### ⚙️ Technology Choices
- **Frontend:** React + Vite (lightweight, modular, responsive)  
- **Backend:** FastAPI (Python 3, async, type-safe, easy to deploy)  
- **External API:** Yelp Fusion API (real restaurant data)  
- **Data Storage:** Local CSV files in `/data` (easy to update and version control)  
- **Environment:** `.env` for secrets and config variables 

---

### 🔐 Security
- API key for yelp data stored in `.env` → never exposed to frontend  
- Input validated with **Pydantic** models in FastAPI  
- **CORS** limited to approved frontend origin   
- **HTTPS** enforced when deployed  

---

### ⚡ Scalability
- **Stateless** FastAPI backend (easy horizontal scaling)  
- **Batch processing** for scoring model → fast API lookups  
- **Pagination** & **top-K results** limit payload size  
- Can be scaled to handle **larger datasets** (more hotels, more cities)  
- Future option: connect to a **cloud database** or add **Redis cache** for efficiency  
- Designed for deployment on **Render / Railway / Docker**

---

### 📡 Data / Content Flow
- The system uses **local CSV datasets** stored in the `/data/` folder instead of a live database.  
- All data is **pre-cleaned and batch processed** by `scoring_model.py`, producing:  
  - `hotel_scores_with_recos.csv` → aggregated hotel scores  
  - `hotel_recommendations.csv` → top-K restaurant recommendations per hotel  
- The **FastAPI backend** loads these pre-computed files and serves results directly to the UI.  
- The current design can easily extend to a **cloud database** or **real-time updates** in future versions

---

### 🎨 AX / CX / UI
- **User flow:**  
  1. Select preferences (radius, price, cuisines, weights)  
  2. View ranked hotels  
  3. Expand a hotel → see top-5 restaurant recommendations  
- **Design focus:** Clear cards, icons for distance/rating, simple slider inputs  
- **Error handling:** Empty-state messages & loading skeletons for better UX  

---

The backend reads from pre-computed CSVs in `/data/` and exposes simple JSON routes:
### 🧪 API Routes (File-Based)
```text
GET  /api/hotels/top?limit=5
GET  /api/hotels/{hotel_id}/restaurants?top_k=5
POST /api/score/preview   # body: { radius_m, price_levels, cuisines, weights }
GET  /health
```

---

### 🗂️ Data Management
- Source data for hotels and restaurants is stored in `/data/`.  
- Each CSV can be replaced or extended without code changes.  
- Outputs from the scoring model are saved back into `/data/` for reuse.  
- This design keeps the system **lightweight, portable, and reproducible**.

---

