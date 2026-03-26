const AI_BASE = import.meta.env.VITE_AI_URL ?? 'http://localhost:8000'

export interface DifficultyRequest {
  player:             string
  recent_scores:      number[]
  reaction_percentile: number
  avoidance_rate:     number
  current_difficulty: number
  elapsed_seconds:    number
}

export interface DifficultyResponse {
  difficulty:       number
  speed_multiplier: number
  gap_multiplier:   number
  reason:           string
}

export async function fetchDifficulty(req: DifficultyRequest): Promise<DifficultyResponse> {
  try {
    const res = await fetch(`${AI_BASE}/difficulty`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(req),
    })
    if (!res.ok) throw new Error(`AI engine ${res.status}`)
    return res.json()
  } catch {
    // Fallback if AI engine is unreachable
    return {
      difficulty:       20,
      speed_multiplier: 1.0,
      gap_multiplier:   1.2,
      reason:           'fallback',
    }
  }
}

export async function recordRunResult(params: {
  player:           string
  score:            number
  ai_difficulty:    number
  tokens_collected: number
  distance:         number
}): Promise<void> {
  try {
    await fetch(`${AI_BASE}/run-result`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(params),
    })
  } catch {
    // Non-critical — AI engine may be offline
  }
}