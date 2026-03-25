const AI_BASE = '/api/ai'

export interface DifficultyRequest {
  /** Player wallet address (used as session key) */
  player: string
  /** Scores from the last 3 runs (most recent first) */
  recent_scores: number[]
  /** Current run: reaction time percentile 0–100 (lower = faster) */
  reaction_percentile: number
  /** Current run: obstacle avoidance rate 0–1 */
  avoidance_rate: number
  /** Current AI difficulty level (0–100) */
  current_difficulty: number
  /** Seconds elapsed in current run */
  elapsed_seconds: number
}

export interface DifficultyResponse {
  /** New target difficulty 0–100 */
  difficulty: number
  /** Speed multiplier to apply to obstacle spawn rate (0.5–2.0) */
  speed_multiplier: number
  /** Gap size multiplier for obstacles (0.5–1.5, higher = easier) */
  gap_multiplier: number
  /** Human-readable reason (for debugging) */
  reason: string
}

/**
 * Ask the AI engine for an updated difficulty setting.
 * Called every 5 seconds during active gameplay.
 * Falls back to no change if the service is unreachable.
 */
export async function fetchDifficulty(req: DifficultyRequest): Promise<DifficultyResponse> {
  try {
    const res = await fetch(`${AI_BASE}/difficulty`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
      signal: AbortSignal.timeout(2000), // 2 s timeout — game must not freeze
    })

    if (!res.ok) throw new Error(`AI service returned ${res.status}`)
    return await res.json()
  } catch {
    // Graceful fallback: return unchanged difficulty
    return {
      difficulty: req.current_difficulty,
      speed_multiplier: 1.0,
      gap_multiplier: 1.0,
      reason: 'AI service unavailable — holding current difficulty',
    }
  }
}

/**
 * Register a completed run with the AI engine so it can
 * update its rolling player model.
 */
export async function registerRunResult(
  player: string,
  score: number,
  aiDifficulty: number,
  tokensCollected: number,
  distance: number,
): Promise<void> {
  try {
    await fetch(`${AI_BASE}/run-result`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player, score, ai_difficulty: aiDifficulty, tokens_collected: tokensCollected, distance }),
      signal: AbortSignal.timeout(3000),
    })
  } catch {
    // Fire-and-forget: ignore failures
  }
}
