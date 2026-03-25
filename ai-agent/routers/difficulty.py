"""
Difficulty router — two endpoints:
  POST /difficulty    called every 5 s during live gameplay
  POST /run-result    called once per completed run
"""

from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

from models.player_model import PlayerModel, RunRecord

router = APIRouter()

# In-memory player registry (replace with Redis in production)
_players: dict[str, PlayerModel] = {}


def _get_player(player_id: str) -> PlayerModel:
    if player_id not in _players:
        _players[player_id] = PlayerModel(player_id)
    return _players[player_id]


# ── Request / Response schemas ───────────────────────────────────────────────

class DifficultyRequest(BaseModel):
    player: str = Field(..., description="Player wallet address")
    recent_scores: List[int] = Field(default_factory=list, description="Last 3 scores, newest first")
    reaction_percentile: float = Field(50.0, ge=0, le=100)
    avoidance_rate: float = Field(0.5, ge=0.0, le=1.0)
    current_difficulty: int = Field(20, ge=0, le=100)
    elapsed_seconds: int = Field(0, ge=0)


class DifficultyResponse(BaseModel):
    difficulty: int
    speed_multiplier: float
    gap_multiplier: float
    reason: str


class RunResultRequest(BaseModel):
    player: str
    score: int = Field(..., ge=0)
    ai_difficulty: int = Field(..., ge=0, le=100)
    tokens_collected: int = Field(0, ge=0)
    distance: int = Field(0, ge=0)


class RunResultResponse(BaseModel):
    recorded: bool
    total_runs: int


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/difficulty", response_model=DifficultyResponse)
def get_difficulty(req: DifficultyRequest) -> DifficultyResponse:
    """
    Return optimal difficulty parameters for the current game state.
    Called every ~5 s during live play.
    Target latency: <10 ms.
    """
    model = _get_player(req.player)
    result = model.compute_next_difficulty(
        current_difficulty=req.current_difficulty,
        elapsed_seconds=req.elapsed_seconds,
        reaction_percentile=req.reaction_percentile,
        avoidance_rate=req.avoidance_rate,
    )
    return DifficultyResponse(**result)


@router.post("/run-result", response_model=RunResultResponse)
def record_run_result(req: RunResultRequest) -> RunResultResponse:
    """
    Register a completed run so the model can update its skill estimate.
    Called once when the player dies and score is finalised.
    """
    model = _get_player(req.player)
    model.record_run(RunRecord(
        score=req.score,
        ai_difficulty=req.ai_difficulty,
        tokens_collected=req.tokens_collected,
        distance=req.distance,
    ))
    return RunResultResponse(recorded=True, total_runs=model.runs_recorded)


@router.get("/player/{player_id}/stats")
def player_stats(player_id: str) -> dict:
    """Debug endpoint: inspect a player's model state."""
    if player_id not in _players:
        return {"error": "Player not found"}
    model = _players[player_id]
    return {
        "player_id": model.player_id,
        "runs_recorded": model.runs_recorded,
        "ema_adjusted_score": round(model.ema_adjusted_score, 1),
        "history_length": len(model.history),
        "last_5_scores": [r.score for r in model.history[-5:]],
    }
