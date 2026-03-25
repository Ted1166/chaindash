"""
PlayerModel — maintains a per-player skill estimate and translates it
into game difficulty parameters.

Skill estimation uses a simple exponential moving average (EMA) over
recent scores, normalised against a global baseline.  The model is
intentionally lightweight so it runs in <1 ms per call — critical
since the game polls every 5 seconds during live play.

In production you would persist this in Redis or Postgres.  For the
hackathon demo, an in-memory dict per process is sufficient.
"""

from __future__ import annotations

import math
import time
from dataclasses import dataclass, field
from typing import List

import numpy as np


# ── Tuning constants ────────────────────────────────────────────────────────
EMA_ALPHA = 0.35          # Weight given to the most recent run (0–1)
BASELINE_SCORE = 800      # Score a "median" player achieves
MAX_HISTORY = 20          # Runs kept in memory per player
MIN_RUNS_FOR_MODEL = 3    # Runs before we trust the model over the prior

# Difficulty output range
MIN_DIFFICULTY = 10
MAX_DIFFICULTY = 95


@dataclass
class RunRecord:
    score: int
    ai_difficulty: int
    tokens_collected: int
    distance: int
    timestamp: float = field(default_factory=time.time)


class PlayerModel:
    """
    Tracks one player's skill history and computes the ideal next difficulty.

    The core idea:
      - We maintain an EMA of "adjusted score" — raw score normalised by
        the AI difficulty the player was facing so scores are comparable
        across difficulty levels.
      - Adjusted score = raw_score / (ai_difficulty / 50)
        (difficulty 50 = neutral; higher difficulty deflates the score.)
      - We aim to keep the player in the "flow zone": they should be
        succeeding ~60% of the time at the current difficulty.
      - If recent adjusted scores are rising, increase difficulty.
      - If they are falling (player is struggling), decrease difficulty.
    """

    def __init__(self, player_id: str) -> None:
        self.player_id = player_id
        self.history: List[RunRecord] = []
        self.ema_adjusted_score: float = BASELINE_SCORE
        self.runs_recorded: int = 0

    # ── Public API ──────────────────────────────────────────────────────────

    def record_run(self, record: RunRecord) -> None:
        """Add a completed run to this player's history."""
        adjusted = self._adjusted_score(record.score, record.ai_difficulty)
        if self.runs_recorded == 0:
            self.ema_adjusted_score = adjusted
        else:
            self.ema_adjusted_score = (
                EMA_ALPHA * adjusted + (1 - EMA_ALPHA) * self.ema_adjusted_score
            )
        self.history.append(record)
        if len(self.history) > MAX_HISTORY:
            self.history.pop(0)
        self.runs_recorded += 1

    def compute_next_difficulty(
        self,
        current_difficulty: int,
        elapsed_seconds: int,
        reaction_percentile: float = 50.0,
        avoidance_rate: float = 0.5,
    ) -> dict:
        """
        Return a dict with:
          difficulty      int   0–100
          speed_multiplier float
          gap_multiplier   float
          reason           str
        """
        if self.runs_recorded < MIN_RUNS_FOR_MODEL:
            # Not enough data — use a gentle ramp from current value
            new_diff = min(current_difficulty + 2, 30)
            return self._build_response(new_diff, "warming up — not enough history")

        # ── Skill signal ────────────────────────────────────────────────
        # How does the player compare to the global baseline?
        skill_ratio = self.ema_adjusted_score / BASELINE_SCORE  # 1.0 = average

        # ── Trend signal ────────────────────────────────────────────────
        # Are they improving or declining recently?
        trend = self._recent_trend()

        # ── In-run signal ───────────────────────────────────────────────
        # How well are they doing right now?
        live_signal = (avoidance_rate - 0.5) * 40   # -20 to +20
        reaction_signal = (50 - reaction_percentile) * 0.2  # faster = positive

        # ── Combine ──────────────────────────────────────────────────────
        target = (
            50                              # baseline
            + (skill_ratio - 1.0) * 40     # skill delta
            + trend * 15                   # trend direction
            + live_signal                  # current run performance
            + reaction_signal              # reaction speed
        )
        target = float(np.clip(target, MIN_DIFFICULTY, MAX_DIFFICULTY))

        # Dampen change: never move more than 8 points per poll
        delta = target - current_difficulty
        clamped_delta = float(np.clip(delta, -8, 8))
        new_diff = int(round(current_difficulty + clamped_delta))
        new_diff = int(np.clip(new_diff, MIN_DIFFICULTY, MAX_DIFFICULTY))

        reason = (
            f"skill_ratio={skill_ratio:.2f} trend={trend:+.2f} "
            f"avoidance={avoidance_rate:.2f} → target={target:.1f}"
        )
        return self._build_response(new_diff, reason)

    # ── Internal helpers ────────────────────────────────────────────────────

    @staticmethod
    def _adjusted_score(raw_score: int, ai_difficulty: int) -> float:
        """Normalise score by difficulty so runs are comparable."""
        difficulty_factor = max(0.2, ai_difficulty / 50.0)
        return raw_score / difficulty_factor

    def _recent_trend(self) -> float:
        """
        Return a trend scalar in [-1, 1].
        Positive = player improving, negative = declining.
        Uses the last 5 adjusted scores.
        """
        recent = self.history[-5:]
        if len(recent) < 2:
            return 0.0
        scores = [self._adjusted_score(r.score, r.ai_difficulty) for r in recent]
        # Simple slope via least-squares
        x = np.arange(len(scores), dtype=float)
        slope = float(np.polyfit(x, scores, 1)[0])
        # Normalise: a slope of +200 pts/run = trend of +1.0
        return float(np.clip(slope / 200.0, -1.0, 1.0))

    def _build_response(self, difficulty: int, reason: str) -> dict:
        d = difficulty / 100.0
        # Speed multiplier: 0.8 at diff=10, 1.0 at diff=50, 1.6 at diff=95
        speed = 0.8 + d * 0.8
        # Gap multiplier: 1.4 at diff=10 (easy), 0.85 at diff=95 (tight)
        gap = 1.4 - d * 0.55
        return {
            "difficulty": difficulty,
            "speed_multiplier": round(speed, 2),
            "gap_multiplier": round(gap, 2),
            "reason": reason,
        }
