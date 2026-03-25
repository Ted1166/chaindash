import { useSuiClient } from '@mysten/dapp-kit'
import { useEffect, useState } from 'react'
import { fetchLeaderboard, type LeaderboardEntry } from '../chain/contracts'

interface Props {
  onBack: () => void
}

export default function Leaderboard({ onBack }: Props) {
  const client = useSuiClient()
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchLeaderboard(client)
      .then(setEntries)
      .catch(() => setError('Could not load leaderboard'))
      .finally(() => setLoading(false))
  }, [client])

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem' }}>
        <button
          onClick={onBack}
          style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}
        >
          ← Back
        </button>
        <h2 style={{ fontSize: 22, fontWeight: 500, margin: 0 }}>Leaderboard</h2>
        <span style={{
          marginLeft: 'auto',
          fontSize: 11,
          background: 'var(--color-background-info)',
          color: 'var(--color-text-info)',
          padding: '3px 10px',
          borderRadius: 20,
        }}>
          On-chain
        </span>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-secondary)' }}>
          Loading…
        </div>
      )}

      {error && (
        <div style={{ color: 'var(--color-text-danger)', fontSize: 14 }}>{error}</div>
      )}

      {!loading && !error && entries.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-secondary)' }}>
          No scores yet — be the first!
        </div>
      )}

      {!loading && entries.map((entry, i) => (
        <LeaderboardRow key={entry.player} rank={i + 1} entry={entry} />
      ))}
    </div>
  )
}

function LeaderboardRow({ rank, entry }: { rank: number; entry: LeaderboardEntry }) {
  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null
  const diffColor = entry.aiDifficulty < 40
    ? '#1d9e75'
    : entry.aiDifficulty < 70
      ? '#ef9f27'
      : '#e24b4a'

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '12px 14px',
      borderRadius: 8,
      border: '0.5px solid var(--color-border-tertiary)',
      marginBottom: 8,
      background: rank <= 3
        ? 'var(--color-background-secondary)'
        : 'var(--color-background-primary)',
    }}>
      <span style={{
        fontSize: medal ? 20 : 14,
        fontWeight: 500,
        minWidth: 28,
        color: 'var(--color-text-secondary)',
      }}>
        {medal ?? `#${rank}`}
      </span>

      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 500 }}>{entry.username}</div>
        <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--color-text-secondary)' }}>
          {entry.player.slice(0, 8)}…{entry.player.slice(-4)}
        </div>
      </div>

      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 18, fontWeight: 500 }}>{entry.score.toLocaleString()}</div>
        <div style={{ fontSize: 11, color: diffColor }}>
          AI {entry.aiDifficulty}/100
        </div>
      </div>
    </div>
  )
}
