import sys
import asyncio

# Fix for Windows: Set the event loop policy to support subprocesses (required for Playwright)
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json
import os

# Import your scraper function
from scraper_student import scrape_student_grades, parse_universis_data

app = FastAPI(title="ECE AUTh App API")

# Startup event to ensure Windows event loop policy is set
@app.on_event("startup")
async def startup_event():
    """Set Windows event loop policy on startup."""
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
        print("Windows ProactorEventLoop policy set for Playwright compatibility")

# Allow the React frontend to communicate with this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, change this to your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create a data model for the login request
class LoginCredentials(BaseModel):
    username: str
    password: str

@app.post("/api/sync")
async def sync_student_data(credentials: LoginCredentials):
    """Logs into AUTh, scrapes grades, and returns clean JSON."""
    try:
        # Ensure Windows event loop policy is set (belt and suspenders approach)
        if sys.platform == 'win32':
            asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
        
        raw_data = await scrape_student_grades(credentials.username, credentials.password)
        if not raw_data:
            raise HTTPException(status_code=404, detail="Could not retrieve data from AUTh.")
        
        clean_data = parse_universis_data(raw_data)
        return clean_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/rules")
async def get_department_rules():
    """Serves the hardcoded ECE AUTh rules to the frontend."""
    rules_path = "rules_ece.json"
    if not os.path.exists(rules_path):
        raise HTTPException(status_code=404, detail="Rules file not found on server.")
    
    with open(rules_path, 'r', encoding='utf-8') as f:
        rules = json.load(f)
    return rules

@app.get("/")
def read_root():
    return {"status": "Backend is running!"}