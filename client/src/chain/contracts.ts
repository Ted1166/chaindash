export const PACKAGE_ID     = import.meta.env.VITE_PACKAGE_ID     ?? '0x989e99dcb5ca02662d0a603374e88985ddd36b48f4d8bf9a8dd3e2a1d1d49b0f'
export const LEADERBOARD_ID = import.meta.env.VITE_LEADERBOARD_ID ?? '0x12f885c41f3dfedbda92b8f50b4d964f45915f163a5c933169a5810c5485a8d4'
export const PRIZE_POOL_ID  = import.meta.env.VITE_PRIZE_POOL_ID  ?? '0x23c8d639615adcee821dc13f7ef31e7037e65b460955d509705e2783e3eeed8e'
export const NETWORK        = import.meta.env.VITE_NETWORK         ?? 'testnet'

import { Transaction } from '@mysten/sui/transactions'

export function buildSubmitScoreTransaction(params: {
  profileId:       string
  sessionId:       string
  score:           number
  tokensCollected: number
  distance:        number
  aiDifficulty:    number
}) {
  const tx = new Transaction()
  tx.moveCall({
    target:    `${PACKAGE_ID}::game::submit_score`,
    arguments: [
      tx.object(params.profileId),
      tx.object(params.sessionId),
      tx.pure.u64(params.score),
      tx.pure.u64(params.tokensCollected),
      tx.pure.u64(params.distance),
      tx.pure.u64(params.aiDifficulty),
    ],
  })
  return tx
}

export function buildLeaderboardInsertTransaction(params: {
  leaderboardId: string
  player:        string
  username:      string
  score:         number
  aiDifficulty:  number
  sessionId:     string
}) {
  const tx = new Transaction()
  tx.moveCall({
    target:    `${PACKAGE_ID}::leaderboard::try_insert`,
    arguments: [
      tx.object(params.leaderboardId),
      tx.pure.address(params.player),
      tx.pure.string(params.username),
      tx.pure.u64(params.score),
      tx.pure.u64(params.aiDifficulty),
      tx.pure.id(params.sessionId),
    ],
  })
  return tx
}

export const RPC_URL = 'https://fullnode.testnet.sui.io:443'

export interface LeaderboardEntry {
  player:       string
  username:     string
  score:        number
  aiDifficulty: number
}

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  try {
    const res = await fetch(RPC_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id:      1,
        method:  'sui_getObject',
        params:  [
          LEADERBOARD_ID,
          { showContent: true, showType: true },
        ],
      }),
    })
    const data = await res.json()
    const fields = data?.result?.data?.content?.fields
    if (!fields?.entries) return []

    return (fields.entries as any[]).map((e: any) => ({
      player:       e.fields.player,
      username:     e.fields.username ?? shortenAddr(e.fields.player),
      score:        Number(e.fields.score),
      aiDifficulty: Number(e.fields.ai_difficulty),
    }))
  } catch {
    return []
  }
}

export function shortenAddr(addr: string): string {
  if (!addr || addr.length < 12) return addr
  return addr.slice(0, 6) + '...' + addr.slice(-4)
}