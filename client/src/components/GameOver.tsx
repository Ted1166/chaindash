import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit'
import { useState, useEffect } from 'react'
import type { SessionResult } from '../hooks/useGameStore'
import { useGameStore } from '../hooks/useGameStore'
import {
  buildSubmitScore,
  buildInsertLeaderboard,
  fetchActiveSession,
  fetchPlayerProfile,
} from '../chain/contracts'

interface Props {
  session: SessionResult
  onPlayAgain: () => void
  onLeaderboard: () => void
  onHome: () => void
}

type ChainStatus = 'idle' | 'submitting' | 'done' | 'error'

export default function GameOver({ session, onPlayAgain, onLeaderboard, onHome }: Props) {
  const account = useCurrentAccount()
  const client = useSuiClient()
  const { mutate: signAndExecute } = useSignAndExecuteTransaction()
  const { setTxDigest } = useGameStore()

  const [chainStatus, setChainStatus] = useState<ChainStatus>('idle')
  const [txDigest, setLocalTxDigest] = useState<string | null>(null)

  // Automatically submit score on mount
  useEffect(() => {
    if (!account) return
    submitToChain()
  }, [])

  async function submitToChain() {
    if (!account || chainStatus !== 'idle') return
    setChainStatus('submitting')

    try {
      // Fetch profile and active session IDs
      const [profile, sessionId] = await Promise.all([
        fetchPlayerProfile(client, account.address),
        fetchActiveSession(client, account.address),
      ])

      if (!profile || !sessionId) {
        setChainStatus('error')
        return
      }

      const tx = buildSubmitScore(
        profile.id,
        sessionId,
        session.score,
        session.tokensCollected,
        session.distance,
        session.aiDifficulty,
      )

      signAndExecute(
        { transaction: tx },
        {
          onSuccess: async (result) => {
            const digest = result.digest
            setLocalTxDigest(digest)
            setTxDigest(digest)

            // Now insert into leaderboard
            const lbTx = buildInsertLeaderboard(
              account.address,
              profile.username,
              session.score,
              session.aiDifficulty,
              sessionId,
            )
            signAndExecute({ transaction: lbTx }, {
              onSuccess: () => setChainStatus('done'),
              onError: () => setChainStatus('done'), // leaderboard is best-effort
            })
          },
          onError: () => setChainStatus('error'),
        },
      )
    } catch {
      setChainStatus('error')
    }
  }

  const diffColor = session.aiDifficulty < 40
    ? '#1d9e75'
    : session.aiDifficulty < 70
      ? '#ef9f27'
      : '#e24b4a'

  return (
    <div style={{ maxWidth: 420, margin: '0 auto', padding: '2rem 1rem' }}>
      <h2 style={{ fontSize: 28, fontWeight: 500, textAlign: 'center', marginBottom: 8 }}>
        {session.newPersonalBest ? '🏆 New Personal Best!' : 'Run Over'}
      </h2>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 12,
        margin: '1.5rem 0',
      }}>
        <StatCard label="Score" value={session.score.toLocaleString()} accent />
        <StatCard label="Tokens" value={`⬡ ${session.tokensCollected}`} />
        <StatCard label="Distance" value={`${(session.distance / 1000).toFixed(1)} km`} />
        <StatCard
          label="AI Difficulty"
          value={`${session.aiDifficulty}/100`}
          valueColor={diffColor}
        />
      </div>

      {/* Chain submission status */}
      <div style={{
        padding: '12px 16px',
        borderRadius: 8,
        border: '0.5px solid var(--color-border-tertiary)',
        marginBottom: '1.5rem',
        fontSize: 13,
      }}>
        {chainStatus === 'idle' && (
          <span style={{ color: 'var(--color-text-secondary)' }}>Preparing on-chain submission…</span>
        )}
        {chainStatus === 'submitting' && (
          <span style={{ color: 'var(--color-text-info)' }}>⏳ Submitting score to OneChain…</span>
        )}
        {chainStatus === 'done' && txDigest && (
          <span style={{ color: 'var(--color-text-success)' }}>
            ✓ Score recorded on-chain
            <br />
            <span style={{ fontSize: 11, fontFamily: 'monospace', opacity: 0.7 }}>
              {txDigest.slice(0, 16)}…
            </span>
          </span>
        )}
        {chainStatus === 'error' && (
          <span style={{ color: 'var(--color-text-danger)' }}>
            ✗ Chain submission failed — score saved locally only
          </span>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button className="btn btn--primary" onClick={onPlayAgain}>
          Play Again
        </button>
        <button className="btn btn--secondary" onClick={onLeaderboard}>
          Leaderboard
        </button>
        <button className="btn btn--ghost" onClick={onHome}>
          Home
        </button>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  accent = false,
  valueColor,
}: {
  label: string
  value: string
  accent?: boolean
  valueColor?: string
}) {
  return (
    <div style={{
      background: 'var(--color-background-secondary)',
      borderRadius: 8,
      padding: '12px 14px',
    }}>
      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{
        fontSize: accent ? 24 : 18,
        fontWeight: 500,
        color: valueColor || 'var(--color-text-primary)',
      }}>
        {value}
      </div>
    </div>
  )
}
