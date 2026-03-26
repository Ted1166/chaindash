import { useState, useCallback } from 'react'

export interface GameState {
  score:           number
  tokensCollected: number
  distance:        number
  aiDifficulty:    number
  speedMultiplier: number
  gapMultiplier:   number
  isRunning:       boolean
}

const INITIAL: GameState = {
  score:           0,
  tokensCollected: 0,
  distance:        0,
  aiDifficulty:    20,
  speedMultiplier: 1.0,
  gapMultiplier:   1.2,
  isRunning:       false,
}

export function useGameStore() {
  const [state, setState] = useState<GameState>(INITIAL)

  const updateScore = useCallback((score: number) => {
    setState(s => ({ ...s, score }))
  }, [])

  const updateTokens = useCallback((tokensCollected: number) => {
    setState(s => ({ ...s, tokensCollected }))
  }, [])

  const updateDistance = useCallback((distance: number) => {
    setState(s => ({ ...s, distance }))
  }, [])

  const updateAI = useCallback((params: {
    aiDifficulty:    number
    speedMultiplier: number
    gapMultiplier:   number
  }) => {
    setState(s => ({ ...s, ...params }))
  }, [])

  const startRun = useCallback(() => {
    setState({ ...INITIAL, isRunning: true })
  }, [])

  const endRun = useCallback(() => {
    setState(s => ({ ...s, isRunning: false }))
  }, [])

  return { state, updateScore, updateTokens, updateDistance, updateAI, startRun, endRun }
}