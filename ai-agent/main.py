"""
ChainDash AI Engine
-------------------
FastAPI service that provides adaptive difficulty parameters
for the ChainDash game client.

Run with:
  uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers.difficulty import router as difficulty_router

app = FastAPI(
    title="ChainDash AI Engine",
    version="0.1.0",
    description="Adaptive difficulty engine for ChainDash — OneHack 3.0",
)

# Allow the Vite dev server and any deployed frontend origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # Vite dev
        "http://localhost:4173",   # Vite preview
        "https://chaindash.vercel.app",  # production (update as needed)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(difficulty_router, tags=["difficulty"])


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "chaindash-ai"}
