import { create } from 'zustand'

export interface SessionResult {
  score: number
  tokensCollected: number
  distance: number
  aiDifficulty: number
  newPersonalBest: boolean
  txDigest?: string
}

interface GameStore {
  // Current run state (written by Phaser, read by React)
  score: number
  tokensCollected: number
  distance: number
  aiDifficulty: number        // 0–100, updated by AI engine each 5s
  isPlaying: boolean

  // Historical session data (for GameOver screen + leaderboard tx)
  lastSession: SessionResult | null
  personalBest: number

  // Actions
  startRun: () => void
  updateScore: (score: number) => void
  updateTokens: (count: number) => void
  updateDistance: (d: number) => void
  setAiDifficulty: (level: number) => void
  endRun: (result: SessionResult) => void
  setTxDigest: (digest: string) => void
}

export const useGameStore = create<GameStore>((set, get) => ({
  score: 0,
  tokensCollected: 0,
  distance: 0,
  aiDifficulty: 20,
  isPlaying: false,
  lastSession: null,
  personalBest: 0,

  startRun: () =>
    set({ score: 0, tokensCollected: 0, distance: 0, aiDifficulty: 20, isPlaying: true }),

  updateScore: (score) => set({ score }),
  updateTokens: (tokensCollected) => set({ tokensCollected }),
  updateDistance: (distance) => set({ distance }),
  setAiDifficulty: (aiDifficulty) => set({ aiDifficulty }),

  endRun: (result) => {
    const newPB = result.score > get().personalBest
    set({
      isPlaying: false,
      lastSession: { ...result, newPersonalBest: newPB },
      personalBest: newPB ? result.score : get().personalBest,
    })
  },

  setTxDigest: (digest) =>
    set((state) => ({
      lastSession: state.lastSession ? { ...state.lastSession, txDigest: digest } : null,
    })),
}))
