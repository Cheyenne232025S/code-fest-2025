# code-fest-2025

## Project Intro

## 🏗️ Architecture Overview

### System Diagram

```mermaid
flowchart LR
  User[User in Browser] --> UI[React Web App]
  UI --> API[FastAPI Backend]
  API --> DB[(Postgres Database)]
  API --> Storage[(File Storage / Images)]

