import { Transaction } from '@mysten/sui/transactions'
type SuiClient = any

// ── Contract addresses (update after deployment) ──────────────────────────────
export const PACKAGE_ID = '0x989e99dcb5ca02662d0a603374e88985ddd36b48f4d8bf9a8dd3e2a1d1d49b0f'
export const LEADERBOARD_ID = '0x12f885c41f3dfedbda92b8f50b4d964f45915f163a5c933169a5810c5485a8d4'
export const PRIZE_POOL_ID = '0x23c8d639615adcee821dc13f7ef31e7037e65b460955d509705e2783e3eeed8e'
export const CLOCK_ID = '0x6' // Sui system clock object — always this address

// ── Entry fee ─────────────────────────────────────────────────────────────────
export const ENTRY_FEE_MIST = 10_000_000n // 0.01 SUI

// ── Transaction builders ──────────────────────────────────────────────────────

/**
 * Build a transaction to create a new player profile.
 */
export function buildCreateProfile(username: string): Transaction {
  const tx = new Transaction()
  tx.moveCall({
    target: `${PACKAGE_ID}::game::create_profile`,
    arguments: [
      tx.pure.vector('u8', Array.from(new TextEncoder().encode(username))),
      tx.object(CLOCK_ID),
    ],
  })
  return tx
}

/**
 * Build a transaction to start a new game session.
 * Splits entry fee from the gas coin and returns the GameSession object.
 */
export function buildStartSession(sender: string): Transaction {
  const tx = new Transaction()
  const [coin] = tx.splitCoins(tx.gas, [ENTRY_FEE_MIST])
  const session = tx.moveCall({
    target: `${PACKAGE_ID}::game::start_session`,
    arguments: [coin, tx.object(CLOCK_ID)],
  })
  tx.transferObjects([session], sender)
  return tx
}

/**
 * Build a transaction to submit a score on game over.
 */
export function buildSubmitScore(
  profileId: string,
  sessionId: string,
  score: number,
  tokensCollected: number,
  distance: number,
  aiDifficulty: number,
): Transaction {
  const tx = new Transaction()
  tx.moveCall({
    target: `${PACKAGE_ID}::game::submit_score`,
    arguments: [
      tx.object(profileId),
      tx.object(sessionId),
      tx.pure.u64(score),
      tx.pure.u64(tokensCollected),
      tx.pure.u64(distance),
      tx.pure.u64(aiDifficulty),
    ],
  })
  return tx
}

/**
 * Build a transaction to insert a score into the global leaderboard.
 * Called after submit_score confirms on-chain.
 */
export function buildInsertLeaderboard(
  player: string,
  username: string,
  score: number,
  aiDifficulty: number,
  sessionId: string,
): Transaction {
  const tx = new Transaction()
  tx.moveCall({
    target: `${PACKAGE_ID}::leaderboard::try_insert`,
    arguments: [
      tx.object(LEADERBOARD_ID),
      tx.pure.address(player),
      tx.pure.string(username),
      tx.pure.u64(score),
      tx.pure.u64(aiDifficulty),
      tx.pure.id(sessionId),
    ],
  })
  return tx
}

// ── Read helpers ──────────────────────────────────────────────────────────────

export interface LeaderboardEntry {
  player: string
  username: string
  score: number
  aiDifficulty: number
}

/**
 * Fetch the current leaderboard entries directly from the shared object.
 */
export async function fetchLeaderboard(client: SuiClient): Promise<LeaderboardEntry[]> {
  const obj = await client.getObject({
    id: LEADERBOARD_ID,
    options: { showContent: true },
  })

  if (obj.data?.content?.dataType !== 'moveObject') return []

  const fields = obj.data.content.fields as {
    entries: Array<{ fields: { player: string; username: string; score: string; ai_difficulty: string } }>
  }

  return (fields.entries ?? []).map((e) => ({
    player: e.fields.player,
    username: e.fields.username,
    score: Number(e.fields.score),
    aiDifficulty: Number(e.fields.ai_difficulty),
  }))
}

/**
 * Find the PlayerProfile object owned by the given address.
 */
export async function fetchPlayerProfile(client: SuiClient, owner: string) {
  const objects = await client.getOwnedObjects({
    owner,
    filter: { StructType: `${PACKAGE_ID}::game::PlayerProfile` },
    options: { showContent: true },
  })

  if (!objects.data.length) return null

  const obj = objects.data[0]
  if (obj.data?.content?.dataType !== 'moveObject') return null

  const f = obj.data.content.fields as {
    best_score: string
    total_runs: string
    username: string
  }

  return {
    id: obj.data.objectId,
    bestScore: Number(f.best_score),
    totalRuns: Number(f.total_runs),
    username: f.username,
  }
}

/**
 * Find the active GameSession owned by the given address.
 */
export async function fetchActiveSession(client: SuiClient, owner: string) {
  const objects = await client.getOwnedObjects({
    owner,
    filter: { StructType: `${PACKAGE_ID}::game::GameSession` },
    options: { showContent: true },
  })

  if (!objects.data.length) return null
  return objects.data[0].data?.objectId ?? null
}
