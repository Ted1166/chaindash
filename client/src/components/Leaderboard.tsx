import { useEffect, useState, useCallback } from 'react'

const RPC_URL        = 'https://fullnode.testnet.sui.io:443'
const LEADERBOARD_ID = '0x12f885c41f3dfedbda92b8f50b4d964f45915f163a5c933169a5810c5485a8d4'
const REFRESH_MS     = 30_000

interface Entry {
  rank:         number
  player:       string
  score:        number
  aiDifficulty: number
}

interface Props {
  wallet: string | null
  onBack: () => void
}

async function fetchOnChain(): Promise<{ entries: Entry[]; totalGames: number }> {
  const res = await fetch(RPC_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id:      1,
      method:  'sui_getObject',
      params:  [LEADERBOARD_ID, { showContent: true }],
    }),
  })
  const json = await res.json()
  const fields = json?.result?.data?.content?.fields
  if (!fields) throw new Error('Object not found or empty — check LEADERBOARD_ID')

  const totalGames = Number(fields.total_games ?? 0)
  const entries: Entry[] = (fields.entries ?? [])
    .map((e: any) => ({
      player:       e.fields?.player ?? '0x???',
      score:        Number(e.fields?.score ?? 0),
      aiDifficulty: Number(e.fields?.ai_difficulty ?? 0),
    }))
    .sort((a: Entry, b: Entry) => b.score - a.score)
    .map((e: Entry, i: number) => ({ ...e, rank: i + 1 }))

  return { entries, totalGames }
}

export default function Leaderboard({ wallet, onBack }: Props) {
  const [entries,    setEntries]    = useState<Entry[]>([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)
  const [totalGames, setTotalGames] = useState(0)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [countdown,  setCountdown]  = useState(REFRESH_MS / 1000)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { entries, totalGames } = await fetchOnChain()
      setEntries(entries)
      setTotalGames(totalGames)
      setLastUpdate(new Date())
      setCountdown(REFRESH_MS / 1000)
    } catch (err: any) {
      setError(err.message ?? 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  useEffect(() => {
    const iv = setInterval(refresh, REFRESH_MS)
    return () => clearInterval(iv)
  }, [refresh])

  useEffect(() => {
    const tick = setInterval(() => {
      setCountdown(c => c <= 1 ? REFRESH_MS / 1000 : c - 1)
    }, 1000)
    return () => clearInterval(tick)
  }, [])

  function shorten(addr: string) {
    return addr.length < 12 ? addr : addr.slice(0, 6) + '...' + addr.slice(-4)
  }

  function diffLabel(d: number) {
    if (d < 30) return { label: 'EASY',    color: '#00ff88' }
    if (d < 55) return { label: 'MEDIUM',  color: '#ffaa00' }
    if (d < 75) return { label: 'HARD',    color: '#ff6633' }
    return             { label: 'EXTREME', color: '#ff3355' }
  }

  return (
    <div className="lb-root">
      <div className="lb-header">
        <button className="lb-back" onClick={onBack}>← BACK</button>
        <div className="lb-title">LEADERBOARD</div>
        <div className="lb-badge">● LIVE</div>
      </div>

      <div className="lb-meta">
        {totalGames > 0 && <span>{totalGames.toLocaleString()} GAMES PLAYED</span>}
        <span style={{ marginLeft: 'auto', opacity: 0.5 }}>
          {loading ? 'REFRESHING...' : `REFRESH IN ${countdown}s`}
        </span>
        <button className="lb-refresh" onClick={refresh} disabled={loading}>↺</button>
      </div>

      {error && (
        <div className="lb-error">
          ✗ {error}
          <br /><br />
          <button className="lb-back" onClick={refresh}>RETRY</button>
        </div>
      )}

      {!error && !loading && entries.length === 0 && (
        <>
          <div className="lb-col-headers">
            <span>#</span>
            <span>PLAYER</span>
            <span>SCORE</span>
            <span>DIFFICULTY</span>
          </div>
          <div className="lb-table">
            {[
              { rank: 1, player: '0x61ed...376f', score: 14820, aiDifficulty: 82 },
              { rank: 2, player: '0xaa23...9f12', score: 11340, aiDifficulty: 71 },
              { rank: 3, player: '0xbb44...cc01', score:  8760, aiDifficulty: 58 },
              { rank: 4, player: '0xdd55...ee22', score:  6200, aiDifficulty: 45 },
              { rank: 5, player: '0xff66...aa33', score:  4480, aiDifficulty: 33 },
            ].map((e, i) => {
              const tier = e.aiDifficulty >= 75 ? { label: 'EXTREME', color: '#ff3355' }
                        : e.aiDifficulty >= 55 ? { label: 'HARD',    color: '#ff6633' }
                        : e.aiDifficulty >= 30 ? { label: 'MEDIUM',  color: '#ffaa00' }
                        :                        { label: 'EASY',    color: '#00ff88' }
              return (
                <div className="lb-row" key={i} style={{ animationDelay: `${i * 0.06}s` }}>
                  <div className="lb-rank">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${e.rank}`}
                  </div>
                  <div className="lb-player">{e.player}</div>
                  <div className="lb-score">{e.score.toLocaleString()}</div>
                  <div className="lb-diff" style={{ color: tier.color }}>
                    {e.aiDifficulty} · {tier.label}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="lb-footer" style={{ color: 'var(--text-3)', fontStyle: 'italic' }}>
            DEMO DATA — play to add your score
          </div>
        </>
      )}

      {entries.length > 0 && (
        <>
          <div className="lb-col-headers">
            <span>#</span>
            <span>PLAYER</span>
            <span>SCORE</span>
            <span>DIFFICULTY</span>
          </div>
          <div className="lb-table">
            {entries.map((e, i) => {
              const tier  = diffLabel(e.aiDifficulty)
              const isYou = wallet && e.player.toLowerCase() === wallet.toLowerCase()
              return (
                <div
                  className={`lb-row${isYou ? ' lb-row--you' : ''}`}
                  key={e.player + i}
                  style={{ animationDelay: `${i * 0.06}s` }}
                >
                  <div className="lb-rank">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${e.rank}`}
                  </div>
                  <div className="lb-player">
                    {shorten(e.player)}
                    {isYou && <span className="lb-you-tag">YOU</span>}
                  </div>
                  <div className="lb-score">{e.score.toLocaleString()}</div>
                  <div className="lb-diff" style={{ color: tier.color }}>
                    {e.aiDifficulty} · {tier.label}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {lastUpdate && (
        <div className="lb-footer">Last updated {lastUpdate.toLocaleTimeString()}</div>
      )}
    </div>
  )
}